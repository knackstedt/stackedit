import { Injectable } from '@angular/core';
import sanitizeFilename from "sanitize-filename";
import { Page } from '../types/page';
import { BrowserFS } from 'src/app/utils/browser-fs';
import { useElectron, ElectronFS } from 'src/app/utils/electron-fs';

const fs: BrowserFS = useElectron ? new ElectronFS() as any : new BrowserFS();

@Injectable({
    providedIn: 'root'
})
export class FilesService {

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
                const files = items.filter(i => i.isFile()).filter(i => !i.name.startsWith("."));
                // TODO: directory support.
                const dirs = items.filter(i => i.isDirectory());

                // console.log("file from path", files);

                return Promise.all(
                    dirs.map(async f => {
                        const metadata = await this.readFile(path + '.' + f.name).catch(e => null);
                        // If we have a metadata file, load that.
                        if (metadata) {
                            // Ensure that if something is moved in the real FS, we catch it and update the path we try to use.
                            const meta = JSON.parse(metadata || "{}") as Page;
                            meta.path = f.path || '/';
                            meta.filename = f.name;

                            // console.log("incoming metadata", meta);
                            return meta;
                        }

                        return {
                            path: f.path || '/',
                            filename: f.name,
                            created: f.stats?.ctimeMs,
                            modified: f.stats?.mtimeMs,
                            kind: "directory",
                            autoLabel: true,
                            content: ''
                        } as Page;
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
    async saveFileMetadata(file: Page): Promise<void> {
        const data = structuredClone(file);
        data.content = '';

        // console.log("sfm", file.path + file.filename);
        return fs.writeFile(file.path + '.' + file.filename, JSON.stringify(data));
    }

    /**
     * Saves page contents.
     */
    async saveFileContents(file: Page): Promise<void> {
        if (file.autoFilename) {
            const filename = sanitizeFilename(file.label || file.filename);
            file.filename = filename;
        }

        if (file.kind == "fetch") {
            file.content = '';
        }
        else if (file.kind == "directory") {
            fs.mkdir(file.path + file.filename)
            return;
        }

        // console.log("sfc", file.path + file.filename);
        return fs.writeFile(file.path + file.filename, file.content);
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
        // Delete both the .md and the .md.json files.
        return fs.unlink(path)
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
