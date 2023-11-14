import { Component, Input, OnInit } from '@angular/core';
import { VscodeComponent } from '@dotglitch/ngx-common';
import { Page } from '../../types/page';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { AngularSplitModule } from 'angular-split';
import { FormsModule } from '@angular/forms';
import { Fetch } from '../../services/fetch.service';
import { PagesService } from '../../services/pages.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-fetch-page',
    templateUrl: './fetch-page.component.html',
    styleUrls: ['./fetch-page.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatSelectModule,
        MatInputModule,
        MatTooltipModule,
        MatIconModule,
        MatButtonModule,
        MatTabsModule,
        MatProgressSpinnerModule,
        VscodeComponent,
        AngularSplitModule
    ],
    standalone: true
})
export class FetchPageComponent implements OnInit {

    @Input() page: Page;

    readonly methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
        "CONNECT",
        "TRACE"
    ];

    resultStatus = 0;
    resultSize = '0';
    resultTime = 0;
    resultBody = '';
    resultLanguage = '';
    resultHeaders: [string, string][];

    requestIsPending = false;

    urlIsValid = true;

    constructor(
        private readonly fetch: Fetch,
        public readonly pages: PagesService
    ) {
    }

    ngOnInit() {
        this.page.options = this.page.options || {};
        this.page.options['url'] = this.page.options['url'] || '';
        this.page.options['method'] = this.page.options['method'] || 'GET';
        this.page.options['headers'] = this.page.options['headers'] || [];
        this.page.options['params'] = this.page.options['params'] || [];
        this.page.options['beforeRun'] = this.page.options['beforeRun'] || '';
        this.page.options['afterRun'] = this.page.options['afterRun'] || '';
    }

    // Perform a basic semantic check on the URL
    checkUrl() {
        const url = this.page.options['url'];
        this.urlIsValid = /^https?:\/\/[a-zA-Z0-9\._~:\/?#\[\]@!$&'()*+,;%=\-]+$/.test(url);
    }

    async submitRequest() {
        const headers = {};
        const params = {};
        const url = this.page.options['url'];

        this.page.options['headers'].forEach(({key, value}) => {
            if (key.trim().length > 0)
                headers[key] = value;
        });

        this.page.options['params'].forEach(({key, value}) => {
            if (key.trim().length > 0)
                params[key] = value;
        });

        const compiledUrl = url + (url.includes('?') ? '&' : '?')
            + new URLSearchParams(params).toString();

        let body: string;
        if (["POST","PUT","PATCH","DELETE"].includes(this.page.options['method'])) {
            body = this.page.content.trim() || null;
        }


        this.requestIsPending = true;
        const sTime = Date.now();
        const result = await this.fetch.request(
            this.page.options['method'],
            compiledUrl,
            {
                body,
                headers: headers
            },
            true
        ).catch(err => {
            console.error(err)
            return err;
        });

        this.requestIsPending = false;

        this.resolveContentType(result['headers']?.["content-type"]);

        this.resultStatus = result['status'];
        this.resultTime = Date.now() - sTime;
        this.resultBody = typeof result['data'] != "object" ? result['data'] : JSON.stringify(result['data'], null, 4);
        this.resultHeaders = Object.entries(result['headers']);

        this.resultSize = this.bytesToString(result['data'].length)
    }

    private resolveContentType(contentType: string) {
        if (contentType.includes("text/html") || contentType.includes("application/xhtml"))
            this.resultLanguage = "html";
        else if (contentType.includes("application/json"))
            this.resultLanguage = "json";
        else if (contentType.includes("text/xml") || contentType.includes("application/xml"))
            this.resultLanguage = "xml";
        else if (contentType.includes("text/css"))
            this.resultLanguage = "css";
        else if (contentType.includes("text/csv"))
            this.resultLanguage = "csv";
        else if (contentType.includes("text/javascript"))
            this.resultLanguage = "javascript";
        // Fallthrough for any other text response type.
        else if (contentType.includes("text"))
            this.resultLanguage = "text";
        // TODO: (PDF support)
        // else if (contentType.includes("application/pdf"))
        //      this.resultLanguage = "_pdf";
        // TODO: (image support)
        // else if (contentType.includes("image/"))
        //     this.resultLanguage = "_image"
        // TODO: (audio support)
        // else if (contentType.includes("audio/"))
        //     this.resultLanguage = "_audio"
        // TODO: (video support)
        // else if (contentType.includes("video/"))
        //     this.resultLanguage = "_video"
        // TODO: (file download support) (everything else is downloaded)
        // else
        //     this.resultLanguage = "_download"

    }

    private bytesToString(bytes: number, decimals = 2) {
        if (!+bytes) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }
}
