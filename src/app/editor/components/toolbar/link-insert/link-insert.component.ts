import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StackEditorComponent } from '../../../editor.component';

@Component({
    selector: 'app-link-insert',
    templateUrl: './link-insert.component.html',
    styleUrls: ['./link-insert.component.scss'],
    imports: [
        NgIf,
        MatIconModule,
        MatTooltipModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        FormsModule
    ],
    standalone: true
})
export class LinkInsertComponent implements OnInit {

    isSaving = false;

    linkUrl = '';
    linkText = '';

    private stackEditor: StackEditorComponent;

    constructor(
        public readonly dialogRef: MatDialogRef<any>,
        @Inject(MAT_DIALOG_DATA) public readonly data
    ) {
        this.stackEditor = data.stackEditor;
        const editor = this.stackEditor.editorSvc.clEditor;
        this.linkText = editor.getContent().slice(editor.selectionMgr.selectionStart, editor.selectionMgr.selectionEnd)
    }

    ngOnInit() {

    }

    async applyChanges() {
        this.stackEditor.editorSvc.clEditor.replaceSelection(`[${this.linkText}](${this.linkUrl})`);
        this.dialogRef.close();
    }
}
