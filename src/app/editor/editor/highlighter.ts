import markdownConversionSvc from '../markdownConversionSvc';
import Prism from '../prism';
import { EventEmittingClass, debounce } from './utils';
import { VanillaMirror } from './vanilla-mirror';
import type * as Monaco from 'monaco-editor';

export class Section {
    text;
    data: "list" | "main" | "blockquote";
    elt: HTMLDivElement;

    // AFAIK nothing ever sets this
    forceHighlighting = false;

    monaco: Monaco.editor.IStandaloneCodeEditor;

    get ulid() {
        return this.elt.getAttribute("ulid")
    }

    constructor(text: string | any) {
        this.text = text.text === undefined ? text : text.text;
        this.data = text.data;
    }

    setElement(elt: HTMLDivElement) {
        this.elt = elt;
        elt['section'] = this;
    }
}

export class Highlighter extends EventEmittingClass {
    isComposing = 0;
    trailingNode: HTMLElement;
    get contentElt() { return this.editor.$contentElt };
    cancelComposition: any;

    sectionList: Section[] = [];
    insertBeforeSection: Section;

    readonly trailingNodeTag = 'div';
    readonly lfHtml = `<span class="lf">\n</span>`;

    constructor(private editor: VanillaMirror) {
        super();
    }

    fixContent(modifiedSections: Section[], removedSections: Section[], noContentFix: boolean) {
        modifiedSections.forEach((section) => {
            section.forceHighlighting = true;
            if (!noContentFix) {
                // if (isWebkit) {
                //     [...section.elt.getElementsByClassName('hd-lf')]
                //         .forEach(lfElt => lfElt.parentNode.removeChild(lfElt));
                //     [...section.elt.getElementsByTagName('br')]
                //         .forEach(brElt => brElt.parentNode.replaceChild(document.createTextNode('\n'), brElt));
                // }
                if (section.elt.textContent.slice(-1) !== '\n') {
                    section.elt.appendChild(document.createTextNode('\n'));
                }
            }
        });
    }

    addTrailingNode() {
        this.trailingNode = document.createElement(this.trailingNodeTag);
        this.contentElt.appendChild(this.trailingNode);
    };

    calcLineNumbers = debounce(() => {
        [...(this.editor.$contentElt?.querySelectorAll(".lf") || []) as any].forEach((e, i) => {
            e.setAttribute("data-linenumber", i+1);
        });
    }, 25)

    sectionHighlighter(section: Section) {
        const highlighted = Prism.highlight(section.text, Prism.languages.markdown, 'markdown');

        return `<div class="prism language-markdown">${highlighted}</div>`;
    }

    parseSections(content: string, isInit = false) {
        if (this.isComposing && !this.cancelComposition)
            return this.sectionList;

        this.cancelComposition = false;

        const { editorSvc } = this.editor.ngEditor;
        editorSvc.parsingCtx = markdownConversionSvc.parseSections(editorSvc.converter, content);

        const newSectionList: Section[] = editorSvc.parsingCtx.sections
            .map(sectionText => new Section(sectionText));

        let modifiedSections: Section[] = [];
        let sectionsToRemove: Section[] = [];
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
            this.insertBeforeSection = rightSections?.[0];
            sectionsToRemove = this.sectionList.slice(leftIndex, this.sectionList.length + rightIndex);
            this.sectionList = leftSections.concat(modifiedSections).concat(rightSections);
        }

        // TODO: All of the rendering logic for the editor should be unified.
        const highlight = (section: Section) => {
            const initialMarkup = this.sectionHighlighter(section) as string;
            const html = initialMarkup.replace(/\n/g, this.lfHtml);

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
            try {
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
                    section.elt['section'] = undefined;
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

                if (this.editor.ngEditor.showLineNumbers)
                    this.calcLineNumbers();
            }
            catch(err) {
                // Handle the error to prevent the watcher from failing.
                console.error(err);
            }
        });

        return this.sectionList;
    };
}


