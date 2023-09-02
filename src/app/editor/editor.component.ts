import { Component, OnInit, ViewContainerRef } from '@angular/core';

import editorSvc from './editorSvc'
import markdownConversionSvc from 'src/app/editor/markdownConversionSvc';
import { NgClass, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TooltipDirective, MenuDirective, MenuItem } from '@dotglitch/ngx-common';

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


    wrapText(before = '', after = '', indent?: number) {
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

            // Clear before and after to re-use the result logic.
            before = '';
            after = '';
            indent = null;
        }

        let updatedSelection = selectionText;

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
        this.wrapText(headerString);
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
        this.wrapText("> ", '', 2);
    }

    insertLink() {

    }

    insertOrderedList() {
        this.wrapText("1. ", '', 3);
    }

    insertList() {
        this.wrapText(" - ", '', 3);
    }

    insertCheckList() {
        this.wrapText(" - [ ]", '', 6);
    }

    insertInlineCode() {
        this.wrapText("`", "`");
    }

    insertCodeBlock() {
        // TODO: align to start of line
        this.wrapText("```", "```");
    }


    tableMenu: MenuItem[] = [
        { label: "", }
    ];

    diagramMenu: MenuItem[] = [
        { label: "", }
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

    constructor(private viewContainer: ViewContainerRef) { }

    ngOnInit() {
        markdownConversionSvc.init(); // Needs to be inited before mount
        this.updateBodySize();

        window.addEventListener('resize', this.updateBodySize);
        window.addEventListener('keyup', this.saveSelection);
        window.addEventListener('mouseup', this.saveSelection);
        window.addEventListener('focusin', this.saveSelection);
        window.addEventListener('contextmenu', this.saveSelection);
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

        // editorSvc.clEditor.focus();
    }

    ngOnDestroy() {
        // window.removeEventListener('resize', this.updateStyle);
        window.removeEventListener('keyup', this.saveSelection);
        window.removeEventListener('mouseup', this.saveSelection);
        window.removeEventListener('focusin', this.saveSelection);
        window.removeEventListener('contextmenu', this.saveSelection);
    }

    saveSelection = () => editorSvc.saveSelection(true);

    updateBodySize() {
        // unknown
    }
}
