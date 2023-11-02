import { EventEmitter, Injectable } from '@angular/core';
import { FilesService } from './files.service';
import { Page } from '../types/page';
import { ulid } from 'ulidx';
import { debounceTime } from 'rxjs';

const $debounce = Symbol("debounce");

@Injectable({
    providedIn: 'root'
})
export class PagesService {

    public selectedTabIndex = 0;

    /**
     * List of all tabs in the current view
     */
    public tabs: Page[] = [];
    /**
     * All currently registered pages on the nav menu
     */
    public pages: Page[] = [];
    public trash: Page[] = [];

    constructor(
        private readonly files: FilesService
    ) {

        (async() => {
            this.pages = await this.files.listFiles("data");
            this.trash = await this.files.listFiles("trash");
            this.addTab(this.pages[0]);
        })();
    }

    async savePage(page: Page) {

        // Raw markdown files are always saved
        // without metadata.
        if (page.kind == "markdown-raw") {
            await this.files.saveFileContents(page);
            return;
        }
        page.modified = Date.now();

        if (page.autoName || page.name.length < 2) {
            page.name = page.content?.trim()?.split('\n')?.[0]?.slice(0, 20);
            if (!page.name || page.name.trim().length < 2)
                page.name = "untitled";
        }

        await this.files.saveFileMetadata(page);
        await this.files.saveFileContents(page);
    }

    async createPage(abstract: Partial<Page>) {
        const isUpdate = !!abstract.path;
        // This is an update action
        if (isUpdate) {
            await this.files.saveFileMetadata(abstract as any);
            return abstract;
        }
        else {
            const page: Page = {
                path: "data/temp_" + ulid() + '.json',
                content: '',
                created: Date.now(),
                kind: "markdown",
                modified: Date.now(),
                autoName: true,
                ...abstract
            };
            await this.savePage(page);

            this.pages.push(page);
            this.addTab(page);
            return page;
        }
    }

    /**
     * Moves a page to `trash` or deletes it
     * deletes it only if `destroy` is set
     */
    async deletePage(page: Page, destroy = false) {
        if (destroy) {
            await this.files.deleteFile(page);
            this.trash.splice(this.trash.indexOf(page), 1);
        }
        else {
            await this.files.trashFile(page);
            this.trash.push(page);
        }
        this.tabs.splice(this.tabs.indexOf(page), 1);
        this.pages.splice(this.pages.indexOf(page), 1);
    }

    async addTab(tab: Page) {
        let index = this.tabs.indexOf(tab);
        if (index == -1) {
            const emitter = new EventEmitter();
            emitter
                .pipe(debounceTime(300)).subscribe(() => {
                    this.savePage(tab);
                });

            tab[$debounce] = emitter;

            if (tab.content == undefined || tab.content == null) {
                const text = await this.files.readFile(tab.path.replace(/\.json$/, '.md')) as any;
                tab.content = text;
            }

            index = this.tabs.push(tab);
        }

        this.selectedTabIndex = index;
    }

    onTabUpdate(page: Page, value: string) {
        if (page.autoName) {
            page.name = page.content?.trim()?.split('\n')?.[0]?.slice(0, 20);
            if (page.name.trim().length < 2)
                page.name = "untitled";
        }

        page.content = value;
        page[$debounce].next();
    }
}
