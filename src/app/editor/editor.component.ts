import { Component, EventEmitter, Input, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TooltipDirective, MenuDirective } from '@dotglitch/ngx-common';

import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { Editor } from './editor';

@Component({
    selector: 'ngx-stackedit',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss'],
    imports: [
        NgIf,
        NgFor,
        NgClass,
        NgStyle,
        MatIconModule,
        MatTooltipModule,
        TooltipDirective,
        MenuDirective,
        ToolbarComponent
    ],
    standalone: true
})
export class StackEditorComponent {

    @ViewChild(ToolbarComponent) toolbar: ToolbarComponent;

    get $el() { return this.viewContainer.element.nativeElement as HTMLElement }

    /**
     * What mode should the editor be in.
     * - Possible values are `edit` | `view`
     * - Default `edit`
     */
    @Input() mode: "edit" | "view" = "edit";

    /**
     * Initial value of the editor.
     * 2-way binding capable.
     */
    @Input() value: string = '';
    /**
     * Emits when the value of the editor changed.
     * Can be used standalone or in 2-way binding.
     */
    @Output() valueChange = new EventEmitter<string>();

    /**
     * Emits when a file is pasted and needs to be uploaded.
     */
    @Output() onFileUpload = new EventEmitter<string>();

    /**
     * Emits when the user uploads an image via file upload.
     */
    @Output() onImageUpload = new EventEmitter<any>();

    editorSvc: Editor;

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
        buttonBarWidth: 2,
        statusBarHeight: 20,
    }


    constructor(
        private readonly viewContainer: ViewContainerRef,
    ) {

    }

    ngAfterViewInit() {
        const editorElt = this.$el.querySelector('.editor__inner') as HTMLElement;
        const previewElt = this.$el.querySelector('.preview__inner-2') as HTMLElement;
        const tocElt = this.$el.querySelector('.toc__inner') as HTMLElement;
        this.editorSvc = new Editor(this, editorElt, previewElt, tocElt);
        this.toolbar.bindEditorEvents();

        // Focus on the editor every time reader mode is disabled
        const focus = () => {
            if (this.styles.showEditor) {
                this.editorSvc.clEditor.focus();
            }
        };
        setTimeout(focus, 100);
        // this.$watch(() => this.styles.showEditor, focus);

        this.editorSvc.clEditor.focus();

        // Bind the 'value' property
        this.editorSvc.clEditor.setContent(this.value);
        this.editorSvc.clEditor.on('contentChanged', (content, diffs, sectionList) => {
            this.valueChange.next(content);
        });
    }

    finalizeImageUpload({ label, link }) {
        const text = `![${label}](${link})`;
        this.editorSvc.clEditor.replaceAll(/```img-spinner```/gs, text);
    }
}
