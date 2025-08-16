import { EventEmitter, Injectable } from '@angular/core';
import { ulid } from 'ulidx';
import { debounceTime } from 'rxjs';
import { FilesService } from './files.service';
import { Page } from '../types/page';
import { ConfigService } from './config.service';

const $debounce = Symbol("debounce");
const JSON_PAGE_KINDS = ["canvas"];

const getExtension = (kind) => ({
    markdown: ".md",
    code: ".code",
    raw: ".raw",
    canvas: ".canvas"
}[kind]);

@Injectable({
    providedIn: 'root'
})
export class PagesService {

    private _selectedTabIndex = 0;
    public get selectedTabIndex() { return this._selectedTabIndex };
    public set selectedTabIndex(value) {
        // Don't allow the selected tab index to go out of bounds
        this._selectedTabIndex = Math.min(Math.max(value, 0), this.tabs.length);

        this.saveTabsState();
    };

    /**
     * List of all tabs in the current view
     */
    public tabs: Page[] = [];
    /**
     * All currently registered pages on the nav menu
     */
    // public pages: Page[] = [];
    // public flatPages: Page[] = [];
    public trash: Page[] = [];

    public rootPage: Page = {
        kind: "directory"
    } as any;

    constructor(
        private readonly files: FilesService,
        private readonly config: ConfigService
    ) {
        files.init(this);
        this.loadRootPages();
    }

    private async loadRootPages() {
        const pages = await this.files.readDir("/");
        const tabsState = this.config.get("tabs-state");
        const tabs = tabsState?.tabs || [];
        const selectedTabIndex = tabsState?.selectedTabIndex || 0;

        this.rootPage.children = pages;

        this.tabs = pages.filter(p => tabs.find(t => t == p.path + p.filename));
        this.selectedTabIndex = selectedTabIndex;

        if (pages.length > 0 && this.tabs.length == 0)
            this.addTab(pages[0], this.rootPage);

        this.saveTabsState();
    }

    private saveTabsState() {
        this.config.set("tabs-state", {
            selectedTabIndex: this.selectedTabIndex,
            tabs: this.tabs
                .filter(t => !t.isPreviewTab)
                .map(t => t.path + t.filename)
        });
    }

    public loadCurrentPageContent() {
        const tab = this.tabs[this._selectedTabIndex];
        if (!tab) return null;

        return this.loadPageContent(tab);
    }

    public async loadPageContent(page: Page) {
        if (!page) {
            console.trace(page);
            return;
        }

        console.log("LOAD PAGE CONTENT", page)

        const res = await this.files.readFile(page.path + page.filename) as any;

        if (JSON_PAGE_KINDS.includes(page.kind)) {
            page.content = JSON.parse(res || '{}');
        }
        else {
            page.content = res;
        }

        // Regenerate the label once the page has been loaded.
        this.genLabel(page);

        page.hasLoaded = true;
    }

    async loadPageChildren(page: Page) {
        if (page.kind != "directory") return;

        page.loading = true;

        const contents = await this.files.readDir(page.path + page.filename + '/');
        page.children = contents;

        page.expanded = true;
        page.loading = false;
    }

    async savePage(page: Page, parent: Page) {
        if (page.isPreviewTab) {
            page.isPreviewTab = undefined;
        }

        page.modified = Date.now();

        if (page.kind != "directory") {
            // Raw markdown files are always saved
            // without metadata.
            if (page.kind == "raw") {
                if (page.hasLoaded) {
                    await this.files.saveFileContents(page, parent, page.content);
                }
                return;
            }
            this.genLabel(page);

            if (
                page.content === 'null' ||
                page.content === null ||
                page.content === undefined
            )
                debugger;

            let data = page.content;
            if (typeof page.content == "object") {
                data = JSON.stringify(page.content);
            }

            if (page.hasLoaded) {
                console.trace("Save");
                console.log("SAVE PAGE", page);
                await this.files.saveFileContents(page, parent, data).catch(e => console.error(e));
            }
        }

        await this.files.saveMetadata(page).catch(e => console.error(e));
    }

    async createPage(abstract: Partial<Page>, parent: Page, openTab = true) {
        const isUpdate = !!abstract.path && !parent;
        parent ??= this.rootPage;

        if (isUpdate) {
            // This is an update action
            abstract.modified = Date.now();
            await this.files.saveMetadata(abstract as any);
            return abstract;
        }

        // This is a create -- we need to preform more actions to build the object.

        let path;
        if (parent) {
            path = parent.path + parent.filename;
        }

        console.log("CREATE PAGE >:(");

        const page: Page = {
            path: (path ? path + "/" : '/'),
            content: '',
            kind: "markdown",
            created: Date.now(),
            modified: Date.now(),
            filename: ulid() + getExtension(abstract.kind || "markdown"),
            autoFilename: true,
            autoLabel: true,
            options: {},
            tags: [],
            variables: {},
            hasLoaded: true,
            ...abstract
        };

        if (abstract.kind == "directory") {
            throw new Error("Not Implemented");
        }
        else {
            await this.savePage(page, parent);

            if (parent) {
                parent.children ??= [];
                parent.children.push(page);
            }

            if (openTab) {
                this.addTab(page, parent);
            }
        }

        return page;
    }

