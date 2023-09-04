import { Component, EventEmitter, HostListener, Input, OnInit, Output, ViewContainerRef } from '@angular/core';

import editorSvc from './editorSvc'
import markdownConversionSvc from 'src/app/editor/markdownConversionSvc';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TooltipDirective, MenuDirective, MenuItem, KeyboardService } from '@dotglitch/ngx-common';
import { Subscription } from 'rxjs';

window['editorSvc'] = editorSvc

const pagedownHandler = name => () => {
    editorSvc.pagedownEditor.uiManager.doClick(name);
    return true;
};

@Component({
    selector: 'app-editor',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss'],
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

    colorizeText() {

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

    insertLink() {

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
      * | Heading |     |
        | ---     | --- |
        |         |     |
     */
    insertTable(cols: number, rows: number) {

    }

    diagramMenu: MenuItem[] = [
        { label: "Mermaid Diagrams:"},
        "separator",
        { label: "Examples", link: "https://mermaid.js.org/syntax/examples.html", linkTarget: "_blank" },
        { label: "Flow Chart", action: () => this.wrapText(`\`\`\`mermaid
flowchart LR
    markdown["\`This ** is ** _Markdown_\`"]
    newLines["\`Line1
    Line 2
    Line 3\`"]
    markdown --> newLines
\`\`\``) },
        { label: "Sequence Diagram", action: () => this.wrapText(`\`\`\`mermaid
sequenceDiagram
Alice->>John: Hello John, how are you?
John-->>Alice: Great!
Alice-)John: See you later!
\`\`\``) },
        { label: "Class Diagram", action: () => this.wrapText(`\`\`\`mermaid
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
        { label: "State Diagram", action: () => this.wrapText(`\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]

    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\``) },
        { label: "Entity Relationship Diagram", action: () => this.wrapText(`\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
\`\`\``) },
        { label: "User Journey Diagram", action: () => this.wrapText(`\`\`\`mermaid
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
        { label: "Gantt Chart", action: () => this.wrapText(`\`\`\`mermaid
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
        { label: "Pie Chart", action: () => this.wrapText(`\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\``) },
        { label: "Quadrant Chart", action: () => this.wrapText(`\`\`\`mermaid
quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]
\`\`\``) },
        { label: "Requirement Diagram", action: () => this.wrapText(`\`\`\`mermaid
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
        { label: "Mindmap", action: () => this.wrapText(`\`\`\`mermaid
mindmap
      Root
          A
            B
            C
\`\`\``) },
        { label: "Timeline", action: () => this.wrapText(`\`\`\`mermaid
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
            }).subscribe(this.insertComment.bind(this))
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

    ngOnInit() {
        markdownConversionSvc.init(); // Needs to be inited before mount

        // Track the current state of the cursor
        window.addEventListener('keyup', this.onSelectionChange.bind(this));
        window.addEventListener('click', this.onSelectionChange.bind(this));
    }

    @HostListener("document:keyup")
    @HostListener("document:pointerup")
    async onSelectionChange() {
        // this.editorSvc.selectionManager.on("selectionChanged", async (start, end, range) => {
        const text = this.editorSvc.clEditor.getContent();
        const lines = text.split('\n');

        // const { selectionStart, selectionEnd } = editorSvc.clEditor.selectionMgr;

        // const startLineNo = text.slice(0, selectionStart).match(/[\r\n]/g)?.length;
        // const endLineNo = text.slice(0, selectionEnd).match(/[\r\n]/g)?.length;

        // const selectedLine = text[startLineNo];

        const { parentElement } = this.editorSvc.selectionRange.commonAncestorContainer as Node;

        const inheritedClasses = [];
        let currentElement: HTMLElement = parentElement;
        for (let i = 0; i < 10 && !currentElement.classList.contains("cledit-section"); i++) {
            currentElement.classList.forEach(c => inheritedClasses.push(c));
            currentElement = currentElement.parentElement;
        }

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
    }

    ngOnDestroy() {
        this.keybindings.forEach(k => k.unsubscribe());
    }
}
