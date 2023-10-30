import DiffMatchPatch from 'diff-match-patch';
import MarkdownIt from 'markdown-it';
import { ulid } from 'ulidx';
import dompurify from 'dompurify';
import type * as Monaco from 'monaco-editor';

import Prism from './prism';
import markdownConversionSvc from './markdownConversionSvc';
import sectionUtils, { SectionDimension } from './editor/sectionUtils';
import { VanillaMirror } from './editor/vanilla-mirror';
import { EventEmittingClass, findContainer, debounce } from './editor/utils';
import { StackEditorComponent } from './editor.component';
import markdownGFM from './extensions/markdownExtension';
import { Section } from './editor/highlighter';
import { MonacoAliasMap, invokableLanguages, waitForMonacoInstall } from './monaco';
import { RenderMermaid } from './extensions/mermaidExtension';

declare const monaco: typeof Monaco;

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

    public previewText: string;
    public textToPreviewDiffs: [0 | 1 | -1, string][];

    public ulid = ulid();

    constructor(
        public section: Section,
        public previewElt: HTMLElement,
        public tocElt: HTMLElement,
        public html: string
    ) {
        this.editorElt = section.elt;

        previewElt?.setAttribute("ulid", this.ulid);
        tocElt?.setAttribute("ulid", this.ulid);
        section?.elt?.setAttribute("ulid", this.ulid);
    }
}

// Use a vue instance as an event bus
export class Editor extends EventEmittingClass {

    public clEditor: VanillaMirror;

    diffMatchPatch = new DiffMatchPatch();
    instantPreview = true;
    tokens;

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

    converter: MarkdownIt;

    getOptionsListeners = [];
    initConverterListeners = [];
    sectionPreviewListeners = [];

    imageElementCache: { [key: string]: HTMLElement } = {};

    overlay1: HTMLElement;
    overlay2: HTMLElement;
    underlay: HTMLElement;

    focus: "editorContentEditable" | "monaco";

