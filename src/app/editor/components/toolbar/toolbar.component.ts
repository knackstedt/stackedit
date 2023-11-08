import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { KeyboardService, MenuDirective, MenuItem, ThemeService, TooltipDirective } from '@dotglitch/ngx-common';

import mermaidLayouts from './mermaid-layouts';
import { NgForOf, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { StackEditorComponent } from '../../editor.component';
import { MatDialog } from '@angular/material/dialog';
import { ImageInsertComponent } from './image-insert/image-insert.component';
import { LinkInsertComponent } from './link-insert/link-insert.component';

@Component({
    selector: 'app-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
    imports: [
        NgIf,
        NgForOf,
        MatIconModule,
        MatTooltipModule,
        MatButtonModule,
        TooltipDirective,
        MenuDirective
    ],
    standalone: true
})
export class ToolbarComponent {
    get editor() { return this.stackEditor.editorSvc.clEditor }
    get wrapSelection() {
        return this.editor.wrapSelection.bind(this.editor) as typeof this.editor.wrapSelection;
    }

    // 2D array of color hex codes that show up for the color picker.
    @Input() colorList = [
        // Gray  red     yellow  green   gcyan   lblue   dblue   violet  puke    brown
        "#000000 #4c4c4c #666666 #808080 #999999 #b3b3b3 #cccccc #e6e6e6 #f2f2f2 #ffffff".split(' '),
        "#d4dae4 #ffcdd2 #f9e6ad #bce4ce #bdf0e9 #b3e5fc #aec1ff #c5c0da #d6bdcc #d2c5c1".split(' '),
        "#b0b8cd #fe9998 #f4d679 #90d2af #92e7dc #81d4fa #88a3f9 #9f97c1 #c492ac #b4a09a".split(' '),
        "#949db1 #f35c4e #edb90f #33b579 #02d7c5 #29b6f6 #5874cd #7e6bad #a9537c #826358".split(' '),
        "#727a8c #e94633 #eaa100 #36955f #11b3a5 #039be5 #2349ae #584a8f #963a64 #624339".split(' '),
        "#5e6677 #d73c2d #ea8f00 #247346 #018b80 #0288d1 #163fa2 #4f4083 #81355a #5d4037".split(' '),
        "#3f4757 #ca3626 #ea7e00 #1d5b38 #026b60 #0277bd #083596 #473776 #6e3051 #4e342e".split(' '),
        "#1d2534 #bb2b1a #ea5d00 #17492d #024f43 #01579b #002381 #3a265f #4c2640 #3e2723".split(' ')
    ];

    textSizeMenu: MenuItem[] = [
        { label: "Heading 1", action: () => this.injectHeading(1) },
        { label: "Heading 2", action: () => this.injectHeading(2) },
        { label: "Heading 3", action: () => this.injectHeading(3) },
        { label: "Heading 4", action: () => this.injectHeading(4) },
        { label: "Heading 5", action: () => this.injectHeading(5) },
        { label: "Heading 6", action: () => this.injectHeading(6) }
    ];

    diagramMenu: MenuItem[] = [
        { label: "Mermaid Diagrams:" },
        { label: "Live Editor", link: "https://mermaid.live/edit", linkTarget: "_blank" },
        { label: "Examples", link: "https://mermaid.js.org/syntax/examples.html", linkTarget: "_blank" },
        "separator",
        ...mermaidLayouts.map(l => ({
            label: l.label,
            action: () => this.wrapSelection(l.value, '', null, true)
        }))
    ];

    cursorIsInHeading = false;
    cursorIsInBold = false;
    cursorIsInItalic = false;
    cursorIsInStrikethrough = false;
    cursorIsInUnderline = false;
    cursorIsInBlockquote = false;
    cursorIsInLink = false;
    cursorIsInOrderedList = false;
    cursorIsInList = false;
    cursorIsInChecklist = false;
    cursorIsInTable = false;
    cursorIsInInlineCode = false;
    cursorIsInCode = false;
    currentTextColor = "#f00";


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
        this.wrapSelection("> ", '', 2, true);
    }

    insertOrderedList() {
        this.wrapSelection(" 1. ", '', 4, true);
    }

    insertList() {
        this.wrapSelection(" - ", '', 3, true);
    }

    insertCheckList() {
        this.wrapSelection(" - [ ] ", '', 7, true);
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

    private keybindings: Subscription[] = [];

    constructor(
        private readonly keyboard: KeyboardService,
        public readonly stackEditor: StackEditorComponent,
        private readonly dialog: MatDialog,
        public readonly theme: ThemeService
    ) { }

    bindEditorEvents() {
        // Handle cursor position updates
        this.stackEditor.editorSvc.on("selectionRange", this.onSelectionChange.bind(this))

        this.keybindings = [
            this.keyboard.onKeyCommand({
                label: "Comment",
                key: "/",
                ctrl: true
            }).subscribe(this.insertComment.bind(this)),
            this.keyboard.onKeyCommand({
                label: "Bold",
                key: "b",
                ctrl: true
            }).subscribe(this.boldText.bind(this)),
            this.keyboard.onKeyCommand({
                label: "Bold",
                key: "*",
                ctrl: true
            }).subscribe(() => this.wrapSelection("**", "**")),
            this.keyboard.onKeyCommand({
                label: "Italic",
                key: "i",
                ctrl: true
            }).subscribe(this.italicizeText.bind(this)),
            this.keyboard.onKeyCommand({
                label: "Bold",
                key: "_",
                ctrl: true
            }).subscribe(this.italicizeText.bind(this)),
            // this.keyboard.onKeyCommand({
            //     label: "Select All",
            //     key: "/",
            //     ctrl: true
            // }).subscribe(this.insertComment.bind(this)),
            this.keyboard.onKeyCommand({
                label: "Select Line",
                key: "l",
                ctrl: true
            }).subscribe(() => {
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
                        const nextLine = this.editor.getLine(endLine.lineEnd+1, text);

                        this.editor.selectionMgr.setSelection(startLine.lineStart, nextLine.lineEnd);
                    }
                    // Expand the selection to the start and end of the first and last lines.
                    else {
                        this.editor.selectionMgr.setSelection(startLine.lineStart, endLine.lineEnd);
                    }
                }
            }),
            this.keyboard.onKeyCommand({
                label: "Duplicate Current Line",
                key: "d",
                ctrl: true,
                shift: true
            }).subscribe(() => {
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
                    })
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
                    })
                }
            }),
            this.keyboard.onKeyCommand({
                label: "BREAKPOINT",
                key: "pause"
            }).subscribe(() => {debugger})
        ];
    }

    ngOnDestroy() {
        this.keybindings.forEach(k => k.unsubscribe());
    }

    openImageDialog() {
        this.dialog.open(ImageInsertComponent, { data: { stackEditor: this.stackEditor } })
    }

    openLinkDialog() {
        this.dialog.open(LinkInsertComponent, { data: { stackEditor: this.stackEditor } })
    }

    async onSelectionChange() {
        this.cursorIsInHeading = false;
        this.cursorIsInBold = false;
        this.cursorIsInItalic = false;
        this.cursorIsInStrikethrough = false;
        this.cursorIsInBlockquote = false;
        this.cursorIsInLink = false;
        this.cursorIsInOrderedList = false;
        this.cursorIsInList = false;
        this.cursorIsInChecklist = false;
        this.cursorIsInTable = false;
        this.cursorIsInInlineCode = false;
        this.cursorIsInCode = false;

        // Large selection -- don't perform evaluations
        if (this.stackEditor.editorSvc.clEditor.selectionMgr.selectionStart != this.stackEditor.editorSvc.clEditor.selectionMgr.selectionEnd) {
            return;
        }

        const { parentElement } = this.stackEditor.editorSvc?.selectionRange?.commonAncestorContainer as Node || {};

        if (!parentElement) return;

        const inheritedClasses = [];
        let currentElement: HTMLElement = parentElement;
        for (let i = 0; i < 10 && currentElement && !currentElement.classList.contains("cledit-section"); i++) {
            currentElement.classList.forEach(c => inheritedClasses.push(c));
            currentElement = currentElement.parentElement;
        }

        const content = this.stackEditor.editorSvc.clEditor.getContent();
        const matches = content.substring(0, this.stackEditor.editorSvc.clEditor.selectionMgr.selectionStart).split('\n');
        const currentLine = matches?.slice(-1)?.[0];

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].some(c => inheritedClasses.includes(c)))
            this.cursorIsInHeading = true;
        if (inheritedClasses.includes("bold"))
            this.cursorIsInBold = true;
        if (inheritedClasses.includes("italic"))
            this.cursorIsInItalic = true;
        if (inheritedClasses.includes("strike"))
            this.cursorIsInStrikethrough = true;
        if (inheritedClasses.includes("blockquote") || currentLine.match(/^\s*>\s*/))
            this.cursorIsInBlockquote = true;
        if (inheritedClasses.includes("bold"))
            this.cursorIsInLink = true;

        // TODO: This detection will not work for nested items
        // These need custom markdown highlighting to work properly
        if (currentLine.match(/^\s*\d+\.\s*/))
            this.cursorIsInOrderedList = true;
        if (currentLine.match(/^\s*[\-*]\s*/))
            this.cursorIsInList = true;
        if (currentLine.match(/^\s*[\-*]\s*\[[ xX*]?\]\s*/)) {
            this.cursorIsInList = false;
            this.cursorIsInChecklist = true;
        }

        // Needs custom highlighting
        if (inheritedClasses.includes("table"))
            this.cursorIsInTable = true;

        if (inheritedClasses.includes("code-snippet"))
            this.cursorIsInInlineCode = true;
        if (inheritedClasses.includes("code-block"))
            this.cursorIsInCode = true;
    }

    injectHeading(size: number) {
        const headerString = ''.padStart(size, '#') + ' ';
        this.wrapSelection(headerString, '', null, true);
    }

    toggleTOC() {
        this.stackEditor.showToc = !this.stackEditor.showToc;
    }

    toggleEditor() {
        this.stackEditor.mode = this.stackEditor.mode == 'view' ? 'edit' : 'view';
        if (this.stackEditor.mode == 'view' && !this.stackEditor.showPreview)
            this.stackEditor.showPreview = !this.stackEditor.showPreview;
    }

    togglePreview() {
        this.stackEditor.showPreview = !this.stackEditor.showPreview;
        if (this.stackEditor.mode == 'view' && !this.stackEditor.showPreview)
            this.stackEditor.mode = this.stackEditor.mode == 'view' ? 'edit' : 'view';
    }
}
