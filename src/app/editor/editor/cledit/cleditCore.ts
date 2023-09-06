import DiffMatchPatch from 'diff-match-patch';
import TurndownService from 'turndown/lib/turndown.browser.umd';
import htmlSanitizer from '../../libs/htmlSanitizer';
import { Utils } from './cleditUtils';
import { Highlighter } from './cleditHighlighter';
import { SelectionMgr } from './cleditSelectionMgr';
import { UndoMgr } from './cleditUndoMgr';
import { Watcher } from './cleditWatcher';
import { defaultKeystrokes } from './cleditKeystroke';

function cledit(contentElt, scrollEltOpt, isMarkdown = false) {
    const scrollElt = scrollEltOpt || contentElt;
    const editor = {
        $contentElt: contentElt,
        $scrollElt: scrollElt,
        $keystrokes: [],
        $markers: {},
        value: '',
        toggleEditable: (isEditable) => {
            contentElt.contentEditable = isEditable == null ? !contentElt.contentEditable : isEditable;
            contentElt.spellcheck = false;
        }
    };

    Utils.createEventHooks(editor);
    const { debounce } = Utils;

    contentElt.setAttribute('tabindex', '0'); // To have focus even when disabled
    editor.toggleEditable(true);

    function getTextContent() {


        function recursivelyCollectChildrenText(el) {
            // This element has a content override, so we'll read that instead.
            if (el.nodeType == 1 && el.getAttribute('source') != null) {
                const text = el.getAttribute('source')
                    .replace(/\\n/gm, '\n')
                    .replace(/\\"/gm, '"');

                return text;
            }

            // This doesn't have children, so we can simply read the textContent
            else if (el.nodeType != 1 || el.childNodes.length == 0) {
                return el.textContent;
            }

            // This has childNodes, and no content override
            else {
                const sections = [...el.childNodes].map(c =>
                    recursivelyCollectChildrenText(c));

                return sections.join('');
            }
        }

        const text = recursivelyCollectChildrenText(contentElt);


        // Markdown-it sanitization (Mac/DOS to Unix)
        // let textContent = contentElt.textContent.replace(/\r[\n\u0085]?|[\u2424\u2028\u0085]/g, '\n');
        let textContent = text.replace(/\r[\n\u0085]?|[\u2424\u2028\u0085]/g, '\n');

        // Append a newline at the end if one isn't present.
        if (textContent.slice(-1) !== '\n') {
            textContent += '\n';
        }
        return editor.value = textContent;
    }

    let lastTextContent = '';
    const highlighter = new Highlighter(editor);

    /* eslint-disable new-cap */
    const diffMatchPatch = new DiffMatchPatch();
    /* eslint-enable new-cap */
    const selectionMgr = new SelectionMgr(editor);

    function adjustCursorPosition(force?) {
        selectionMgr.saveSelectionState(true, true, force);
    }

    function replaceContent(selectionStart, selectionEnd, replacement) {
        const min = Math.min(selectionStart, selectionEnd);
        const max = Math.max(selectionStart, selectionEnd);
        const range = selectionMgr.createRange(min, max);
        const rangeText = `${range}`;
        // Range can contain a br element, which is not taken into account in rangeText
        if (rangeText.length === max - min && rangeText === replacement) {
            return null;
        }
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
        return range;
    }

    let ignoreUndo = false;
    let noContentFix = false;

    function setContent(value, noUndo, maxStartOffsetOpt) {
        editor.value = value;

        const textContent = getTextContent();
        const maxStartOffset = maxStartOffsetOpt != null && maxStartOffsetOpt < textContent.length
            ? maxStartOffsetOpt
            : textContent.length - 1;
        const startOffset = Math.min(
            diffMatchPatch.diff_commonPrefix(textContent, value),
            maxStartOffset,
        );
        const endOffset = Math.min(
            diffMatchPatch.diff_commonSuffix(textContent, value),
            textContent.length - startOffset,
            value.length - startOffset,
        );
        const replacement = value.substring(startOffset, value.length - endOffset);
        const range = replaceContent(startOffset, textContent.length - endOffset, replacement);
        if (range) {
            ignoreUndo = noUndo;
            noContentFix = true;
        }
        return {
            start: startOffset,
            end: value.length - endOffset,
            range,
        };
    }

    const undoMgr = new UndoMgr(editor);

    function replace(selectionStart, selectionEnd, replacement) {
        undoMgr.setDefaultMode('single');
        replaceContent(selectionStart, selectionEnd, replacement);
        const startOffset = Math.min(selectionStart, selectionEnd);
        const endOffset = startOffset + replacement.length;
        selectionMgr.setSelectionStartEnd(endOffset, endOffset);
        selectionMgr.updateCursorCoordinates(true);
    }

    function replaceAll(search, replacement, startOffset = 0) {
        undoMgr.setDefaultMode('single');
        const text = getTextContent();
        const subtext = getTextContent().slice(startOffset);
        const value = subtext.replace(search, replacement);
        if (value !== subtext) {
            const offset = editor['setContent'](text.slice(0, startOffset) + value);
            selectionMgr.setSelectionStartEnd(offset.end, offset.end);
            selectionMgr.updateCursorCoordinates(true);
        }
    }

    function focus() {
        selectionMgr.restoreSelection();
        contentElt.focus();
    }

    function addMarker(marker) {
        editor.$markers[marker.id] = marker;
    }

    function removeMarker(marker) {
        delete editor.$markers[marker.id];
    }

    const triggerSpellCheck = debounce(() => {
        // Hack for Chrome to trigger the spell checker
        const selection = window.getSelection();
        if (selectionMgr.hasFocus()
            && !highlighter.isComposing
            && selectionMgr.selectionStart === selectionMgr.selectionEnd
            && selection.modify
        ) {
            if (selectionMgr.selectionStart) {
                selection.modify('move', 'backward', 'character');
                selection.modify('move', 'forward', 'character');
            } else {
                selection.modify('move', 'forward', 'character');
                selection.modify('move', 'backward', 'character');
            }
        }
    }, 10);

    let watcher;
    let skipSaveSelection;
    // Primarily invoked by mutation observer
    function checkContentChange(mutations) {
        watcher.noWatch(() => {
            const removedSections = [];
            const modifiedSections = [];

            function markModifiedSection(node) {
                let currentNode = node;
                while (currentNode && currentNode !== contentElt) {
                    if (currentNode.section) {
                        const array = currentNode.parentNode ? modifiedSections : removedSections;
                        if (array.indexOf(currentNode.section) === -1) {
                            array.push(currentNode.section);
                        }
                        return;
                    }
                    currentNode = currentNode.parentNode;
                }
            }

            mutations.forEach((mutation) => {
                markModifiedSection(mutation.target);
                mutation.addedNodes.forEach(markModifiedSection);
                mutation.removedNodes.forEach(markModifiedSection);
            });
            highlighter.fixContent(modifiedSections, removedSections, noContentFix);
            noContentFix = false;
        });

        if (!skipSaveSelection) {
            selectionMgr.saveSelectionState();
        }
        skipSaveSelection = false;

        const newTextContent = getTextContent();
        const diffs = diffMatchPatch.diff_main(lastTextContent, newTextContent);
        Object.entries(editor.$markers).forEach(([key, marker]) => {
            (marker as any).adjustOffset(diffs);
        });

        const sectionList = highlighter.parseSections(newTextContent);
        editor['$trigger']('contentChanged', newTextContent, diffs, sectionList);
        if (!ignoreUndo) {
            undoMgr.addDiffs(lastTextContent, newTextContent, diffs);
            undoMgr.setDefaultMode('typing');
            undoMgr.saveState();
        }
        ignoreUndo = false;
        lastTextContent = newTextContent;
        triggerSpellCheck();
    }

    // Detect editor changes
    watcher = new Watcher(editor, checkContentChange);
    watcher.startWatching();

    function setSelection(start, end) {
        selectionMgr.setSelectionStartEnd(start, end == null ? start : end);
        selectionMgr.updateCursorCoordinates();
    }

    function keydownHandler(handler) {
        return (evt) => {
            if (
                evt.which !== 17 && // Ctrl
                evt.which !== 91 && // Cmd
                evt.which !== 18 && // Alt
                evt.which !== 16 // Shift
            ) {
                handler(evt);
            }
        };
    }

    let windowKeydownListener;
    let windowMouseListener;
    let windowResizeListener;
    function tryDestroy() {
        if (document.contains(contentElt)) {
            return false;
        }
        watcher.stopWatching();
        window.removeEventListener('keydown', windowKeydownListener);
        window.removeEventListener('mousedown', windowMouseListener);
        window.removeEventListener('mouseup', windowMouseListener);
        window.removeEventListener('resize', windowResizeListener);
        editor['$trigger']('destroy');
        return true;
    }

    // Mouseup can happen outside the editor element
    windowMouseListener = () => {
        if (!tryDestroy()) {
            selectionMgr.saveSelectionState(true, false);
        }
    };
    window.addEventListener('mousedown', windowMouseListener);
    window.addEventListener('mouseup', windowMouseListener);

    // Resize provokes cursor coordinate changes
    windowResizeListener = () => {
        if (!tryDestroy()) {
            selectionMgr.updateCursorCoordinates();
        }
    };
    window.addEventListener('resize', windowResizeListener);

    // This handles 'Enter' and keyboard arrow events.
    contentElt.addEventListener('keydown', keydownHandler((evt) => {
        selectionMgr.saveSelectionState();

        // Perform keystroke
        let contentChanging = false;
        const textContent = getTextContent();
        let min = Math.min(selectionMgr.selectionStart, selectionMgr.selectionEnd);
        let max = Math.max(selectionMgr.selectionStart, selectionMgr.selectionEnd);

        const state = {
            before: textContent.slice(0, min),
            after: textContent.slice(max),
            selection: textContent.slice(min, max),
            isBackwardSelection: selectionMgr.selectionStart > selectionMgr.selectionEnd,
        };

        editor.$keystrokes.forEach((keystroke) => {
            if (!keystroke.handler(evt, state, editor)) {
                return false;
            }
            const newContent = state.before + state.selection + state.after;
            if (newContent !== getTextContent()) {
                editor['setContent'](newContent, false, min);
                contentChanging = true;
                skipSaveSelection = true;
                highlighter.cancelComposition = true;
            }
            min = state.before.length;
            max = min + state.selection.length;
            selectionMgr.setSelectionStartEnd(
                state.isBackwardSelection ? max : min,
                state.isBackwardSelection ? min : max,
                !contentChanging, // Expect a restore selection on mutation event
            );
            return true;
        });

        if (!contentChanging) {
            // Optimization to avoid saving selection
            adjustCursorPosition();
        }
    }));

    contentElt.addEventListener('compositionstart', () => {
        highlighter.isComposing += 1;
    });

    contentElt.addEventListener('compositionend', () => {
        setTimeout(() => {
            if (highlighter.isComposing) {
                highlighter.isComposing -= 1;
                if (!highlighter.isComposing) {
                    checkContentChange([]);
                }
            }
        }, 1);
    });

    let turndownService;
    if (isMarkdown) {
        contentElt.addEventListener('copy', (evt) => {
            if (evt.clipboardData) {
                evt.clipboardData.setData('text/plain', selectionMgr.getSelectedText());
                evt.preventDefault();
            }
        });

        contentElt.addEventListener('cut', (evt) => {
            if (evt.clipboardData) {
                evt.clipboardData.setData('text/plain', selectionMgr.getSelectedText());
                evt.preventDefault();
                replace(selectionMgr.selectionStart, selectionMgr.selectionEnd, '');
            } else {
                undoMgr.setCurrentMode('single');
            }
            adjustCursorPosition();
        });

        turndownService = new TurndownService(
            {
                "headingStyle": "atx",
                "hr": "----------",
                "bulletListMarker": "-",
                "codeBlockStyle": "fenced",
                "fence": "```",
                "emDelimiter": "_",
                "strongDelimiter": "**",
                "linkStyle": "inlined",
                "linkReferenceStyle": "full"
            });//store.getters['data/computedSettings'].turndown);
        turndownService.escape = str => str; // Disable escaping
        // turndownService.keep(['div', 'span'])
    }

    contentElt.addEventListener('paste', (evt) => {
        undoMgr.setCurrentMode('single');
        evt.preventDefault();

        let data;
        let { clipboardData } = evt;
        if ( clipboardData ) {
            data = clipboardData.getData('text/plain');
            // TODO: Re-enable after paste dialog is added.
            if (false && turndownService) {
                try {
                    const html = clipboardData.getData('text/html');
                    if (html) {
                        // TODO: Add a popup dialog to choose using whatever we
                        // end up with, after using Turndown, or raw HTML propagation
                        // Inject a custom fence around pasted content
                        // data = `\n\`\`\`<injected>\n${html}\n</injected>\n\`\`\`\n`;

                        const sanitizedHtml = htmlSanitizer.sanitizeHtml(html)
                            .replace(/&#160;/g, ' '); // Replace non-breaking spaces with classic spaces
                        if (sanitizedHtml) {
                            data = turndownService.turndown(sanitizedHtml);
                            // Handle double newlines added on HTML paste.
                            // TODO: Check if this needs to be placed elsewhere.

                            data = data
                                // Fix duplicate newlines that are inserted
                                .replace(/\n\n/g, '\n')
                                // Fix duplicate spaces that get inserted
                                .replace(/(?<!^)  /gm, ' ');
                        }
                    }
                }
                catch (e) {
                    // Ignore
                }
            }
        }
        else {
            // TODO: This API might be deprecated.
            ({ clipboardData } = window['clipboardData']);
            data = clipboardData && clipboardData.getData('Text');
        }
        if (!data) {
            return;
        }

        replace(selectionMgr.selectionStart, selectionMgr.selectionEnd, data);
        adjustCursorPosition();
    });

    contentElt.addEventListener('focus', () => {
        editor['$trigger']('focus');
    });

    contentElt.addEventListener('blur', () => {
        editor['$trigger']('blur');
    });

    function addKeystroke(keystroke) {
        const keystrokes = Array.isArray(keystroke) ? keystroke : [keystroke];
        editor.$keystrokes = editor.$keystrokes
            .concat(keystrokes)
            .sort((keystroke1, keystroke2) => keystroke1.priority - keystroke2.priority);
    }
    addKeystroke(defaultKeystrokes);

    // @ts-ignore
    editor.selectionMgr = selectionMgr;
    // @ts-ignore
    editor.undoMgr = undoMgr;
    // @ts-ignore
    editor.highlighter = highlighter;
    // @ts-ignore
    editor.watcher = watcher;
    // @ts-ignore
    editor.adjustCursorPosition = adjustCursorPosition;
    // @ts-ignore
    editor.setContent = setContent;
    // @ts-ignore
    editor.replace = replace;
    // @ts-ignore
    editor.replaceAll = replaceAll;
    // @ts-ignore
    editor.getContent = getTextContent;
    // @ts-ignore
    editor.focus = focus;
    // @ts-ignore
    editor.setSelection = setSelection;
    // @ts-ignore
    editor.addKeystroke = addKeystroke;
    // @ts-ignore
    editor.addMarker = addMarker;
    // @ts-ignore
    editor.removeMarker = removeMarker;

    // @ts-ignore
    editor.init = (opts: any = {}) => {
        opts.content = ``;

        const options = {
            getCursorFocusRatio() {
                return 0.1;
            },
            sectionHighlighter(section) {
                return section.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
            },
            sectionDelimiter: '',
            ...opts
        };
        // @ts-ignore
        editor.options = options;

        if (options.content !== undefined) {
            lastTextContent = options.content.toString();
            if (lastTextContent.slice(-1) !== '\n') {
                lastTextContent += '\n';
            }
        }

        const sectionList = highlighter.parseSections(lastTextContent, true);
        editor['$trigger']('contentChanged', lastTextContent, [0, lastTextContent], sectionList);
        if (options.selectionStart !== undefined && options.selectionEnd !== undefined) {
            editor['setSelection'](options.selectionStart, options.selectionEnd);
        }
        else {
            selectionMgr.saveSelectionState();
        }
        undoMgr.init(options);

        if (options.scrollTop !== undefined) {
            scrollElt.scrollTop = options.scrollTop;
        }
    };

    return editor;
}

export default cledit;
