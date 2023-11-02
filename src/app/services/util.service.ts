

import { Injectable } from '@angular/core';
import { ConfirmDialogComponent } from '../components/@dialogs/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
    providedIn: 'root'
})
export class UtilService {

    constructor(
        private readonly dialog: MatDialog
    ) {

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
}
