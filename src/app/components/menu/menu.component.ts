
import { ChangeDetectorRef, Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MenuItem, MenuDirective, ThemeService, DialogService } from '@dotglitch/ngx-common';
import { LogoComponent } from './logo/logo.component';
import { AppComponent } from '../../app.component';
import { EntryListComponent } from './entry-list/entry-list.component';
import { Page } from '../../types/page';
import { EditDialogComponent } from '../@dialogs/edit-dialog/edit-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { sampleData } from './sampledata';
import { FilesService } from '../../services/files.service';
import { TagPickerComponent } from '../@ctxmenu/tag-picker/tag-picker.component';
import { IconPickerComponent } from '../@ctxmenu/icon-picker/icon-picker.component';
import { PagesService } from '../../services/pages.service';
import { ConfigService } from '../../services/config.service';
import { UtilService } from '../../services/util.service';
import { FolderRenameComponent } from '../@ctxmenu/folder-rename/folder-rename.component';

type Tag = {
    key: string,
    value: string
}

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    imports: [
        MenuDirective,
        MatTooltipModule,
        MatIconModule,
        LogoComponent,
        EntryListComponent
    ],
    standalone: true
})
export class MenuComponent {
    @ViewChild("createTemplate", { read: TemplateRef }) createTemplate: TemplateRef<any>;

    public readonly matIconRx = /[\/\.]/i;

    @Input() isMobile = false;

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
                    action: () => this.config.set('theme', "light")
                },
                {
                    // label: "Dark",
                    labelTemplate: () => `${this.theme.value == "dark" ? '⏺' : '\u00A0\u00A0\u00A0\u00A0'} Dark`,
                    action: () => this.config.set('theme', "dark")
                }
            ]
        }
    ]

    pageContextMenu: MenuItem<Page>[] = [];

    constructor(
        public readonly pages: PagesService,
        private readonly app: AppComponent,
        private readonly theme: ThemeService,
        private readonly dialog: MatDialog,
        private readonly files: FilesService,
        public readonly config: ConfigService,
        private readonly changeDetector: ChangeDetectorRef
    ) {

    }

    async ngOnInit() {

    }

    async ngAfterViewInit() {
        this.changeDetector.detectChanges();
    }

    onEntryEdit(entry: Partial<Page>) {
        this.dialog.open(EditDialogComponent, { data: entry })
    }
}
