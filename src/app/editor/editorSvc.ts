import Vue from 'vue';
import DiffMatchPatch from 'diff-match-patch';
import Prism from 'prismjs';
import markdownItPandocRenderer from 'markdown-it-pandoc-renderer';
import cledit from './editor/cledit';
import pagedown from './libs/pagedown';
import htmlSanitizer from './libs/htmlSanitizer';
import markdownConversionSvc from './markdownConversionSvc';
import markdownGrammarSvc from './markdownGrammarSvc';
import sectionUtils from './editor/sectionUtils';
import extensionSvc from './extensionSvc';
import editorSvcDiscussions from './editor/editorSvcDiscussions';
import editorSvcUtils from './editor/editorSvcUtils';



import 'prismjs/components/prism-asciidoc';
import 'prismjs/components/prism-awk';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-batch';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cmake';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-cshtml';
import 'prismjs/components/prism-csp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-csv';
import 'prismjs/components/prism-dns-zone-file';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-erlang';
import 'prismjs/components/prism-excel-formula';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-gradle';
import 'prismjs/components/prism-groovy';
import 'prismjs/components/prism-hsts';
import 'prismjs/components/prism-http';
import 'prismjs/components/prism-icon';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jq';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-json5';
import 'prismjs/components/prism-jsonp';
import 'prismjs/components/prism-jsstacktrace';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-log';
import 'prismjs/components/prism-makefile';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-mermaid';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-perl';
// import 'prismjs/components/prism-php';
import 'prismjs/components/prism-plant-uml';
import 'prismjs/components/prism-powerquery';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-properties';
import 'prismjs/components/prism-puppet';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-rest';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sass';
import 'prismjs/components/prism-scheme';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-uri';
import 'prismjs/components/prism-yaml';
import './prism-markdown-custom';


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
    pagedownEditor: null,
    options: null,
    prismGrammars: null,
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
     * Initialize the Prism grammar with the options
     */
    initPrism() {
        const options = {
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
            insideFences: markdownConversionSvc.defaultOptions.insideFences,
        };
        this.prismGrammars = markdownGrammarSvc.makeGrammars(options);
    },

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
            },
            getCursorFocusRatio: () => {
                // TODO
                // if (store.getters['data/layoutSettings'].focusMode) {
                //     return 1;
                // }
                return 1;
                // return 0.15;
            },
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
     * Save editor selection/scroll state into the store.
     */
    saveContentState: allowDebounce(() => {
        // TODO: Save state
        // const scrollPosition = editorSvc.getScrollPosition() ||
        //     store.getters['contentState/current'].scrollPosition;
        //
        //     store.dispatch('contentState/patchCurrent', {
        //         selectionStart: editorSvc.clEditor.selectionMgr.selectionStart,
        //         selectionEnd: editorSvc.clEditor.selectionMgr.selectionEnd,
        //         scrollPosition,
        //     });

        // const opts = {
        //     selectionStart: editorSvc.clEditor.selectionMgr.selectionStart,
        //     selectionEnd: editorSvc.clEditor.selectionMgr.selectionEnd,
        //     scrollPosition: editorSvc.getScrollPosition()
        // };

        editorSvc.restoreScrollPosition(editorSvc.getScrollPosition(editorSvc.editorElt));
    }, 100),

    /**
     * Report selection from the preview to the editor.
     */
    saveSelection: allowDebounce(() => {
        const selection = window.getSelection();
        let range = selection.rangeCount && selection.getRangeAt(0);
        if (range) {
            if (
                /* eslint-disable no-bitwise */
                !(editorSvc.previewElt.compareDocumentPosition(range.startContainer) &
                    window.Node.DOCUMENT_POSITION_CONTAINED_BY) ||
                !(editorSvc.previewElt.compareDocumentPosition(range.endContainer) &
                    window.Node.DOCUMENT_POSITION_CONTAINED_BY)
                /* eslint-enable no-bitwise */
            ) {
                range = null;
            }
        }
        if (editorSvc.previewSelectionRange !== range) {
            let previewSelectionStartOffset;
            let previewSelectionEndOffset;
            if (range) {
                const startRange = document.createRange();
                startRange.setStart(editorSvc.previewElt, 0);
                startRange.setEnd(range.startContainer, range.startOffset);
                previewSelectionStartOffset = `${startRange}`.length;
                previewSelectionEndOffset = previewSelectionStartOffset + `${range}`.length;
                const editorStartOffset = editorSvc.getEditorOffset(previewSelectionStartOffset);
                const editorEndOffset = editorSvc.getEditorOffset(previewSelectionEndOffset);
                if (editorStartOffset != null && editorEndOffset != null) {
                    editorSvc.clEditor.selectionMgr.setSelectionStartEnd(
                        editorStartOffset,
                        editorEndOffset,
                    );
                }
            }
            editorSvc.previewSelectionRange = range;
            editorSvc.$emit('previewSelectionRange', editorSvc.previewSelectionRange);
        }
    }, 50),

    /**
     * Returns the pandoc AST generated from the file tokens and the converter options
     */
    getPandocAst() {
        return tokens && markdownItPandocRenderer(tokens, this.converter.options);
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
        this.pagedownEditor = pagedown({
            input: Object.create(this.clEditor),
        });
        this.pagedownEditor.run();
        this.pagedownEditor.hooks.set('insertLinkDialog', (callback) => {
            // TODO: insert link dialog
            // store.dispatch('modal/open', {
            //     type: 'link',
            //     callback,
            // });
            return true;
        });
        this.pagedownEditor.hooks.set('insertImageDialog', (callback) => {

            // TODO: insert image dialog
            // store.dispatch('modal/open', {
            //     type: 'image',
            //     callback,
            // });
            return true;
        });

        // Aha!...
        const scrollEditor = allowDebounce(() => {
            editorSvc.restoreScrollPosition(editorSvc.getScrollPosition(editorSvc.editorIsActive ? editorElt : previewElt));
        }, 100);
        const scrollPreview = allowDebounce(() => {
            editorSvc.restoreScrollPosition(editorSvc.getScrollPosition(editorSvc.editorIsActive ? editorElt : previewElt));
        }, 100);

        editorElt.parentNode.addEventListener('scroll', scrollEditor);
        previewElt.parentNode.addEventListener('scroll', scrollPreview);

        const refreshPreview = allowDebounce(() => {
            this.convert();
            if (instantPreview) {
                this.refreshPreview();
                this.measureSectionDimensions(false, true);
            } else {
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
            this.saveContentState();
        }, 10);

        this.clEditor.selectionMgr.on('selectionChanged', (start, end, selectionRange) => {
            newSelectionRange = selectionRange;
            onEditorChanged(!instantPreview);
        });
        this.clEditor.on('contentChanged', (content, diffs, sectionList) => {
            newSectionList = sectionList;
            onEditorChanged(!instantPreview);
        });

        /* -----------------------------
         * Inline images
         */

        const imgCache = Object.create(null);

        const hashImgElt = imgElt => `${imgElt.src}:${imgElt.width || -1}:${imgElt.height || -1}`;

        const addToImgCache = (imgElt) => {
            const hash = hashImgElt(imgElt);
            let entries = imgCache[hash];
            if (!entries) {
                entries = [];
                imgCache[hash] = entries;
            }
            entries.push(imgElt);
        };

        const getFromImgCache = (imgEltsToCache) => {
            const hash = hashImgElt(imgEltsToCache);
            const entries = imgCache[hash];
            if (!entries) {
                return null;
            }
            let imgElt;
            return entries
                .some((entry) => {
                    if (this.editorElt.contains(entry)) {
                        return false;
                    }
                    imgElt = entry;
                    return true;
                }) && imgElt;
        };

        const triggerImgCacheGc = cledit.Utils.debounce(() => {
            Object.entries(imgCache).forEach(([src, entries]) => {
                // Filter entries that are not attached to the DOM
                const filteredEntries = (entries as any[]).filter(imgElt => this.editorElt.contains(imgElt));
                if (filteredEntries.length) {
                    imgCache[src] = filteredEntries;
                } else {
                    delete imgCache[src];
                }
            });
        }, 100);

        let imgEltsToCache = [];
        // TODO: inline images config
        // if (store.getters['data/computedSettings'].editor.inlineImages) {
        this.clEditor.highlighter.on('sectionHighlighted', (section) => {

            // Render images inline in the editor.
            section.elt.getElementsByClassName('token img').cl_each((imgTokenElt) => {
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
                    imgEltsToCache.push(imgElt);
                }

                const imgTokenWrapper = document.createElement('span');
                imgTokenWrapper.className = 'token img-wrapper';
                imgTokenElt.parentNode.insertBefore(imgTokenWrapper, imgTokenElt);
                imgTokenWrapper.appendChild(imgElt);
                imgTokenWrapper.appendChild(imgTokenElt);
            });

            section.elt.querySelectorAll('.injection-fence').cl_each((fenceElement: HTMLElement) => {
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

        // this.clEditor.highlighter.on('highlighted', () => {
        //     imgEltsToCache.forEach((imgElt) => {
        //         const cachedImgElt = getFromImgCache(imgElt);
        //         if (cachedImgElt) {
        //             // Found a previously loaded image that has just been released
        //             imgElt.parentNode.replaceChild(cachedImgElt, imgElt);
        //         } else {
        //             addToImgCache(imgElt);
        //         }
        //     });
        //     imgEltsToCache = [];
        //     // Eject released images from cache
        //     triggerImgCacheGc();
        // });


        this.measureSectionDimensions(false, true, true)

        this.initPrism();
        this.initConverter();

        this.initClEditor();
        this.applyContent();

        this.clEditor.toggleEditable(true);

        this.initHighlighters();
        this.$emit('inited');
    },
});


export default editorSvc;