    async createDirectory(partial: Partial<Page>, parent: Page) {
        partial.created = Date.now();
        partial.modified = Date.now();

        await this.files.createFolder(partial.path + '/' + partial.filename);
        await this.files.saveMetadata(partial as Page);

        parent.children.push(partial as Page);
    }

    /**
     * Moves a page to `trash` or deletes it
     * deletes it only if `destroy` is set
     *
     * TODO: fix deleting things that are nested
     */
    async deletePage(page: Page, parent: Page, destroy = false) {
        console.log("deleting page", page);

        // Disable the update tracker to prevent pages being undeletable
        page[$debounce].unsubscribe();

        if (destroy) {
            if (page.kind == "directory") {
                await this.files.deleteFolder(page.path + page.filename);
            }
            else {
                await this.files.deleteFile(page.path);
            }
            this.trash.splice(this.trash.indexOf(page), 1);
        }
        else {
            // TODO: Trash support
            if (page.kind == "directory") {
                await this.files.deleteFolder(page.path + page.filename);

                // Tolerate issues if the metadata file does not exist.
                this.files.deleteFile(page.path + '.' + page.filename);

                parent.children.splice(parent.children.indexOf(page), 1);

                // TODO: Delete from parent page (FIX: make a virtual "root" page)

                return;
            }

            const c = await this.files.readFile(page.path + page.filename);
            const m = await this.files.readFile(page.path + '.' + page.filename);

            const trashedPage = this.files.metadataToPage(m, c);

            trashedPage.deleted = Date.now();
            trashedPage.originalPath = trashedPage.path;
            trashedPage.path = `/.trash/`;

            await this.files.saveMetadata(trashedPage);
            await this.files.saveFileContents(trashedPage, page._parent, trashedPage.content);

            await this.files.deleteFile(page.path + page.filename);
            await this.files.deleteFile(page.path + '.' + page.filename);

            this.trash.push(page);
        }
        const tabIndex = this.tabs.indexOf(page);

        tabIndex != -1 && this.tabs.splice(tabIndex, 1);

        parent.children.splice(parent.children.indexOf(page), 1);

        this.saveTabsState();
    }

    async addTab(page: Page, parent: Page, isPreview = false) {
        // I'm not even sure where this comes from
        if (page.kind == "directory") return;

        page['_parent'] = parent;

        page.isPreviewTab = undefined;

        let index = this.tabs.indexOf(page);
        if (index != -1) {
            this.selectedTabIndex = index;
            return;
        }

        this.attachPageChangeEmitter(page);

        if (page.content == undefined || page.content == null) {
            const text = await this.files.readFile(page.path + page.filename) as any;
            page.content = text;
        }

        if (isPreview) {
            page.isPreviewTab = true;

            // Check for and replace any current preview tab
            const previewIndex = this.tabs.findIndex(t => t.isPreviewTab);
            if (previewIndex != -1) {
                this.tabs.splice(previewIndex, 1, page);
                this.selectedTabIndex = previewIndex;
            }
            else {
                this.tabs.splice(this.selectedTabIndex+1, 0, page);
                this.selectedTabIndex += 1;
            }
        }
        else {
            this.tabs.splice(this.selectedTabIndex + 1, 0, page);
            this.selectedTabIndex = this.selectedTabIndex + 1;
        }

        this.saveTabsState();
    }

    closeTab(page: Page) {
        const index = this.tabs.indexOf(page);
        this.tabs.splice(index, 1);
        this.saveTabsState();
    }

    closeOtherTabs(page: Page) {
        const index = this.tabs.indexOf(page);
        this.tabs = this.tabs.splice(index, 1);
        this.saveTabsState();
    }

    closeTabsToTheRight(page: Page) {
        const index = this.tabs.indexOf(page);
        this.tabs.splice(index);
        this.saveTabsState();
    }

    closeTabsToTheLeft(page: Page) {
        const index = this.tabs.indexOf(page);
        this.tabs.splice(0, index);
        this.saveTabsState();
    }

    closeAllTabs() {
        this.tabs = [];
        this.saveTabsState();
    }

    getFocusedTab() {
        return this.tabs[this.selectedTabIndex];
    }

    genLabel(page: Page) {
        if (page.autoLabel || page.label?.trim().length < 2) {
            if (page.kind == "canvas") {
                page.label = "Untitled Diagram";
            }
            else if (page.kind == "fetch") {
                page.label = "Fetch Request";
            }
            else {
                if (page.hasLoaded) {
                    page.label = page.content?.trim()?.split('\n')?.[0]?.slice(0, 20);
                    if (!page.label || page.label.trim().length < 2)
                        page.label = "Untitled";
                }
                else {
                    // page keeps whatever name it had or defaults to Untitled.
                    page.label ||= "Untitled";
                }
            }
        }
    }

    onPageContentChange(page: Page, value: string) {

        console.log("ON PAGE CONTENT CHANGE")

        if (!page.hasLoaded) {
            console.error("Page received content change event before loading!")
            debugger;
        }

        this.genLabel(page);

        page.content = value;

        if (!page[$debounce])
            this.attachPageChangeEmitter(page);

        page[$debounce].next();
    }

    attachPageChangeEmitter(page: Page) {
        const emitter = new EventEmitter();
        emitter
            .pipe(debounceTime(300)).subscribe(() => {
                this.savePage(page, page._parent);
            });

        page[$debounce] = emitter;
    }
}