    /**
     * Pass the elements to the store and initialize the editor.
     */
    constructor(
        private ngEditor: StackEditorComponent,
        public editorElt: HTMLElement,
        public previewElt: HTMLElement,
        public tocElt: HTMLElement
    ) {
        super();

        this.overlay1 = editorElt.querySelector(".editor-overlay-1");
        this.overlay2 = editorElt.querySelector(".editor-overlay-2");
        this.underlay = editorElt.querySelector(".editor-underlay");

        // Enable standard markdown rendering support
        markdownGFM(this);

        waitForMonacoInstall().then(() => {
        })

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
            this.clEditor = new VanillaMirror(
                this.ngEditor,
                editorElt.querySelector('.editor-inner'),
                this.ngEditor.value
                );

            let scrollMode: "editor" | "preview";
            let lastScrollEvent = 0;
            const scrollDebounceTime = 500;

            // Manually handle scroll events
            const onScroll = (e) => {
                e.preventDefault();
                this.restoreScrollPosition(
                    this.getScrollPosition(scrollMode == 'editor' ? editorElt : previewElt)
                );
            };

            editorElt.addEventListener('scroll', evt => {
                if (scrollMode == "editor" || lastScrollEvent + scrollDebounceTime < Date.now()) {
                    scrollMode = "editor";
                    lastScrollEvent = Date.now();
                    onScroll(evt);
                }
            });
            previewElt.parentNode.addEventListener('scroll', evt => {
                if (scrollMode == "preview" || lastScrollEvent + scrollDebounceTime < Date.now()) {
                    scrollMode = "preview";
                    lastScrollEvent = Date.now();
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
            this.clEditor.on('contentChanged', (text, diffs, sectionList) => {
                this.parsingCtx.sectionList = sectionList;
                newSectionList = sectionList;
                onEditorChanged(!this.instantPreview);
            });

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
            // Need to listen to focus because resize events that occur
            // when the tab isn't focused may not always fire.
            window.addEventListener('focus', this.refreshScrollSync);

            this.clEditor.selectionMgr.on('selectionChanged', (start, end, selectionRange) => {
                newSelectionRange = selectionRange;
                onEditorChanged(!this.instantPreview);
            });

            this.clEditor.highlighter.on('sectionHighlighted', (section) =>
                this.onEditorRenderSection(section));

            this.measureSectionDimensions(false, true, true);
            this.initClEditor();

            this.clEditor.toggleEditable(true);
            this.$trigger('loaded');
        });
    }

    destroy() {
        this.clEditor.destroy();
        window.removeEventListener('resize', this.refreshScrollSync);
        window.removeEventListener('focus', this.refreshScrollSync);
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

    onEditorRenderSection(s: Section) {
        const section = s;

        // Render images inline in the editor.
        section.elt.querySelectorAll('.token.img').forEach((imgTokenElt) => {
            const srcElt = imgTokenElt.querySelector('.img-src');
            if (!srcElt) return;
            // TODO: sanitize URIs?
            // Also add support for URI whitelists.

            // Create an img element before the .img.token and wrap both elements
            // into a .token.img-wrapper
            const imgElt = document.createElement('img');
            imgElt.style.display = 'none';
            const uri = srcElt.textContent;

            imgElt.onload = () => {
                imgElt.style.display = '';

                sectionUtils.measureSectionDimensions(this);
                this.previewCtxMeasured = this.previewCtx;
                this.sectionList?.forEach(s => s.monaco?.['_resize']());
                this.restoreScrollPosition();

                const width = imgElt.offsetWidth;
                const height = imgElt.offsetHeight;

                if (height > 30) {
                    imgElt.parentElement.classList.add("img-block")
                }

                const rsObserver = new ResizeObserver(() => {
                    this.restoreScrollPosition();
                });
                rsObserver.observe(imgElt, { box: 'border-box' });
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

            this.imageElementCache[uri] = imgElt;

            const imgTokenWrapper = document.createElement('span');
            imgTokenWrapper.className = 'token img-wrapper';
            imgTokenElt.parentNode.insertBefore(imgTokenWrapper, imgTokenElt);
            imgTokenWrapper.appendChild(imgElt);
            imgTokenWrapper.appendChild(imgTokenElt);
        });

        let imgCache = {};
        this.clEditor.highlighter.on('highlighted', () => {
            Object.entries(this.imageElementCache).forEach(([key, imgElt]) => {

                const cachedImgElt = imgCache[key];
                if (cachedImgElt) {
                    // Found a previously loaded image that has just been released
                    imgElt.parentNode.replaceChild(cachedImgElt, imgElt);
                }
                else {
                    imgCache[key] = imgElt;
                }
            });
            this.imageElementCache = {};
        });

        section.elt.querySelectorAll('.image-spinner').forEach((fenceElement: HTMLElement) => {
            const insertWrapper = document.createElement('div');
            insertWrapper.className = 'img-spinner';
            insertWrapper.innerHTML = `<div class="spinnerMax"><div class="spinnerMid"><div class="spinnerMin"><span>\`\`\`img-spinner\`\`\`</span></div></div></div>`;

            fenceElement.insertAdjacentElement('beforebegin', insertWrapper);
            fenceElement.remove();
        });

        // Run on next tick to allow for style updates to propagate
        setTimeout(() => {
            // return;
            section.elt.querySelectorAll('.code-block').forEach((cb: HTMLElement) => {
                const codeBlock = cb;
                section.elt.classList.add("monaco-injected");
                const ulid = section.elt.getAttribute("ulid");

                let language = codeBlock.parentElement.querySelector('.code-language').textContent || 'auto';
                // Map aliases to known monaco languages
                language = MonacoAliasMap[language] || language;

                const monacoContainer = document.createElement('div');
                monacoContainer.setAttribute("ulid", section.elt.getAttribute("ulid"));
                monacoContainer.classList.add("monaco-container");

                // console.log("lang", language)

                if (this.ngEditor.showCodeRunButton && invokableLanguages.includes(language)) {
                    const runButton = document.createElement('mat-icon');
                    runButton.classList.add("material-icons");
                    runButton.classList.add("run-button");
                    runButton.innerHTML = "play_arrow";
                    runButton.onclick = async () => {
                        let res = eval(codeBlock.textContent);
                        if (typeof res == "function")
                            res = await res();

                        // ... Do something with the result
                    }
                    monacoContainer.append(runButton);
                }

                if (this.ngEditor.showCodeCopyButton) {
                    const copyButton = document.createElement('mat-icon');
                    copyButton.classList.add("material-icons");
                    copyButton.classList.add("copy-button");
                    copyButton.innerHTML = "content_copy";
                    copyButton.onclick = () => {
                        navigator.clipboard.writeText(section.text);
                    }
                    monacoContainer.append(copyButton);
                }


                // Lookup the closest actual style definition
                const originalStyles = (() => {
                    const styleOrder = [
                        window.getComputedStyle(codeBlock),
                        window.getComputedStyle(section.elt),
                        window.getComputedStyle(this.editorElt),
                        window.getComputedStyle(document.body)
                    ];
                    const obj = {};
                    Object.keys(styleOrder[0]).forEach(key => {
                        obj[key] = styleOrder[0][key] ||
                                styleOrder[1][key] ||
                                styleOrder[2][key] ||
                                styleOrder[3][key]
                    });
                    return obj as CSSStyleDeclaration;
                })();

                const settings: Monaco.editor.IStandaloneEditorConstructionOptions = {
                    theme: "vs-dark",
                    automaticLayout: true,
                    colorDecorators: true,
                    lineHeight: 24,
                    folding: true,
                    // ! This _cannot_ be used reliably without testing on
                    // Windows, macOS, AND Linux
                    // fontFamily: 'var(--stackedit-font-family-mono)',
                    fontSize: parseInt(originalStyles?.fontSize?.replace('px', '')) || 16,
                    scrollbar: {
                        alwaysConsumeMouseWheel: false
                    },
                    minimap: {
                        enabled: false
                    },
                    smoothScrolling: true,
                    mouseWheelScrollSensitivity: 2,
                    scrollBeyondLastLine: false,
                    value: codeBlock.textContent,
                    language: language
                };
                const editor = section.monaco = monaco.editor.create(monacoContainer, settings);
                const model = editor.getModel();

                // ! Time for untyped bindings.
                monacoContainer['_editor'] = editor;
                codeBlock['_editor'] = editor;
                codeBlock['_monacoContainer'] = monacoContainer;
                codeBlock['_section'] = section;
                editor['_resize'] = () => {
                    // Add 1 extra line to accommodate the scroll bar and other pixel
                    // imperfect artifacts
                    monacoContainer.style.height = codeBlock.offsetHeight + (0) + "px";
                    monacoContainer.style.width = codeBlock.offsetWidth + "px";
                    monacoContainer.style.top = codeBlock.offsetTop + 'px';
                    monacoContainer.style.left = codeBlock.offsetLeft + 'px';
                }
                editor['_resize']();
                const rsObserver = new ResizeObserver(editor['_resize']);
                rsObserver.observe(codeBlock, { box: 'border-box' });

                // Prevent editor click handler from deselecting the element
                monacoContainer.onclick = evt => {
                    evt.stopPropagation();
                    this.focus = "monaco";
                }

                let lastCursPos: Monaco.Position;
                const disposables = [
                    model.onDidChangeContent(() => {
                        const text = editor.getValue();
                        const cleanedText = text.replace(/\\n/gm, '\n')
                            .replace(/\\"/gm, '"');

                        section.text = cleanedText;

                        // Handle completely passively.
                        // Watcher will trigger a rebuild of monaco.
                        this.clEditor.watcher.noWatch(() => {
                            codeBlock.textContent = cleanedText;

                            const previewSection = this.previewElt.querySelector(`.cl-preview-section[ulid="${ulid}"]`);
                            const prismContainer = previewSection?.querySelector(".prism");
                            if (!previewSection) return;

                            const mermaidElement = previewSection.querySelector(".language-mermaid");
                            if (mermaidElement) {
                                RenderMermaid(mermaidElement as HTMLElement, cleanedText);
                            }
                            else {
                                const lang = prismContainer.classList.value
                                    .split(" ")
                                    .find(v => v.startsWith("language-"))
                                    ?.replace('language-', '') || "auto";

                                const updated = Prism.highlight(cleanedText, Prism.languages[lang]);
                                prismContainer.innerHTML = updated;
                            }
                        });
                    }),
                    editor.onDidChangeCursorPosition(e => {
                        lastCursPos = e.position;
                    })
                ];

                editor.onKeyDown(e => {
                    if (e.altKey || e.shiftKey || e.ctrlKey)
                        return;

                    if (e.code != "ArrowUp" && e.code != "ArrowDown")
                        return;

                    lastCursPos = lastCursPos || editor.getSelection().getPosition();

                    const gutter =  editor.getDomNode().querySelector('.margin-view-overlays') as HTMLDivElement;

                    if (e.code == "ArrowUp" && lastCursPos.lineNumber <= 1) {
                        e.preventDefault();
                        const node = codeBlock.previousElementSibling.previousElementSibling;

                        const { left, top } = node.getBoundingClientRect();
                        this.clEditor.rebaseSelectionByPixel(left + gutter.offsetWidth, top);
                        this.clEditor.focus();
                        this.focus = "editorContentEditable";
                        return;
                    }

                    const text = editor.getValue();
                    const lines = text.match(/[\r\n]/g).length;
                    if (e.code == "ArrowDown" && lastCursPos.lineNumber >= lines+1) {
                        e.preventDefault();
                        const node = codeBlock.nextElementSibling;

                        const {left, top} = node.getBoundingClientRect();
                        this.clEditor.rebaseSelectionByPixel(left + gutter.offsetWidth, top);
                        this.clEditor.focus();
                        this.focus = "editorContentEditable";
                        return;
                    }
                })

                editor['_dispose'] = () => {
                    rsObserver.disconnect();
                    disposables.forEach(d => d.dispose());
                    editor.dispose();
                }

                this.overlay1.appendChild(monacoContainer);
            });
        })
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

        this.previewCtxMeasured?.sectionDescList.find((sectionDesc, sectionIdx) => {
            if (!sectionDesc[dimensionKey]) return false;

            if (scrollTop >= (sectionDesc[dimensionKey].topOffset + sectionDesc[dimensionKey].height)) {
                return false;
            }
            const posInSection = (scrollTop - sectionDesc[dimensionKey].topOffset) /
                (sectionDesc[dimensionKey].height || 1);

            result = {
                sectionDesc,
                sectionIdx,
                posInSection
            };
            return true;
        });

        return result;
    }

    /**
     * Restore the scroll position from the current file content state.
     */
    restoreScrollPosition(scrollPosition?) {
        const sectionDesc: SectionDesc = this.previewCtxMeasured?.sectionDescList[scrollPosition?.sectionIdx];
        if (!sectionDesc) return;

        const editorScrollTop = sectionDesc.editorDimension.topOffset +
            (sectionDesc.editorDimension.height * scrollPosition.posInSection);

        this.editorElt.scrollTop = editorScrollTop;

        const previewScrollTop = sectionDesc.previewDimension.topOffset +
            (sectionDesc.previewDimension.height * scrollPosition.posInSection);

        this.previewElt.parentElement.scrollTop = previewScrollTop;
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
        sectionDescList.find((sectionDesc) => {
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
        sectionDescList.find((sectionDesc) => {
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
        }
        else if (scrollTop > maxScrollTop) {
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

        this.clEditor.init();
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

                    // ??? This occurs sometimes
                    if (!sectionDesc) continue;

                    // Trigger a resize event
                    sectionDesc.section?.monaco?.['_resize']();

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
                    let sectionDesc = this.previewCtx.sectionDescList[sectionDescIdx] as SectionDesc;

                    // Dispose an injected monaco editor
                    sectionDesc?.section?.monaco?.['_dispose']();

                    sectionDescIdx++;
                    sectionPreviewElt = insertBeforePreviewElt;
                    insertBeforePreviewElt = insertBeforePreviewElt.nextSibling;
                    this.previewElt.removeChild(sectionPreviewElt);
                    sectionTocElt = insertBeforeTocElt;
                    insertBeforeTocElt = insertBeforeTocElt.nextSibling;
                    this.tocElt.removeChild(sectionTocElt);
                }
                else if (item[0] === 1) {
                    const html = dompurify.sanitize(this.conversionCtx.htmlSectionList[sectionIdx]);
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
        this.measureSectionDimensions(!!this.previewCtxMeasured, true);
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
        this.sectionList?.forEach(s => s.monaco?.['_resize']());

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
