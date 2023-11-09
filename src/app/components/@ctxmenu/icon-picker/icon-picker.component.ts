import { Component, Inject, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgForOf, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Page } from '../../../types/page';
import { FormsModule } from '@angular/forms';
import icons from './mat-icons-outlined.json';
import { PagesService } from '../../../services/pages.service';

@Component({
    selector: 'app-icon-picker',
    templateUrl: './icon-picker.component.html',
    styleUrls: ['./icon-picker.component.scss'],
    imports: [
        NgIf,
        NgForOf,
        MatIconModule,
        MatButtonModule,
        MatInputModule,
        FormsModule
    ],
    standalone: true
})
export class IconPickerComponent {

    @Input() dialog: MatDialogRef<any>;
    page: Page;
    iconCount = 30;
    query = '';
    searchIcons: string[] = [];

    constructor(
        // public readonly dialog: MatDialogRef<any>,
        @Inject(MAT_DIALOG_DATA) public readonly data,
        private readonly pages: PagesService
    ) {
        this.page = data.data;
        this.dialog = data.dialog;
    }

    ngOnInit() {
        this.filterResults()
    }

    filterResults() {
        if (this.query.trim().length == 0) {
            this.searchIcons = icons.slice(0, this.iconCount).map(i => i.name);
            return;
        }

        const query = this.query.toLowerCase().trim();
        let matchedIcons = [];
        for (let i = 0; i < icons.length && matchedIcons.length < this.iconCount; i++) {
            const icon = icons[i];
            if (
                icon.name.includes(query) ||
                icon.categories.includes(query) ||
                icon.tags.includes(query)
                ) {
                    matchedIcons.push(icon.name);
                }
        }
        this.searchIcons = matchedIcons;
    }

    async clearIcon() {
        this.page.icon = null;
        await this.pages.savePage(this.page);
        // this.dialog.close();
    };
    async setIcon(icon: string) {
        this.page.icon = icon;
        await this.pages.savePage(this.page);
        // this.dialog.close();
    };
}
