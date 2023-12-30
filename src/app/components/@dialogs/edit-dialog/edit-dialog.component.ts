
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Page, PageKinds } from '../../../types/page';
import { ulid } from 'ulidx';
import { installMonaco } from '../../../editor/monaco';
import { PagesService } from '../../../services/pages.service';
import { MatCheckboxModule } from '@angular/material/checkbox';


@Component({
    selector: 'app-edit-dialog',
    templateUrl: './edit-dialog.component.html',
    styleUrls: ['./edit-dialog.component.scss'],
    imports: [
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatCheckboxModule,
        FormsModule
    ],
    standalone: true
})
export class EditDialogComponent implements OnInit {

    PageKinds = PageKinds;
    page: Page;

    languages = [];

    constructor(
        public dialog: MatDialogRef<any>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private pages: PagesService
    ) {
        this.page = structuredClone(data) || {};
        this.page.path = this.page.path ?? "data/temp_" + ulid() + '.json'
        this.page.created = this.page.created ?? Date.now();
        this.page.kind = this.page.kind ?? "markdown";
        this.page.options = this.page.options ?? {};
    }

    async ngOnInit() {
        await installMonaco();
        this.languages = window['monaco'].languages.getLanguages().map(l => l.id);
    }

    async save() {
        // Apply changes
        Object.keys(this.page).forEach(k => this.data[k] = this.page[k]);

        this.pages.savePage(this.page);
        this.dialog.close();
    }
}
