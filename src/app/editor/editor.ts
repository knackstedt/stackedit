import DiffMatchPatch from 'diff-match-patch';
import htmlSanitizer from './libs/htmlSanitizer';
import markdownConversionSvc from './markdownConversionSvc';
import sectionUtils, { SectionDimension } from './editor/sectionUtils';
import { VanillaMirror } from './editor/vanilla-mirror';
import { EventEmittingClass, findContainer, debounce } from './editor/utils';
import { makePatchableText } from './diffUtils';
import { StackEditorComponent } from './editor.component';
import Prism from './prism';
import MarkdownIt from 'markdown-it';
import markdownGFM from './extensions/markdownExtension';
import { ulid } from 'ulidx';
import { Section } from './editor/highlighter';

const allowDebounce = (action, wait) => {
    let timeoutId;
    return (doDebounce = false, ...params) => {
        clearTimeout(timeoutId);
        if (doDebounce) {
            timeoutId = setTimeout(() => action(...params), wait);
        }
        else {
            action(...params);
        }
    };
};


export class SectionDesc {
    public editorElt: HTMLElement;

    public editorDimension: SectionDimension;
    public previewDimension: SectionDimension;
    public tocDimension: SectionDimension;

    // public ulid = ulid();

    constructor(
        public section: Section,
        public previewElt: HTMLElement,
        public tocElt: HTMLElement,
        public html
    ) {
        this.editorElt = section.elt;
        // if (previewElt)
        //     previewElt.setAttribute("ulid", this.ulid);
        // if (tocElt)
        //     tocElt.setAttribute("ulid", this.ulid);
        // if (section.elt)
        //     section.elt.setAttribute("ulid", this.ulid);
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
    parsingCtx: any;
    conversionCtx: any;
    previewCtx = {
        sectionDescList: [] as SectionDesc[]
    };
    previewCtxMeasured: any;
    previewCtxWithDiffs: any;
    sectionList: Section[];
    selectionRange: any;
    previewSelectionRange: any;
    previewSelectionStartOffset: any;
    editorIsActive = false;

    converter: MarkdownIt;

    getOptionsListeners = [];
    initConverterListeners = [];
    sectionPreviewListeners = [];

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

        // Enable standard markdown rendering support
        markdownGFM(this);

        Promise.all([
            (!ngEditor.options.disableEmoji)
                ? import('./extensions/emojiExtension').then((ext) => ext.default(this))
                : null,
            (!ngEditor.options.disableMermaid)
                ? import('./extensions/mermaidExtension').then((ext) => ext.default(this))
                : null,
        ].filter(e => !!e)).then((extensions) => {
            this.converter = markdownConversionSvc.createConverter();
            this.initConverter(this.converter, ngEditor.options.markdownIt);
            this.clEditor = new VanillaMirror(this.ngEditor, editorElt, editorElt.parentNode as any);

            this.clEditor.on('contentChanged', (text, diffs, sectionList) => {
                const oldContent = {
                    comments: {},
                    discussions: {},
                    hash: 0,
                    id: null,
                    properties: "\n",
                    text: "\n",
                    type: "content"
                };

                // last char must be a `\n`.
                // TODO: This is probably not right
                const sanitizedText = `${text}\n`.replace(/\n\n$/, '\n');
                const newContent = {
                    ...structuredClone(oldContent),
                    text: sanitizedText,
                };
                if (!this.isChangePatch) {
                    this.previousPatchableText = this.currentPatchableText;
                    this.currentPatchableText = makePatchableText(newContent, this.markerKeys, this.markerIdxMap);
                }
                else {
                    // Take a chance to restore discussion offsets on undo/redo
                    newContent.text = this.currentPatchableText;
                }
                this.isChangePatch = false;

                this.parsingCtx = {
                    ...this.parsingCtx,
                    sectionList,
                };
                newSectionList = sectionList;
                onEditorChanged(!this.instantPreview);
            });


            // Manually handle scroll events
            // const onScroll = (e) => {
            //     e.preventDefault();
            //     this.restoreScrollPosition(this.getScrollPosition(this.editorIsActive ? editorElt : previewElt));
            // };
            const onScroll = (e) => {
                e.preventDefault();
                this.restoreScrollPosition(this.getScrollPosition(this.editorIsActive ? editorElt : previewElt));
            };

            let scrollMode: "editor" | "preview";
            let lastScrollEvent = 0;
            const scrollDebounceTime = 500;
            editorElt.addEventListener('scroll', evt => {
                if (scrollMode == "editor" || lastScrollEvent + scrollDebounceTime < Date.now()) {
                    scrollMode = "editor";
                    lastScrollEvent = Date.now();
                    // console.log("A");
                    onScroll(evt);
                }
            });
            previewElt.parentNode.addEventListener('scroll', evt => {
                if (scrollMode == "preview" || lastScrollEvent + scrollDebounceTime < Date.now()) {
                    scrollMode = "preview";
                    lastScrollEvent = Date.now();
                    // console.log("B");
                    onScroll(evt);
                }
            });

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

            window.addEventListener('resize', this.refreshScrollSync);

            this.clEditor.selectionMgr.on('selectionChanged', (start, end, selectionRange) => {
                newSelectionRange = selectionRange;
                onEditorChanged(!this.instantPreview);
            });

            this.clEditor.highlighter.on('sectionHighlighted', (section) => this.onEditorRenderSection(section));

            this.measureSectionDimensions(false, true, true);
            this.initClEditor();

            this.clEditor.toggleEditable(true);
            this.$trigger('loaded');
        });
    }

