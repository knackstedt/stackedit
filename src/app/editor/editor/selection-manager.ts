import { EventEmittingClass, debounce, findContainer } from './utils';
import { VanillaMirror } from './vanilla-mirror';

export class SelectionMgr extends EventEmittingClass {
    get contentElt() { return this.editor.$contentElt };
    get scrollElt() { return this.editor.$contentElt.parentElement };

    get hasFocus() { return this.contentElt === document.activeElement };

    lastSelectionStart = 0;
    lastSelectionEnd = 0;
    selectionStart = 0;
    selectionEnd = 0;
    selectionIsReverse = false;

    selectionStartNode: Node;
    selectionStartOffset: number;
    selectionEndNode: Node;
    selectionEndOffset: number;

    cursorCoordinates: {
        top: number,
        height: number,
        left: number
    } = { top: 0, height: 0, left: 0 };

    adjustScroll;
    oldSelectionRange;

    constructor(private editor: VanillaMirror) {
        super();
    }

    createRange(start: number | { node, offset; }, end: number | { node, offset; }) {
        const range = document.createRange();
        const startContainer = typeof start === 'number'
            ? this.editor.getNodeAndOffsetAtIndex(start < 0 ? 0 : start)
            : start;

        let endContainer = startContainer;
        if (start !== end) {
            endContainer = typeof end === 'number'
                ? this.editor.getNodeAndOffsetAtIndex(end < 0 ? 0 : end)
                : end;
        }

        range.setStart(startContainer.node, startContainer.offset);
        range.setEnd(
            endContainer?.node ?? startContainer.node,
            endContainer?.offset ?? startContainer.offset
        );

        return range;
    };

    updateCursorCoordinates(adjustScrollParam = false) {
        this.adjustScroll = this.adjustScroll || adjustScrollParam;

        const startNodeOffset = this.editor.getNodeAndOffsetAtIndex(this.selectionStart);
        const endNodeOffset = this.selectionStart == this.selectionEnd
            ? startNodeOffset
            : this.editor.getNodeAndOffsetAtIndex(this.selectionEnd);

        const coordinates = this.getCoordinates(endNodeOffset);

        // Keep track of both the start and end offset nodes
        this.selectionStartNode = startNodeOffset.node;
        this.selectionStartOffset = startNodeOffset.offset;
        this.selectionEndNode = endNodeOffset.node;
        this.selectionEndOffset = endNodeOffset.offset;

        // This is the cardinal coordinates of the selection top-left point.
        // ? why is this even here
        if (this.cursorCoordinates.top !== coordinates.top ||
            this.cursorCoordinates.height !== coordinates.height ||
            this.cursorCoordinates.left !== coordinates.left
        ) {
            this.cursorCoordinates = coordinates;
            this.$trigger('cursorCoordinatesChanged', coordinates);
        }

        // Scroll the coords into view
        if (this.adjustScroll) {
            // let scrollEltHeight = this.scrollElt.clientHeight;
            // if (typeof this.adjustScroll === 'number') {
            //     scrollEltHeight -= this.adjustScroll;
            // }
            // const adjustment = (scrollEltHeight / 2) * .15;
            // let cursorTop = this.cursorCoordinates.top + (this.cursorCoordinates.height / 2);
            // // Adjust cursorTop with contentElt position relative to scrollElt
            // cursorTop += (this.contentElt.getBoundingClientRect().top - this.scrollElt.getBoundingClientRect().top)
            //     + this.scrollElt.scrollTop;
            // const minScrollTop = cursorTop - adjustment;
            // const maxScrollTop = (cursorTop + adjustment) - scrollEltHeight;

            // if (this.scrollElt.scrollTop > minScrollTop) {
            //     this.scrollElt.scrollTop = minScrollTop;
            // }
            // else if (this.scrollElt.scrollTop < maxScrollTop) {
            //     this.scrollElt.scrollTop = maxScrollTop;
            // }

            const { top, height } = this.cursorCoordinates;
            const caretTop = top + height;

            // console.log(caretTop, this.scrollElt)

            if (caretTop > (this.scrollElt.scrollTop + this.scrollElt.clientHeight) - 24) {
                this.scrollElt.scrollTo({
                    top: Math.max(0, (caretTop - this.scrollElt.clientHeight) + 24)
                });
            }
        }
        this.adjustScroll = false;
    };

