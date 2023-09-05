import { Component, EventEmitter, HostListener, Input, OnInit, Output, ViewContainerRef } from '@angular/core';

import editorSvc from './editorSvc';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TooltipDirective, MenuDirective, MenuItem, KeyboardService } from '@dotglitch/ngx-common';
import { Subscription } from 'rxjs';

window['editorSvc'] = editorSvc

@Component({
    selector: 'app-editor',
    templateUrl: './editor.component.html',
    styleUrls: [
        './editor.component.scss',
        './palette.scss'
    ],
    imports: [
        NgIf,
        NgFor,
        NgClass,
        NgStyle,
        MatIconModule,
        TooltipDirective,
        MenuDirective
    ],
    standalone: true
})
export class EditorComponent implements OnInit {

    get $el() { return this.viewContainer.element.nativeElement as HTMLElement }

    @Input() value: string = '';
    @Output() valueChange = new EventEmitter<string>();

    readonly colorList = [
        // Gray  red     yellow  green   gcyan   lblue   dblue   violet  puke    brown
        "#000000 #4c4c4c #666666 #808080 #999999 #b3b3b3 #cccccc #e6e6e6 #f2f2f2 #ffffff".split(' '),
        "#d4dae4 #ffcdd2 #f9e6ad #bce4ce #bdf0e9 #b3e5fc #aec1ff #c5c0da #d6bdcc #d2c5c1".split(' '),
        "#b0b8cd #fe9998 #f4d679 #90d2af #92e7dc #81d4fa #88a3f9 #9f97c1 #c492ac #b4a09a".split(' '),
        "#949db1 #f35c4e #edb90f #33b579 #02d7c5 #29b6f6 #5874cd #7e6bad #a9537c #826358".split(' '),
        "#727a8c #e94633 #eaa100 #36955f #11b3a5 #039be5 #2349ae #584a8f #963a64 #624339".split(' '),
        "#5e6677 #d73c2d #ea8f00 #247346 #018b80 #0288d1 #163fa2 #4f4083 #81355a #5d4037".split(' '),
        "#3f4757 #ca3626 #ea7e00 #1d5b38 #026b60 #0277bd #083596 #473776 #6e3051 #4e342e".split(' '),
        "#1d2534 #bb2b1a #ea5d00 #17492d #024f43 #01579b #002381 #3a265f #4c2640 #3e2723".split(' ')


        // ...[
        //     'A700',
        //     'A400',
        //     'A200',
        //     'A100'
        // ].map(n => 'red.pink.purple.indigo.cyan.teal.lightGreen.yellow.orange'.split('.').map(c => c+'-'+n))
        // 'grey-900',
        // 'grey-600',
        // 'grey-400',
        // 'grey-50',
    ]

    wrapText(before = '', after = '', indent?: number, insertNewline = false) {
        const { selectionStart, selectionEnd } = editorSvc.clEditor.selectionMgr;
        let text = editorSvc.clEditor.getContent() as string;

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
            editorSvc.clEditor.selectionMgr.selectionStart += before.length;
            editorSvc.clEditor.selectionMgr.selectionEnd += before.length;

            // Clear before and after to re-use the result logic.
            before = '';
            after = '';
            indent = null;
            insertNewline = false;
        }
        else {
            editorSvc.clEditor.selectionMgr.selectionStart += before.length;
            editorSvc.clEditor.selectionMgr.selectionEnd += before.length;
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

        editorSvc.clEditor.setContent(patchedText);
    }

    /**
     * Replace the current selection with the given text.
     */
    replaceText(text: string) {
        const { selectionStart, selectionEnd } = editorSvc.clEditor.selectionMgr;
        let content = editorSvc.clEditor.getContent() as string;

        const startIndex = Math.min(selectionStart, selectionEnd);
        const endIndex = Math.max(selectionStart, selectionEnd);

        const preString = content.slice(0, startIndex);
        const postString = content.slice(endIndex);

        const patchedText =
            preString +
            text +
            postString;

        editorSvc.clEditor.setContent(patchedText);
    }

    injectHeading(size: number) {
        const headerString = ''.padStart(size, '#') + ' ';
        this.wrapText(headerString, '', null, true);
    }

