import { IndexedDB } from '@zenfs/dom';
import { configureSingle, promises as fs, Stats } from '@zenfs/core';

type FS = typeof fs;

export class BrowserFS {
    private initPromise: Promise<any>;

    constructor() {
        this.initPromise = configureSingle({
            backend: IndexedDB
        })
    }

    exists: FS['exists'] = async (...args) => {
        await this.initPromise;
        return await fs.exists.apply(null, args);
    }

    readDir = async (path: string) => {
        await this.initPromise;
        return await fs.readdir(path, { withFileTypes: true }).then(result => {
            // TODO: The ZenFS "polyfill" doesn't return the correct format in the current version.
            return result.map(r => {
                let path: string = r.path;

                if (!path.startsWith('/'))
                    path = '/' + path;

                return {
                    name: path.split('/').pop(),
                    path: path.split('/').slice(0, -1).join('/') || '/',
                    isFile: () => r.isFile(),
                    isDirectory: () => r.isDirectory(),
                    stats: r['stats'] as Stats
                }
            });
        });
    }

    readFile: FS['readFile'] = async (...args) => {
        await this.initPromise;
        return await fs.readFile.apply(null, args);
    }

    writeFile: FS['writeFile'] = async (...args) => {
        await this.initPromise;
        const path = (args[0] as string).split("/").slice(0, -1).join('/');
        await fs.mkdir(path, { recursive: true }).catch(e => void 0);

        return await fs.writeFile.apply(null, args);
    }

    unlink: FS['unlink'] = async (...args) => {
        await this.initPromise;
        return await fs.unlink.apply(null, args);
    }

    mkdir: FS['mkdir'] = async (...args) => {
        await this.initPromise;
        return await fs.mkdir.apply(null, args);
    }
}
