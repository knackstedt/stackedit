import { Injectable, Component } from '@angular/core';
import sanitizeFilename from "sanitize-filename";
import { Page } from '../types/page';
import { BrowserFS } from 'src/app/utils/browser-fs';
import { useElectron, ElectronFS } from 'src/app/utils/electron-fs';
import { PagesService } from 'src/app/services/pages.service';

const fs: BrowserFS = useElectron ? new ElectronFS() as any : new BrowserFS();

@Injectable({
    providedIn: 'root'
})
export class FilesService {

    private pages: PagesService;

    constructor() {

    }
    init(pages: PagesService) {
        this.pages = pages;
    }

    /**
     * Read a directory for all of the files we can view.
     */
    async readDir(path: string): Promise<Page[]> {
        const exists = await fs.exists(path);
        if (!exists) {
            // console.log("path is a lie", path);
            await fs.mkdir(path, { recursive: true });
            return [];
        }
        // console.log("readdir from path", path);
        return fs.readDir(path)
            .then(items => {
                const files = items.filter(i => i.isFile());
                // TODO: directory support.
                const dirs = items.filter(i => i.isDirectory());

                return Promise.all(
                    dirs.map(async f => {
                        const metadata = await this.readFile(path + '.' + f.name).catch(e => null);
                        // If we have a metadata file, load that.
                        if (metadata) {
                            // Ensure that if something is moved in the real FS, we catch it and update the path we try to use.
                            const meta = JSON.parse(metadata || "{}") as Page;
                            meta.path = f.path || '/';
                            meta.filename = f.name;
                            meta.hasLoaded = false;

                            return meta;
                        }
                        else {
                            return {
                                path: f.path || '/',
                                label: f.name,
                                filename: f.name,
                                created: f.stats?.ctimeMs,
                                modified: f.stats?.mtimeMs,
                                kind: "directory",
                                autoLabel: true,
                                hasLoaded: false,
                                content: ''
                            } as Page;
                        }
                    })
                    .concat(
                        files.map(async f => {
                            // console.log("read file", path + f.name);

                            const metadata = await this.readFile(path + '.' + f.name).catch(e => null);
                            // If we have a metadata file, load that.
                            if (metadata) {
                                // Ensure that if something is moved in the real FS, we catch it and update the path we try to use.
                                const meta = JSON.parse(metadata || "{}") as Page;
                                meta.path = f.path || '/';
                                meta.filename = f.name;
                                meta.hasLoaded = false;

                                // console.log("incoming metadata", meta);
                                return meta;
                            }
                            // Otherwise, attempt to guess metadata based on file hints.
                            else {
                                const contents = await this.readFile(path + f.name);

                                return {
                                    path: f.path || '/',
                                    filename: f.name,
                                    created: f.stats?.ctimeMs,
                                    modified: f.stats?.mtimeMs,
                                    kind: "code",
                                    autoLabel: true,
                                    hasLoaded: true,
                                    content: contents
                                } as Page;
                            }
                        })
                    )
                )
        })
    }

    /**
     * Saves page metadata.
     */
    async saveMetadata(file: Page): Promise<void> {
        // file.content
        try {
            // If we have an appState (excalidraw)
            // remove the context menu before we clone the object
            // to prevent structuredClone errors.
            if (file.content?.['appState'])
                file.content['appState'].contextMenu = null;

            const parent = file._parent;
            file._parent = null;
            const data = structuredClone(file);
            data.content = '';
            file._parent = parent;

            // console.log("sfm", file.path + file.filename);
            return fs.writeFile(file.path + '.' + file.filename, JSON.stringify(data));
        }
        catch(er) {
            debugger;
        }
    }

    /**
     * Saves page contents.
     */
    async saveFileContents(file: Page, parent: Page, data: string): Promise<void> {
        let oldFilename: string;
        if (file.autoFilename) {
            const filename = sanitizeFilename(file.label || file.filename);
            // Prevent deleting the source file if it's unchanged.
            if (filename != file.filename) {
                // Look for any files that already have the filename we're
                // trying to auto-rename to. DO NOT OVERWRITE these.
                const existingPage = parent.children.find(p => p.path == file.path && p.filename == filename);
                if (!existingPage) {
                    oldFilename = file.filename;
                    file.filename = filename;
                }
            }
        }

        if (file.kind == "fetch") {
            data = '';
        }
        else if (file.kind == "directory") {
            fs.mkdir(file.path + file.filename);
            return;
        }

        // console.log("sfc", file.path + file.filename);
        await fs.writeFile(file.path + file.filename, data);
        if (oldFilename) {
            await fs.unlink(file.path + oldFilename);
            await fs.unlink(file.path + '.' + oldFilename);
        }
    }

    /**
     * Saves a file at a given path.
     */
    async saveFile(path: string, content: string): Promise<void> {
        return fs.writeFile(path, content);
    }

    /**
     * Read the file content at the given path + filename
     * Encoding will be utf8 unless otherwise specified.
     */
    async readFile(path: string, encoding = 'utf8'): Promise<string> {
        return fs.readFile(path, encoding as 'utf8');
    }

    // Delete a file
    async deleteFile(path: string): Promise<void> {
        return fs.unlink(path);
    }

    async deleteFolder(path: string): Promise<void> {
        return fs.rmdir(path);
    }

    async createFolder(path: string): Promise<void> {
        return fs.mkdir(path);
    }
    /**
     * Parse metadata into a Page object.
     */
    metadataToPage(metadata: string, contents?: string): Page {
        const data = JSON.parse(metadata) as Page;
        data.content = contents;
        return data;
    }
}
