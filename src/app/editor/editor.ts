import DiffMatchPatch from 'diff-match-patch';
import markdownItPandocRenderer from 'markdown-it-pandoc-renderer';
import htmlSanitizer from './libs/htmlSanitizer';
import markdownConversionSvc from './markdownConversionSvc';
import sectionUtils from './editor/sectionUtils';
import extensionSvc from './extensionSvc';
import Prism from './prism';
import { VanillaMirror } from './editor/vanilla-mirror';
import { EventEmittingClass, findContainer } from './editor/utils';
import { makePatchableText } from './diffUtils';
import utils from './utils';
import { StackEditorComponent } from './editor.component';



const allowDebounce = (action, wait) => {
    let timeoutId;
    return (doDebounce = false, ...params) => {
        clearTimeout(timeoutId);
        if (doDebounce) {
            timeoutId = setTimeout(() => action(...params), wait);
        } else {
            action(...params);
        }
    };
};


class SectionDesc {
    public editorElt;
    constructor(public section, public previewElt, public tocElt, public html) {
        this.editorElt = section.elt;
    }
}

// Use a vue instance as an event bus
export class Editor extends EventEmittingClass {

    public clEditor: VanillaMirror;

    diffMatchPatch = new DiffMatchPatch();
    instantPreview = true;
    tokens;

    markerKeys;
    markerIdxMap;
    previousPatchableText;
    currentPatchableText;
    isChangePatch;
    contentId;

    // Other object;
    options: any;
    parsingCtx: any;
    conversionCtx: any;
    previewCtx =  {
        sectionDescList: []
    };
    previewCtxMeasured: any;
    previewCtxWithDiffs: any;
    sectionList: any;
    selectionRange: any;
    previewSelectionRange: any;
    previewSelectionStartOffset: any;
    editorIsActive = false;

    converter = markdownConversionSvc.createConverter({
        "emoji": true,
        "emojiShortcuts": false,
        "abc": true,
        "math": true,
        "abbr": true,
        "breaks": true,
        "deflist": true,
        "del": true,
        "fence": true,
        "footnote": true,
        "imgsize": true,
        "linkify": true,
        "mark": true,
        "sub": true,
        "sup": true,
        "table": true,
        "tasklist": true,
        "typographer": true,
        "mermaid": true,
    });

    /**
     * Pass the elements to the store and initialize the editor.
     */
    constructor(
        private ngEditor: StackEditorComponent,
        private editorElt: HTMLElement,
        private previewElt: HTMLElement,
        private tocElt: HTMLElement
    ) {
        super();

        this.createClEditor(editorElt);

        this.clEditor.on('contentChanged', (content, diffs, sectionList) => {
            this.parsingCtx = {
                ...this.parsingCtx,
                sectionList,
            };
        });

        // Manually handle scroll events
        const onScroll = (e) => {
            e.preventDefault();
            this.restoreScrollPosition(this.getScrollPosition(this.editorIsActive ? editorElt : previewElt));
        };

        editorElt.parentNode.addEventListener('scroll', onScroll);
        previewElt.parentNode.addEventListener('scroll', onScroll);

        const refreshPreview = allowDebounce(() => {
            this.convert();
            if (this.instantPreview) {
                this.refreshPreview();
                this.measureSectionDimensions(false, true);
            }
            else {
                setTimeout(() => this.refreshPreview(), 10);
            }
            this.instantPreview = false;
        }, 25);

        let newSectionList;
        let newSelectionRange;
        const onEditorChanged = allowDebounce(() => {
            if (this.sectionList !== newSectionList) {
                this.sectionList = newSectionList;
                this.$trigger('sectionList', this.sectionList);
                refreshPreview(!this.instantPreview);
            }
            if (this.selectionRange !== newSelectionRange) {
                this.selectionRange = newSelectionRange;
                this.$trigger('selectionRange', this.selectionRange);
            }
        }, 10);

        this.clEditor.selectionMgr.on('selectionChanged', (start, end, selectionRange) => {
            newSelectionRange = selectionRange;
            onEditorChanged(!this.instantPreview);
        });

        this.clEditor.on('contentChanged', (content, diffs, sectionList) => {
            newSectionList = sectionList;
            onEditorChanged(!this.instantPreview);
        });

        this.clEditor.highlighter.on('sectionHighlighted', (section) => this.onEditorRenderSection(section));

        this.measureSectionDimensions(false, true, true);
        this.initClEditor();

        this.clEditor.toggleEditable(true);
        this.$trigger('inited');
    }


