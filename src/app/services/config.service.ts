import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

// key prefix
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
    }

    init() {
        for (let i = 0; i < knownKeys.length; i++) {
            const k = knownKeys[i];
            const value = this.get(k);
            this.value[k] = value;
        }
        this.next(this.value);
    }

    set(key: string, value: any) {
        this.value[key] = value;
        localStorage[prefix + key] = JSON.stringify(value ?? null);
        this.next(this.value);
    }

    get<T = any>(key: string) {
        const value = localStorage[prefix + key];
        if (value === null || value === undefined)
            return value;
        return this.value[key] = JSON.parse(value) as T;
    }
}
