import { NgForOf, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MenuItem, MenuDirective, ThemeService, DialogService } from '@dotglitch/ngx-common';
import { LogoComponent } from './logo/logo.component';
import { AppComponent } from '../app.component';
import { EntryListComponent } from './entry-list/entry-list.component';
import { Page } from '../types/page';
import { EditDialogComponent } from './edit-dialog/edit-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { sampleData } from './sampledata';
import { FilesService } from '../services/files.service';
import { TagPickerComponent } from './@ctxmenu/tag-picker/tag-picker.component';
import { IconPickerComponent } from './@ctxmenu/icon-picker/icon-picker.component';

type Tag = {
    key: string,
    value: string
}

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    imports: [
        NgForOf,
        NgIf,
        MenuDirective,
        MatTooltipModule,
        MatIconModule,
        LogoComponent,
        EntryListComponent
    ],
    standalone: true
})
export class MenuComponent {

    pages: Page[] = [];
    trash: Page[] = [];

    public readonly matIconRx = /[\/\.]/i;

    @Input() isMobile = false;

    collapsed = false;
    showAdvancedMenu = true;

    readonly profileLinks: MenuItem[] = [
        {
            label: "Appearance",
            children: [
                // {
                //     label: "Browser Theme",
                //     action: () => {

                //     }
                // },
                // "separator",
                {
                    // label: "Light",
                    labelTemplate: () => `${this.theme.value == "light" ? '⏺' : '\u00A0\u00A0\u00A0'} Light`,
                    action: () => this.theme.setTheme("light")
                },
                {
                    // label: "Dark",
                    labelTemplate: () => `${this.theme.value == "dark" ? '⏺' : '\u00A0\u00A0\u00A0\u00A0'} Dark`,
                    action: () => this.theme.setTheme("dark")
                }
            ]
        }
    ]

    readonly pageContextMenu: MenuItem[] = [
        { label: "Open in new tab" },
        "separator",
        {
            label: "Set Icon",
            childTemplate: IconPickerComponent,
            action: (data) => {
                console.log(data)
            }
        },
        {
            label: "Set Tag",
            childTemplate: TagPickerComponent,
            action: (data) => {
                console.log(data)
            }
        },
        // { label: "Set Color" },
        // { label: "Set Color" },
        // "separator",
        // { label: "Rename" },
        // { label: "Clone" },
        // { label: "Move" },
        // { label: "Bookmark" },
        // "separator",
        // { label: "Show in File Explorer" },
        "separator",
        {
            label: "Delete",
            action: page => {
                // this.files.del
            }
        },
        { label: "Edit...", action: p => this.onEntryEdit(p) }
    ]

    constructor(
        private readonly app: AppComponent,
        private readonly theme: ThemeService,
        private readonly dialog: MatDialog,
        private readonly files: FilesService,
    ) {
    }

    async ngOnInit() {
        this.pages = await this.files.listFiles("data");
        this.trash = await this.files.listFiles("trash");
        this.app.addTab(this.pages[0]);
    }

    onEntryEdit(entry: Partial<Page>) {
        const s = this.dialog.open(EditDialogComponent, { data: entry })
            .afterClosed().subscribe(async (result) => {
                s.unsubscribe();

                if (result) {
                    await this.files.saveFileMetadata(result);
                    this.pages.push(result);
                }
            });
    }
}
