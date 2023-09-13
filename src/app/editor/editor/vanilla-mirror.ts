import DiffMatchPatch from 'diff-match-patch';
import TurndownService from 'turndown/lib/turndown.browser.umd';
import { UndoManager } from './undo-manager';
import { Watcher } from './watcher';
import { EventEmittingClass, debounce } from './utils';
import { Highlighter } from './highlighter';
import { SelectionMgr } from './selection-manager';
import { defaultKeystrokes } from './keystroke';
import { StackEditorComponent } from '../editor.component';

export class VanillaMirror extends EventEmittingClass {

    // TODO: Type this
    options: any;

    ignoreUndo = false;
    noContentFix = false;
    skipSaveSelection;
    $markers = {};
    $keystrokes = [];
    value = '';
    lastTextContent = '';
    get $contentElt() { return this.contentElt };
    get $scrollElt() { return this.scrollElt };

    watcher = new Watcher(this, this.checkContentChange.bind(this));
    highlighter = new Highlighter(this);
    diffMatchPatch = new DiffMatchPatch();
    selectionMgr = new SelectionMgr(this);
    undoMgr = new UndoManager(this);

    turndownService = new TurndownService({
        "headingStyle": "atx",
        "hr": "----------",
        "bulletListMarker": "-",
        "codeBlockStyle": "fenced",
        "fence": "```",
        "emDelimiter": "_",
        "strongDelimiter": "**",
        "linkStyle": "inlined",
        "linkReferenceStyle": "full"
    });

    private windowKeydownListener;
    private windowMouseListener;
    private windowResizeListener;

    private scrollElt: HTMLElement

    constructor(
        private ngEditor: StackEditorComponent,
        private contentElt: HTMLElement,
        private scrollEltOpt: HTMLElement
    ) {
        super();

        this.scrollElt = scrollEltOpt || contentElt;

        contentElt.setAttribute('tabindex', '0'); // To have focus even when disabled
        this.toggleEditable(true);

        // Disable escaping
        this.turndownService.escape = str => str;

        // This handles 'Enter' and keyboard arrow events.
        contentElt.addEventListener('keydown', this.keydownHandler((evt) => this.onKeyDown(evt)));
        contentElt.addEventListener('paste', (evt) => this.onPaste(evt));

        contentElt.addEventListener('focus', () => this.$trigger('focus'));
        contentElt.addEventListener('blur', () => this.$trigger('blur'));

        // Mouseup can happen outside the editor element
        window.addEventListener('mousedown', this.onWindowMouse.bind(this));
        window.addEventListener('mouseup', this.onWindowMouse.bind(this));

        // Resize provokes cursor coordinate changes
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.addKeystroke(defaultKeystrokes);

        this.watcher.startWatching();
    }

    toggleEditable(isEditable) {
        this.contentElt.contentEditable = isEditable == null ? !this.contentElt.contentEditable : isEditable;
        this.contentElt.spellcheck = false;
    }

    onWindowMouse() {
        this.selectionMgr.saveSelectionState(true, false);
        this.selectionMgr.updateCursorCoordinates();
    }

    onWindowResize() {
        if (!this.tryDestroy()) {
            this.selectionMgr.updateCursorCoordinates();
        }
    }

    init(opts: any = {}) {
        opts.content = ``;

        const options = {
            sectionHighlighter(section) {
                return section.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
            },
            sectionDelimiter: '',
            ...opts
        };
        this.options = options;
        this.undoMgr = new UndoManager(this, options);

        if (options.content !== undefined) {
            this.lastTextContent = options.content.toString();
            if (this.lastTextContent.slice(-1) !== '\n') {
                this.lastTextContent += '\n';
            }
        }

        const sectionList = this.highlighter.parseSections(this.lastTextContent, true);
        this.$trigger('contentChanged', this.lastTextContent, [0, this.lastTextContent], sectionList);
        if (options.selectionStart !== undefined && options.selectionEnd !== undefined) {
            this.setSelection(options.selectionStart, options.selectionEnd);
        }
        else {
            this.selectionMgr.saveSelectionState();
        }

        if (options.scrollTop !== undefined) {
            this.scrollElt.scrollTop = options.scrollTop;
        }
    }

