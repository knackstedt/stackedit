import { Component } from '@angular/core';
import { ThemeService } from '@dotglitch/ngx-common';

@Component({
    selector: 'app-text',
    templateUrl: './text.component.html',
    styleUrls: ['./text.component.scss'],
    standalone: true
})
export class TextComponent {
    constructor(
        public readonly theme: ThemeService
    ) { }
}
