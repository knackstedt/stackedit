import { Utils } from './cleditUtils';

const styleElts = [];

// TODO: this is dumb
function createStyleSheet(document) {
    const styleElt = document.createElement('style');
    styleElt.type = 'text/css';
    styleElt.innerHTML = '.cledit-section * { display: inline; } .cledit-section .injected div {display: block}';
    document.head.appendChild(styleElt);
    styleElts.push(styleElt);
}

export function Highlighter(editor) {
    Utils.createEventHooks(this);

    if (!styleElts.find(styleElt => document.head.contains(styleElt))) {
        createStyleSheet(document);
    }

    const contentElt = editor.$contentElt;
    this.isComposing = 0;

    let sectionList = [];
    let insertBeforeSection;
    const useBr = Utils.isWebkit;
    const trailingNodeTag = 'div';
    const hiddenLfInnerHtml = '<br><span class="hd-lf" style="display: none">\n</span>';

    const lfHtml = `<span class="lf">${useBr ? hiddenLfInnerHtml : '\n'}</span>`;

    this.fixContent = (modifiedSections, removedSections, noContentFix) => {
        modifiedSections.forEach((section) => {
            section.forceHighlighting = true;
            if (!noContentFix) {
                if (useBr) {
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

    this.addTrailingNode = () => {
        this.trailingNode = document.createElement(trailingNodeTag);
        contentElt.appendChild(this.trailingNode);
    };

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

    this.parseSections = (content, isInit) => {
        if (this.isComposing && !this.cancelComposition) {
            return sectionList;
        }

        this.cancelComposition = false;
        const newSectionList = (editor.options.sectionParser
            ? editor.options.sectionParser(content)
            : [content])
            .map(sectionText => new Section(sectionText));

        let modifiedSections = [];
        let sectionsToRemove = [];
        insertBeforeSection = undefined;

        if (isInit) {
            // Render everything if isInit
            sectionsToRemove = sectionList;
            sectionList = newSectionList;
            modifiedSections = newSectionList;
        }
        else {
            // Find modified section starting from top
            let leftIndex = sectionList.length;
            sectionList.find((section, index) => {
                const newSection = newSectionList[index];
                if (index >= newSectionList.length ||
                    section.forceHighlighting ||
                    // Check text modification
                    section.text !== newSection.text ||
                    // Check that section has not been detached or moved
                    section.elt.parentNode !== contentElt ||
                    // Check also the content since nodes can be injected in sections via copy/paste
                    section.elt.textContent !== newSection.text
                ) {
                    leftIndex = index;
                    return true;
                }
                return false;
            });

            // Find modified section starting from bottom
            let rightIndex = -sectionList.length;
            sectionList.slice().reverse().find((section, index) => {
                const newSection = newSectionList[newSectionList.length - index - 1];
                if (index >= newSectionList.length ||
                    section.forceHighlighting ||
                    // Check modified
                    section.text !== newSection.text ||
                    // Check that section has not been detached or moved
                    section.elt.parentNode !== contentElt ||
                    // Check also the content since nodes can be injected in sections via copy/paste
                    section.elt.textContent !== newSection.text
                ) {
                    rightIndex = -index;
                    return true;
                }
                return false;
            });

            if (leftIndex - rightIndex > sectionList.length) {
                // Prevent overlap
                rightIndex = leftIndex - sectionList.length;
            }

            const leftSections = sectionList.slice(0, leftIndex);
            modifiedSections = newSectionList.slice(leftIndex, newSectionList.length + rightIndex);
            const rightSections = sectionList.slice(sectionList.length + rightIndex, sectionList.length);
            [insertBeforeSection] = rightSections;
            sectionsToRemove = sectionList.slice(leftIndex, sectionList.length + rightIndex);
            sectionList = leftSections.concat(modifiedSections).concat(rightSections);
        }

        const highlight = (section) => {
            const html = editor.options.sectionHighlighter(section).replace(/\n/g, lfHtml);
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
        editor.watcher.noWatch(() => {
            if (isInit) {
                contentElt.innerHTML = '';
                contentElt.appendChild(newSectionEltList);
                this.addTrailingNode();
                return;
            }

            // Remove outdated sections
            sectionsToRemove.forEach((section) => {
                // section may be already removed
                if (section.elt.parentNode === contentElt) {
                    contentElt.removeChild(section.elt);
                }
                // To detect sections that come back with built-in undo
                section.elt.section = undefined;
            });

            if (insertBeforeSection !== undefined) {
                contentElt.insertBefore(newSectionEltList, insertBeforeSection.elt);
            } else {
                contentElt.appendChild(newSectionEltList);
            }

            // Remove unauthorized nodes (text nodes outside of sections or
            // duplicated sections via copy/paste)
            let childNode = contentElt.firstChild;
            while (childNode) {
                const nextNode = childNode.nextSibling;
                if (!childNode.section) {
                    contentElt.removeChild(childNode);
                }
                childNode = nextNode;
            }
            this.addTrailingNode();
            this.$trigger('highlighted');

            if (editor.selectionMgr.hasFocus()) {
                editor.selectionMgr.restoreSelection();
                editor.selectionMgr.updateCursorCoordinates();
            }
        });

        return sectionList;
    };
}


