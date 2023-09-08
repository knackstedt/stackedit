import Vue from 'vue';
import DiffMatchPatch from 'diff-match-patch';
import markdownItPandocRenderer from 'markdown-it-pandoc-renderer';
import htmlSanitizer from './libs/htmlSanitizer';
import markdownConversionSvc from './markdownConversionSvc';
import sectionUtils from './editor/sectionUtils';
import extensionSvc from './extensionSvc';
import editorSvcDiscussions from './editor/editorSvcDiscussions';
import editorSvcUtils from './editor/editorSvcUtils';
import Prism from './prism';



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

const diffMatchPatch = new DiffMatchPatch();
let instantPreview = true;
let tokens;

class SectionDesc {
    public editorElt;
    constructor(public section, public previewElt, public tocElt, public html) {
        this.editorElt = section.elt;
    }
}

// Use a vue instance as an event bus
const editorSvc = Object.assign(new Vue(), editorSvcDiscussions, editorSvcUtils, {
    // Elements
    editorElt: null,
    previewElt: null,
    tocElt: null,
    // Other objects
    clEditor: null,
    options: null,
    converter: null,
    parsingCtx: null,
    conversionCtx: null,
    previewCtx: {
        sectionDescList: [],
    },
    previewCtxMeasured: null,
    previewCtxWithDiffs: null,
    sectionList: null,
    selectionRange: null,
    previewSelectionRange: null,
    previewSelectionStartOffset: null,

    editorIsActive: false,

    /**
     * Initialize the markdown-it converter with the options
     */
    initConverter() {
        // TODO: Move these to proper home.

        this.converter = markdownConversionSvc.createConverter({
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
    },

    /**
     * Initialize the cledit editor with markdown-it section parser and Prism highlighter
     */
    initClEditor() {
        this.previewCtxMeasured = null;
        editorSvc.$emit('previewCtxMeasured', null);
        this.previewCtxWithDiffs = null;
        editorSvc.$emit('previewCtxWithDiffs', null);

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
    },

    /**
     * Finish the conversion initiated by the section parser
     */
    convert() {
        this.conversionCtx = markdownConversionSvc.convert(this.parsingCtx, this.conversionCtx);
        this.$emit('conversionCtx', this.conversionCtx);
        ({ tokens } = this.parsingCtx.markdownState);
    },

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
                    let sectionDesc = this.previewCtx.sectionDescList[sectionDescIdx];
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
                    extensionSvc.sectionPreview(sectionPreviewElt, this.options, true);
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
            sectionDescList,
        };

        this.$emit('previewCtx', this.previewCtx);
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
    },

    /**
     * Measure the height of each section in editor, preview and toc.
     */
    measureSectionDimensions: allowDebounce((restoreScrollPosition = false, force = false) => {
        if (force || editorSvc.previewCtx !== editorSvc.previewCtxMeasured) {
            sectionUtils.measureSectionDimensions(editorSvc);
            editorSvc.previewCtxMeasured = editorSvc.previewCtx;

            if (restoreScrollPosition) {
                editorSvc.restoreScrollPosition();
            }

            editorSvc.$emit('previewCtxMeasured', editorSvc.previewCtxMeasured);
        }
    }, 500),

    /**
     * Compute the diffs between editor's markdown and preview's html
     * asynchronously unless there is only one section to compute.
     */
    makeTextToPreviewDiffs() {
        if (editorSvc.previewCtx !== editorSvc.previewCtxWithDiffs) {
            const makeOne = () => {
                let hasOne = false;
                const hasMore = editorSvc.previewCtx.sectionDescList
                    .some((sectionDesc) => {
                        if (!sectionDesc.textToPreviewDiffs) {
                            if (hasOne) {
                                return true;
                            }
                            if (!sectionDesc.previewText) {
                                sectionDesc.previewText = sectionDesc.previewElt.textContent;
                            }
                            sectionDesc.textToPreviewDiffs = diffMatchPatch.diff_main(
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
                    editorSvc.previewCtxWithDiffs = editorSvc.previewCtx;
                    editorSvc.$emit('previewCtxWithDiffs', editorSvc.previewCtxWithDiffs);
                }
            };
            makeOne();
        }
    },

    /**
     * Pass the elements to the store and initialize the editor.
     */
    init(editorElt, previewElt, tocElt) {
        this.editorElt = editorElt;
        this.previewElt = previewElt;
        this.tocElt = tocElt;

        this.createClEditor(editorElt);

        this.clEditor.on('contentChanged', (content, diffs, sectionList) => {
            this.parsingCtx = {
                ...this.parsingCtx,
                sectionList,
            };
        });
        this.clEditor.undoMgr.on('undoStateChange', () => {

            // TODO: Handle

            // const canUndo = this.clEditor.undoMgr.canUndo();
            // if (canUndo !== store.state.layout.canUndo) {
            //     store.commit('layout/setCanUndo', canUndo);
            // }
            // const canRedo = this.clEditor.undoMgr.canRedo();
            // if (canRedo !== store.state.layout.canRedo) {
            //     store.commit('layout/setCanRedo', canRedo);
            // }
        });

        // Manually handle scroll events
        const onScroll = (e) => {
            e.preventDefault()
            editorSvc.restoreScrollPosition(editorSvc.getScrollPosition(editorSvc.editorIsActive ? editorElt : previewElt));
        };

        editorElt.parentNode.addEventListener('scroll', onScroll);
        previewElt.parentNode.addEventListener('scroll', onScroll);

        const refreshPreview = allowDebounce(() => {
            this.convert();
            if (instantPreview) {
                this.refreshPreview();
                this.measureSectionDimensions(false, true);
            }
            else {
                setTimeout(() => this.refreshPreview(), 10);
            }
            instantPreview = false;
        }, 25);

        let newSectionList;
        let newSelectionRange;
        const onEditorChanged = allowDebounce(() => {
            if (this.sectionList !== newSectionList) {
                this.sectionList = newSectionList;
                this.$emit('sectionList', this.sectionList);
                refreshPreview(!instantPreview);
            }
            if (this.selectionRange !== newSelectionRange) {
                this.selectionRange = newSelectionRange;
                this.$emit('selectionRange', this.selectionRange);
            }
        }, 10);

        this.clEditor.selectionMgr.on('selectionChanged', (start, end, selectionRange) => {
            newSelectionRange = selectionRange;
            onEditorChanged(!instantPreview);
        });
        this.clEditor.on('contentChanged', (content, diffs, sectionList) => {
            newSectionList = sectionList;
            onEditorChanged(!instantPreview);
        });


        // TODO: inline images config
        // if (store.getters['data/computedSettings'].editor.inlineImages) {
        this.clEditor.highlighter.on('sectionHighlighted', (section) => {

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
        });

        this.measureSectionDimensions(false, true, true)

        this.initConverter();
        this.initClEditor();

        this.clEditor.toggleEditable(true);
        this.$emit('inited');
    },
});


export default editorSvc;
