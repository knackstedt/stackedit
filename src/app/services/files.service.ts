import { Injectable } from '@angular/core';
import type fs from '@tauri-apps/api/fs';
import { BaseDirectory, FileEntry, removeFile, renameFile, writeTextFile } from '@tauri-apps/api/fs';
import { Page } from '../types/page';
import localforage from 'localforage';

/**
 * Schemas
 */
import { Subject, map } from 'rxjs';

// Mangled import so tauri doesn't throw errors if it's not injected
const { readDir, readTextFile, createDir }
    = window['__TAURI__']?.['fs'] as typeof fs || {};

const useTauri = !!readDir;


let dbPromise;
/**
 *
 */

@Injectable({
    providedIn: 'root'
})
export class FilesService extends Subject<any> {

    constructor() {
        super();
        dbPromise = localforage.setDriver([
            localforage.INDEXEDDB
        ]);
    }

    private async validateDir(path: string) {
        if (!useTauri) return true;

        if (path.endsWith(".json"))
            path = path.split('/').slice(0, -1).join("/");

        await createDir(path, { dir: BaseDirectory.AppData, recursive: true });
        return true
    }

    async saveFileMetadata(pageMetadata: Page) {
        await this.validateDir(pageMetadata.path);

        const page = structuredClone(pageMetadata);
        page.content = undefined;

        if (useTauri) {
            const jsonText = JSON.stringify(page);
            await writeTextFile(page.path, jsonText, { dir: BaseDirectory.AppData });
        }
        else {
            await localforage.setItem(page.path, page)
        }
    }

    async saveFileContents(page: Page) {
        await this.validateDir(page.path);

        // Do not set page contents to `undefined` or `null`.
        // This gets called when an update comes through before
        // a page loads it's contents
        if (page.content == undefined || page.content == null)
            return;

        if (useTauri) {
            const path = page.path.replace(/\.json$/, '.md');
            await writeTextFile(path, page.content, { dir: BaseDirectory.AppData });
        }
        else {
            const path = page.path.replace(/\.json$/, '.md');
            await localforage.setItem(path, page.content);
        }
    }

    async readFile(path: string) {
        if (useTauri) {
            return await readTextFile(path, { dir: BaseDirectory.AppData });
        }
        else {
            return await localforage.getItem(path)
        }
    }

    async deleteFile(page: Page) {
        if (useTauri) {
            return await removeFile(page.path, { dir: BaseDirectory.AppData });
        }
        else {
            await localforage.removeItem(page.path);
            await localforage.removeItem(page.path.replace(/\.json$/, '.md'));
        }
    }

    async trashFile(page: Page) {
        const srcPath = page.path;
        const targetPath = page.path.replace(/^data\//, 'trash/');
        const srcPathMd = srcPath.replace(/\.json$/, '.md');
        const targetPathMd = targetPath.replace(/\.json$/, '.md');

        if (useTauri) {
            createDir(targetPath.split('/').slice(0, -1).join("/"), { dir: BaseDirectory.AppData });
            await renameFile(srcPath, targetPath, { dir: BaseDirectory.AppData });
            await renameFile(srcPathMd, targetPathMd, { dir: BaseDirectory.AppData });
        }
        else {
            const oldFile = await localforage.getItem(srcPath);
            await localforage.setItem(targetPath, oldFile);

            const oldFileMd = await localforage.getItem(srcPathMd);
            await localforage.setItem(targetPathMd, oldFileMd);

            await localforage.removeItem(srcPath);
            await localforage.removeItem(srcPathMd);
        }
    }

    async listFiles(pathTarget: string) {
        let pages: Page[] = [];

        if (pathTarget.trim().length < 3)
            pathTarget = "data";

        // if (!pathTarget.startsWith("/"))
            // pathTarget = "/" + pathTarget;
        if (!pathTarget.endsWith("/"))
            pathTarget += "/";

        const path = pathTarget;

        if (useTauri) {
            await createDir(path, { dir: BaseDirectory.AppData, recursive: true });
            const entries = await readDir(path, { dir: BaseDirectory.AppData, recursive: true });

            const processEntries = async (entries: FileEntry[], parent?) => {
                for (const entry of entries) {
                    if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
                        const jsonFile = entry.path.replace(/\.mdx?$/, '.json');
                        if (!entries.find(e => e.path == jsonFile)) {
                            // Markdown files that don't have corresponding json
                            // files. This scenario usually happens when
                            // opening a doc repo folder.

                            pages.push({
                                path: entry.path,
                                kind: "markdown-raw",
                                name: entry.path.split('/').pop(),
                                modified: 0,
                                created: 0,
                                content: ''
                            })
                        }
                    }

                    if (entry.children) {
                        await processEntries(entry.children, entry);
                    }

                    // skip any non json files
                    if (!entry.name.endsWith(".json"))
                        continue;

                    const jsonText = await readTextFile(entry.path, { dir: BaseDirectory.AppData });
                    const page = JSON.parse(jsonText);
                    pages.push(page);
                }
            };
            await processEntries(entries);
        }
        else {
            await dbPromise;
            const slug = pathTarget.replace(/[^a-z0-9_\-]/g, '');
            const keys = await localforage.keys();
            const jsonKeys = keys
                .filter(key => key.endsWith(".json"))
                .filter(key => key.startsWith(slug));

            pages = await Promise.all(jsonKeys.map(k => localforage.getItem(k))) as any;
            pages.forEach(p => {
                if (!p.name || p.name.trim().length < 2) {
                    p.autoName = true;
                }
            })

        }

        pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return pages;
    }
}
