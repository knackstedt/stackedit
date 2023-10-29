# ngx-stackedit

[![Build Status](https://img.shields.io/travis/benweet/stackedit.svg?style=flat)](https://travis-ci.org/benweet/stackedit) [![NPM version](https://img.shields.io/npm/v/stackedit.svg?style=flat)](https://www.npmjs.org/package/stackedit)

> Full-featured, open-source Markdown editor based on PageDown, the Markdown library used by Stack Overflow and the other Stack Exchange sites.
> This is an Angular rewrite of the StackEdit implementation.
>  * Rewrote editor and preview components to use Angular instead of Vue
>  * Rewrote several files to TS
>  * Added support for more inline editor rendering
>  * Upgraded dependencies
>  * Optimized event handling (generically across clEdit)
>  * Improved content parsing on paste (duplicate lines, extra spaces etc.)
>  * Improved dark & light mode support
>  * Packaging for Angular component distribution

https://dotglitch.dev/#/StackEdit

<!-- ### Ecosystem

- [Chrome app](https://chrome.google.com/webstore/detail/iiooodelglhkcpgbajoejffhijaclcdg)
- NEW! Embed StackEdit in any website with [stackedit.js](https://github.com/benweet/stackedit.js)
- NEW! [Chrome extension](https://chrome.google.com/webstore/detail/ajehldoplanpchfokmeempkekhnhmoha) that uses stackedit.js
- [Community](https://community.stackedit.io/) -->

### Quickstart

##### Install

```bash
    npm i -S ngx-stackedit
```

##### Import

```ts
import { Component } from '@angular/core';
import { StackEditorComponent } from 'ngx-stackedit';

@Component({
    selector: 'app-example',
    template: `
<ngx-stackedit
    [(value)]="defaultValue"
    mode="viewonly"
    (onImageUpload)="onImageUpload($event)"
/>
    `,
    imports: [
        StackEditorComponent
    ],
    standalone: true
})
export class ExampleBasicComponent {

    defaultValue = `
Lorem **ipsum** _dolor_ sit amet, consectetur adipiscing elit, sed do _eiusmod tempor incididunt_ \
ut labore et dolore magna ~~aliqua~~. Ut enim ad minim veniam, quis nostrud exercitation \
ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in \
_reprehenderit_ in <span style="color: #ff0000">voluptate</span> velit esse cillum \
dolore eu fugiat nulla pariatur. Excepteur sint ~~occaecat cupidatat~~ non proident, \
sunt in culpa qui **officia deserunt mollit** anim id est laborum.
    `;

    // Sample for handling an image upload event
    onImageUpload(evt: { data: FileList, stackEditor: StackEditorComponent }) {
        const formData = new FormData();

        Object.keys(evt.data).forEach(k => {
            const file: {
                lastModified: number,
                lastModifiedDate: Date,
                name: string,
                size: number,
                type: string;
            } = evt.data[k];

            const parts = file.name.split('.');
            const name = parts.slice(0, -1).join('.') + '-' + ulid() + '.' + parts.slice(-1)[0];
            formData.append(name, file as any);
        });
        formData.append("data", JSON.stringify({
            path,
            scope: this.asset.dto + '.' + this.asset.id,
            autoRename: true
        }));

        const url = `/api/files/upload`;

        const { files } = await this.fetch.post<{ files: {url: string, name: string}[] }>(url, formData);

        evt.stackEditor.finalizeImageUpload({
            label: files[0].name,
            link: files[0].url
        });
    }
}

```

### Developing

```bash
npm install

npm run dev # Start live-reload dev server on localhost:8080

```

### Building

```bash
# production build in ./dist
npm run build

# build for production and view the bundle analyzer report
npm run build:analyze

```

## Roadmap:
 - [ ] Clicking on already selected text does nothing
 - [ ] Events need reworked
 - [ ] CL Editor needs to be rewritten into a TS Class
 - [ ] Grammars need to be reviewed


## Custom Markdown Syntax

#### External (visible) syntax
 > This syntax is visible in the editor panel. It can be edited as raw text.
 - simple styling in `span` tags
    - <span style="color: #ff00ff">Pretty colors</span>
#### Internal (hidden) syntax
 > This syntax is abstracted in the editor. It is non-editable and is used
for the rich-preview of content in the editor panel
 - Injected rich text (HTML) content
    - \`\`\`<injected>{{html content}}</injected>\`\`\`
 - Image upload spinner
    - \`\`\`image-spinner\`\`\`
