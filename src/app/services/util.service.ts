

import { Injectable } from '@angular/core';
import { ConfirmDialogComponent } from '../components/@dialogs/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Fetch } from './fetch.service';
import { StackEditorComponent } from '../editor/editor.component';
import { Page } from '../types/page';
import { ulid } from 'ulidx';

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

    async executeCode(page: Page) {
        const runtimes = await this.getPistonRuntimes();
        const lang = runtimes.find(r =>
            r.language == page.options['language'] || r.aliases.includes(page.options['language'])
        );

        return this.runPistonScript(lang, [{
            content: page.content,
            encoding: "utf-8",
            name: ulid()
        }]);
    }

    private _gettingRuntimes;
    async getPistonRuntimes() {
        if (this.pistonRuntimes?.length > 0)
            return this.pistonRuntimes;

        if (this._gettingRuntimes)
            return await this._gettingRuntimes;

        return this._gettingRuntimes =
            this.fetch.get<PistonLanguage[]>("https://emkc.org/api/v2/piston/runtimes");
    }

    async runPistonScript(lang: PistonLanguage, files: PistonFile[]): Promise<PistonExecResult> {
        return this.fetch.post("https://emkc.org/api/v2/piston/execute", {
            ...lang,
            files
        })
    }
}
