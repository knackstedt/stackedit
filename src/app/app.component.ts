import { Component, ElementRef, EventEmitter, ViewChild } from '@angular/core';
import { NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { KeyboardService, MenuDirective, MenuItem, VscodeComponent } from '@dotglitch/ngx-common';
import { debounceTime, map } from 'rxjs';

import { StackEditorComponent } from './editor/editor.component';
import { MenuComponent } from './components/menu/menu.component';
import { PagesService } from './services/pages.service';
import { FilesService } from './services/files.service';
import { Page } from './types/page';
import { ConfigService } from './services/config.service';
import { MatDialog } from '@angular/material/dialog';
import { TelemetryDialogComponent } from './components/telemetry-dialog/telemetry-dialog.component';

declare const dT_;
export const sleep = ms => new Promise(r => setTimeout(r, ms));

const $debounce = Symbol("debounce");

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
        NgIf,
        NgForOf,
        NgSwitch,
        NgSwitchCase,
        NgSwitchDefault,
        StackEditorComponent,
        VscodeComponent,
        MenuComponent,
        MatTabsModule,
        MatIconModule,
        MatTooltipModule,
        MenuDirective
    ]
})
export class AppComponent {
    @ViewChild(MenuComponent) menu: MenuComponent;

    currentTabIndex = 0;
    tabs: Page[] = [];

    readonly tabCtxMenu: MenuItem<Page>[] = [
        { label: "Close", action: p => this.tabs.splice(this.tabs.indexOf(p), 1) },
        { label: "Close Others", action: p => this.tabs = this.tabs.splice(this.tabs.indexOf(p), 1) },
        { label: "Close to the right", action: p => this.tabs.splice(this.tabs.indexOf(p)) },
        { label: "Close to the left", action: p => this.tabs.splice(0, this.tabs.indexOf(p)) },
        { label: "Close All", action: p => this.tabs = [] },
        // "separator",
        // { label: "Icon", action: p => this.tabs = [] },
        // { label: "Color", action: p => this.tabs = [] },
        // { label: "Category", action: p => this.tabs = [] },
        "separator",
        // { label: "Pin" },
        { label: "Edit...", action: p => this.menu.onEntryEdit(p) }
    ]

    constructor(
        private readonly http: HttpClient,
        private readonly iconRegistry: MatIconRegistry,
        private readonly keyboard: KeyboardService,
        private readonly files: FilesService,
        private readonly pages: PagesService,
        private readonly config: ConfigService,
        private readonly dialog: MatDialog
    ) {
        if (typeof dT_ != 'undefined' && dT_.initAngularNg) {
            dT_.initAngularNg(http, HttpHeaders);
        }

        window['root'] = this;
        keyboard.onKeyCommand({
            key: "f5",
        }).subscribe(k => {
            window.location.reload()
        });

        config.subscribe(c => {
            console.log("config", c)
            if (c.telemetry == null) {
                dialog.open(TelemetryDialogComponent);
            }
        })
    }

    async addTab(tab: Page) {
        let index = this.tabs.indexOf(tab);
        if (index == -1) {
            const emitter = new EventEmitter();
            emitter
                .pipe(debounceTime(300)).subscribe(() => {
                    this.pages.savePage(tab);
                });

            tab[$debounce] = emitter;

            if (tab.content == undefined || tab.content == null) {
                const text = await this.files.readFile(tab.path.replace(/\.json$/, '.md')) as any;
                tab.content = text;
            }

            index = this.tabs.push(tab);
        }
        this.currentTabIndex = index;
    }

    // @HostListener("window:resize", ["$event"])
    // onResize() {
    //     this.isMobile = (window.innerHeight / window.innerWidth > 1.5) || window.innerWidth < 900;
    //     document.body.classList.remove("mobile");
    //     document.body.classList.remove("desktop");

    //     this.isMobile && document.body.classList.add("mobile");
    //     !this.isMobile && document.body.classList.add("desktop");
    // }

    async onImageUpload(evt) {
        await sleep(10000);
        evt.stackEditor.finalizeImageUpload({
            label: "image text",
            link: "https://img.shields.io/travis/benweet/stackedit.svg?style=flat"
        });
    }

    onTabUpdate(page: Page, value: string) {
        if (page.autoName) {
            page.name = page.content?.trim()?.split('\n')?.[0]?.slice(0, 20);
            if (page.name.trim().length < 2)
                page.name = "untitled";
        }
        page.content = value;
        page[$debounce].next()
    }
}