    textSizeMenu: MenuItem[] = [
        { label: "Heading 1", action: () => this.injectHeading(1) },
        { label: "Heading 2", action: () => this.injectHeading(2) },
        { label: "Heading 3", action: () => this.injectHeading(3) },
        { label: "Heading 4", action: () => this.injectHeading(4) },
        { label: "Heading 5", action: () => this.injectHeading(5) },
        { label: "Heading 6", action: () => this.injectHeading(6) }
    ];

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

        for (let i = 0; i < rows+2; i++) {
            // Empty cell
            let placeholder = ''.padStart(8 + (cols.toString().length), ' ');
            let cells: string[] = [];

            // If we're on the second row, we place dashes in the cell.
            if (i == 1)
                placeholder = ''.padStart(8 + (cols.toString().length),'-');

            for (let j = 0; j < cols; j++) {
                // If we're on the first row, we use "Heading 1" etc.
                if (i == 0)
                    placeholder = "Heading " + (j+1);

                cells.push(placeholder);
            }

            text.push("| " + cells.join(" | ") + " |");
        }

        const table = text.join('\n');
        this.wrapText('', '\n' + table, null, true)
    }

    diagramMenu: MenuItem[] = [
        { label: "Mermaid Diagrams:"},
        { label: "Examples", link: "https://mermaid.js.org/syntax/examples.html", linkTarget: "_blank" },
        "separator",
        { label: "Flow Chart", action: () => this.wrapText(`\n\`\`\`mermaid
flowchart LR
    markdown[This ** is ** _Markdown_]
    newLines["Line1
    Line 2
    Line 3"]
    markdown --> newLines
\`\`\``) },
        { label: "Sequence Diagram", action: () => this.wrapText(`\n\`\`\`mermaid
sequenceDiagram
Alice->>John: Hello John, how are you?
John-->>Alice: Great!
Alice-)John: See you later!
\`\`\``) },
        { label: "Class Diagram", action: () => this.wrapText(`\n\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()

    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }
\`\`\``) },
        { label: "State Diagram", action: () => this.wrapText(`\n\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]

    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\``) },
        { label: "Entity Relationship Diagram", action: () => this.wrapText(`\n\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
\`\`\``) },
        { label: "User Journey Diagram", action: () => this.wrapText(`\n\`\`\`mermaid
journey
    title My working day
    section Go to work
    Make tea: 5: Me
    Go upstairs: 3: Me
    Do work: 1: Me, Cat
    section Go home
    Go downstairs: 5: Me
    Sit down: 5: Me
\`\`\``) },
        { label: "Gantt Chart", action: () => this.wrapText(`\n\`\`\`mermaid
gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2014-01-12  , 12d
    another task      : 24d
\`\`\``) },
        { label: "Pie Chart", action: () => this.wrapText(`\n\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\``) },
        { label: "Requirement Diagram", action: () => this.wrapText(`\n\`\`\`mermaid
requirementDiagram

    requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
    }

    element test_entity {
    type: simulation
    }

    test_entity - satisfies -> test_req
\`\`\``) },
        { label: "Mindmap", action: () => this.wrapText(`\n\`\`\`mermaid
mindmap
    Root
        A
          B
          C
\`\`\``) },
        { label: "Timeline", action: () => this.wrapText(`\n\`\`\`mermaid
timeline
    title History of Social Media Platform
    2002 : LinkedIn
    2004 : Facebook
        : Google
    2005 : Youtube
    2006 : Twitter
\`\`\``) }
    ];

    editorSvc = editorSvc;

    styles = {
        showNavigationBar: true,
        showEditor: true,
        showSidePreview: true,
        showStatusBar: true,
        showSideBar: false,
        showExplorer: false,
        scrollSync: true,
        focusMode: false,
        findCaseSensitive: false,
        findUseRegexp: false,
        sideBarPanel: 'menu',
        welcomeTourFinished: false,
        layoutOverflow: false,
        innerWidth: window.innerWidth - 500,
        innerHeight: window.innerHeight,
        editorWidth: 800,
        editorGutterWidth: 10,
        editorGutterLeft: 10,
        fontSize: 16,
        previewWidth: 800,
        previewGutterWidth: 10,
        previewGutterLeft: 10,

    };

    constants = {
        editorMinWidth: 320,
        explorerWidth: 260,
        gutterWidth: 250,
        sideBarWidth: 280,
        navigationBarHeight: 44,
        buttonBarWidth: 26,
        statusBarHeight: 20,
    }

    private keybindings: Subscription[] = [];

    constructor(
        private readonly viewContainer: ViewContainerRef,
        private readonly keyboard: KeyboardService
    ) {
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
                label: "Italic",
                key: "i",
                ctrl: true
            }).subscribe(this.italicizeText.bind(this)),
            // this.keyboard.onKeyCommand({
            //     label: "Select All",
            //     key: "/",
            //     ctrl: true
            // }).subscribe(this.insertComment.bind(this)),
            this.keyboard.onKeyCommand({
                label: "Delete Line",
                key: "l",
                ctrl: true
            }).subscribe(this.insertComment.bind(this)),
            this.keyboard.onKeyCommand({
                label: "Duplicate Current Line",
                key: "d",
                ctrl: true,
                shift: true
            }).subscribe(this.insertComment.bind(this)),
            this.keyboard.onKeyCommand({
                label: "BREAKPOINT",
                key: "pause"
            }).subscribe(() => {debugger})
        ];
    }


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

    ngOnInit() {
        // markdownConversionSvc.init(); // Needs to be inited before mount
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

        const { parentElement } = this.editorSvc?.selectionRange?.commonAncestorContainer as Node || {};

        if (!parentElement) return;

        const inheritedClasses = [];
        let currentElement: HTMLElement = parentElement;
        for (let i = 0; i < 10 && !currentElement.classList.contains("cledit-section"); i++) {
            currentElement.classList.forEach(c => inheritedClasses.push(c));
            currentElement = currentElement.parentElement;
        }

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].some(c => inheritedClasses.includes(c)))
            this.cursorIsInHeading = true;
        if (inheritedClasses.includes("bold"))
            this.cursorIsInBold = true;
        if (inheritedClasses.includes("italic"))
            this.cursorIsInItalic = true;
        if (inheritedClasses.includes("strike"))
            this.cursorIsInStrikethrough = true;
        if (inheritedClasses.includes("blockquote"))
            this.cursorIsInBlockquote = true;
        if (inheritedClasses.includes("bold"))
            this.cursorIsInLink = true;

        // These need custom markdown highlighting to work properly
        if (inheritedClasses.includes("1"))
            this.cursorIsInOrderedList = true;
        if (inheritedClasses.includes("1"))
            this.cursorIsInList = true;
        if (inheritedClasses.includes("1"))
            this.cursorIsInChecklist = true;

        // Needs custom highlighting
        if (inheritedClasses.includes("table"))
            this.cursorIsInTable = true;

        if (inheritedClasses.includes("code-snippet"))
            this.cursorIsInInlineCode = true;
        if (inheritedClasses.includes("code-block"))
            this.cursorIsInCode = true;
    }

    ngAfterViewInit() {
        const editorElt = this.$el.querySelector('.editor__inner');
        const previewElt = this.$el.querySelector('.preview__inner-2');
        const tocElt = this.$el.querySelector('.toc__inner');
        editorSvc.init(editorElt, previewElt, tocElt);

        // Focus on the editor every time reader mode is disabled
        const focus = () => {
            if (this.styles.showEditor) {
                editorSvc.clEditor.focus();
            }
        };
        setTimeout(focus, 100);
        // this.$watch(() => this.styles.showEditor, focus);

        editorSvc.clEditor.focus();

        // Bind the 'value' property
        editorSvc.clEditor.setContent(this.value);
        editorSvc.clEditor.on('contentChanged', (content, diffs, sectionList) => {
            this.valueChange.next(content);
        });

        // Handle cursor position updates
        editorSvc.clEditor.selectionMgr.on("cursorCoordinatesChanged", this.onSelectionChange.bind(this))
    }

    ngOnDestroy() {
        this.keybindings.forEach(k => k.unsubscribe());
    }
}
