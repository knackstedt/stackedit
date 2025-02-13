import { Component, EventEmitter, Inject, InjectionToken, Input, Optional, Output, Sanitizer, ViewChild, ViewContainerRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService, DialogService, LazyLoaderService, CommandPaletteService } from '@dotglitch/ngx-common';
import { MermaidConfig } from 'mermaid';

import { ToolbarComponent } from './components/toolbar/toolbar.component';
// import { StatusbarComponent } from './components/statusbar/statusbar.component';

import { Editor } from './editor';
import { installMonaco, waitForMonacoInstall } from './monaco';
import { Subscription } from 'rxjs';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { KeyCommands } from './key-commands';
import { DomSanitizer } from '@angular/platform-browser';

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

type Hook = (
    {
        /**
         * Runs immediately before a chunk of markdown is rendered. Output will be sanitized by Angular's sanitizer.
         */
        kind: "beforeRender",
        fn: (markdown: string) => string
    }
) & {
    options: Object;
}

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
    selector: 'ngx-stackedit-img-dialog',
    template: '<img [src]="url" (click)="dialog.close()">',
    styles: `:host{max-width: min(90vh, 90vw); max-height: min(90vh, 90vw)} img { border-radius: 6px }`,
    standalone: true
})
class ImageComponent {
    constructor(
        @Inject(MAT_DIALOG_DATA) public readonly url: string,
        public readonly dialog: MatDialogRef<any>
    ) {}
}

@Component({
    selector: 'ngx-stackedit',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss'],
    imports: [
        MatIconModule,
        MatTooltipModule,
        // TooltipDirective,
        // MenuDirective,
        ToolbarComponent,
        NgScrollbarModule,
        // AngularSplitModule
    ],
    host: {
        "(pointerdown)": "onPointerDown($event)"
    },
    standalone: true
})
export class StackEditorComponent {

    @ViewChild(ToolbarComponent) toolbar: ToolbarComponent;

    get $el() { return this.viewContainer.element.nativeElement as HTMLElement }

    /**
     * Dictates the theme of the editor.
     */
    @Input() theme: "light" | "dark";
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
     * Control the execution runtime for code blocks.
     * > only valid for `showCodeRunButton` = true.
     * - If set to `eval`, only javascript code blocks will have a run button
     * - If set to `piston`, a HTTP request will be made to check the
     *     available runtimes
     *  - If set to `custom`, you need to define the runnable languages in
     *     `customCodeLanguages` and hook onto `onCustomCodeExecute`.
     */
    @Input() codeRunner: "piston" | "eval" | "custom" = null;
    /**
     * If `codeRunner` is set to true
     */
    @Input() customCodeLanguages: string[] = [];
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
     * ! WIP -- this feature is not supported
     * Hide punctuation markings in the editor
     *
     * This requires improved editor table, mermaid,
     * and code block rendering
     */
    @Input() hideWritingSymbols: boolean = false;

    /**
     * Event hooks that may be provided to perform mutations
     */
    @Input() hooks: Hook[] = [];

    private _value = '';
    /**
     * Initial value of the editor.
     * 2-way binding capable.
     */
    @Input() set value (value: string) {
        this._value = value;

        if (this.editorSvc) {
            this.editorSvc.clEditor?.setContent(value, true);
        }
    }
    get value() { return this._value };
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

    /**
     *
     */
    @Output() onCustomCodeExecute = new EventEmitter<{ content: string, language: string }>();

    editorSvc: Editor;
    public options: StackEditConfig = {};

    private resizeChecker;
    private width = 0;
    private height = 0;
    private subscriptions: Subscription[];
    private keyCommands: KeyCommands;

    constructor(
        private readonly viewContainer: ViewContainerRef,
        private readonly lazyLoader: LazyLoaderService,
        private readonly commandPalette: CommandPaletteService,
        public  readonly themeService: ThemeService,
        public  readonly dialog: DialogService,
        public  readonly matDialog: MatDialog,
        public readonly  sanitizer: DomSanitizer,
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
        ];

        lazyLoader.registerComponent({
            id: "image-editor",
            group: "@dotglitch",
            load: () => import('./components/image-editor/image-editor.component')
        })
    }

    ngOnChanges() {
        if (this.theme)
            this.themeService.setTheme(this.theme);
    }

    async ngAfterViewInit() {
        installMonaco();

        // This is only active in tauri mode.
        if (this.codeRunner == "piston") {
            await window['root']?.utils.getPistonRuntimes()
                .catch(e => null)
        }

        await waitForMonacoInstall();

        // This is replaced during automation.
        this.$el.setAttribute("version", "__VERSION__");

        const editorElt = this.$el.querySelector('.editor') as HTMLElement;
        const previewElt = this.$el.querySelector('.preview__inner') as HTMLElement;
        const tocElt = this.$el.querySelector('.toc__inner') as HTMLElement;
        this.editorSvc = new Editor(this, editorElt, previewElt, tocElt);
        this.toolbar.bindEditorEvents();

        this.keyCommands = new KeyCommands(editorElt, this.commandPalette, this, this.matDialog);

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
        this.editorSvc?.destroy();
    }

    public finalizeImageUpload({ label, link }) {
        const text = `![${label}](${link})`;
        this.editorSvc.clEditor.replaceAll(/```img-spinner```/gs, text);
    }

    private triggerResize() {

    }

    toggleEditor() {
        this.mode = this.mode == 'view' ? 'edit' : 'view';
        if (this.mode == 'view' && !this.showPreview)
            this.showPreview = !this.showPreview;
    }

    onPointerDown(e: PointerEvent) {
        if (e.target instanceof HTMLImageElement) {
            this.matDialog.open(ImageComponent, { data: e.target.src })
        }
    }
}


export const renderMarkdown = (input: string) => {
    // const converter = markdownConversionSvc.createConverter();
    // this.initConverter(converter, defaults.markdownIt);
}
