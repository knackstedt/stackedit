import DiffMatchPatch from 'diff-match-patch';
import { EventEmittingClass, debounce } from './utils';
import { VanillaMirror } from './vanilla-mirror';

type Patch = {
    length1: number,
    length2: number,
    start1: number,
    start2: number,
    diffs: [-1 | 0 | 1, string][]
}

class State {
    patches: Patch[];

    constructor(
        private undoManager: UndoManager
    ) { }

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

// Why is this a separate class?
class StateMgr {
    currentTime: number;
    lastTime: number;
    lastMode: 'typing' | 'single';
    currentMode: 'typing' | 'single';

    constructor(
        private undoManager: UndoManager
    ) { }

    isBufferState() {
        this.currentTime = Date.now();
        return this.currentMode !== 'single' &&
            this.currentMode === this.lastMode &&
            this.currentTime - this.lastTime < this.undoManager.options.bufferStateUntilIdle;
    }

    setDefaultMode(mode: "typing" | "single") {
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
    undoStack: State[] = [];
    redoStack: State[] = [];
    currentState: State;
    previousPatches: Patch[] = [];
    currentPatches: Patch[] = [];

    stateMgr = new StateMgr(this);

    get canUndo () { return this.undoStack.length != 0 };
    get canRedo () { return this.redoStack.length != 0 };

    options = {
        undoStackMaxSize: 200,
        bufferStateUntilIdle: 1000,
    }

    constructor(
        private editor: VanillaMirror,
        options?: {
            undoStackMaxSize: number,
            bufferStateUntilIdle: number
        }
    ) {
        super();

        this.options = { ...options || {} as any };
        this.selectionMgr = editor.selectionMgr;
        this.currentState = this.currentState || new State(this);
    }

    setCurrentMode(mode) {
        this.stateMgr.currentMode = mode;
    };
    setDefaultMode = this.stateMgr.setDefaultMode.bind(this)

    addDiffs(oldContent: string, newContent, diffs) {
        const patches = this.diffMatchPatch.patch_make(oldContent, diffs);
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

    restoreState(patchesParam: Patch[], isForward = false) {
        let patches = patchesParam;
        // Update editor
        const content = this.editor.getContent();
        if (!isForward) {
            patches = this.diffMatchPatch.patch_deepCopy(patches).reverse();
            patches.forEach((patch) => {
                patch.diffs.forEach((diff) => {
                    // TODO: This might be a bug.
                    // @ts-ignore
                    diff[0] = -diff[0];
                });
            });
        }

        const newContent = this.diffMatchPatch.patch_apply(patches, content)[0];
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
        if (!state) return;

        this.saveCurrentPatches();
        this.currentState.addToRedoStack();
        this.restoreState(this.currentState.patches);
        this.previousPatches = state.patches;
        this.currentState = state;
    }

    redo() {
        const state = this.redoStack.pop();
        if (!state) return;

        this.currentState.addToUndoStack();
        this.restoreState(state.patches, true);
        this.previousPatches = state.patches;
        this.currentState = state;
    }
}

