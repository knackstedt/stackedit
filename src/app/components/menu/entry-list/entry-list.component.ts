
import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MenuItem, MenuDirective, TooltipDirective } from '@dotglitch/ngx-common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatExpansionModule } from '@angular/material/expansion';
import { Page } from '../../../types/page';
import { MenuComponent } from '../menu.component';
import { AppComponent } from '../../../app.component';
import { PagesService } from '../../../services/pages.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DirectoryCreateComponent } from 'src/app/components/@ctxmenu/directory-create/directory-create.component';
import { IconPickerComponent } from 'src/app/components/@ctxmenu/icon-picker/icon-picker.component';
import { FolderRenameComponent } from 'src/app/components/@ctxmenu/folder-rename/folder-rename.component';
import { UtilService } from 'src/app/services/util.service';
import { EditDialogComponent } from 'src/app/components/@dialogs/edit-dialog/edit-dialog.component';

@Component({
    selector: 'app-entry-list',
    templateUrl: './entry-list.component.html',
    styleUrls: ['./entry-list.component.scss'],
    imports: [
        DragDropModule,
        MatIconModule,
        MatButtonModule,
        MatExpansionModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        TooltipDirective,
        MenuDirective,
        FolderRenameComponent
    ],
    standalone: true
})
export class EntryListComponent implements OnInit {
    @ViewChild("renameTemplate", { read: TemplateRef }) renameTemplate: TemplateRef<any>;

    @Input() depth = 0;
    @Input() item: Page;
    @Input() items: Page[] = [];

    ctxMenu: MenuItem<Page>[] = [];

    constructor(
        private readonly app: AppComponent,
        private readonly menu: MenuComponent,
        public readonly pages: PagesService,
        private readonly dialog: MatDialog,
        private readonly util: UtilService
    ) {
    }

    ngOnInit() {
        this.items?.sort((a, b) => a.order - b.order);
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.ctxMenu = [
                {
                    label: "Add subdirectory",
                    isVisible: data => data.kind == "directory",
                    action: (parent) =>
                        this.createDirectory(parent)
                },
                {
                    label: "Add new Markdown file",
                    isVisible: data => data.kind == "directory",
                    action: (parent) =>
                        this.pages.createPage({ kind: "markdown", icon: "markdown" }, parent)
                },
                {
                    label: "Add new Diagram file",
                    isVisible: data => data.kind == "directory",
                    action: (parent) =>
                        this.pages.createPage({ kind: "canvas", icon: "network_node" }, parent)
                },
                {
                    label: "Add new Code file",
                    isVisible: data => data.kind == "directory",
                    action: (parent) =>
                        this.pages.createPage({ kind: "code", icon: "code_blocks" }, parent)
                },
                // {
                //     label: "Create Child (Fetch)",
                //     action: (data) =>
                //         this.pages.createPage({ kind: "fetch" }, data)
                // },
                "separator",
                {
                    label: "Set Icon",
                    childTemplate: IconPickerComponent
                },
                "separator",
                {
                    label: "Delete",
                    action: async page => {
                        await this.util.confirmAction("Confirm"
                            , `Are you sure you want to delete ${page.label || page.filename}?`);
                        this.pages.deletePage(page, this.item);
                    }
                },
                {
                    label: "Rename",
                    childTemplate: this.renameTemplate,
                    isVisible: page => page.kind != "directory",
                    action: async page => {
                        this.pages.savePage(page, this.item);
                    }
                },
                { label: "Edit...", action: p => this.onEntryEdit(p) }
            ];
        }, 1)
    }

    async drop(event: CdkDragDrop<any, any, any>) {
        if (event.previousIndex == event.currentIndex) return;

        // Update the array position after the data is updated in the backend
        moveItemInArray(this.items, event.previousIndex, event.currentIndex);

        this.items.forEach((item, index) => {
            item.order = index;
        });

        // debugger;

        for (let i = 0; i < this.items.length; i++)
            await this.pages.savePage(this.items[i], this.item);
    }

    create(kind: string, icon: string) {
        this.pages.createPage({
            order: this.items?.length ?? 0,
            kind: kind as any,
            icon
        }, this.item as any);
    }

    createDirectory(parent?: Partial<Page>) {
        this.dialog.open(DirectoryCreateComponent, {
            data: {
                parent: parent || this.pages.rootPage
            }
        })
    }

    onEntryEdit(entry: Partial<Page>) {
        this.dialog.open(EditDialogComponent, { data: entry })
    }

    debug(e) {
        console.log(e)
    }
}
