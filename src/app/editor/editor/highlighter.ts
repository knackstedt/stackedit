import { EventEmittingClass, isWebkit } from './utils';
import { VanillaMirror } from './vanilla-mirror';

const styleElts = [];

// TODO: this is dumb
function createStyleSheet(document) {
    const styleElt = document.createElement('style');
    styleElt.type = 'text/css';
    styleElt.innerHTML = '.cledit-section * { display: inline; } .cledit-section .injected div {display: block}';
    document.head.appendChild(styleElt);
    styleElts.push(styleElt);
}

class Section {
    text;
    data;
    elt;

    constructor(text) {
        this.text = text.text === undefined ? text : text.text;
        this.data = text.data;
    }
    setElement(elt) {
        this.elt = elt;
        elt.section = this;
    }
}

export class Highlighter extends EventEmittingClass {
    isComposing = 0;
    trailingNode: HTMLElement;
    get contentElt() { return this.editor.$contentElt };
    cancelComposition: any;

    sectionList = [];
    insertBeforeSection;
    useBr = isWebkit;

    readonly trailingNodeTag = 'div';
    readonly hiddenLfInnerHtml = '<br><span class="hd-lf" style="display: none">\n</span>';

    readonly lfHtml = `<span class="lf">${this.useBr ? this.hiddenLfInnerHtml : '\n'}</span>`;


    constructor(private editor: VanillaMirror) {
        super();

        if (!styleElts.find(styleElt => document.head.contains(styleElt))) {
            createStyleSheet(document);
        }
    }

    fixContent = (modifiedSections, removedSections, noContentFix) => {
        modifiedSections.forEach((section) => {
            section.forceHighlighting = true;
            if (!noContentFix) {
                if (this.useBr) {
                    [...section.elt.getElementsByClassName('hd-lf')]
                        .forEach(lfElt => lfElt.parentNode.removeChild(lfElt));
                    [...section.elt.getElementsByTagName('br')]
                        .forEach(brElt => brElt.parentNode.replaceChild(document.createTextNode('\n'), brElt));
                }
                if (section.elt.textContent.slice(-1) !== '\n') {
                    section.elt.appendChild(document.createTextNode('\n'));
                }
            }
        });
    };

    addTrailingNode() {
        this.trailingNode = document.createElement(this.trailingNodeTag);
        this.contentElt.appendChild(this.trailingNode);
    };

    parseSections(content, isInit = false) {
        if (this.isComposing && !this.cancelComposition) {
            return this.sectionList;
        }

        this.cancelComposition = false;
        const newSectionList = (this.editor.options.sectionParser
            ? this.editor.options.sectionParser(content)
            : [content])
            .map(sectionText => new Section(sectionText));

        let modifiedSections = [];
        let sectionsToRemove = [];
        this.insertBeforeSection = undefined;

        if (isInit) {
            // Render everything if isInit
            sectionsToRemove = this.sectionList;
            this.sectionList = newSectionList;
            modifiedSections = newSectionList;
        }
        else {
            // Find modified section starting from top
            let leftIndex = this.sectionList.length;
            this.sectionList.find((section, index) => {
                const newSection = newSectionList[index];
                if (index >= newSectionList.length ||
                    section.forceHighlighting ||
                    // Check text modification
                    section.text !== newSection.text ||
                    // Check that section has not been detached or moved
                    section.elt.parentNode !== this.contentElt ||
                    // Check also the content since nodes can be injected in sections via copy/paste
                    section.elt.textContent !== newSection.text
                ) {
                    leftIndex = index;
                    return true;
                }
                return false;
            });

            // Find modified section starting from bottom
            let rightIndex = -this.sectionList.length;
            this.sectionList.slice().reverse().find((section, index) => {
                const newSection = newSectionList[newSectionList.length - index - 1];
                if (index >= newSectionList.length ||
                    section.forceHighlighting ||
                    // Check modified
                    section.text !== newSection.text ||
                    // Check that section has not been detached or moved
                    section.elt.parentNode !== this.contentElt ||
                    // Check also the content since nodes can be injected in sections via copy/paste
                    section.elt.textContent !== newSection.text
                ) {
                    rightIndex = -index;
                    return true;
                }
                return false;
            });

            if (leftIndex - rightIndex > this.sectionList.length) {
                // Prevent overlap
                rightIndex = leftIndex - this.sectionList.length;
            }

            const leftSections = this.sectionList.slice(0, leftIndex);
            modifiedSections = newSectionList.slice(leftIndex, newSectionList.length + rightIndex);
            const rightSections = this.sectionList.slice(this.sectionList.length + rightIndex, this.sectionList.length);
            [this.insertBeforeSection] = rightSections;
            sectionsToRemove = this.sectionList.slice(leftIndex, this.sectionList.length + rightIndex);
            this.sectionList = leftSections.concat(modifiedSections).concat(rightSections);
        }

        const highlight = (section) => {
            const html = this.editor.options.sectionHighlighter(section).replace(/\n/g, this.lfHtml);
            const sectionElt = document.createElement('div');
            sectionElt.className = 'cledit-section';
            sectionElt.innerHTML = html;
            section.setElement(sectionElt);
            this.$trigger('sectionHighlighted', section);
        };

        const newSectionEltList = document.createDocumentFragment();
        modifiedSections.forEach((section) => {
            section.forceHighlighting = false;
            highlight(section);
            newSectionEltList.appendChild(section.elt);
        });
        this.editor.watcher.noWatch(() => {
            if (isInit) {
                this.contentElt.innerHTML = '';
                this.contentElt.appendChild(newSectionEltList);
                this.addTrailingNode();
                return;
            }

            // Remove outdated sections
            sectionsToRemove.forEach((section) => {
                // section may be already removed
                if (section.elt.parentNode === this.contentElt) {
                    this.contentElt.removeChild(section.elt);
                }
                // To detect sections that come back with built-in undo
                section.elt.section = undefined;
            });

            if (this.insertBeforeSection !== undefined) {
                this.contentElt.insertBefore(newSectionEltList, this.insertBeforeSection.elt);
            }
            else {
                this.contentElt.appendChild(newSectionEltList);
            }

            // Remove unauthorized nodes (text nodes outside of sections or
            // duplicated sections via copy/paste)
            let childNode = this.contentElt.firstChild;
            while (childNode) {
                const nextNode = childNode.nextSibling;
                if (!childNode['section']) {
                    this.contentElt.removeChild(childNode);
                }
                childNode = nextNode;
            }
            this.addTrailingNode();
            this.$trigger('highlighted');

            if (this.editor.selectionMgr.hasFocus) {
                this.editor.selectionMgr.restoreSelection();
                this.editor.selectionMgr.updateCursorCoordinates();
            }
        });

        return this.sectionList;
    };
}


