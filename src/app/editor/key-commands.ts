import { CommandAction, CommandPaletteService } from '@dotglitch/ngx-common';
import { StackEditorComponent } from './editor.component';
import { EditorActions } from './editor-actions';
import { MatDialog } from '@angular/material/dialog';

export class KeyCommands {
    get editor() { return this.stackEditor.editorSvc.clEditor; }
    get wrapSelection() {
        return this.editor.wrapSelection.bind(this.editor) as typeof this.editor.wrapSelection;
    }

    private actions: EditorActions = new EditorActions();

    constructor(
        private readonly element: HTMLElement,
        private readonly commandPalette: CommandPaletteService,
        private readonly stackEditor: StackEditorComponent,
        private readonly dialog: MatDialog
    ) {
        commandPalette.initialize({
            keybind: "ctrl+p"
        });

        commandPalette.attachElementCommands(element, this.commands);

        this.actions.stackEditor = stackEditor;
        this.actions.dialog = dialog;
    }

    dispose() {
        this.commandPalette.detachElementCommands(this.element, this.commands);
    }

    private readonly commands: CommandAction[] = [
        {
            label: "Insert Comment",
            shortcutKey: "ctrl+slash",
            action: this.actions.insertComment.bind(this)
        },
        {
            label: "Bold Text",
            shortcutKey: "ctrl+b",
            action: this.actions.boldText.bind(this)
        },
        // {
        //     label: "Bold",
        //     shortcutKey: "ctrl+*",
        //     action: () => this.wrapSelection("**", "**")
        // },
        // {
        //     label: "Italic",
        //     shortcutKey: "ctrl+i",
        //     ctrl: true,
        //     action: this.italicizeText.bind(this)
        // },
        // {
        //     label: "Bold",
        //     shortcutKey: "ctrl+_",
        //     ctrl: true,
        //     action: this.italicizeText.bind(this)
        // },
        // {
        //     label: "Select All",
        //     key: "/",
        //     ctrl: true
        // action: this.insertComment.bind(this)
        // }
        {
            label: "Select Line",
            shortcutKey: "ctrl+l",
            action: () => {
                const text = this.editor.getContent();
                const { selectionStart, selectionEnd } = this.editor.selectionMgr;

                // select the current line
                if (selectionStart == selectionEnd) {
                    const line = this.editor.getLine(selectionStart, text);
                    this.editor.selectionMgr.setSelection(line.lineStart, line.lineEnd);
                }
                // Expand the selection to the start of the first line, and the end of the last line
                // If that is already the case, select the next line below the end.
                else {
                    const startLine = this.editor.getLine(selectionStart, text);
                    const endLine = this.editor.getLine(selectionEnd, text);

                    // Select the next line below the selection
                    if (startLine.lineStart == selectionStart && endLine.lineEnd == selectionEnd) {
                        const nextLine = this.editor.getLine(endLine.lineEnd + 1, text);

                        this.editor.selectionMgr.setSelection(startLine.lineStart, nextLine.lineEnd);
                    }
                    // Expand the selection to the start and end of the first and last lines.
                    else {
                        this.editor.selectionMgr.setSelection(startLine.lineStart, endLine.lineEnd);
                    }
                }
            }
        },
        {
            label: "Duplicate Current Line",
            shortcutKey: "ctrl+shift+d",
            action: () => {
                const text = this.editor.getContent();
                const { selectionStart, selectionEnd } = this.editor.selectionMgr;

                // Duplicate the current line
                if (selectionStart == selectionEnd) {
                    const line = this.editor.getLine(selectionStart, text);
                    const copy = '\n' + line.line;
                    const patched = text.slice(0, line.lineEnd) + copy + text.slice(line.lineEnd);

                    this.editor.setContent(patched);

                    // Run this on the next tick to give the browser time to settle things
                    // Observe an issue on duplicating content at the last line.
                    setTimeout(() => {
                        this.editor.setSelection(selectionStart + copy.length, selectionEnd + copy.length);
                    });
                }
                // Expand the selection to the start of the first line, and the end of the last line
                // Duplicate the contents through the start and the end.
                else {
                    const startLine = this.editor.getLine(selectionStart, text);
                    const endLine = this.editor.getLine(selectionEnd, text);
                    const copyLines = '\n' + text.slice(startLine.lineStart, endLine.lineEnd);
                    const patched = text.slice(0, endLine.lineEnd) + copyLines + text.slice(endLine.lineEnd);

                    this.editor.setContent(patched);

                    // Run this on the next tick to give the browser time to settle things
                    // Observe an issue on duplicating content at the last line.
                    setTimeout(() => {
                        this.editor.setSelection(selectionStart + copyLines.length, selectionEnd + copyLines.length);
                    });
                }
            }
        }
    ]
}
