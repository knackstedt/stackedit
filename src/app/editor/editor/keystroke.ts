import { isMac } from './utils';
import { VanillaMirror } from './vanilla-mirror';

type State = {
    before: string;
    after: string;
    selection: string;
    isBackwardSelection: boolean;
}

export function Keystroke(handler: (evt: KeyboardEvent, state: State, editor: VanillaMirror) => boolean, priority?) {
    this.handler = handler;
    this.priority = priority || 100;
}


let clearNewline;
const charTypes = Object.create(null);

// Word separators, as in Sublime Text
'./\\()"\'-:,.;<>~!@#$%^&*|+=[]{}`~?'.split('').forEach((wordSeparator) => {
    charTypes[wordSeparator] = 'wordSeparator';
});
charTypes[' '] = 'space';
charTypes['\t'] = 'space';
charTypes['\n'] = 'newLine';

function getNextWordOffset(text: string, offset: number, isBackward = false) {
    let previousType;
    let result = offset;
    while ((isBackward && result > 0) || (!isBackward && result < text.length)) {
        const currentType = charTypes[isBackward ? text[result - 1] : text[result]] || 'word';
        if (previousType && currentType !== previousType) {
            if (previousType === 'word' || currentType === 'space' || previousType === 'newLine' || currentType === 'newLine') {
                break;
            }
        }
        previousType = currentType;
        if (isBackward) {
            result -= 1;
        }
        else {
            result += 1;
        }
    }
    return result;
}

