import { Component, OnInit, ViewContainerRef } from '@angular/core';

import editorSvc from './editorSvc'
import markdownConversionSvc from 'src/app/editor/markdownConversionSvc';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  imports: [
    NgClass,
    NgStyle
  ],
  standalone: true
})
export class EditorComponent implements OnInit {

    get $el() { return this.viewContainer.element.nativeElement as HTMLElement }

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