    onEditorRenderSection(section) {
        // Render images inline in the editor.
        [...section.elt.getElementsByClassName('token img')].forEach((imgTokenElt) => {
            const srcElt = imgTokenElt.querySelector('.token.cl-src');
            if (!srcElt) return;

            // Create an img element before the .img.token and wrap both elements
            // into a .token.img-wrapper
            const imgElt = document.createElement('img');
            imgElt.style.display = 'none';
            const uri = srcElt.textContent;
            if (true || !/^unsafe/.test(htmlSanitizer.sanitizeUri(uri, true))) {
                imgElt.onload = () => {
                    imgElt.style.display = '';
                };
                imgElt.src = uri;
                // Take img size into account
                const sizeElt = imgTokenElt.querySelector('.token.cl-size');
                if (sizeElt) {
                    const match = sizeElt.textContent.match(/=(\d*)x(\d*)/);
                    if (match[1]) {
                        imgElt.width = parseInt(match[1], 10);
                    }
                    if (match[2]) {
                        imgElt.height = parseInt(match[2], 10);
                    }
                }
            }

            const imgTokenWrapper = document.createElement('span');
            imgTokenWrapper.className = 'token img-wrapper';
            imgTokenElt.parentNode.insertBefore(imgTokenWrapper, imgTokenElt);
            imgTokenWrapper.appendChild(imgElt);
            imgTokenWrapper.appendChild(imgTokenElt);
        });

        section.elt.querySelectorAll('.injection-fence').forEach((fenceElement: HTMLElement) => {
            const insertWrapper = document.createElement('div');
            insertWrapper.className = 'token injection-portal';
            insertWrapper.setAttribute("source", '');

            // fenceElement.setAttribute('source', fenceElement.textContent);
            const insertion = fenceElement.textContent.replace(/^```<injected>\n?|<\/injected>\s*```$/g, '');

            insertWrapper.innerHTML = insertion;//htmlSanitizer.sanitizeHtml(insertion);
            fenceElement.insertAdjacentElement('beforebegin', insertWrapper);
            // insertWrapper.appendChild(fenceElement);
        });

        section.elt.querySelectorAll('.image-spinner').forEach((fenceElement: HTMLElement) => {
            const insertWrapper = document.createElement('div');
            insertWrapper.className = 'img-spinner';
            insertWrapper.innerHTML = `<div class="spinnerMax"><div class="spinnerMid"><div class="spinnerMin"><span>\`\`\`img-spinner\`\`\`</span></div></div></div>`;

            fenceElement.insertAdjacentElement('beforebegin', insertWrapper);
            fenceElement.remove();
        });
    }

    makePatches() {
        const diffs = this.diffMatchPatch.diff_main(this.previousPatchableText, this.currentPatchableText);
        return this.diffMatchPatch.patch_make(this.previousPatchableText, diffs);
    }

    applyPatches(patches) {
        const newPatchableText = this.diffMatchPatch.patch_apply(patches, this.currentPatchableText)[0];
        let result = newPatchableText;
        // if (markerKeys.length) {
        //     // Strip text markers
        //     result = result.replace(new RegExp(`[\ue000-${String.fromCharCode((0xe000 + markerKeys.length) - 1)}]`, 'g'), '');
        // }
        // Expect a `contentChanged` event
        if (result !== this.clEditor.getContent()) {
            this.previousPatchableText = this.currentPatchableText;
            this.currentPatchableText = newPatchableText;
            this.isChangePatch = true;
        }
        return result;
    }

