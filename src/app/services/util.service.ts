

import { Injectable } from '@angular/core';
import { ConfirmDialogComponent } from '../components/@dialogs/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Fetch } from './fetch.service';

type PistonLanguage = { language: string, version: string, aliases: string[]; }
type PistonFile = { name: string, content: string, encoding: string };
type PistonResponse = {
    stdout: string,
    stderr: string,
    output: string,
    code: number,
    signal: unknown
}
type PistonExecResult = {
    language: string,
    version: string,
    run?: PistonResponse
    compile?: PistonResponse
};

@Injectable({
    providedIn: 'root'
})
export class UtilService {

    pistonRuntimes: PistonLanguage[] = [];

    constructor(
        private readonly dialog: MatDialog,
        private readonly fetch: Fetch
    ) {
        this.getPistonRuntimes();
    }

    confirmAction(title: string, message: string) {
        return new Promise(r => {
            let s = this.dialog.open(ConfirmDialogComponent, {
                data: {
                    title,
                    message
                }
            })
                .afterClosed()
                .subscribe(() => {
                    r(0);
                    s.unsubscribe();
                });
        });
    }

    async getPistonRuntimes() {
        console.log("what the actual hell")
        this.pistonRuntimes = this.pistonRuntimes?.length
            ? this.pistonRuntimes
            : await this.fetch.get<PistonLanguage[]>("https://emkc.org/api/v2/piston/runtimes");
        console.log("promise me ", this.pistonRuntimes)
        return this.pistonRuntimes;
    }

    async runPistonScript(lang: PistonLanguage, files: PistonFile[]): Promise<PistonExecResult> {
        return this.fetch.post("https://emkc.org/api/v2/piston/execute", {
            ...lang,
            files
        })
    }
}
