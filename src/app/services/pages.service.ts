import { EventEmitter, Injectable } from '@angular/core';
import { ulid } from 'ulidx';
import { debounceTime } from 'rxjs';
import { FilesService } from './files.service';
import { Page } from '../types/page';
import { ConfigService } from './config.service';

const $debounce = Symbol("debounce");
const basePath = `/`;

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
    public pages: Page[] = [];
    public flatPages: Page[] = [];
    public trash: Page[] = [];

    // A map of page URLs to the page
    private pageMap: { [key: string]: Page } = {};
    // A map of dir URLs to pages
    private dirMap: { [key: string]: Page[] } = {};

    private workspaceHandle: FileSystemDirectoryHandle;
    private dirHandles: {
        [key: string]: {
            handle: FileSystemDirectoryHandle,
            entries: any
        }
    } = {};

    constructor(
        private readonly files: FilesService,
        private readonly config: ConfigService
    ) {

        (async() => {
            const pages = await this.files.readDir("/");
            const { tabs, selectedTabIndex } = await this.config.get("tabs-state")
                .then(r => r || { tabs: [], selectedTabIndex: 0 })

            this.flatPages = this.pages = pages;

            this.tabs = this.pages.filter(p => tabs.find(t => t.path == p.path));
            this.selectedTabIndex = selectedTabIndex;

            if (this.pages.length > 0 && this.tabs.length == 0)
                this.addTab(this.pages[0]);

            // debugger;
            // this.calculatePageTree();
        })();
    }

    private saveTabsState() {
        this.config.set("tabs-state", {
            selectedTabIndex: this.selectedTabIndex,
            tabs: this.tabs
                .filter(t => !t.isPreviewTab)
                .map(t => t.path)
        });
    }

    // Open a workspace via WFSA
    // async openWorkspace() {
    //     const dirHandle = this.workspaceHandle = await window['showDirectoryPicker']({
    //         mode: "readwrite"
    //     });

    //     const files: Page[] = [];
    //     const flatPages: Page[] = [];

    //     // TODO: make this run in parallel?
    //     const traverseDirs = async (dir: FileSystemDirectoryHandle, path: string) => {
    //         const results = [];
    //         const metadataFiles: FileSystemFileHandle[] = [];
    //         const files: FileSystemFileHandle[] = [];
    //         const dirs: FileSystemDirectoryHandle[] = [];

    //         // @ts-ignore .values()
    //         for await (const entry of dir.values()) {
    //             if (entry.kind == "directory")
    //                 dirs.push(entry);
    //             else if (entry.name.endsWith(metadata_ext))
    //                 metadataFiles.push(entry);
    //             else
    //                 files.push(entry);
    //         }

    //         // Metadata files will sort to the start
    //         files.sort((a,b) => {
    //             if (a.name.endsWith(metadata_ext))
    //                 return -1;
    //             if (b.name.endsWith(metadata_ext))
    //                 return 1;
    //             // Default to alphabetical sort
    //             return a.name > b.name ? 1 : -1;
    //         });
    //         console.log("sorted files", files)

    //         // Only perform lookup _after_ all entries in the dir have
    //         // resolved -- this lets us check if there are other
    //         // relevant files in the directory

    //         for (const dir of dirs) {
    //             const index = path + dir.name + '/';
    //             this.dirHandles[index] = {
    //                 handle: dir,
    //                 entries: await traverseDirs(dir, index)
    //             };
    //             // results.push(...this.dirHandles[index].entries);
    //         }

    //         for (const metadata of metadataFiles) {
    //             const fileName = metadata.name.replace(metadata_ext, '');
    //             const dataFile = files.findIndex(f => f.name == fileName);

    //             if (dataFile == -1) {
    //                 console.warn("Found metadata, but not data file!")
    //             }
    //             else {
    //                 const data = await metadata.getFile();
    //                 const text = await data.text();
    //                 const json = JSON5.parse(text) as Page;

    //                 json.path = "wfsa://" + path;
    //                 json.metadataEntry = metadata;
    //                 json.fileEntry = files[dataFile];
    //                 json.hasLoaded = false;
    //                 json.content = '';
    //                 results.push(json);
    //                 flatPages.push(json);

    //                 // Remove the file -- it's added already
    //                 files.splice(dataFile, 1);
    //             }
    //         }

    //         for (const file of files) {
    //             const obj: Page = {
    //                 path: "wfsa://" + path,
    //                 content: undefined,
    //                 hasLoaded: false,
    //                 created: 0,
    //                 modified: Date.now(),
    //                 kind: "raw",
    //                 name: file.name,
    //                 fileEntry: file
    //             };

    //             results.push(obj);
    //             flatPages.push(obj);
    //         }

    //         return results;
    //     }

    //     const roots = await traverseDirs(dirHandle, '');

    //     Object.entries(this.dirHandles).forEach(([path, handle]) => {

    //     })

    //     console.log({
    //         roots,
    //         files,
    //         dirs: this.dirHandles
    //     });

    //     this.flatPages = flatPages;
    //     this.pages = roots;

    //     this.calculatePageTree();
    // }

    public loadCurrentPageContent() {
        return this.loadPageContent(this.tabs[this._selectedTabIndex]);
    }

    public async loadPageContent(page: Page) {
        if (!page.hasLoaded) {
            const res = await this.files.readFile(page.path + page.filename) as any;
            page.content = res;
        }
    }

    public calculatePageTree() {
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

        // Object.entries(this.dirMap).forEach(([k, v]) => {
        //     const parent = this.pageMap[k];
        //     if (parent) {
        //         parent.children = v;
        //     }
        // });

        const keys = Object.keys(this.dirMap).sort((a, b) => a.length - b.length)
        this.pages = this.dirMap[keys[0]] || [];

        // console.log({
        //     dirm: this.dirMap,
        //     pm: this.pageMap,
        //     pages: this.pages,
        // });

        // If there would otherwise be no tabs selected, preselect the
        // first item in the list.
        if (this.pages.length > 0 && this.tabs.length == 0)
            this.addTab(this.pages[0]);
    }

    async savePage(page: Page) {
        if (page.isPreviewTab) {
            page.isPreviewTab = undefined;
        }

        // Raw markdown files are always saved
        // without metadata.
        if (page.kind == "raw") {
            await this.files.saveFileContents(page);
            return;
        }
        page.modified = Date.now();

        this.genLabel(page);

        await this.files.saveFileMetadata(page).catch(e => {debugger});
        await this.files.saveFileContents(page).catch(e => {debugger});

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
                path: (path ? path + "/" : basePath),
                content: '',
                kind: "markdown",
                created: Date.now(),
                modified: Date.now(),
                filename: ulid() + {
                    markdown: ".md",
                    code: ".code",
                    raw: ".raw",
                    canvas: ".canvas"
                }[abstract.kind],
                autoLabel: true,
                options: {},
                tags: [],
                variables: {},
                ...abstract
            };
            await this.savePage(page);

            this.flatPages.push(page);
            // this.calculatePageTree();

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
            await this.files.deleteFile(page.path);
            this.trash.splice(this.trash.indexOf(page), 1);
        }
        else {
            const c = await this.files.readFile(page.path + page.filename);
            const m = await this.files.readFile(page.path + '.' + page.filename);

            const trashedPage = this.files.metadataToPage(m, c);

            trashedPage.deleted = Date.now();
            trashedPage.modified = Date.now();
            trashedPage.path = `/.trash/`;

            await this.files.saveFileMetadata(trashedPage);
            await this.files.saveFileContents(trashedPage);

            await this.files.deleteFile(page.path);

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

    async addTab(tab: Page, isPreview = false) {
        tab.isPreviewTab = undefined;

        let index = this.tabs.indexOf(tab);
        if (index != -1) {
            this.selectedTabIndex = index;
            return;
        }

        const emitter = new EventEmitter();
        emitter
            .pipe(debounceTime(300)).subscribe(() => {
                this.savePage(tab);
            });

        tab[$debounce] = emitter;

        if (tab.content == undefined || tab.content == null) {
            const text = await this.files.readFile(tab.path + tab.filename) as any;
            tab.content = text;
        }

        if (isPreview) {
            tab.isPreviewTab = true;

            // Check for and replace any current preview tab
            const previewIndex = this.tabs.findIndex(t => t.isPreviewTab);
            if (previewIndex != -1) {
                this.tabs.splice(previewIndex, 1, tab);
                this.selectedTabIndex = previewIndex;
            }
            else {
                this.tabs.splice(this.selectedTabIndex+1, 0, tab);
                this.selectedTabIndex += 1;
            }
        }
        else {
            this.tabs.splice(this.selectedTabIndex + 1, 0, tab);
            this.selectedTabIndex = this.selectedTabIndex + 1;
        }
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
                page.label = page.content?.trim()?.split('\n')?.[0]?.slice(0, 20);
                if (!page.label || page.label.trim().length < 2)
                    page.label = "Untitled";
            }
        }
    }

    onPageContentChange(page: Page, value: string) {
        this.genLabel(page);

        page.content = value;
        page[$debounce].next();
    }
}