    reversePatches(patches) {
        const result = this.diffMatchPatch.patch_deepCopy(patches).reverse();
        result.forEach((patch) => {
            patch.diffs.forEach((diff) => {
                diff[0] = -diff[0];
            });
        });
        return result;
    }

    createClEditor(editorElt) {
        this.clEditor = new VanillaMirror(this.ngEditor, editorElt, editorElt.parentNode);
        this.clEditor.on('contentChanged', (text) => {
            const oldContent = {
                comments: {},
                discussions: {},
                hash: 0,
                id: null,
                properties: "\n",
                text: "\n",
                type: "content"
            };//store.getters['content/current'];

            const newContent = {
                ...utils.deepCopy(oldContent),
                text: utils.sanitizeText(text),
            };
            if (!this.isChangePatch) {
                this.previousPatchableText = this.currentPatchableText;
                this.currentPatchableText = makePatchableText(newContent, this.markerKeys, this.markerIdxMap);
            } else {
                // Take a chance to restore discussion offsets on undo/redo
                newContent.text = this.currentPatchableText;
            }
            // TODO:
            // store.dispatch('content/patchCurrent', newContent);
            this.isChangePatch = false;
        });
        // TODO:
        // clEditor.on('focus', () => store.commit('discussion/setNewCommentFocus', false));

    }

    initClEditorInternal(opts) {
        const content = {
            comments: {},
            discussions: {},
            hash: 0,
            id: null,
            properties: "\n",
            text: "\n",
            type: "content"
        };//store.getters['content/current'];

        if (content) {
            const contentState = {
                hash: 0,
                id: null,
                scrollPosition: null,
                selectionEnd: 0,
                selectionStart: 0,
                type: "contentState"
            };//store.getters['contentState/current'];
            const options = Object.assign({
                selectionStart: contentState.selectionStart,
                selectionEnd: contentState.selectionEnd,
                patchHandler: {
                    makePatches: this.makePatches.bind(this),
                    applyPatches: this.applyPatches.bind(this),
                    reversePatches: this.reversePatches.bind(this),
                },
            }, opts);

            if (this.contentId !== content.id) {
                this.contentId = content.id;
                this.currentPatchableText = makePatchableText(content, this.markerKeys, this.markerIdxMap);
                this.previousPatchableText = this.currentPatchableText;
                options.content = content.text;
            }

            this.clEditor.init(options);
        }
    }

    /**
     * Get an object describing the position of the scroll bar in the file.
     */
    getScrollPosition(elt) {

        const dimensionKey = elt === this.editorElt
            ? 'editorDimension'
            : 'previewDimension';

        const { scrollTop } = elt.parentNode;

        let result;

        this.previewCtxMeasured?.sectionDescList.some((sectionDesc, sectionIdx) => {
            if (scrollTop >= sectionDesc[dimensionKey].endOffset) {
                return false;
            }
            const posInSection = (scrollTop - sectionDesc[dimensionKey].startOffset) /
                (sectionDesc[dimensionKey].height || 1);
            result = {
                sectionIdx,
                posInSection,
            };
            return true;
        });

        return result;
    }

    /**
     * Restore the scroll position from the current file content state.
     */
    restoreScrollPosition(scrollPosition?) {

        if (!scrollPosition || !this.previewCtxMeasured)
            return;

        const sectionDesc = this.previewCtxMeasured.sectionDescList[scrollPosition.sectionIdx];
        if (sectionDesc) {
            const editorScrollTop = sectionDesc.editorDimension.startOffset +
                (sectionDesc.editorDimension.height * scrollPosition.posInSection);

            (this.editorElt.parentNode as HTMLElement).scrollTop = Math.floor(editorScrollTop);

            const previewScrollTop = sectionDesc.previewDimension.startOffset +
                (sectionDesc.previewDimension.height * scrollPosition.posInSection);

            (this.previewElt.parentNode as HTMLElement).scrollTop = Math.floor(previewScrollTop);
        }
    }

