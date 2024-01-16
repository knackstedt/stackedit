import { MatDialog } from '@angular/material/dialog';
import { ImageInsertComponent } from './components/toolbar/image-insert/image-insert.component';
import { LinkInsertComponent } from './components/toolbar/link-insert/link-insert.component';
import { StackEditorComponent } from './editor.component';

export class EditorActions {
    get editor() { return this.stackEditor.editorSvc.clEditor; }
    get wrapSelection() {
        return this.editor.wrapSelection.bind(this.editor) as typeof this.editor.wrapSelection;
    }

    colorizeText(color: string) {
        this.wrapSelection(`<span style="color: ${color}">`, "</span>");
    }

    setTextFont(font: string) {
        this.wrapSelection(`<span style="font-family: ${font}">`, "</span>");
    }

    boldText() {
        this.wrapSelection("**", "**");
    }

    italicizeText() {
        this.wrapSelection("_", "_");
    }

    strikethroughText() {
        this.wrapSelection("~~", "~~");
    }

    blockQuoteText() {
        this.wrapSelection("> ", '', null, true);
    }

    insertOrderedList() {
        this.wrapSelection(" 1. ", '', null, true);
    }

    insertList() {
        this.wrapSelection(" - ", '', null, true);
    }

    insertCheckList() {
        this.wrapSelection(" - [ ] ", '', null, true);
    }

    insertInlineCode() {
        this.wrapSelection("`", "`");
    }

    insertCodeBlock() {
        // TODO: align to start of line
        this.wrapSelection("```\n", "\n```", null, true);
    }
    insertComment() {
        this.wrapSelection("<!-- ", " -->", null, true);
    }

    /**
      * | Heading 1 |     |
        | ---       | --- |
        |           |     |
     */
    insertTable(cols: number, rows: number) {
        let text: string[] = [];

        for (let i = 0; i < rows + 2; i++) {
            // Empty cell
            let placeholder = ''.padStart(8 + (cols.toString().length), ' ');
            let cells: string[] = [];

            // If we're on the second row, we place dashes in the cell.
            if (i == 1)
                placeholder = ''.padStart(8 + (cols.toString().length), '-');

            for (let j = 0; j < cols; j++) {
                // If we're on the first row, we use "Heading 1" etc.
                if (i == 0)
                    placeholder = "Heading " + (j + 1);

                cells.push(placeholder);
            }

            text.push("| " + cells.join(" | ") + " |");
        }

        const table = text.join('\n');
        this.wrapSelection('', '\n' + table, null, true);
    }

    openImageDialog() {
        this.dialog.open(ImageInsertComponent, { data: { stackEditor: this.stackEditor } });
    }

    openLinkDialog() {
        this.dialog.open(LinkInsertComponent, { data: { stackEditor: this.stackEditor } });
    }

    constructor(
        public stackEditor?: StackEditorComponent,
        public dialog?: MatDialog
    ) {

    }

}
