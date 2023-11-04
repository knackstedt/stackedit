import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Page } from '../../../types/page';
import { PagesService } from '../../../services/pages.service';

@Component({
    selector: 'app-folder-rename',
    templateUrl: './folder-rename.component.html',
    styleUrls: ['./folder-rename.component.scss'],
    imports: [
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        FormsModule
    ],
    standalone: true
})
export class FolderRenameComponent implements OnInit {

    @Input() dialog: MatDialogRef<any>;
    @Input() data: Page;
    @Input() createDir: boolean;

    originalName = "";
    isRename = false;
    hasSaved = false;

    constructor(
        private readonly pages: PagesService
    ) { }

    ngOnInit() {
        if (this.createDir) {
            this.data = {
                path: this.data.path,
                name: ''
            } as any;
        }
        this.isRename = this.data?.name.length > 0;

        this.originalName = this.data?.name;
    }

    ngOnDestroy() {
        if (this.data && !this.hasSaved)
            this.data.name = this.originalName;
    }

    onSave() {
        this.hasSaved = true;
        if (this.data?.name?.length > 2)
            this.data.autoName = false;
        this.dialog.close(this.data);
        this.pages.savePage(this.data);
    }
}
