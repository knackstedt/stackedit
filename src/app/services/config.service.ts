import { Injectable } from '@angular/core';
import { createInstance } from 'localforage';
import { Subject } from 'rxjs';

const localforage = createInstance({
    name: "@dotglitch",
    storeName: "ScratchDown"
});

// key prefix used by localforage
const prefix = `config-`;

type Config = Partial<{
    telemetry: boolean,
    menuCollapsed: boolean,
    menuSize: number,
    theme: string,
    hasInstalledDefaultPages: boolean
}>;

const knownKeys = [
    "telemetry",
    "menuCollapsed",
    "theme",
    "hasInstalledDefaultPages",
    "menuSize"
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

    }

    init() {
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
        this.value[key] = value;
        await localforage.setItem(prefix + key, value);

        this.next(this.value);
    }

    async get<T = any>(key: string) {
        return await localforage.getItem(prefix + key) as T;
    }
}
