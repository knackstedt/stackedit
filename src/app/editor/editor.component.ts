import { Component, EventEmitter, HostListener, Input, OnInit, Output, ViewContainerRef } from '@angular/core';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TooltipDirective, MenuDirective } from '@dotglitch/ngx-common';

import editorSvc from './editorSvc';
import { ToolbarComponent } from './components/toolbar/toolbar.component';

window['editorSvc'] = editorSvc

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
export class StackEditorComponent implements OnInit {

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
     * Emits when the user uploads an image via the toolbar dialog.
     */
    @Output() onImageUpload = new EventEmitter<string>();

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
        buttonBarWidth: 2,
        statusBarHeight: 20,
    }


    constructor(
        private readonly viewContainer: ViewContainerRef,
    ) {

    }



    ngOnInit() {
        // markdownConversionSvc.init(); // Needs to be inited before mount
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


}
