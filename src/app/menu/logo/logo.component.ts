import { NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { SymbolComponent } from './symbol/symbol.component';
import { TextComponent } from './text/text.component';
import { WidetextComponent } from './widetext/widetext.component';

@Component({
    selector: 'app-logo',
    templateUrl: './logo.component.html',
    styleUrls: ['./logo.component.scss'],
    imports: [
        SymbolComponent,
        TextComponent,
        WidetextComponent,
        NgIf
    ],
    standalone: true
})
export class LogoComponent implements OnInit {

    @Input() showText = true;

  constructor() { }

  ngOnInit() {
  }

}
