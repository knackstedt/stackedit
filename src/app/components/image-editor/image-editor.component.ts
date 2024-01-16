import { Component, Input, OnInit, ViewContainerRef } from '@angular/core';
import FilerobotImageEditor from 'filerobot-image-editor';
import { FilerobotImageEditorConfig, TABS, TOOLS } from 'react-filerobot-image-editor';
import { Section } from '../../editor/editor/highlighter';
import { MatDialogRef } from '@angular/material/dialog';
import { ThemeService } from '@dotglitch/ngx-common';

// https://github.com/scaleflex/filerobot-image-editor

@Component({
  selector: 'app-image-editor',
  template: '',
  styleUrls: ['./image-editor.component.scss']
})
export class ImageEditorComponent implements OnInit {

    @Input() image: HTMLImageElement;
    @Input() section: Section;

    private editor: FilerobotImageEditor;

    constructor(
        private readonly viewContainer: ViewContainerRef,
        private readonly dialogRef: MatDialogRef<any>,
        private readonly theme: ThemeService
    ) { }

    ngOnInit() {
    }

    ngAfterViewInit() {
        const config: FilerobotImageEditorConfig = {
            source: this.image,
            onSave: (editedImageObject, designState) => {
                console.log('saved', editedImageObject, designState)
            },
            useZoomPresetsMenu: true,
            annotationsCommon: {
                fill: this.theme.value == 'dark' ? '#eeeeee' : '#121212',
            },
            theme: {
                palette: {
                    // 'bg-secondary': '#242424',
                    // 'bg-primary': '#121212',
                    // 'bg-primary-active': '#69f0ae',
                    // 'accent-primary': '#69f0ae',
                    // 'accent-primary-active': '#00ffff',
                    // 'icons-primary': '#69f0ae',
                    // 'icons-secondary': '#ff0000',
                    // 'borders-secondary': '#808000',
                    // 'borders-primary': '#0000ff',
                    // 'borders-strong': '#00ff00',
                    // 'light-shadow': '#ffff00',
                    // 'warning': '....',

                    "txt-primary": "#eee",
                    "txt-secondary": "#e0e",
                    "txt-secondary-invert": "#12ff12",
                    "txt-placeholder": "#eeeeee",
                    "txt-warning": "#00ffff",
                    "txt-error": "#ff00ff",
                    "txt-info": "#ffff00",
                    // "accent-primary": "#69f0ae",
                    // "accent-primary-hover": "#07fa87",
                    "accent-primary-active": "#69f0ae",
                    // "accent-primary-disabled": "#69f0aeaa",
                    // "accent-secondary-disabled": "#00ffff",
                    "accent-stateless": "#69f0ae",

                    // "accent-stateless_0_4_opacity": "#0000ff",
                    // "accent_0_5_opacity": "#ffff00",
                    // "accent_1_2_opacity": "#ffff00",
                    // "accent_1_8_opacity": "#ffff00",
                    // "accent_2_8_opacity": "#ffff00",
                    // "accent_4_0_opacity": "#ffff00",
                    // "bg-grey": "#0000ff",
                    "bg-stateless": "#242424",
                    // "bg-active": "#00ff00",
                    "bg-base-light": "#363636",
                    // "bg-base-medium": "#0000ff",
                    // "bg-primary": "#ff00ff",
                    // "bg-primary-light": "#ffff00",
                    // "bg-primary-hover": "#00ffff",
                    "bg-primary-active": "#434343",
                    // "bg-primary-stateless": "#0000ff",
                    // "bg-primary-0-5-opacity": "#0000ff",
                    "bg-secondary": "#121212",
                    "bg-hover": "#303030",
                    // "bg-green": "#ff0000",
                    // "bg-green-medium": "#ff0000",
                    // "bg-blue": "#ff0000",
                    // "bg-red": "#ff0000",
                    // "background-red-medium": "#ff0000",
                    // "bg-orange": "#ff0000",
                    // "bg-tooltip": "#ff0000",
                    "icon-primary": "#07fa87",
                    // "icons-primary-opacity-0-6": "#0000ff",
                    "icons-secondary": "#ccc",
                    "icons-placeholder": "#ffff00",
                    // "icons-invert": "#00f",
                    "icons-muted": "#ccc",
                    // "icons-primary-hover": "#ff0000",
                    // "icons-secondary-hover": "#ff0000",
                    // "btn-primary-text": "#0000ff",
                    // "btn-primary-text-0-6": "#0000ff",
                    // "btn-primary-text-0-4": "#0000ff",
                    // "btn-disabled-text": "#0000ff",
                    // "btn-secondary-text": "#0000ff",
                    // "link-primary": "#ff0000",
                    // "link-stateless": "#ff0000",
                    // "link-hover": "#ff0000",
                    // "link-active": "#ff0000",
                    // "link-muted": "#ff0000",
                    // "link-pressed": "#ff0000",
                    // "borders-primary": "#0000ff",
                    "borders-primary-hover": "#00ffff",
                    "borders-secondary": "#444",
                    // "borders-strong": "#ff00ff",
                    // "borders-invert": "#ffff00",
                    // "border-hover-bottom": "#ff0000",
                    // "border-active-bottom": "#ff0000",
                    // "border-primary-stateless": "#ff0000",
                    // "borders-disabled": "#00ffff",
                    // "borders-button": "#0000ff",
                    // "borders-item": "#ff00ff",
                    // "borders-base-light": "#ffff00",
                    // "borders-base-medium": "#ff0000",
                    // "borders-green": "#ff0000",
                    // "borders-green-medium": "#ff0000",
                    // "borders-red": "#ff0000",
                    // "active-secondary": "#0000ff",
                    // "active-secondary-hover": "#ff0000",
                    // "tag": "#ff0000",
                    // "states-error-disabled-text": "#ff0000",
                    // "error": "#ff0000",
                    // "error-0-28-opacity": "#ff0000",
                    // "error-0-12-opacity": "#ff0000",
                    // "error-hover": "#ff0000",
                    // "error-active": "#ff0000",
                    // "success": "#ff0000",
                    // "success-hover": "#ff0000",
                    // "success-Active": "#ff0000",
                    // "warning": "#ff0000",
                    // "warning-hover": "#ff0000",
                    // "warning-active": "#ff0000",
                    // "info": "#ff0000",
                    // "modified": "#ff0000",
                    // "red": "#ff0000",
                    // "orange": "#ff0000",
                    // "salad": "#ff0000",
                    // "green": "#ff0000",
                    // "blue": "#ff0000",
                    // "indigo": "#ff0000",
                    // "violet": "#ff0000",
                    // "pink": "#ff0000",
                    // "gradient-right": "#ff0000",
                    // "extra-0-3-overlay": "#ff0000",
                    // "gradient-right-active": "#ff0000",
                    // "gradient-right-hover": "#ff0000",
                    // "extra-0-5-overlay": "#ff0000",
                    // "extra-0-7-overlay": "#ff0000",
                    // "extra-0-9-overlay": "#ff0000",
                    // "red-0-1-overlay": "#ff0000",
                    // "orange-0-1-overlay": "#ff0000",
                    // "accent-0-8-overlay": "#ff0000",
                    "link": "#ffff00",
                    // "camera": "#ff0000",
                    // "google-drive": "#ff0000",
                    // "dropbox": "#ff0000",
                    // "one-drive": "#ff0000",
                    // "device": "#ff0000",
                    // "instagram": "#ff0000",
                    // "free-images": "#ffff00",
                    // "free-icons": "#ff00ff",
                    // "canvas": "#00f",
                },
                typography: {
                    fontFamily: 'Fira Sans',
                },
            },
            Rotate: { angle: 90, componentType: 'slider' },
            Image: {
                disableUpload: true,
            },
            defaultSavedImageType: "webp",
            defaultSavedImageName: "image.webp",
            defaultSavedImageQuality: 98,
            tabsIds: [ TABS.RESIZE, TABS.ADJUST, TABS.FILTERS, TABS.ANNOTATE, TABS.WATERMARK ],
            defaultTabId: TABS.ANNOTATE,
            defaultToolId: TOOLS.TEXT,
            savingPixelRatio: 1,
            previewPixelRatio: 1
        };

        // Assuming we have a div with id="editor_container"
        const filerobotImageEditor = this.editor = new FilerobotImageEditor(
            this.viewContainer.element.nativeElement,
            config,
        );

        filerobotImageEditor.render({
            onClose: (closingReason) => {
                console.log('Closing reason', closingReason);
                filerobotImageEditor.terminate();

                this.dialogRef.close();
            },
        } as any);
    }

    ngOnDestroy() {
        this.editor.terminate();
    }
}
