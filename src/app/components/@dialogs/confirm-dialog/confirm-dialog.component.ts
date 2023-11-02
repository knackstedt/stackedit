import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.scss'],
    imports: [
        NgIf,
        MatIconModule,
        MatButtonModule
    ],
    standalone: true
})
export class ConfirmDialogComponent {

    constructor(
        @Inject(MAT_DIALOG_DATA) public readonly data,
        public readonly dialogRef: MatDialogRef<any>
    ) {

    }
}
