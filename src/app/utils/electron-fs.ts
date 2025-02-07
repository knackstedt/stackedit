import { promises as FSApi, Stats } from '@zenfs/core';

type FS = typeof FSApi;
declare const electronFs: FS;

export const useElectron = window.navigator.userAgent.includes("Electron");

export class ElectronFS {
    exists = async (path: string) => {
        return await electronFs.access(path).then(() => true).catch(() => false);
    }

    readDir = async (path: string) => {
        return await electronFs.readdir(path, { withFileTypes: true }).then(result => {
            return result.map(r => {
                let path: string = r.path;

                if (!path.startsWith('/'))
                    path = '/' + path;

                return {
                    name: r.name,
                    path: r.path,
                    isFile: () => r.isFile,
                    isDirectory: () => r.isDirectory
                }
            });
        });
    }

    readFile: FS['readFile'] = async (...args) => {
        return await electronFs.readFile.apply(null, args);
    }

    writeFile: FS['writeFile'] = async (...args) => {
        const path = (args[0] as string).split("/").slice(0, -1).join('/');
        await electronFs.mkdir(path, { recursive: true }).catch(e => void 0);

        return await electronFs.writeFile.apply(null, args);
    }

    unlink: FS['unlink'] = async (...args) => {
        return await electronFs.unlink.apply(null, args);
    }

    mkdir: FS['mkdir'] = async (...args) => {
        return await electronFs.mkdir.apply(null, args);
    }

}
