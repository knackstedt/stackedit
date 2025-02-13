import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommandPaletteService, KeyboardService, MenuDirective, MenuItem, ThemeService, VscodeComponent } from '@dotglitch/ngx-common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AngularSplitModule } from 'angular-split';
import { ulid } from 'ulidx';

import { StackEditorComponent } from './editor/editor.component';
import { MenuComponent } from './components/menu/menu.component';
import { PagesService } from './services/pages.service';
import { FilesService } from './services/files.service';
import { Page } from './types/page';
import { ConfigService } from './services/config.service';
import { TelemetryDialogComponent } from './components/telemetry-dialog/telemetry-dialog.component';
import { FetchPageComponent } from './components/fetch-page/fetch-page.component';
import { Fetch } from './services/fetch.service';
import { UtilService } from './services/util.service';
import { DiagramComponent } from './components/diagram/diagram.component';
import { InitializeCommandPalette } from 'src/app/commands';

declare const dT_;
export const sleep = ms => new Promise(r => setTimeout(r, ms));


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
        StackEditorComponent,
        VscodeComponent,
        FetchPageComponent,
        DiagramComponent,
        MenuComponent,
        MatTabsModule,
        MatIconModule,
        MatTooltipModule,
        MatButtonModule,
        MenuDirective,
        AngularSplitModule
    ]
})
export class AppComponent {
    @ViewChild(MenuComponent) menu: MenuComponent;

    readonly tabCtxMenu: MenuItem<Page>[] = [
        { label: "Close", action: p => this.pages.closeTab(p) },
        { label: "Close Others", action: p => this.pages.tabs = this.pages.tabs.splice(this.pages.tabs.indexOf(p), 1) },
        { label: "Close to the right", action: p => this.pages.tabs.splice(this.pages.tabs.indexOf(p)) },
        { label: "Close to the left", action: p => this.pages.tabs.splice(0, this.pages.tabs.indexOf(p)) },
        { label: "Close All", action: p => this.pages.tabs = [] },
        // "separator",
        // { label: "Icon", action: p => this.pages.tabs = [] },
        // { label: "Color", action: p => this.pages.tabs = [] },
        // { label: "Category", action: p => this.pages.tabs = [] },
        "separator",
        // { label: "Pin" },
        { label: "Edit...", action: p => this.menu.onEntryEdit(p) }
    ];

    constructor(
        public readonly pages: PagesService,
        public readonly config: ConfigService,
        public readonly utils: UtilService,
        private readonly http: HttpClient,
        private readonly iconRegistry: MatIconRegistry,
        private readonly keyboard: KeyboardService,
        private readonly files: FilesService,
        private readonly dialog: MatDialog,
        private readonly fetch: Fetch,
        private readonly changeDetector: ChangeDetectorRef,
        private readonly theme: ThemeService,
        private readonly commandPalette: CommandPaletteService
    ) {
        utils.getPistonRuntimes().then(r => {
            this.changeDetector.detectChanges();
        });

        window['_fetch'] = this.fetch;
        window['root'] = this;

        config.subscribe(c => {
            if (c.hasInstalledDefaultPages == null) {
                this.installDefaultPages();
            }

            theme.setTheme(c.theme || "dark" as any);
        });

        config.init();

        InitializeCommandPalette(commandPalette, pages, config, utils, files, dialog, theme);
    }

    installDefaultPages() {
        this.config.set("hasInstalledDefaultPages", true);

        Promise.all([
            import("./assets/sample-markdown"),
            import("./assets/sample-diagram"),
            // import("./assets/sample-fetch"),
            import("./assets/sample-code")
        ]).then(async (files) => {
            for (let { page } of files) {
                await this.pages.savePage(page as any);
                await this.pages.addTab(page as any);
                this.pages.flatPages.push(page as any);
            };

            // this.pages.calculatePageTree();
            this.pages.selectedTabIndex = 0;
        });
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


    public checkLangIsExecutable(page: Page) {
        if (this.utils.pistonRuntimes.length == 0) {
            return false;
        }

        const runtimes = this.utils.pistonRuntimes;
        const lang = runtimes.find(r =>
            r.language == page.options['language'] || r.aliases.includes(page.options['language'])
        );

        return !!lang;
    }

    public async executeScript(page: Page) {
        const runtimes = await this.utils.getPistonRuntimes();
        const lang = runtimes.find(r =>
            r.language == page.options['language'] || r.aliases.includes(page.options['language'])
        );
        this.utils.runPistonScript(lang, [{
            content: page.content,
            encoding: "utf-8",
            name: ulid()
        }]);
    }
}
