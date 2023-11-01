import { Component } from '@angular/core';
import { ThemeService } from '@dotglitch/ngx-common';

@Component({
    selector: 'app-widetext',
    templateUrl: './widetext.component.html',
    styleUrls: ['./widetext.component.scss'],
    standalone: true
})
export class WidetextComponent {
    constructor(
        public readonly theme: ThemeService
    ) { }
}
