import { isMac } from './utils';
import { VanillaMirror } from './vanilla-mirror';

export function Keystroke(handler: (evt: KeyboardEvent, state: any, editor: VanillaMirror) => boolean, priority?) {
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

function getNextWordOffset(text, offset, isBackward) {
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
        } else {
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
        const keyCode = evt.charCode || evt.keyCode;
        const keyCodeChar = String.fromCharCode(keyCode).toLowerCase();
        let action;
        switch (keyCodeChar) {
            case 'y':
                action = 'redo';
                break;
            case 'z':
                action = evt.shiftKey ? 'redo' : 'undo';
                break;
            default:
        }
        if (action) {
            evt.preventDefault();
            setTimeout(() => editor.undoMgr[action](), 10);
            return true;
        }
        return false;
    }),

    // TAB
    new Keystroke((evt, state) => {
        if (evt.code !== 'Tab' || evt.metaKey || evt.ctrlKey) {
            return false;
        }

        const strSplice = (str, i, remove, add = '') =>
            str.slice(0, i) + add + str.slice(i + (+remove || 0));

        evt.preventDefault();
        const isInverse = evt.shiftKey;
        const lf = state.before.lastIndexOf('\n') + 1;
        if (isInverse) {
            if (/\s/.test(state.before.charAt(lf))) {
                state.before = strSplice(state.before, lf, 1);
            }
            state.selection = state.selection.replace(/^[ \t]/gm, '');
        }
        else if (state.selection) {
            state.before = strSplice(state.before, lf, 0, '    ');
            state.selection = state.selection.replace(/\n(?=[\s\S])/g, '\n    ');
        }
        else {
            state.before += '    ';
        }
        return true;
    }),

    // ENTER
    new Keystroke((evt, state, editor) => {
        if (evt.code !== 'Enter') {
            clearNewline = false;
            return false;
        }
        evt.preventDefault();

        const lf = state.before.lastIndexOf('\n') + 1;
        if (clearNewline) {
            state.before = state.before.substring(0, lf);
            state.selection = '';
            clearNewline = false;
            return true;
        }

        clearNewline = false;
        const previousLine = state.before.slice(lf);
        const indent = previousLine.match(/^\s*/)[0];

        const isList        = /^\s*[-*]\s*\S/.test(previousLine);
        const isOrderedList = /^\s*\d+\.\s*\S/.test(previousLine);
        const isCheckList   = /^\s*-\s*\[[ xX]?\]\s*\S/.test(previousLine);

        if (indent.length) {
            clearNewline = true;
        }

        editor.undoMgr.setCurrentMode('single');

        let prefix = '';
        if (isList) prefix = '- ';
        if (isOrderedList) {
            const prevNumber = previousLine.match(/^\s*(?<num>\d+)\.\s*\S/)?.groups?.num;

            let num = parseInt(prevNumber);
            if (Number.isNaN(num))
                num = 1;
            prefix = num + '. ';
        }
        if (isCheckList) prefix = '- [ ] ';

        state.before += `\n${indent}${prefix}`;
        state.selection = '';

        // Trigger scroll update after things have settled
        setTimeout(() => editor.adjustCursorPosition(), 1);
        return true;
    }),

    // BACKSPACE, DELETE
    new Keystroke((evt, state, editor) => {
        if (evt.code !== 'Backspace' && evt.code !== 'Delete') {
            return false;
        }
        // evt.preventDefault();

        editor.undoMgr.setCurrentMode('delete');
        if (!state.selection) {
            const isJump = (isMac && evt.altKey) || (!isMac && evt.ctrlKey);
            if (isJump) {
                // Custom kill word behavior
                const text = state.before + state.after;
                const offset = getNextWordOffset(text, state.before.length, evt.code === 'Backspace');
                if (evt.code === 'Backspace') {
                    state.before = state.before.slice(0, offset);
                }
                else {
                    state.after = state.after.slice(offset - text.length);
                }
                return true;
            }
            else if (evt.code == 'Backspace' && state.before.slice(-1) === '\n') {
                // Special treatment for end of lines
                state.before = state.before.slice(0, -1);
                return true;
            }
            else if (evt.code == 'Delete' && state.after.slice(0, 1) === '\n') {
                state.after = state.after.slice(1);
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
            evt.code == 'ArrowLeft',
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
