import { Injectable } from '@angular/core';
import type fs from '@tauri-apps/api/fs';
import { BaseDirectory, FileEntry, writeTextFile } from '@tauri-apps/api/fs';
import localforage from 'localforage';
import { BehaviorSubject, Subject } from 'rxjs';

// Mangled import so tauri doesn't throw errors if it's not injected
const { readDir, readTextFile, createDir }
    = window['__TAURI__']?.['fs'] as typeof fs || {};

const useTauri = !!readDir;

// Filepath used by tauri
const filePath = `app.json`;
// key prefix used by localforage
const prefix = `config-`;

type Config = Partial<{
    telemetry: boolean
}>;

const knownKeys = [
    "telemetry"
]

let dbPromise;

/**
 *
 */
@Injectable({
    providedIn: 'root'
})
export class ConfigService extends Subject<Config> {

    public value: Config = {};

    constructor() {
        super();
        dbPromise = localforage.setDriver([
            localforage.INDEXEDDB
        ]);

        dbPromise.then(async () => {
            for (let i = 0; i < knownKeys.length; i++) {
                const k = knownKeys[i];
                const value = await this.get(k);
                this.value[k] = value;
            }

            this.next(this.value);
        });
    }

    async set(key: string, value: any) {

        if (useTauri) {
            let text = '';
            switch(typeof value) {
                case "function":
                    throw new Error("Cannot set value if type is function");
                case "undefined":
                    return;
                case "object": {
                    text = JSON.parse(value);
                    break;
                }
                default: {
                    text = value.toString();
                }
            }

            this.value[key] = value;
            const entry = {
                value: text,
                type: typeof value
            }
            const entryValue = JSON.stringify(entry);
            await writeTextFile(filePath, entryValue, { dir: BaseDirectory.AppData });
        }
        else {
            this.value[key] = value;
            await localforage.setItem(prefix + key, value);
        }

        this.next(this.value);
    }

    async get(key: string) {
        if (useTauri) {
            const data = await readTextFile(filePath, { dir: BaseDirectory.AppData });
            const {
                value,
                type
            } = JSON.parse(data);

            if (type == "string")
                return value;
            else
                return JSON.parse(value);
        }
        else {
            return await localforage.getItem(prefix + key);
        }
    }
}