    destroy() {
        this.clEditor.destroy();
        window.removeEventListener('resize', this.refreshScrollSync);
    }

    onGetOptions(listener: Function) {
        this.getOptionsListeners.push(listener);
    }

    onInitConverter(priority: number, listener: Function) {
        this.initConverterListeners[priority] = listener;
    }

    onSectionPreview(listener: Function) {
        this.sectionPreviewListeners.push(listener);
    }

    getOptions(properties, isCurrentFile?) {
        return this.getOptionsListeners.reduce((options, listener) => {
            listener(options, properties, isCurrentFile);
            return options;
        }, {});
    }

    initConverter(markdown: MarkdownIt, options: any) {
        // Use forEach as it's a sparsed array
        this.initConverterListeners.forEach((listener) => {
            listener(markdown, options);
        });
    }

    sectionPreview(elt, options, isEditor) {
        this.sectionPreviewListeners.forEach((listener) => {
            listener(elt, options, isEditor);
        });
    }

    onEditorRenderSection(section) {
        // Render images inline in the editor.
        section.elt.querySelectorAll('.token.img').forEach((imgTokenElt) => {
            const srcElt = imgTokenElt.querySelector('.img-src');
            if (!srcElt) return;

            // Create an img element before the .img.token and wrap both elements
            // into a .token.img-wrapper
            const imgElt = document.createElement('img');
            imgElt.style.display = 'none';
            const uri = srcElt.textContent;
            if (true || !/^unsafe/.test(htmlSanitizer.sanitizeUri(uri, true))) {
                imgElt.onload = () => {
                    imgElt.style.display = '';

                    // TODO figure out why this delay is needed
                    // setTimeout(() => {
                        // this.measureSectionDimensions(false, true);
                        sectionUtils.measureSectionDimensions(this);
                        this.previewCtxMeasured = this.previewCtx;

                        this.restoreScrollPosition();
                    // }, 0);
                };
                imgElt.src = uri;
                // Take img size into account
                const sizeElt = imgTokenElt.querySelector('.size');
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


        // section.elt.querySelectorAll('.code-block').forEach((imgTokenElt) => {

        //     // Create an img element before the .img.token and wrap both elements
        //     // into a .token.img-wrapper
        //     const imgElt = document.createElement('div');

        //     const imgTokenWrapper = document.createElement('span');
        //     imgTokenWrapper.className = 'token img-wrapper';
        //     imgTokenElt.parentNode.insertBefore(imgTokenWrapper, imgTokenElt);
        //     imgTokenWrapper.appendChild(imgElt);
        //     imgTokenWrapper.appendChild(imgTokenElt);
        // });

        // ! Experimental
        // if (this.ngEditor.useMonacoEditor) {
        //     section.elt.querySelectorAll('.code-block').forEach((fenceElement: HTMLElement) => {
        //         console.log("bootstrap monaco ediotr")
        //         fenceElement.parentElement.classList.add("vscode-injected");
        //         const language = fenceElement.parentElement.querySelector('.code-language').textContent;

        //         const insertWrapper = document.createElement('div');
        //         insertWrapper.classList.add('injected-monaco-editor');
        //         insertWrapper.style.display = "block";
        //         insertWrapper.style.width = "100%";

        //         const getHeight = () => {

        //         }

        //         insertWrapper.style.height = "500px";
        //         const settings = {
        //             theme: "vs-dark",
        //             automaticLayout: true,
        //             colorDecorators: true,
        //             folding: true,
        //             fontSize: 16,
        //             // fontFamily: 'Dr',
        //             scrollbar: {
        //                 alwaysConsumeMouseWheel: false,
        //             },
        //             smoothScrolling: true,
        //             mouseWheelScrollSensitivity: 2,
        //             scrollBeyondLastLine: false,
        //             value: fenceElement.textContent,
        //             language: language || 'auto'
        //         };
        //         const editor = self['monaco'].editor.create(insertWrapper, settings);
        //         insertWrapper.setAttribute("source", fenceElement.textContent);
        //         insertWrapper.setAttribute("contenteditable", "false");
        //         insertWrapper['_editor'] = editor;

        //         // disable click handler so contenteditable
        //         // doesn't try to handle the click event
        //         // Disable onmouseup to prevent our own listener from changing the selection
        //         // insertWrapper.onkeyup =
        //         insertWrapper.onkeyup = (evt) => {
        //             // evt.preventDefault();
        //             evt.stopPropagation();
        //         }

        //         insertWrapper.onkeydown = (evt) => {
        //             // evt.preventDefault();
        //             evt.stopPropagation();
        //         }

        //         insertWrapper.onclick =
        //         insertWrapper.onmouseup = (evt: any) => {
        //             evt.preventDefault();
        //             evt.stopPropagation()
        //         }

        //         editor.getModel().onDidChangeContent(() => {
        //             const text = editor.getValue();
        //             const cleanedText = text.replace(/\\n/gm, '\n')
        //                                     .replace(/\\"/gm, '"');

        //             insertWrapper.setAttribute("source", cleanedText);
        //             // TODO: handle text change event passively
        //             this.clEditor.onMutationObserved([]);
        //         });

        //         fenceElement.insertAdjacentElement('beforebegin', insertWrapper);
        //         fenceElement.remove();
        //     });
        // }
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

    initClEditorInternal(opts) {
        const content = {
            comments: {},
            discussions: {},
            hash: 0,
            id: null,
            properties: "\n",
            text: "\n",
            type: "content"
        };

        if (content) {
            const contentState = {
                hash: 0,
                id: null,
                scrollPosition: null,
                selectionEnd: 0,
                selectionStart: 0,
                type: "contentState"
            };

            const options = {
                selectionStart: contentState.selectionStart,
                selectionEnd: contentState.selectionEnd,
                patchHandler: {
                    makePatches: this.makePatches.bind(this),
                    applyPatches: this.applyPatches.bind(this),
                    reversePatches: this.reversePatches.bind(this),
                },
                ...opts
            };

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

        const { scrollTop } = dimensionKey == "editorDimension" ? elt : elt.parentNode;

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

            (this.editorElt as HTMLElement).scrollTop = Math.floor(editorScrollTop);

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
     *
     * ! Was used by discussions
     */
    getPreviewOffsetCoordinates(offset?: number) {
        // TODO:
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
            sectionHighlighter: (section) => {
                const highlighted = Prism.highlight(section.text, Prism.languages.markdown, 'markdown');

                return `<div class="prism language-markdown">${highlighted}</div>`;

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
        const sectionDescList: SectionDesc[] = [];
        let sectionPreviewElt;
        let sectionTocElt;
        let sectionIdx = 0;
        let sectionDescIdx = 0;
        let insertBeforePreviewElt = this.previewElt.firstChild;
        let insertBeforeTocElt = this.tocElt.firstChild;
        let previewHtml = '';
        let loadingImages = [];

        this.conversionCtx.htmlSectionDiff.forEach((item) => {
            for (let i = 0; i < item[1]?.length; i++) {
                const section = this.conversionCtx.sectionList[sectionIdx];

                if (item[0] === 0) {
                    let sectionDesc = this.previewCtx.sectionDescList[sectionDescIdx] as SectionDesc;
                    sectionDescIdx++;
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
                    sectionIdx++;
                    insertBeforePreviewElt = insertBeforePreviewElt.nextSibling;
                    insertBeforeTocElt = insertBeforeTocElt.nextSibling;
                }
                else if (item[0] === -1) {
                    sectionDescIdx++;
                    sectionPreviewElt = insertBeforePreviewElt;
                    insertBeforePreviewElt = insertBeforePreviewElt.nextSibling;
                    this.previewElt.removeChild(sectionPreviewElt);
                    sectionTocElt = insertBeforeTocElt;
                    insertBeforeTocElt = insertBeforeTocElt.nextSibling;
                    this.tocElt.removeChild(sectionTocElt);
                }
                else if (item[0] === 1) {
                    const html = htmlSanitizer.sanitizeHtml(this.conversionCtx.htmlSectionList[sectionIdx]);
                    sectionIdx++;

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
                    this.sectionPreview(sectionPreviewElt, this.ngEditor.options.markdownIt, true);

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

            // Mark the item as having been rastered
            // to prevent duplicate sections from being added
            item[0] = 0;
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
     * Refresh the stored heights of the preview
     * and editor elements
     */
    refreshScrollSync: () => void = (() => {
        this.refreshPreview();
        // this.measureSectionDimensions(false, true);

        // Trigger a scroll event
        this.editorElt.scrollBy(0, 0);
    }).bind(this)

    /**
     * Measure the height of each section in editor, preview and toc.
     */
    measureSectionDimensions = allowDebounce((restoreScrollPosition = false, force = false) => {
        if (!force && this.previewCtx === this.previewCtxMeasured)
            return;

        sectionUtils.measureSectionDimensions(this);
        this.previewCtxMeasured = this.previewCtx;

        if (restoreScrollPosition) {
            this.restoreScrollPosition();
        }

        this.$trigger('previewCtxMeasured', this.previewCtxMeasured);
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
                    setTimeout(() => makeOne(), 5);
                }
                else {
                    this.previewCtxWithDiffs = this.previewCtx;
                    this.$trigger('previewCtxWithDiffs', this.previewCtxWithDiffs);
                }
            };
            makeOne();
        }
    }
}
