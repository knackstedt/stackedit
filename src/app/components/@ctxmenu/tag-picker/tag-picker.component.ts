import { Component, Input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-tag-picker',
    templateUrl: './tag-picker.component.html',
    styleUrls: ['./tag-picker.component.scss'],
    imports: [
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
