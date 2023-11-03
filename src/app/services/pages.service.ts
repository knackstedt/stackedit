import { EventEmitter, Injectable } from '@angular/core';
import { FilesService } from './files.service';
import { Page } from '../types/page';
import { ulid } from 'ulidx';
import { debounceTime } from 'rxjs';

const $debounce = Symbol("debounce");
const basePath = `data/`;

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
    public flatPages: Page[] = [];
    public trash: Page[] = [];

    // A map of page URLs to the page
    private pageMap: { [key: string]: Page } = {};
    // A map of dir URLs to pages
    private dirMap: { [key: string]: Page[] } = {};

    constructor(
        private readonly files: FilesService
    ) {

        (async() => {
            const [pages, trash] = await Promise.all([
                this.files.listFiles("data"),
                this.files.listFiles("trash")
            ]);

            this.flatPages = pages;
            this.trash = trash;
            this.calculatePageTree();
        })();
    }

    private calculatePageTree() {
        this.dirMap = {};
        this.pageMap = {};

        this.flatPages.forEach(p => {
            this.pageMap[
                p.path.split('.').slice(0, -1).join('.')
            ] = p;

            const dir = p.path
                .split('/').slice(0, -1).join('/');

            this.dirMap[dir] = this.dirMap[dir] || [];
            this.dirMap[dir].push(p);
        });

        Object.entries(this.dirMap).forEach(([k, v]) => {
            const parent = this.pageMap[k];
            if (parent) {
                parent.children = v;
            }
        });

        const keys = Object.keys(this.dirMap).sort((a, b) => a.length - b.length)
        this.pages = this.dirMap[keys[0]] || [];

        console.log({
            dirm: this.dirMap,
            pm: this.pageMap,
            pages: this.pages,
        });
        if (this.pages.length > 0)
            this.addTab(this.pages[0]);
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

        this.pageMap[page.path] = page;
    }

    async createPage(abstract: Partial<Page>, parent?: Page, openTab = true) {
        const isUpdate = !!abstract.path && !parent;
        // This is an update action
        if (isUpdate) {
            abstract.modified = Date.now();
            await this.files.saveFileMetadata(abstract as any);
            return abstract;
        }
        else {
            let path;
            if (parent && parent.path?.length > 2) {
                path = parent.path.split(".")?.slice(0, -1)?.join('.');
            }

            const page: Page = {
                path: (path ? path + "/" : basePath) + ulid() + '.json',
                content: '',
                created: Date.now(),
                kind: "markdown",
                modified: Date.now(),
                autoName: true,
                options: {},
                tags: [],
                variables: {},
                ...abstract
            };
            await this.savePage(page);

            this.flatPages.push(page);
            this.calculatePageTree();

            if (openTab)
                this.addTab(page);

            return page;
        }
    }

    /**
     * Moves a page to `trash` or deletes it
     * deletes it only if `destroy` is set
     *
     * TODO: fix deleting things that are nested
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
        const tabIndex = this.tabs.indexOf(page),
              pageIndex = this.pages.indexOf(page),
              flatIndex = this.flatPages.indexOf(page);

        tabIndex != -1 && this.tabs.splice(tabIndex, 1);
        pageIndex != -1 && this.pages.splice(pageIndex, 1);
        flatIndex != -1 && this.flatPages.splice(flatIndex, 1);

        Object.entries(this.dirMap).forEach(([key, entries]) => {
            const i = entries.indexOf(page);
            i != -1 && entries.splice(i, 1);
        })

        this.pageMap[page.path] = undefined;
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

    onPageContentChange(page: Page, value: string) {
        if (page.autoName) {
            page.name = page.content?.trim()?.split('\n')?.[0]?.slice(0, 20);
            if (page.name.trim().length < 2)
                page.name = "untitled";
        }

        page.content = value;
        page[$debounce].next();
    }
}
