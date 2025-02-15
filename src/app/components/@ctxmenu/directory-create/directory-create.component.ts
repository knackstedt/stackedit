import { Component, Inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Page } from '../../../types/page';
import { PagesService } from '../../../services/pages.service';

@Component({
    selector: 'app-directory-create',
    templateUrl: './directory-create.component.html',
    styleUrls: ['./directory-create.component.scss'],
    imports: [
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        FormsModule
    ],
    standalone: true
})
export class DirectoryCreateComponent {

    @Input() value: string;
    @Input() parent: Page;

    constructor(
        @Inject(MAT_DIALOG_DATA) data,
        public readonly dialog: MatDialogRef<any>,
        private readonly pages: PagesService
    ) {
        this.value ??= data.value;
        this.parent ??= data.parent;
    }

    onSave() {
        const path = this.value.split('/').slice(0, -1).join('/');
        const dirName = this.value.split('/').pop();

        this.pages.createDirectory({
            kind: "directory",
            path: path,
            filename: dirName,
        } as any, this.parent);

        this.dialog.close();
    }
}
