import { NgForOf, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LazyLoaderService } from '@dotglitch/ngx-common';
import { Page, PageKinds } from '../../types/page';
import { ulid } from 'ulidx';


@Component({
    selector: 'app-edit-dialog',
    templateUrl: './edit-dialog.component.html',
    styleUrls: ['./edit-dialog.component.scss'],
    imports: [
        NgIf,
        NgForOf,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatTooltipModule,
        FormsModule,
    ],
    standalone: true
})
export class EditDialogComponent implements OnInit {

    PageKinds = PageKinds;
    page: Page;

    constructor(
        public dialog: MatDialogRef<any>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.page = structuredClone(data) || {};
        this.page.path = this.page.path ?? "data/temp_" + ulid() + '.json'
        this.page.created = this.page.created ?? Date.now();
        this.page.kind = this.page.kind ?? "markdown";

    }

    ngOnInit() {

    }

    async save() {
        this.page.modified = Date.now();
        this.dialog.close(this.page);
    }
}
