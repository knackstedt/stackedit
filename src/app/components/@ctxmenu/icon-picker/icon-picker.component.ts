import { Component, Inject, Input, Optional } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Page } from '../../../types/page';
import { FormsModule } from '@angular/forms';
import icons from './mat-icons-outlined.json';
import { PagesService } from '../../../services/pages.service';
import { ThemeService } from '@dotglitch/ngx-common';

@Component({
    selector: 'app-icon-picker',
    templateUrl: './icon-picker.component.html',
    styleUrls: ['./icon-picker.component.scss'],
    imports: [
        MatIconModule,
        MatButtonModule,
        MatInputModule,
        FormsModule
    ],
    standalone: true
})
export class IconPickerComponent {

    @Input() dialog: MatDialogRef<any>;
    @Input() page: Page;
    @Input() disableAutoSave = false;

    @Input() iconCount = 30;
    query = '';
    searchIcons: string[] = [];

    constructor(
        // public readonly dialog: MatDialogRef<any>,
        @Optional() @Inject(MAT_DIALOG_DATA) public readonly data,
        private readonly pages: PagesService,
        public readonly theme: ThemeService
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

        if (!this.disableAutoSave)
            await this.pages.savePage(this.page);
    };
    async setIcon(icon: string) {
        this.page.icon = icon;

        if (!this.disableAutoSave)
            await this.pages.savePage(this.page);
    };
}