    /**
     * Check if the selection has been changed,
     * if so, emit a `selectionChanged` event.
     */
    checkSelection(selectionRange) {
        if (!this.oldSelectionRange ||
            this.oldSelectionRange.startContainer !== selectionRange.startContainer ||
            this.oldSelectionRange.startOffset !== selectionRange.startOffset ||
            this.oldSelectionRange.endContainer !== selectionRange.endContainer ||
            this.oldSelectionRange.endOffset !== selectionRange.endOffset
        ) {
            this.oldSelectionRange = selectionRange;
            this.$trigger('selectionChanged', this.selectionStart, this.selectionEnd, selectionRange);
            return true;
        }
        return false;
    };


    restoreSelection() {
        const min = Math.min(this.selectionStart, this.selectionEnd);
        const max = Math.max(this.selectionStart, this.selectionEnd);
        const selectionRange = this.createRange(min, max);

        if (!document.contains(selectionRange.commonAncestorContainer)) {
            return null;
        }

        const selection = window.getSelection();
        selection.removeAllRanges();
        const isBackward = this.selectionStart > this.selectionEnd;

        if (isBackward && selection.extend) {
            const beginRange = selectionRange.cloneRange();
            beginRange.collapse(false);
            selection.addRange(beginRange);
            selection.extend(selectionRange.startContainer, selectionRange.startOffset);
        }
        else {
            selection.addRange(selectionRange);
        }

        this.checkSelection(selectionRange);
        return selectionRange;
    };

    setSelection(start: number = this.selectionStart, end: number = this.selectionEnd) {
        this.selectionStart = start < 0 ? 0 : start;
        this.selectionEnd = end < 0 ? 0 : end;
        this.lastSelectionStart = this.selectionStart;
        this.lastSelectionEnd = this.selectionEnd;
    }

    setSelectionStartEnd(start: number, end: number, restoreSelection = true) {
        this.setSelection(start, end);
        if (restoreSelection && this.hasFocus) {
            return this.restoreSelection();
        }
        return null;
    }

    saveSelectionState(selection: Selection = window.getSelection()) {
        if (!this.hasFocus) {
            return null;
        }

        let { selectionStart, selectionEnd } = this;

        if (selection.rangeCount <= 0) {
            return null;
        }

        const selectionRange = selection.getRangeAt(0);
        let node = selectionRange.startContainer;

        if (!(this.contentElt.compareDocumentPosition(node) & window.Node.DOCUMENT_POSITION_CONTAINED_BY)
            && this.contentElt !== node
        ) {
            return null;
        }

        let offset = selectionRange.startOffset;
        if (node.firstChild && offset > 0) {
            node = node.childNodes[offset - 1];
            offset = node.textContent.length;
        }

        let container = node;
        while (node !== this.contentElt) {
            node = node.previousSibling;
            while (node) {
                offset += node.textContent?.length ?? 0;
                node = node.previousSibling;
            }
            node = container.parentNode;
            container = node;
        }

        let selectionText = selectionRange.toString();
        // Fix end of line when only br is selected
        const brElt = selectionRange.endContainer.firstChild;
        if (brElt && brElt['tagName'] === 'BR' && selectionRange.endOffset === 1) {
            selectionText += '\n';
        }

        const isBackwardsSelection = (() => {
            if (selection.anchorNode === selection.focusNode) {
                return selection.anchorOffset > selection.focusOffset;
            }

            const anchorTree: HTMLElement[] = [];
            const focusTree: HTMLElement[] = [];
            let _focusNode: Node = selection.focusNode;
            let _anchorNode: Node = selection.anchorNode;

            // Build two node paths
            do {
                focusTree.unshift(_focusNode?.parentElement);
                _focusNode = _focusNode?.parentElement;
            }
            while (_focusNode && _focusNode != this.editor.$contentElt)

            do {
                anchorTree.unshift(_anchorNode?.parentElement);
                _anchorNode = _anchorNode?.parentElement;
            }
            while (_anchorNode && _anchorNode != this.editor.$contentElt)

            // Walk down tree A until it diverges from tree B
            // Max 128 depth.
            for (let i = 0; i < 128; i++) {

                // The trees have diverged!
                if (!focusTree[i]) {
                    const commonElement = focusTree[i - 1];
                    const nodes = [...commonElement.childNodes as any];
                    return nodes.indexOf(selection.focusNode) < nodes.indexOf(anchorTree[i]);
                }

                // The trees have diverged!
                if (!anchorTree[i]) {
                    const commonElement = anchorTree[i - 1];
                    const nodes = [...commonElement.childNodes as any];
                    return nodes.indexOf(focusTree[i]) < nodes.indexOf(selection.anchorNode);
                }

                // The trees have diverged!
                if (anchorTree[i] != focusTree[i]) {
                    const commonElement = anchorTree[i - 1];
                    const nodes = [...commonElement.childNodes as any];
                    return nodes.indexOf(focusTree[i]) < nodes.indexOf(anchorTree[i]);
                }
            }
            return false;
        })();

        if (isBackwardsSelection) {
            selectionStart = offset + selectionText.length;
            selectionEnd = offset;
        }
        else {
            selectionStart = offset;
            selectionEnd = offset + selectionText.length;
        }

        if (selectionStart >= this.editor.value.length) {
            // If cursor is after the trailingNode
            selectionEnd = this.editor.value.length;
            selectionStart = selectionEnd;
            return this.setSelectionStartEnd(selectionStart, selectionEnd);
        }
        else {
            this.setSelection(selectionStart, selectionEnd);
            const result = this.checkSelection(selectionRange);
            // selectionRange doesn't change when selection is at the start of a section
            return result || this.lastSelectionStart !== this.selectionStart;
        }
    }

