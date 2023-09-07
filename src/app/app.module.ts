import { isDevMode, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ServiceWorkerModule } from '@angular/service-worker';

import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';

import { AppComponent } from './app.component';
import { MatDialogModule } from '@angular/material/dialog';
// import { NgxAppMenuDirective, NgxContextMenuDirective } from '@dotglitch/ngx-ctx-menu';
// import { NgxLazyLoaderModule } from '@dotglitch/ngx-lazy-loader';
// import { RegisteredComponents } from 'src/app/component.registry';
import { StackEditorComponent } from './editor/editor.component';


@NgModule({
    declarations: [
        AppComponent
   ],
    imports: [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        StackEditorComponent,
        // NgxAppMenuDirective,
        // NgxContextMenuDirective,
        MatButtonModule,
        MatSidenavModule,
        MatDialogModule,
        // NgxLazyLoaderModule.forRoot({
        //     entries: RegisteredComponents,
        //     // componentResolveStrategy: ComponentResolveStrategy.PickFirst,
        // }),
        ServiceWorkerModule.register('ngsw-worker.js', {
          enabled: !isDevMode(),
          // Register the ServiceWorker as soon as the application is stable
          // or after 30 seconds (whichever comes first).
          registrationStrategy: 'registerWhenStable:30000'
        })
    ],
    providers: [],
    bootstrap: [ AppComponent ]
})
export class AppModule { }
