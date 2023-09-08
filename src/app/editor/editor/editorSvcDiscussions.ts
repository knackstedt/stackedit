import DiffMatchPatch from 'diff-match-patch';
import cledit from './cledit';
import utils from '../utils';
import diffUtils from '../diffUtils';

let clEditor;
let markerKeys;
let markerIdxMap;
let previousPatchableText;
let currentPatchableText;
let isChangePatch;
let contentId;

const diffMatchPatch = new DiffMatchPatch();

function makePatches() {
    const diffs = diffMatchPatch.diff_main(previousPatchableText, currentPatchableText);
    return diffMatchPatch.patch_make(previousPatchableText, diffs);
}

function applyPatches(patches) {
    const newPatchableText = diffMatchPatch.patch_apply(patches, currentPatchableText)[0];
    let result = newPatchableText;
    if (markerKeys.length) {
        // Strip text markers
        result = result.replace(new RegExp(`[\ue000-${String.fromCharCode((0xe000 + markerKeys.length) - 1)}]`, 'g'), '');
    }
    // Expect a `contentChanged` event
    if (result !== clEditor.getContent()) {
        previousPatchableText = currentPatchableText;
        currentPatchableText = newPatchableText;
        isChangePatch = true;
    }
    return result;
}

function reversePatches(patches) {
    const result = diffMatchPatch.patch_deepCopy(patches).reverse();
    result.forEach((patch) => {
        patch.diffs.forEach((diff) => {
            diff[0] = -diff[0];
        });
    });
    return result;
}

export default {
    createClEditor(editorElt) {
        this.clEditor = cledit(editorElt, editorElt.parentNode, true);
        ({ clEditor } = this);
        clEditor.on('contentChanged', (text) => {
            const oldContent = {
                comments: {},
                discussions: {},
                hash: 0,
                id: null,
                properties: "\n",
                text: "\n",
                type: "content"
            }//store.getters['content/current'];

            const newContent = {
                ...utils.deepCopy(oldContent),
                text: utils.sanitizeText(text),
            };
            if (!isChangePatch) {
                previousPatchableText = currentPatchableText;
                currentPatchableText = diffUtils.makePatchableText(newContent, markerKeys, markerIdxMap);
            } else {
                // Take a chance to restore discussion offsets on undo/redo
                newContent.text = currentPatchableText;
            }
            // TODO:
            // store.dispatch('content/patchCurrent', newContent);
            isChangePatch = false;
        });
        // TODO:
        // clEditor.on('focus', () => store.commit('discussion/setNewCommentFocus', false));
    },
    initClEditorInternal(opts) {
        const content = {
            comments: {},
            discussions: {},
            hash: 0,
            id: null,
            properties: "\n",
            text: "\n",
            type: "content"
        }//store.getters['content/current'];
        if (content) {
            const contentState = {
                hash: 0,
                id: null,
                scrollPosition: null,
                selectionEnd: 0,
                selectionStart: 0,
                type: "contentState"
            }//store.getters['contentState/current'];
            const options = Object.assign({
                selectionStart: contentState.selectionStart,
                selectionEnd: contentState.selectionEnd,
                patchHandler: {
                    makePatches,
                    applyPatches,
                    reversePatches,
                },
            }, opts);

            if (contentId !== content.id) {
                contentId = content.id;
                currentPatchableText = diffUtils.makePatchableText(content, markerKeys, markerIdxMap);
                previousPatchableText = currentPatchableText;
                options.content = content.text;
            }

            clEditor.init(options);
        }
    },
};

