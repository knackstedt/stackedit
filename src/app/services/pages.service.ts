import { Injectable } from '@angular/core';
import { FilesService } from './files.service';
import { Page } from '../types/page';
import { ulid } from 'ulidx';



@Injectable({
    providedIn: 'root'
})
export class PagesService {

    constructor(
        private files: FilesService
    ) {
    }

    async savePage(page: Page) {

        // Raw markdown files are always saved
        // without metadata.
        if (page.kind == "markdown-raw") {
            await this.files.saveFileContents(page);
            return;
        }

        if (page.autoName) {
            page.name = page.content?.trim()?.split('\n')?.[0]?.slice(0, 20);
            if (!page.name || page.name.trim().length < 2)
                page.name = "untitled";
        }

        await this.files.saveFileMetadata(page);
        await this.files.saveFileContents(page);
    }

    async createPage(abstract: Partial<Page>) {
        const page: Page = {
            path: "data/temp_" + ulid() + '.json',
            content: '',
            created: Date.now(),
            kind: "markdown",
            modified: Date.now(),
            autoName: true,
            ...abstract
        };
        await this.savePage(page);
        return page;
    }
}
