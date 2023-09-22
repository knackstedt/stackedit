import { EventEmittingClass, debounce, findContainer } from './utils';
import { VanillaMirror } from './vanilla-mirror';

export class SelectionMgr extends EventEmittingClass {
    get contentElt() { return this.editor.$contentElt };
    get scrollElt() { return this.editor.$scrollElt };

    get hasFocus() { return this.contentElt === document.activeElement };

    lastSelectionStart = 0;
    lastSelectionEnd = 0;
    selectionStart = 0;
    selectionEnd = 0;
    cursorCoordinates: any = {};

    adjustScroll;
    oldSelectionRange;
    selectionEndOffset;

    constructor(private editor: VanillaMirror) {
        super();
    }

    findContainer(offset) {
        const result = findContainer(this.contentElt, offset);
        if (result.container.nodeValue === '\n') {
            const hdLfElt = result.container.parentNode;
            if (hdLfElt.className === 'hd-lf' && hdLfElt.previousSibling && hdLfElt.previousSibling.tagName === 'BR') {
                result.container = hdLfElt.parentNode;
                result.offsetInContainer = Array.prototype.indexOf.call(
                    result.container.childNodes,
                    result.offsetInContainer === 0 ? hdLfElt.previousSibling : hdLfElt,
                );
            }
        }
        return result;
    };

    createRange(start, end) {
        const range = document.createRange();
        const startContainer = typeof start === 'number'
            ? this.findContainer(start < 0 ? 0 : start)
            : start;

        let endContainer = startContainer;
        if (start !== end) {
            endContainer = typeof end === 'number'
                ? this.findContainer(end < 0 ? 0 : end)
                : end;
        }

        range.setStart(startContainer.container, startContainer.offsetInContainer);
        range.setEnd(endContainer.container, endContainer.offsetInContainer);

        return range;
    };

    debouncedUpdateCursorCoordinates = debounce(() => {
        const coordinates = this.getCoordinates(
            this.selectionEnd,
            null,
            this.selectionEndOffset,
        );

        // This is the cardinal coordinates of the selection top-left point.
        // ? why is this even here
        if (this.cursorCoordinates.top !== coordinates.top ||
            this.cursorCoordinates.height !== coordinates.height ||
            this.cursorCoordinates.left !== coordinates.left
        ) {
            this.cursorCoordinates = coordinates;
            this.$trigger('cursorCoordinatesChanged', coordinates);
        }

        if (this.adjustScroll) {
            let scrollEltHeight = this.scrollElt.clientHeight;
            if (typeof this.adjustScroll === 'number') {
                scrollEltHeight -= this.adjustScroll;
            }
            const adjustment = (scrollEltHeight / 2) * .15;
            let cursorTop = this.cursorCoordinates.top + (this.cursorCoordinates.height / 2);
            // Adjust cursorTop with contentElt position relative to scrollElt
            cursorTop += (this.contentElt.getBoundingClientRect().top - this.scrollElt.getBoundingClientRect().top)
                + this.scrollElt.scrollTop;
            const minScrollTop = cursorTop - adjustment;
            const maxScrollTop = (cursorTop + adjustment) - scrollEltHeight;

            if (this.scrollElt.scrollTop > minScrollTop) {
                this.scrollElt.scrollTop = minScrollTop;
            }
            else if (this.scrollElt.scrollTop < maxScrollTop) {
                this.scrollElt.scrollTop = maxScrollTop;
            }
        }
        this.adjustScroll = false;
    });

    updateCursorCoordinates(adjustScrollParam?) {
        this.adjustScroll = this.adjustScroll || adjustScrollParam;
        this.debouncedUpdateCursorCoordinates();
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

    setSelectionStartEnd(start, end, restoreSelection = true) {
        this.setSelection(start, end);
        if (restoreSelection && this.hasFocus) {
            return this.restoreSelection();
        }
        return null;
    }

    saveSelectionState(direction: boolean = true, selection?: Selection) {
        if (!this.hasFocus) {
            return null;
        }

        let { selectionStart } = this;
        let { selectionEnd } = this;

        if (!selection)
            selection = window.getSelection();

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

        if (direction) {
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

    getCoordinates(inputOffset, containerParam, offsetInContainerParam) {
        let container = containerParam;
        let offsetInContainer = offsetInContainerParam;

        if (!container) {
            const offset = this.findContainer(inputOffset);
            ({ container } = offset);
            ({ offsetInContainer } = offset);
        }

        let containerElt = container;
        if (!containerElt.hasChildNodes() && container.parentNode) {
            containerElt = container.parentNode;
        }

        let isInvisible = false;
        while (!containerElt.offsetHeight) {
            isInvisible = true;
            if (containerElt.previousSibling) {
                containerElt = containerElt.previousSibling;
            }
            else {
                containerElt = containerElt.parentNode;
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
            const selectedChar = this.editor.value[inputOffset];
            let startOffset = {
                container,
                offsetInContainer,
            };
            let endOffset = {
                container,
                offsetInContainer,
            };
            if (inputOffset > 0 && (selectedChar === undefined || selectedChar === '\n')) {
                left = 'right';
                if (startOffset.offsetInContainer === 0) {
                    // Need to calculate offset-1
                    // TODO: This may be a bug
                    startOffset = inputOffset - 1 as any;
                }
                else {
                    startOffset.offsetInContainer -= 1;
                }
            }
            else if (endOffset.offsetInContainer === container.textContent.length) {
                // Need to calculate offset+1
                endOffset = inputOffset + 1;
            }
            else {
                endOffset.offsetInContainer += 1;
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


