import { Injectable } from '@angular/core';
import type fs from '@tauri-apps/api/fs';
import { BaseDirectory, FileEntry, writeTextFile } from '@tauri-apps/api/fs';
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

    async saveFileMetadata(pageMetadata: Page) {
        console.log(pageMetadata);

        const page = structuredClone(pageMetadata);
        page.content = undefined;

        if (useTauri) {
            const jsonText = JSON.stringify(page);
            await writeTextFile(page.path, jsonText, { dir: BaseDirectory.AppData });
        }
        else {
            console.log(page)
            await localforage.setItem(page.path, page)
        }
    }

    async saveFileContents(page: Page) {
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

    async listFiles(pathTarget: string) {
        let rootPages: Page[] = [];

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
                        const jsonFile = entry.name.replace(/\.mdx?$/, '.json');
                        if (!entries.find(e => e.path == jsonFile)) {
                            // Markdown files that don't have corresponding json
                            // files. This scenario usually happens when
                            // opening a doc repo folder.

                            rootPages.push({
                                path: entry.path,
                                kind: "markdown-raw",
                                name: entry.path.split('/').pop(),
                                modified: 0,
                                created: 0,
                                content: ''
                            })
                        }
                    }

                    // skip any non json files
                    if (!entry.name.endsWith(".json"))
                        continue;

                    const jsonText = await readTextFile(entry.path, { dir: BaseDirectory.AppData});
                    const page = JSON.parse(jsonText);

                    if (!parent) {
                        rootPages.push(page);
                    }

                    if (entry.children) {
                        processEntries(entry.children, entry);
                    }
                }
            };
            processEntries(entries);
        }
        else {
            // console.log("Access db")
            await dbPromise;
            const slug = pathTarget.replace(/[^a-z0-9_\-]/g, '');
            const keys = await localforage.keys();
            const jsonKeys = keys
                .filter(key => key.endsWith(".json"))
                .filter(key => key.startsWith(slug));

            rootPages = await Promise.all(jsonKeys.map(k => localforage.getItem(k))) as any;
            rootPages.forEach(p => {
                if (!p.name || p.name.trim().length < 2) {
                    p.autoName = true;
                }
            })

            // return pages;
        }

        rootPages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        return rootPages;
    }
}