    /**
     * Get the offset in the preview corresponding to the offset of the markdown in the editor
     * @unused
     */
    getPreviewOffset(
        editorOffset,
        sectionDescList = (this.previewCtxWithDiffs || {} as any).sectionDescList,
    ) {
        if (!sectionDescList) {
            return null;
        }
        let offset = editorOffset;
        let previewOffset = 0;
        sectionDescList.some((sectionDesc) => {
            if (!sectionDesc.textToPreviewDiffs) {
                previewOffset = null;
                return true;
            }
            if (sectionDesc.section.text.length >= offset) {
                previewOffset += this.diffMatchPatch.diff_xIndex(sectionDesc.textToPreviewDiffs, offset);
                return true;
            }
            offset -= sectionDesc.section.text.length;
            previewOffset += sectionDesc.previewText.length;
            return false;
        });
        return previewOffset;
    }

    /**
     * Get the offset of the markdown in the editor corresponding to the offset in the preview
     * @unused
     */
    getEditorOffset(
        previewOffset,
        sectionDescList = (this.previewCtxWithDiffs || {}).sectionDescList,
    ) {
        if (!sectionDescList) {
            return null;
        }
        let offset = previewOffset;
        let editorOffset = 0;
        sectionDescList.some((sectionDesc) => {
            if (!sectionDesc.textToPreviewDiffs) {
                editorOffset = null;
                return true;
            }
            if (sectionDesc.previewText.length >= offset) {
                const previewToTextDiffs = sectionDesc.textToPreviewDiffs
                    .map(diff => [-diff[0], diff[1]]);
                editorOffset += this.diffMatchPatch.diff_xIndex(previewToTextDiffs, offset);
                return true;
            }
            offset -= sectionDesc.previewText.length;
            editorOffset += sectionDesc.section.text.length;
            return false;
        });
        return editorOffset;
    }

    /**
     * Get the coordinates of an offset in the preview
     * @unused
     */
    getPreviewOffsetCoordinates(offset) {
        const start = findContainer(this.previewElt, offset && offset - 1);
        const end = findContainer(this.previewElt, offset || offset + 1);
        const range = document.createRange();
        range.setStart(start.container, start.offsetInContainer);
        range.setEnd(end.container, end.offsetInContainer);
        const rect = range.getBoundingClientRect();
        const contentRect = this.previewElt.getBoundingClientRect();
        return {
            top: Math.round((rect.top - contentRect.top) + this.previewElt.scrollTop),
            height: Math.round(rect.height),
            left: Math.round((rect.right - contentRect.left) + this.previewElt.scrollLeft),
        };
    }

    /**
     * Scroll the preview (or the editor if preview is hidden) to the specified anchor
     * @unused
     */
    scrollToAnchor(anchor) {
        let scrollTop = 0;
        const scrollerElt = this.previewElt.parentNode as HTMLElement;
        const elt = document.getElementById(anchor);
        if (elt) {
            scrollTop = elt.offsetTop;
        }
        const maxScrollTop = scrollerElt.scrollHeight - scrollerElt.offsetHeight;
        if (scrollTop < 0) {
            scrollTop = 0;
        } else if (scrollTop > maxScrollTop) {
            scrollTop = maxScrollTop;
        }
    }


