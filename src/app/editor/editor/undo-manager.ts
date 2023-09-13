import DiffMatchPatch from 'diff-match-patch';
import { EventEmittingClass, debounce } from './utils';
import { VanillaMirror } from './vanilla-mirror';


class State {
    patches: any[];

    constructor(private undoManager: UndoManager) {

    }

    // TODO: This is wired poorly, rewrite.
    addToUndoStack() {
        this.undoManager.undoStack.push(this);
        this.patches = this.undoManager.previousPatches;
        this.undoManager.previousPatches = [];
    }

    addToRedoStack() {
        this.undoManager.redoStack.push(this);
        this.patches = this.undoManager.previousPatches;
        this.undoManager.previousPatches = [];
    }
}

class StateMgr {
    currentTime;
    lastTime;
    lastMode;
    currentMode;

    constructor(private undoManager: UndoManager) {

    }

    isBufferState() {
        this.currentTime = Date.now();
        return this.currentMode !== 'single' &&
            this.currentMode === this.lastMode &&
            this.currentTime - this.lastTime < this.undoManager.options.bufferStateUntilIdle;
    }

    setDefaultMode(mode) {
        this.currentMode = this.currentMode || mode;
    }

    resetMode() {
        this.currentMode = undefined;
        this.lastMode = undefined;
    }

    saveMode() {
        this.lastMode = this.currentMode;
        this.currentMode = undefined;
        this.lastTime = this.currentTime;
    }
}

export class UndoManager extends EventEmittingClass {
    diffMatchPatch = new DiffMatchPatch();
    selectionMgr;
    undoStack = [];
    redoStack = [];
    currentState;
    previousPatches = [];
    currentPatches = [];

    get canUndo () { return this.undoStack.length != 0 };
    get canRedo () { return this.redoStack.length != 0 };

    options = {
        undoStackMaxSize: 200,
        bufferStateUntilIdle: 1000,
        patchHandler: {
            makePatches(oldContent, newContent, diffs) {
                return this.diffMatchPatch.patch_make(oldContent, diffs);
            },
            applyPatches(patches, content) {
                return this.diffMatchPatch.patch_apply(patches, content)[0];
            },
            reversePatches(patches) {
                const reversedPatches = this.diffMatchPatch.patch_deepCopy(patches).reverse();
                reversedPatches.forEach((patch) => {
                    patch.diffs.forEach((diff) => {
                        diff[0] = -diff[0];
                    });
                });
                return reversedPatches;
            },
        },
    }

    constructor(private editor: VanillaMirror, options?) {
        super();

        this.options = { ...options || {} };
        this.selectionMgr = editor.selectionMgr;
        if (!this.currentState) {
            this.currentState = new State(this);
        }
    }

    stateMgr = new StateMgr(this);
    setCurrentMode = (mode) => {
        this.stateMgr.currentMode = mode;
    };
    setDefaultMode = this.stateMgr.setDefaultMode.bind(this)

    addDiffs = (oldContent, newContent, diffs) => {
        const patches = this.options.patchHandler.makePatches(oldContent, newContent, diffs);
        patches.forEach(patch => this.currentPatches.push(patch));
    };

    saveCurrentPatches() {
        // Move currentPatches into previousPatches
        Array.prototype.push.apply(this.previousPatches, this.currentPatches);
        this.currentPatches = [];
    }

    saveState = debounce(() => {
        this.redoStack.length = 0;
        if (!this.stateMgr.isBufferState()) {
            this.currentState.addToUndoStack();

            // Limit the size of the stack
            while (this.undoStack.length > this.options.undoStackMaxSize) {
                this.undoStack.shift();
            }
        }
        this.saveCurrentPatches();
        this.currentState = new State(this);
        this.stateMgr.saveMode();
        this.$trigger('undoStateChange');
    });

    restoreState(patchesParam, isForward = false) {
        let patches = patchesParam;
        // Update editor
        const content = this.editor.getContent();
        if (!isForward) {
            patches = this.options.patchHandler.reversePatches(patches);
        }

        const newContent = this.options.patchHandler.applyPatches(patches, content);
        const newContentText = newContent.text || newContent;
        const range = this.editor.setContent(newContentText, true);
        const selection = newContent.selection || {
            start: range.end,
            end: range.end,
        };

        this.selectionMgr.setSelectionStartEnd(selection.start, selection.end);
        this.selectionMgr.updateCursorCoordinates(true);

        this.stateMgr.resetMode();
        this.$trigger('undoStateChange');
        this.editor.adjustCursorPosition();
    }

    undo() {
        const state = this.undoStack.pop();
        if (!state) {
            return;
        }
        this.saveCurrentPatches();
        this.currentState.addToRedoStack();
        this.restoreState(this.currentState.patches);
        this.previousPatches = state.patches;
        this.currentState = state;
    }

    redo() {
        const state = this.redoStack.pop();
        if (!state) {
            return;
        }
        this.currentState.addToUndoStack();
        this.restoreState(state.patches, true);
        this.previousPatches = state.patches;
        this.currentState = state;
    }
}

