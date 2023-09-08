import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MenuDirective, MenuItem, TooltipDirective } from '@dotglitch/ngx-common';

import mermaidLayouts from './mermaid-layouts';
import { NgForOf, NgIf } from '@angular/common';

@Component({
    selector: 'app-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
    imports: [
        NgIf,
        NgForOf,
        MatIconModule,
        MatTooltipModule,
        TooltipDirective,
        MenuDirective
    ],
    standalone: true
})
export class ToolbarComponent {

    @Input() editorSvc;

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
        { label: "Examples", link: "https://mermaid.js.org/syntax/examples.html", linkTarget: "_blank" },
        "separator",
        ...mermaidLayouts.map(l => ({
            label: l.label,
            action: () => this.wrapText(l.value, null, null, true)
        }))
    ];

    cursorIsInHeading = false;
    cursorIsInBold = false;
    cursorIsInItalic = false;
    cursorIsInStrikethrough = false;
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
        this.wrapText(`<span style="color: ${color}">`, "</span>");
    }

    setTextFont(font: string) {
        this.wrapText(`<span style="font-family: ${font}">`, "</span>");
    }

    boldText() {
        this.wrapText("**", "**");
    }

    italicizeText() {
        this.wrapText("*", "*");
    }

    strikethroughText() {
        this.wrapText("~~", "~~");
    }

    blockQuoteText() {
        this.wrapText("> ", '\n', 2, true);
    }

    insertLink(url, label) {
        this.replaceText(`[${label}](${url})`);
    }

    insertOrderedList() {
        this.wrapText("1. ", '', 3, true);
    }

    insertList() {
        this.wrapText(" - ", '', 3, true);
    }

    insertCheckList() {
        this.wrapText(" - [ ] ", '', 7, true);
    }

    insertInlineCode() {
        this.wrapText("`", "`");
    }

    insertCodeBlock() {
        // TODO: align to start of line
        this.wrapText("```\n", "\n```", null, true);
    }
    insertComment() {
        this.wrapText("<!-- ", " -->", null, true);
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
        this.wrapText('', '\n' + table, null, true);
    }



    constructor() { }

    ngOnInit() {
        // Handle cursor position updates
        this.editorSvc.$on("selectionRange", this.onSelectionChange.bind(this))
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
        if (this.editorSvc.clEditor.selectionMgr.selectionStart != this.editorSvc.clEditor.selectionMgr.selectionEnd) {
            return;
        }

        const { parentElement } = this.editorSvc?.selectionRange?.commonAncestorContainer as Node || {};

        if (!parentElement) return;

        const inheritedClasses = [];
        let currentElement: HTMLElement = parentElement;
        for (let i = 0; i < 10 && !currentElement.classList.contains("cledit-section"); i++) {
            currentElement.classList.forEach(c => inheritedClasses.push(c));
            currentElement = currentElement.parentElement;
        }

        const content = this.editorSvc.clEditor.getContent();
        const matches = content.substring(0, this.editorSvc.clEditor.selectionMgr.selectionStart).split('\n');
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


    wrapText(before = '', after = '', indent?: number, insertNewline = false) {
        const { selectionStart, selectionEnd } = this.editorSvc.clEditor.selectionMgr;
        let text = this.editorSvc.clEditor.getContent() as string;

        const startIndex = Math.min(selectionStart, selectionEnd);
        const endIndex = Math.max(selectionStart, selectionEnd);

        const selectionText = text.slice(startIndex, endIndex);
        let preString = text.slice(0, startIndex);
        let postString = text.slice(endIndex);

        // Check if this is a duplicate invocation that should remove the decoration effect
        if (preString.endsWith(before) && postString.startsWith(after)) {
            // Strip out the symbols
            preString = preString.slice(0, preString.length - before.length);
            postString = postString.slice(after.length);

            // Move the selection to what it will be after removing the text
            this.editorSvc.clEditor.selectionMgr.selectionStart += before.length;
            this.editorSvc.clEditor.selectionMgr.selectionEnd += before.length;

            // Clear before and after to re-use the result logic.
            before = '';
            after = '';
            indent = null;
            insertNewline = false;
        }
        else {
            this.editorSvc.clEditor.selectionMgr.selectionStart += before.length;
            this.editorSvc.clEditor.selectionMgr.selectionEnd += before.length;
        }

        let updatedSelection = selectionText;

        if (insertNewline) {
            // Insert a newline at the start if we're in the middle of a selection.
            if (!updatedSelection.startsWith('\n'))
                updatedSelection = "\n" + updatedSelection;
        }


        if (indent) {
            // Indent all lines in the selection
            updatedSelection = selectionText.split('\n').map(l => ''.padStart(indent, ' ') + l).join('\n');
        }

        const patchedText =
            preString +
            before +
            updatedSelection +
            after +
            postString;

        this.editorSvc.clEditor.setContent(patchedText);
        this.editorSvc.clEditor.selectionMgr.setSelectionStartEnd(selectionStart + before, selectionEnd + after);
    }

    /**
     * Replace the current selection with the given text.
     */
    replaceText(text: string) {
        const { selectionStart, selectionEnd } = this.editorSvc.clEditor.selectionMgr;
        let content = this.editorSvc.clEditor.getContent() as string;

        const startIndex = Math.min(selectionStart, selectionEnd);
        const endIndex = Math.max(selectionStart, selectionEnd);

        const preString = content.slice(0, startIndex);
        const postString = content.slice(endIndex);

        const patchedText =
            preString +
            text +
            postString;

        this.editorSvc.clEditor.setContent(patchedText);
    }

    injectHeading(size: number) {
        const headerString = ''.padStart(size, '#') + ' ';
        this.wrapText(headerString, '', null, true);
    }

}
