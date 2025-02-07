import { Injectable } from '@angular/core';
import { Page } from '../types/page';
import { BrowserFS } from 'src/app/utils/browser-fs';
import { useElectron, ElectronFS } from 'src/app/utils/electron-fs';

const fs: BrowserFS = useElectron ? new ElectronFS() as any : new BrowserFS();

@Injectable({
    providedIn: 'root'
})
export class FilesService {

    async readDir(path: string): Promise<Page[]> {
        const exists = await fs.exists(path);
        if (!exists) {
            console.log("path is a lie", path);
            await fs.mkdir(path, { recursive: true });
            return [];
        }
        console.log("readdir from path", path);
        return fs.readDir(path)
            .then(items => {
                const files = items.filter(i => i.isFile()).filter(i => !i.name.startsWith("."));
                const dirs = items.filter(i => i.isDirectory());
                // TODO: directory support.

                console.log("file from path", files);

                return Promise.all(files.map(async f => {
                    console.log("read file", path + f.name);

                    const metadata = await this.readFile(path + '.' + f.name).catch(e => null)
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
                            created: f.stats.ctimeMs,
                            modified: f.stats.mtimeMs,
                            kind: "code",
                            autoLabel: true,
                            content: contents
                        } as Page
                    }
                }))
            })
    }

    async saveFileMetadata(file: Page): Promise<void> {
        const data = structuredClone(file);
        data.content = '';

        // console.log("sfm", file.path + file.filename);
        return fs.writeFile(file.path + '.' + file.filename, JSON.stringify(data));
    }

    async saveFileContents(file: Page): Promise<void> {
        if (file.kind == "fetch") {
            file.content = '';
        };
        // console.log("sfc", file.path + file.filename);
        return fs.writeFile(file.path + file.filename, file.content);
    }

    /**
     * Read the file content at the given path + filename
     */
    async readFile(path: string): Promise<string> {
        return fs.readFile(path, 'utf8')
    }

    // This also deletes directories
    async deleteFile(path: string): Promise<void> {
        // Delete both the .md and the .md.json files.
        return fs.unlink(path)
    }

    metadataToPage(metadata: string, contents?: string): Page {
        const data = JSON.parse(metadata) as Page;
        data.content = contents;
        return data;
    }
}