    tryDestroy() {
        if (document.contains(this.contentElt)) {
            return false;
        }

        this.watcher.stopWatching();

        window.removeEventListener('keydown', this.windowKeydownListener);
        window.removeEventListener('mousedown', this.windowMouseListener);
        window.removeEventListener('mouseup', this.windowMouseListener);
        window.removeEventListener('resize', this.windowResizeListener);

        this.$trigger('destroy');
        return true;
    }

    getContent() {
        const recursivelyCollectChildrenText = (el) => {
            // This element has a content override, so we'll read that instead.
            if (el.nodeType == 1 && el.getAttribute('source') != null) {
                const text = el.getAttribute('source')
                    .replace(/\\n/gm, '\n')
                    .replace(/\\"/gm, '"');

                return text;
            }

            // This doesn't have children, so we can simply read the textContent
            else if (el.nodeType != 1 || el.childNodes.length == 0) {
                return el.textContent;
            }

            // This has childNodes, and no content override
            else {
                const sections = [...el.childNodes].map(c =>
                    recursivelyCollectChildrenText(c));

                return sections.join('');
            }
        }

        const text = recursivelyCollectChildrenText(this.contentElt);


        // Markdown-it sanitization (Mac/DOS to Unix)
        // let textContent = contentElt.textContent.replace(/\r[\n\u0085]?|[\u2424\u2028\u0085]/g, '\n');
        let textContent = text.replace(/\r[\n\u0085]?|[\u2424\u2028\u0085]/g, '\n');

        // Append a newline at the end if one isn't present.
        if (textContent.slice(-1) !== '\n') {
            textContent += '\n';
        }
        return this.value = textContent;
    }

    // Primarily invoked by mutation observer
    checkContentChange(mutations: any[]) {
        this.watcher.noWatch(() => {
            const removedSections = [];
            const modifiedSections = [];

            const markModifiedSection = (node) => {
                let currentNode = node;
                while (currentNode && currentNode !== this.contentElt) {
                    if (currentNode.section) {
                        const array = currentNode.parentNode ? modifiedSections : removedSections;
                        if (array.indexOf(currentNode.section) === -1) {
                            array.push(currentNode.section);
                        }
                        return;
                    }
                    currentNode = currentNode.parentNode;
                }
            }

            mutations.forEach((mutation) => {
                markModifiedSection(mutation.target);
                mutation.addedNodes.forEach(markModifiedSection);
                mutation.removedNodes.forEach(markModifiedSection);
            });
            this.highlighter.fixContent(modifiedSections, removedSections, this.noContentFix);
            this.noContentFix = false;
        });

        if (!this.skipSaveSelection) {
            this.selectionMgr.saveSelectionState();
        }
        this.skipSaveSelection = false;

        const newTextContent = this.getContent();
        const diffs = this.diffMatchPatch.diff_main(this.lastTextContent, newTextContent);
        Object.entries(this.$markers).forEach(([key, marker]) => {
            (marker as any).adjustOffset(diffs);
        });

        const sectionList = this.highlighter.parseSections(newTextContent);
        this.$trigger('contentChanged', newTextContent, diffs, sectionList);
        if (!this.ignoreUndo) {
            this.undoMgr.addDiffs(this.lastTextContent, newTextContent, diffs);
            this.undoMgr.setDefaultMode('typing');
            this.undoMgr.saveState();
        }
        this.ignoreUndo = false;
        this.lastTextContent = newTextContent;
        this.triggerSpellCheck();
    }

    triggerSpellCheck = debounce(() => {
        // Hack for Chrome to trigger the spell checker
        const selection = window.getSelection();
        if (this.selectionMgr.hasFocus
            && !this.highlighter.isComposing
            && this.selectionMgr.selectionStart === this.selectionMgr.selectionEnd
            && selection.modify
        ) {
            if (this.selectionMgr.selectionStart) {
                selection.modify('move', 'backward', 'character');
                selection.modify('move', 'forward', 'character');
            } else {
                selection.modify('move', 'forward', 'character');
                selection.modify('move', 'backward', 'character');
            }
        }
    }, 10);

    // Detect editor changes
    setSelection(start, end) {
        this.selectionMgr.setSelectionStartEnd(start, end == null ? start : end);
        this.selectionMgr.updateCursorCoordinates();
    }

    keydownHandler(handler) {
        return (evt) => {
            if (!['Control', 'Alt', 'Shift', 'Cmd'].includes(evt.key)) {
                handler(evt);
            }
        };
    }

    adjustCursorPosition(force?) {
        this.selectionMgr.saveSelectionState(true, true, force);
    }

    replaceContent(selectionStart, selectionEnd, replacement) {
        const min = Math.min(selectionStart, selectionEnd);
        const max = Math.max(selectionStart, selectionEnd);
        const range = this.selectionMgr.createRange(min, max);
        const rangeText = `${range}`;
        // Range can contain a br element, which is not taken into account in rangeText
        if (rangeText.length === max - min && rangeText === replacement) {
            return null;
        }
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
        return range;
    }

    addKeystroke(keystroke) {
        const keystrokes = Array.isArray(keystroke) ? keystroke : [keystroke];
        this.$keystrokes = this.$keystrokes
            .concat(keystrokes)
            .sort((keystroke1, keystroke2) => keystroke1.priority - keystroke2.priority);
    }

    setContent(value, noUndo?, maxStartOffsetOpt?) {
        this.value = value;

        const textContent = this.getContent();
        const maxStartOffset = maxStartOffsetOpt != null && maxStartOffsetOpt < textContent.length
            ? maxStartOffsetOpt
            : textContent.length - 1;
        const startOffset = Math.min(
            this.diffMatchPatch.diff_commonPrefix(textContent, value),
            maxStartOffset,
        );
        const endOffset = Math.min(
            this.diffMatchPatch.diff_commonSuffix(textContent, value),
            textContent.length - startOffset,
            value.length - startOffset,
        );
        const replacement = value.substring(startOffset, value.length - endOffset);
        const range = this.replaceContent(startOffset, textContent.length - endOffset, replacement);
        if (range) {
            this.ignoreUndo = noUndo;
            this.noContentFix = true;
        }
        return {
            start: startOffset,
            end: value.length - endOffset,
            range,
        };
    }

    replace(selectionStart, selectionEnd, replacement) {
        this.undoMgr.setDefaultMode('single');
        this.replaceContent(selectionStart, selectionEnd, replacement);
        const startOffset = Math.min(selectionStart, selectionEnd);
        const endOffset = startOffset + replacement.length;
        this.selectionMgr.setSelectionStartEnd(endOffset, endOffset);
        this.selectionMgr.updateCursorCoordinates(true);
    }

    replaceAll(search, replacement, startOffset = 0) {
        this.undoMgr.setDefaultMode('single');
        const text = this.getContent();
        const subtext = this.getContent().slice(startOffset);
        const value = subtext.replace(search, replacement);
        if (value !== subtext) {
            const offset = this.setContent(text.slice(0, startOffset) + value);
            this.selectionMgr.setSelectionStartEnd(offset.end, offset.end);
            this.selectionMgr.updateCursorCoordinates(true);
        }
    }

    focus() {
        this.selectionMgr.restoreSelection();
        this.contentElt.focus();
    }

    addMarker(marker) {
        this.$markers[marker.id] = marker;
    }

    removeMarker(marker) {
        delete this.$markers[marker.id];
    }

    onKeyDown(evt) {
        this.selectionMgr.saveSelectionState();

        // Perform keystroke
        let contentChanging = false;
        const textContent = this.getContent();
        let min = Math.min(this.selectionMgr.selectionStart, this.selectionMgr.selectionEnd);
        let max = Math.max(this.selectionMgr.selectionStart, this.selectionMgr.selectionEnd);

        const state = {
            before: textContent.slice(0, min),
            after: textContent.slice(max),
            selection: textContent.slice(min, max),
            isBackwardSelection: this.selectionMgr.selectionStart > this.selectionMgr.selectionEnd,
        };

        this.$keystrokes.forEach((keystroke) => {
            if (!keystroke.handler(evt, state, this)) {
                return false;
            }

            const newContent = state.before + state.selection + state.after;
            if (newContent !== this.getContent()) {
                this.setContent(newContent, false, min);
                contentChanging = true;
                this.skipSaveSelection = true;
                this.highlighter.cancelComposition = true;
            }

            min = state.before.length;
            max = min + state.selection.length;
            this.selectionMgr.setSelectionStartEnd(
                state.isBackwardSelection ? max : min,
                state.isBackwardSelection ? min : max,
                !contentChanging, // Expect a restore selection on mutation event
            );

            return true;
        });

        if (!contentChanging) {
            // Optimization to avoid saving selection
            this.adjustCursorPosition();
        }
    }

    onCompositionStart() {
        this.highlighter.isComposing += 1;
    }

    onCompositionEnd() {
        setTimeout(() => {
            if (this.highlighter.isComposing) {
                this.highlighter.isComposing -= 1;
                if (!this.highlighter.isComposing) {
                    this.checkContentChange([]);
                }
            }
        }, 1);
    }

    onPaste(evt) {
        this.undoMgr.setCurrentMode('single');
        evt.preventDefault();

        let data;
        const clipboardData = evt.clipboardData;
        debugger;
        data = clipboardData.getData('text/plain');

        const files = [...clipboardData.files] as File[];

        this.ngEditor

        // TODO: Re-enable after paste dialog is added.
        if (false && this.turndownService) {
            try {
                const html = clipboardData.getData('text/html');
                if (html) {
                    // TODO: Add a popup dialog to choose using whatever we
                    // end up with, after using Turndown, or raw HTML propagation
                    // Inject a custom fence around pasted content
                    // data = `\n\`\`\`<injected>\n${html}\n</injected>\n\`\`\`\n`;

                    // const sanitizedHtml = htmlSanitizer.sanitizeHtml(html)
                    //     .replace(/&#160;/g, ' '); // Replace non-breaking spaces with classic spaces
                    // if (sanitizedHtml) {
                    //     data = this.turndownService.turndown(sanitizedHtml);
                    //     // Handle double newlines added on HTML paste.
                    //     // TODO: Check if this needs to be placed elsewhere.

                    //     data = data
                    //         // Fix duplicate newlines that are inserted
                    //         .replace(/\n\n/g, '\n')
                    //         // Fix duplicate spaces that get inserted
                    //         .replace(/(?<!^)  /gm, ' ');
                    // }
                }
            }
            catch (e) {
                // Ignore
            }
        }

        if (!data) {
            return;
        }

        this.replace(this.selectionMgr.selectionStart, this.selectionMgr.selectionEnd, data);
        this.adjustCursorPosition();
    }

    onCopy(evt) {
        if (evt.clipboardData) {
            evt.clipboardData.setData('text/plain', this.selectionMgr.getSelectedText());
            evt.preventDefault();
        }
    }

    onCut(evt) {
        if (evt.clipboardData) {
            evt.clipboardData.setData('text/plain', this.selectionMgr.getSelectedText());
            evt.preventDefault();
            this.replace(this.selectionMgr.selectionStart, this.selectionMgr.selectionEnd, '');
        } else {
            this.undoMgr.setCurrentMode('single');
        }
        this.adjustCursorPosition();
    }
}
