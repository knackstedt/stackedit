import { NgForOf, NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MenuItem, MenuDirective } from '@dotglitch/ngx-common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatExpansionModule } from '@angular/material/expansion';
import { Page } from '../../types/page';
import { MenuComponent } from '../menu.component';
import { ulid } from 'ulidx';
import { AppComponent } from '../../app.component';
import { PagesService } from '../../services/pages.service';

@Component({
    selector: 'app-entry-list',
    templateUrl: './entry-list.component.html',
    styleUrls: ['./entry-list.component.scss'],
    imports: [
        NgForOf,
        NgIf,
        DragDropModule,
        MatIconModule,
        MatButtonModule,
        MatExpansionModule,
        MenuDirective
    ],
    standalone: true
})
export class EntryListComponent implements OnInit {

    @Input() depth = 0;
    @Input() item: Partial<Page> = {};
    @Input() items: Page[] = [];
    @Input() ctxMenu: MenuItem<Page>[] = [];

    constructor(
        private readonly app: AppComponent,
        private readonly menu: MenuComponent,
        private readonly pages: PagesService
    ) {
    }

    ngOnInit() {
    }

    async drop(event: CdkDragDrop<any, any, any>) {
        if (event.previousIndex == event.currentIndex) return;

        // Update the array position after the data is updated in the backend
        moveItemInArray(this.items, event.previousIndex, event.currentIndex);

        this.items.forEach((item, index) => {
            item.order = index;
        });

        for (let i = 0; i < this.items.length; i++)
            await this.pages.savePage(this.items[i]);
    }

    async create(kind: string) {
        const page = await this.pages.createPage({
            order: this.items.length,
            kind: kind as any
        });
        this.app.addTab(page);
        this.items.push(page);
    }

    openPage(page: Page) {
        //
        this.app.addTab(page);
    }
}