export const defaultKeystrokes = [
    // CTRL+Z, CTRL+Y
    new Keystroke((evt, state, editor) => {
        if ((!evt.ctrlKey && !evt.metaKey) || evt.altKey) {
            return false;
        }


        let action;
        if (evt.key.toLowerCase() == "y")
            action = 'redo';
        if (evt.key.toLowerCase() == "z")
            action = evt.shiftKey ? 'redo' : 'undo';

        if (action) {
            evt.preventDefault();
            setTimeout(() => editor.undoMgr[action](), 10);
            return true;
        }
        return false;
    }),

    // Bracket matching  () {} []
    new Keystroke((evt, state, editor) => {
        if ((!evt.ctrlKey && !evt.metaKey) || evt.altKey) {
            return false;
        }

        const isInPrism = editor.selectionMgr;

        // let action;
        let boundChars: [string, string];

        switch(evt.key) {
            case ("("): boundChars = ["(", ")"]; break;
            case ("{"): boundChars = ["{", "}"]; break;
            case ("["): boundChars = ["[", "]"]; break;
            case ("<"): boundChars = ["<", ">"]; break;
        }

        if (boundChars) {

        }

        //     action = 'redo';
        // if (evt.key.toLowerCase() == "y")
        //     action = evt.shiftKey ? 'redo' : 'undo';

        // if (action) {
        //     evt.preventDefault();
        //     setTimeout(() => editor.undoMgr[action](), 10);
        //     return true;
        // }
        return false;
    }),

    // TAB
    new Keystroke((evt, state, editor) => {
        if (evt.key !== 'Tab' || evt.metaKey || evt.ctrlKey) {
            return false;
        }

        const strSplice = (str: string, i: number, remove: number, add = '') =>
            str.slice(0, i) + add + str.slice(i + (+remove || 0));

        evt.preventDefault();
        const isInverse = evt.shiftKey;
        const lf = state.before.lastIndexOf('\n') + 1;
        const indentText = ''.padStart(editor.ngEditor.tabSize, editor.ngEditor.tabChar);

        if (isInverse) {
            if (/\s/.test(state.before.charAt(lf))) {
                state.before = strSplice(state.before, lf, editor.ngEditor.tabSize);
            }
            state.selection = state.selection.replace(new RegExp(`^([ ]{${editor.ngEditor.tabSize}}|\t)`, 'gm'), '');
        }
        else if (state.selection) {
            // const beforeLen = state.selection.length;
            state.before = strSplice(state.before, lf, 0, indentText);
            state.selection = state.selection.replace(/\n(?=[\s\S])/g, '\n' + indentText);
            // const newChars = state.selection.length - beforeLen;

            // editor.getNodeAtIndex()
            // const sel = window.getSelection();
            // sel.extend(sel.anchorNode, sel.anchorOffset + newChars);
        }
        else {
            state.before += indentText;
        }
        return true;
    }),

    // ENTER
    new Keystroke((evt, state, editor) => {
        if (evt.key !== 'Enter') {
            clearNewline = false;

            return false;
        }

        const lf = state.before.lastIndexOf('\n') + 1;
        if (clearNewline) {
            state.before = state.before.substring(0, lf);
            state.selection = '';
            clearNewline = false;

            return true;
        }

        clearNewline = false;
        const previousLine = state.before.slice(lf);
        const currentLine = state.after.slice(0, state.after.indexOf('\n'));
        const indent = previousLine.match(/^\s*/)[0];

        const listRx = /^\s*[-*]\s*\S?/;
        const orderedListRx = /^\s*\d+\.\s*\S?/;
        const checkListRx = /^\s*-\s*\[[ xX]?\]\s*\S?/;

        const isList        = listRx.test(previousLine) && !listRx.test(currentLine);
        const isOrderedList = orderedListRx.test(previousLine) && !orderedListRx.test(currentLine);
        const isCheckList   = checkListRx.test(previousLine) && !checkListRx.test(currentLine);

        editor.undoMgr.setCurrentMode('single');

        let prefix = '';
        if (isList) prefix = '- ';
        if (isOrderedList) {
            const prevNumber = previousLine.match(/^\s*(?<num>\d+)\.\s*\S/)?.groups?.['num'];

            let num = parseInt(prevNumber);
            if (Number.isNaN(num))
                num = 1;
            prefix = num + '. ';
        }
        if (isCheckList) prefix = '- [ ] ';

        if (indent.length > 0 || isList || isOrderedList || isCheckList)
            clearNewline = true;

        state.before += `\n${indent}${prefix}`;
        state.selection = '';
        evt.preventDefault();

        setTimeout(() => {
            editor.selectionMgr.updateCursorCoordinates(true)
        }, 1);

        return true;
    }),

    // BACKSPACE, DELETE
    new Keystroke((evt, state, editor) => {
        if (evt.key !== 'Backspace' && evt.key !== 'Delete') {
            return false;
        }

        editor.undoMgr.setCurrentMode('delete');
        if (!state.selection) {
            const isJump = (isMac && evt.altKey) || (!isMac && evt.ctrlKey);
            if (isJump) {
                // Custom kill word behavior
                const text = state.before + state.after;
                const offset = getNextWordOffset(text, state.before.length, evt.key === 'Backspace');
                if (evt.key === 'Backspace') {
                    state.before = state.before.slice(0, offset);
                }
                else {
                    state.after = state.after.slice(offset - text.length);
                }
                return true;
            }
            else if (evt.key == 'Backspace' && state.before.slice(-1) === '\n') {
                // Special treatment for end of lines
                state.before = state.before.slice(0, -1);
                evt.preventDefault();
                return true;
            }
            else if (evt.key == 'Delete' && state.after.slice(0, 1) === '\n') {
                state.after = state.after.slice(1);
                evt.preventDefault();
                return true;
            }
            return false;
        }
        else {
            state.selection = '';
            return true;
        }
    }),

    // LEFT_ARROW, RIGHT_ARROW
    new Keystroke((evt, state, editor) => {
        if (evt.code !== 'ArrowLeft' && evt.code !== 'ArrowRight') {
            return false;
        }
        const isJump = (isMac && evt.altKey) || (!isMac && evt.ctrlKey);
        if (!isJump) {
            return false;
        }

        // Custom jump behavior
        const textContent = editor.getContent();
        const offset = getNextWordOffset(
            textContent,
            editor.selectionMgr.selectionEnd,
            evt.code == "ArrowLeft",
        );
        if (evt.shiftKey) {
            // rebuild the state completely
            const min = Math.min(editor.selectionMgr.selectionStart, offset);
            const max = Math.max(editor.selectionMgr.selectionStart, offset);
            state.before = textContent.slice(0, min);
            state.after = textContent.slice(max);
            state.selection = textContent.slice(min, max);
            state.isBackwardSelection = editor.selectionMgr.selectionStart > offset;
        }
        else {
            state.before = textContent.slice(0, offset);
            state.after = textContent.slice(offset);
            state.selection = '';
        }
        evt.preventDefault();
        return true;
    }),
];
