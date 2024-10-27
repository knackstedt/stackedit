import { Injectable } from '@angular/core';
import type shell from '@tauri-apps/api/shell';

/**
 * Schemas
 */
import { Subject, map } from 'rxjs';

// Mangled import so tauri doesn't throw errors if it's not injected
const { open, Child, Command }
    = window['__TAURI__']?.['shell'] as typeof shell || {};


/**
 *
 */
@Injectable({
    providedIn: 'root'
})
export class ShellService {

    private _canUsePodman = false;
    private _canUseDocker = false;
    get canUsePodman() { return this._canUsePodman }
    get canUseDocker() { return this._canUseDocker }

    get canStartPiston() {
        return this._canUseDocker || this._canUsePodman
    }

    private hasCheckedCommands = false;

    constructor() {

    }

    async init() {
        const usePodman = this._canUsePodman = await this.checkPodman();
        const useDocker = this._canUseDocker = await this.checkDocker();
        this.hasCheckedCommands = true;

        if (!usePodman && !useDocker) {
            throw new Error("Cannot bootstrap")
        }
    }

    /**
     * Use Commands to check if Podman is available on the host.
     */
    private async checkPodman() {
        const which = (await (new Command('which', 'podman')).execute()).stdout;

        if (which.length < 2 || which.includes("no found"))
            return false;
        const perms = (await (new Command('podman', 'ps')).execute()).stdout;
        if (perms.includes("command not found"))
            return false;

        return perms.includes("CONTAINER ID");
    }

    /**
     * Use Commands to check if Docker is available on the host.
     */
    private async checkDocker() {
        const which = (await (new Command('which', 'docker')).execute()).stdout;

        if (which.length < 2 || which.includes("no found"))
            return false;

        const perms = (await (new Command('docker', 'ps')).execute()).stdout;
        if (perms.includes("command not found"))
            return false;

        return perms.includes("CONTAINER ID");
    }

    public async startPiston() {
        let startCommand = new Command("docker", [
            "run",
            "-v $PWD:'/piston'",
            "--tmpfs /piston/jobs",
            "-dit",
            "-p 2000:2000",
            "--name piston_api",
            "ghcr.io/engineer-man/piston"
        ])
    }
}
