import { Component, Input, OnInit } from '@angular/core';
import { Fetch, VscodeComponent } from '@dotglitch/ngx-common';
import { Page } from '../../types/page';
import { NgForOf, NgIf } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { AngularSplitModule } from 'angular-split';

@Component({
    selector: 'app-fetch-page',
    templateUrl: './fetch-page.component.html',
    styleUrls: ['./fetch-page.component.scss'],
    imports: [
        NgIf,
        NgForOf,
        MatSelectModule,
        MatInputModule,
        MatTooltipModule,
        MatIconModule,
        MatButtonModule,
        MatTabsModule,
        VscodeComponent,
        AngularSplitModule
    ],
    standalone: true
})
export class FetchPageComponent implements OnInit {

    @Input() page: Page;

    constructor(
        private readonly fetch: Fetch
    ) { }

    ngOnInit() {

    }
}
