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
        window['editor'] = this;

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
        contentElt.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Resize provokes cursor coordinate changes
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.addKeystroke(defaultKeystrokes);

        this.watcher.startWatching();
    }

    toggleEditable(isEditable) {
        this.contentElt.contentEditable = isEditable == null ? !this.contentElt.contentEditable : isEditable;
        this.contentElt.spellcheck = false;
    }

    onMouseUp(evt: MouseEvent) {
        const { selectionStart, selectionEnd } = this.selectionMgr;
        this.selectionMgr.saveSelectionState();

        // If selection is unchanged, deselect the text.
        if (
            selectionStart == this.selectionMgr.lastSelectionStart &&
            selectionEnd == this.selectionMgr.lastSelectionEnd
        ) {
            let selection = window.getSelection();

            // TODO: There may be a better way to collapse the selection.

            // All webkit browsers support this properly. (incl. Safari)
            if (typeof document.caretRangeFromPoint == "function") {
                const range = document.caretRangeFromPoint(evt.clientX, evt.clientY);
                selection.collapse(range.startContainer, range.startOffset);
            }
            // Ugly stepchild named Firefox needs this mess.
            else if (typeof document['caretPositionFromPoint'] == "function") {
                const range = document['caretPositionFromPoint'](evt.clientX, evt.clientY);
                selection.collapse(range.offsetNode, range.offset);
            }
            else {
                // In the nearly impossible scenario neither of the above exists, just collapse the selection.
                selection.collapse(selection.focusNode, selection.focusOffset);
            }

            this.selectionMgr.saveSelectionState();
        }
        this.selectionMgr.updateCursorCoordinates(true);
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

    getNodeAtIndex(index: number): Node {
        let i = 0;
        const recursivelyFindNode = (el: HTMLElement) => {
            // This element has a content override, so we'll read that instead.
            if (el.nodeType == 1 && el.getAttribute('source') != null) {
                const text = el.getAttribute('source')
                    .replace(/\\n/gm, '\n')
                    .replace(/\\"/gm, '"');
                i += text.length;
                if (i > index) {
                    return el;
                }
                return null;
            }

            // This doesn't have children, so we can simply read the textContent
            else if (el.nodeType != 1 || el.childNodes.length == 0) {
                i += el.textContent.length;
                if (i > index) {
                    return el;
                }
                return null;
            }

            // This has childNodes, and no content override
            else {
                // @ts-ignore
                const children = [...el.childNodes];
                for (let i = 0; i < children.length; i++) {
                    const el = recursivelyFindNode(children[i]);
                    if (el) return el;
                }
            }
            return null;
        };

        return recursivelyFindNode(this.contentElt);
    }

    getContent(): string {
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
    setSelection(start: number, end: number) {
        this.selectionMgr.setSelectionStartEnd(start, end == null ? start : end);
        this.selectionMgr.updateCursorCoordinates();
    }

    scrollCursorIntoView() {
        const { top, height } = this.selectionMgr.cursorCoordinates;
        const caretTop = top + height*3;

        if (caretTop > (this.$contentElt.parentElement.scrollTop + this.$contentElt.clientHeight)) {
            this.$contentElt.parentElement.scrollTo({
                top: Math.max(0, caretTop - this.$contentElt.clientHeight)
            });
        }
    }

    keydownHandler(handler) {
        return (evt) => {
            if (!['Control', 'Alt', 'Shift', 'Cmd'].includes(evt.key)) {
                handler(evt);
            }
        };
    }

    adjustCursorPosition(force?) {
        this.selectionMgr.saveSelectionState();
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

    setContent(value: string, noUndo?: boolean, maxStartOffsetOpt?: number) {
        if (value === null || value === undefined)
            value = '\n';

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

    insertTextAtCarat(text: string) {
        const { selectionStart, selectionEnd } = this.selectionMgr;

        const content = this.getContent();

        const before = content.slice(0, selectionStart);
        const selection = content.slice(selectionStart, selectionEnd);
        const after = content.slice(selectionEnd);

        const patchedText = before + text + after;

        this.setContent(patchedText);
        const afterPoint = before.length + text.length;
        this.selectionMgr.setSelectionStartEnd(afterPoint, afterPoint);
    }

    replace(selectionStart: number, selectionEnd: number, replacement: string) {
        this.undoMgr.setDefaultMode('single');
        this.replaceContent(selectionStart, selectionEnd, replacement);
        const startOffset = Math.min(selectionStart, selectionEnd);
        const endOffset = startOffset + replacement.length;
        this.selectionMgr.setSelectionStartEnd(endOffset, endOffset);
        this.selectionMgr.updateCursorCoordinates(true);
    }

    replaceAll(search: string | RegExp, replacement: string, startOffset = 0) {
        if (typeof search == 'string')
            search = new RegExp(search, 'gm');

        this.undoMgr.setDefaultMode('single');
        const text = this.getContent();
        const subtext = text.slice(startOffset);
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

        const clipboardData = evt.clipboardData;
        let data = clipboardData.getData('text/plain');

        const files = [...clipboardData.files] as File[];

        // TODO: should this be interleaved with text paste?
        if (files.length > 0) {
            this.insertTextAtCarat("```img-spinner```");
            this.ngEditor.onImageUpload.next({ data: files, ...this.selectionMgr, stackEditor: this.ngEditor });
            return;
        }

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

    /**
     * Return the line at a given character index
     * This is _not_ the line number, but the index of the char in the whole string.
     */
    getLine(charIndex: number, text = this.getContent()) {
        const lines = text.split(/[\r\n]/g);
        const number = text.slice(0, charIndex).match(/[\r\n]/g).length;
        const line = lines[number];
        const lineStart = lines.slice(0, number).map(l => l.length).reduce((a, b) => a + b, 0) + (number);
        const lineEnd = lineStart + line.length;

        return {
            lineStart,
            lineEnd,
            line
        };
    }

    /**
     * Wrap the current selection in text
     *
     */
    wrapSelection(before = '', after = '', indent?: number, insertNewline = false) {
        const { selectionStart, selectionEnd } = this.selectionMgr;
        const text = this.getContent() as string;

        const { lineStart, lineEnd, line } = selectionStart == selectionEnd ? this.getLine(selectionStart, text) : {} as any;

        const startIndex = lineStart ?? Math.min(selectionStart, selectionEnd);
        const endIndex = lineEnd ?? Math.max(selectionStart, selectionEnd);

        const selectionText = line ?? text.slice(startIndex, endIndex);
        let preString = text.slice(0, startIndex);
        let postString = text.slice(endIndex);

        // Check if this is a duplicate invocation that should remove the decoration effect
        if (preString.endsWith(before) && postString.startsWith(after)) {
            // Strip out the symbols
            preString = preString.slice(0, preString.length - before.length);
            postString = postString.slice(after.length);

            // Move the selection to what it will be after removing the text
            this.selectionMgr.selectionStart += before.length;
            this.selectionMgr.selectionEnd += before.length;

            // Clear before and after to re-use the result logic.
            before = '';
            after = '';
            indent = null;
            insertNewline = false;
        }
        else {
            this.selectionMgr.selectionStart += before.length;
            this.selectionMgr.selectionEnd += before.length;
        }

        let updatedSelection = selectionText;

        if (indent) {
            // Indent all lines in the selection
            updatedSelection = selectionText.split('\n').map(l => ''.padStart(indent, ' ') + l).join('\n');
        }

        if (insertNewline && before) {
            // Insert a newline at the start if we're in the middle of a selection.
            if (!preString.endsWith('\n'))
                before = "\n" + before;
        }

        const patchedText =
            preString +
            before +
            updatedSelection +
            after +
            postString;

        this.setContent(patchedText);
        this.selectionMgr.setSelectionStartEnd(startIndex + before.length, endIndex + after.length);
    }

    /**
     * Replace the current selection with the given text.
     */
    replaceSelection(text: string) {
        const { selectionStart, selectionEnd } = this.selectionMgr;
        let content = this.getContent() as string;

        const startIndex = Math.min(selectionStart, selectionEnd);
        const endIndex = Math.max(selectionStart, selectionEnd);

        const preString = content.slice(0, startIndex);
        const postString = content.slice(endIndex);

        const patchedText =
            preString +
            text +
            postString;

        this.setContent(patchedText);
    }
}
