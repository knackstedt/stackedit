import { Component, Input } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-tag-picker',
    templateUrl: './tag-picker.component.html',
    styleUrls: ['./tag-picker.component.scss'],
    imports: [
        NgIf,
        NgForOf,
        MatIconModule,
        MatButtonModule
    ],
    standalone: true
})
export class TagPickerComponent {

    hasTag = false;

    constructor(
    ) { }

}