    /**
     * Initialize the cledit editor with markdown-it section parser and Prism highlighter
     */
    initClEditor() {
        this.previewCtxMeasured = null;
        this.$trigger('previewCtxMeasured', null);
        this.previewCtxWithDiffs = null;
        this.$trigger('previewCtxWithDiffs', null);

        // This is the CL Editor for the text input
        const options = {
            sectionHighlighter: section => {

                // TODO: Allow pasting code blocks with native rendering
                // Render pasted code fence
                // if (section.text.match(/\`\`\`<injected>/)) {
                //     const text = section.text.replace(/\`\`\`<injected>/, '')
                //         .replace('\`\`\`', '');
                //     const source = text.replace(/[\r\n]/gm, '\\n').replace(/"/gm, '\\"');
                //     const d = document.createElement('div');
                //     d.innerHTML = text;
                //     d.classList.add("injected");
                //     d.setAttribute("data-source", source);
                //     return d.outerHTML;
                // }

                // const lang = section.text.match(/\`\`\`(?<lang>[a-z]+)\n/i)?.groups?.lang;

                const res = Prism.highlight(section.text, Prism.languages.markdown, 'markdown');
                return `<div class="prism language-markdown">${res}</div>`;

            },
            sectionParser: (text) => {
                this.parsingCtx = markdownConversionSvc.parseSections(this.converter, text);
                return this.parsingCtx.sections;
            }
        };
        this.initClEditorInternal(options);
        this.restoreScrollPosition();
    }

    /**
     * Finish the conversion initiated by the section parser
     */
    convert() {
        this.conversionCtx = markdownConversionSvc.convert(this.parsingCtx, this.conversionCtx);
        this.$trigger('conversionCtx', this.conversionCtx);
        this.tokens = this.parsingCtx.markdownState?.tokens;
    }

    /**
     * Refresh the preview with the result of `convert()`
     */
    async refreshPreview() {
        const sectionDescList = [];
        let sectionPreviewElt;
        let sectionTocElt;
        let sectionIdx = 0;
        let sectionDescIdx = 0;
        let insertBeforePreviewElt = this.previewElt.firstChild;
        let insertBeforeTocElt = this.tocElt.firstChild;
        let previewHtml = '';
        let loadingImages = [];

        this.conversionCtx.htmlSectionDiff.forEach((item) => {
            for (let i = 0; i < item[1].length; i += 1) {
                const section = this.conversionCtx.sectionList[sectionIdx];
                if (item[0] === 0) {
                    let sectionDesc = this.previewCtx.sectionDescList[sectionDescIdx] as any;
                    sectionDescIdx += 1;
                    if (sectionDesc.editorElt !== section.elt) {
                        // Force textToPreviewDiffs computation
                        sectionDesc = new SectionDesc(
                            section,
                            sectionDesc.previewElt,
                            sectionDesc.tocElt,
                            sectionDesc.html,
                        );
                    }
                    sectionDescList.push(sectionDesc);
                    previewHtml += sectionDesc.html;
                    sectionIdx += 1;
                    insertBeforePreviewElt = insertBeforePreviewElt.nextSibling;
                    insertBeforeTocElt = insertBeforeTocElt.nextSibling;
                }
                else if (item[0] === -1) {
                    sectionDescIdx += 1;
                    sectionPreviewElt = insertBeforePreviewElt;
                    insertBeforePreviewElt = insertBeforePreviewElt.nextSibling;
                    this.previewElt.removeChild(sectionPreviewElt);
                    sectionTocElt = insertBeforeTocElt;
                    insertBeforeTocElt = insertBeforeTocElt.nextSibling;
                    this.tocElt.removeChild(sectionTocElt);
                }
                else if (item[0] === 1) {
                    const html = htmlSanitizer.sanitizeHtml(this.conversionCtx.htmlSectionList[sectionIdx]);
                    sectionIdx += 1;

                    // Create preview section element
                    sectionPreviewElt = document.createElement('div');
                    sectionPreviewElt.className = 'cl-preview-section';
                    sectionPreviewElt.innerHTML = html;
                    if (insertBeforePreviewElt) {
                        this.previewElt.insertBefore(sectionPreviewElt, insertBeforePreviewElt);
                    }
                    else {
                        this.previewElt.appendChild(sectionPreviewElt);
                    }

                    // Go through all extensions and render their HTML for the section
                    extensionSvc.sectionPreview(sectionPreviewElt, this.options, true);

                    // Make some anchors external links
                    [...sectionPreviewElt.querySelectorAll('a')].forEach(el => {
                        const url = el.getAttribute('href');

                        // Make external links open in a new tab.
                        if (/^((https?|ftps?|ssh|wss?):\/\/|mailto:)/.test(url))
                            el.setAttribute("target", '_blank');
                    });

                    loadingImages = [
                        ...loadingImages,
                        ...Array.prototype.slice.call(sectionPreviewElt.getElementsByTagName('img')),
                    ];

                    // Create TOC section element
                    sectionTocElt = document.createElement('div');
                    sectionTocElt.className = 'cl-toc-section';
                    const headingElt = sectionPreviewElt.querySelector('h1, h2, h3, h4, h5, h6');
                    if (headingElt) {
                        const clonedElt = headingElt.cloneNode(true);
                        clonedElt.removeAttribute('id');
                        sectionTocElt.appendChild(clonedElt);
                    }
                    if (insertBeforeTocElt) {
                        this.tocElt.insertBefore(sectionTocElt, insertBeforeTocElt);
                    }
                    else {
                        this.tocElt.appendChild(sectionTocElt);
                    }

                    previewHtml += html;
                    sectionDescList.push(new SectionDesc(section, sectionPreviewElt, sectionTocElt, html));
                }
            }
        });

        this.tocElt.classList[
            this.tocElt.querySelector('.cl-toc-section *') ? 'remove' : 'add'
        ]('toc-tab--empty');

        this.previewCtx = {
            markdown: this.conversionCtx.text,
            html: previewHtml.replace(/^\s+|\s+$/g, ''),
            text: this.previewElt.textContent,
            sectionDescList: sectionDescList as any,
        } as any;

        this.$trigger('previewCtx', this.previewCtx);
        this.makeTextToPreviewDiffs();

        // Wait for images to load
        const loadedPromises = loadingImages.map(imgElt => new Promise<void>((resolve) => {
            if (!imgElt.src) {
                resolve();
                return;
            }
            const img = new Image();
            img.onload = resolve as any;
            img.onerror = resolve as any;
            img.src = imgElt.src;
        }));
        await Promise.all(loadedPromises);

        // Debounce if sections have already been measured
        this.measureSectionDimensions(!!this.previewCtxMeasured);
    }