    getSelectedText() {
        const min = Math.min(this.selectionStart, this.selectionEnd);
        const max = Math.max(this.selectionStart, this.selectionEnd);

        return this.editor.getContent().substring(min, max);
    };

    private getCoordinates(offset: {node, offset}) {
        const container = offset.node;
        const offsetInContainer = offset.offset;

        let containerElt: HTMLElement = container as any;
        if (!containerElt.hasChildNodes() && container.parentNode) {
            containerElt = container.parentNode as HTMLElement;
        }

        let isInvisible = false;
        while (!containerElt.offsetHeight) {
            isInvisible = true;
            if (containerElt.previousSibling) {
                containerElt = containerElt.previousSibling as HTMLElement;
            }
            else {
                containerElt = containerElt.parentNode as HTMLElement;
                if (!containerElt) {
                    return {
                        top: 0,
                        height: 0,
                        left: 0,
                    };
                }
            }
        }

        let rect;
        let left = 'left';
        if (isInvisible || container.textContent === '\n') {
            rect = containerElt.getBoundingClientRect();
        }
        else {
            const inputOffset = offset['editorOffset'];
            const selectedChar = this.editor.value[inputOffset];
            let startOffset = {
                node: container,
                offset: offsetInContainer,
            };
            let endOffset = {
                node: container,
                offset: offsetInContainer,
            };
            if (inputOffset > 0 && (selectedChar === undefined || selectedChar === '\n')) {
                left = 'right';
                if (startOffset.offset === 0) {
                    // Need to calculate offset-1
                    // TODO: This may be a bug
                    startOffset = inputOffset - 1 as any;
                }
                else {
                    startOffset.offset -= 1;
                }
            }
            else if (endOffset.offset === container.textContent.length) {
                console.log("This hasn't happened yet")
                // Need to calculate offset+1
                // endOffset = inputOffset + 1;
            }
            else {
                endOffset.offset += 1;
            }
            const range = this.createRange(startOffset, endOffset);
            rect = range.getBoundingClientRect();
        }

        const contentRect = this.contentElt.getBoundingClientRect();
        return {
            top: Math.round((rect.top - contentRect.top) + this.contentElt.scrollTop),
            height: Math.round(rect.height),
            left: Math.round((rect[left] - contentRect.left) + this.contentElt.scrollLeft),
        };
    };

    getClosestWordOffset(offset: number) {
        let offsetStart = 0;
        let offsetEnd = 0;
        let nextOffset = 0;

        this.editor.getContent().split(/\s/).find((word) => {
            if (word) {
                offsetStart = nextOffset;
                offsetEnd = nextOffset + word.length;
                if (offsetEnd > offset) {
                    return true;
                }
            }
            nextOffset += word.length + 1;
            return false;
        });

        return {
            start: offsetStart,
            end: offsetEnd,
        };
    };
}


