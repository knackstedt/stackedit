import { Component, EventEmitter, Inject, InjectionToken, Input, Optional, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TooltipDirective, MenuDirective, ThemeService } from '@dotglitch/ngx-common';
import { MermaidConfig } from 'mermaid';

import { ToolbarComponent } from './components/toolbar/toolbar.component';
// import { StatusbarComponent } from './components/statusbar/statusbar.component';

import { Editor } from './editor';
import { installMonaco, waitForMonacoInstall } from './monaco';
import { Subscription } from 'rxjs';

type StackEditConfig = Partial<{
    /**
     * Mermaid chart configuration
     */
    mermaid: MermaidConfig,
    /**
     * Set to `true` to disable loading Mermaid.
     * Will automatically reduce bundle
     */
    disableMermaid: boolean,
    /**
     * Markdown-it configuration
     */
    markdownIt: {
        "emoji": boolean,
        "emojiShortcuts": boolean,
        "abc": boolean,
        "math": boolean,
        "abbr": boolean,
        "breaks": boolean,
        "deflist": boolean,
        "del": boolean,
        "fence": boolean,
        "footnote": boolean,
        "imgsize": boolean,
        "linkify": boolean,
        "mark": boolean,
        "sub": boolean,
        "sup": boolean,
        "table": boolean,
        "tasklist": boolean,
        "typographer": boolean
    }

    /**
     *
     */
    emojiConfig: {},
    /**
     *
     */
    disableEmoji: boolean
    // mathConfig: {}

}>;

const defaults = {
    markdownIt: {
        "emoji": true,
        "emojiShortcuts": false,
        "abc": true,
        "math": true,
        "abbr": true,
        "breaks": true,
        "deflist": true,
        "del": true,
        "fence": true,
        "footnote": true,
        "imgsize": true,
        "linkify": true,
        "mark": true,
        "sub": true,
        "sup": true,
        "table": true,
        "tasklist": true,
        "typographer": true,
        "mermaid": true,
    }
}

export const NGX_STACKEDIT_CONFIG = new InjectionToken<StackEditConfig>('stackedit-config');

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
        ToolbarComponent,
        // StatusbarComponent
    ],
    standalone: true
})
export class StackEditorComponent {

    @ViewChild(ToolbarComponent) toolbar: ToolbarComponent;

    get $el() { return this.viewContainer.element.nativeElement as HTMLElement }

    /**
     * What mode should the editor be in.
     * - Possible values are `edit` | `view` | `viewonly`
     * - Default `edit`
     * view mode **disables** the editor view & toolbar.
     */
    @Input() mode: "edit" | "view" | "viewonly" = "edit";
    /**
     * Should the table of contents be viewable?
     * `true` shown by default
     * `false` hidden by default
     * `"off"` disable the TOC altogether
     *
     * Default `false`
     */
    @Input() showToc: boolean | "off" = false;
    /**
     * Controls whether the preview is open on initialization
     * `true` visible
     * `false` hidden
     * `"off"` disabled
     * Default `true`
     */
    @Input() showPreview: boolean | "off" = true;
    /**
     * Controls whether a "run" button is shown for applicable
     * code blocks in the editor view.
     */
    @Input() showCodeRunButton: boolean = false;
    /**
     * Controls whether a "copy" button is shown for applicable
     * code blocks in the editor view.
     */
    @Input() showCodeCopyButton: boolean = true;

    /**
     * Controls whether the mermaid insert button is visible
     * `true` visible
     * `false` hidden
     * Default `true`
     */
    @Input() showMermaid: boolean = true;

    @Input() showLineNumbers = false;
    @Input() allowImageUpload = true;

    @Input() tabSize = 4;
    @Input() tabChar: ' ' | '\t' = ' ';

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
    public options: StackEditConfig = {};

    private resizeChecker;
    private width = 0;
    private height = 0;
    private subscriptions: Subscription[];

    constructor(
        private readonly viewContainer: ViewContainerRef,
        private readonly themeService: ThemeService,
        @Optional() @Inject(NGX_STACKEDIT_CONFIG) private config: StackEditConfig = {}
    ) {
        this.options = {
            ...defaults,
            ...config
        };

        this.subscriptions = [
            this.themeService.subscribe(t => {
                window['monaco']?.editor.setTheme(
                    t == "dark" ? "vs-dark" : "vs"
                );
            })
        ]
    }

    async ngAfterViewInit() {
        installMonaco();
        await waitForMonacoInstall();
        this.$el.setAttribute("version", "1.0.36");

        const editorElt = this.$el.querySelector('.editor') as HTMLElement;
        const previewElt = this.$el.querySelector('.preview__inner-2') as HTMLElement;
        const tocElt = this.$el.querySelector('.toc__inner') as HTMLElement;
        this.editorSvc = new Editor(this, editorElt, previewElt, tocElt);
        this.toolbar.bindEditorEvents();

        // Bind the 'value' property
        this.editorSvc.on("loaded", () => {
            this.editorSvc.clEditor.setContent(this.value);
            this.editorSvc.clEditor.on('contentChanged', (content, diffs, sectionList) => {
                this.valueChange.next(content);
            });
        });

        this.resizeChecker = setInterval(() => {
            if (
                this.height != 0 && this.height != this.$el.clientHeight ||
                this.width != 0 && this.width != this.$el.clientWidth
            ) {
                this.triggerResize();
            }

            this.height = this.$el.clientHeight;
            this.width = this.$el.clientWidth;
        }, 300);
    }

    ngOnDestroy() {
        clearInterval(this.resizeChecker);
        this.subscriptions.forEach(s => s.unsubscribe());
        this.editorSvc.destroy();
    }

    public finalizeImageUpload({ label, link }) {
        const text = `![${label}](${link})`;
        this.editorSvc.clEditor.replaceAll(/```img-spinner```/gs, text);
    }

    private triggerResize() {

    }
}