    /**
     * Measure the height of each section in editor, preview and toc.
     */
    measureSectionDimensions = allowDebounce((restoreScrollPosition = false, force = false) => {
        if (force || this.previewCtx !== this.previewCtxMeasured) {
            sectionUtils.measureSectionDimensions(this);
            this.previewCtxMeasured = this.previewCtx;

            if (restoreScrollPosition) {
                this.restoreScrollPosition();
            }

            this.$trigger('previewCtxMeasured', this.previewCtxMeasured);
        }
    }, 500)

    /**
     * Compute the diffs between editor's markdown and preview's html
     * asynchronously unless there is only one section to compute.
     */
    makeTextToPreviewDiffs() {
        if (this.previewCtx !== this.previewCtxWithDiffs) {
            const makeOne = () => {
                let hasOne = false;
                const hasMore = this.previewCtx.sectionDescList
                    .some((sectionDesc: any) => {
                        if (!sectionDesc.textToPreviewDiffs) {
                            if (hasOne) {
                                return true;
                            }
                            if (!sectionDesc.previewText) {
                                sectionDesc.previewText = sectionDesc.previewElt.textContent;
                            }
                            sectionDesc.textToPreviewDiffs = this.diffMatchPatch.diff_main(
                                sectionDesc.section.text,
                                sectionDesc.previewText,
                            );
                            hasOne = true;
                        }
                        return false;
                    });
                if (hasMore) {
                    setTimeout(() => makeOne(), 10);
                } else {
                    this.previewCtxWithDiffs = this.previewCtx;
                    this.$trigger('previewCtxWithDiffs', this.previewCtxWithDiffs);
                }
            };
            makeOne();
        }
    }
}
