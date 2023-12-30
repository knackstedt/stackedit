
import { Component, Inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { StackEditorComponent } from '../../../editor.component';

@Component({
    selector: 'app-image-insert',
    templateUrl: './image-insert.component.html',
    styleUrls: ['./image-insert.component.scss'],
    imports: [
        MatIconModule,
        MatTooltipModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        FormsModule
    ],
    standalone: true
})
export class ImageInsertComponent implements OnInit {

    isSaving = false;

    imageUrl = '';
    imagePlaceholder = '';

    private stackEditor: StackEditorComponent;

    constructor(
        public readonly dialogRef: MatDialogRef<any>,
        @Inject(MAT_DIALOG_DATA) public readonly data
    ) {
        this.stackEditor = data.stackEditor;
        const editor = this.stackEditor.editorSvc.clEditor;
        this.imagePlaceholder = editor.getContent().slice(editor.selectionMgr.selectionStart, editor.selectionMgr.selectionEnd);
    }

    ngOnInit() {

    }

    onFileUpload(files: FileList) {
        this.stackEditor.onImageUpload.next({
            data: files,
            ...this.stackEditor.editorSvc.clEditor.selectionMgr,
            stackEditor: this.stackEditor
        });
        this.dialogRef.close();
    }

    async applyChanges() {
        this.stackEditor.editorSvc.clEditor.replaceSelection(`![${this.imagePlaceholder}](${this.imageUrl})`);
        this.dialogRef.close();
    }
}
