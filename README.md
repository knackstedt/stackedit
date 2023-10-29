# ngx-stackedit

[![npm](https://img.shields.io/npm/v/ngx-stackedit.svg)](https://www.npmjs.com/package/ngx-stackedit)
[![npm](https://img.shields.io/npm/dm/ngx-stackedit.svg)](https://www.npmjs.com/package/ngx-stackedit)
[![npm downloads](https://img.shields.io/npm/dt/ngx-stackedit.svg)](https://npmjs.org/ngx-stackedit)
[![GitHub stars](https://img.shields.io/github/stars/knackstedt/stackedit.svg?label=GitHub%20Stars&style=flat)](https://github.com/knackstedt/stackedit)

StackEdit Markdown Editor is a full-featured, open-source markdown editor designed to outshine all other embeddable markdown editors. With a range of powerful features and modern styling, it's your ultimate tool for creating beautiful markdown documents.

## Features:

- **Rich Text Editing**: Enjoy a seamless editing experience with real-time Markdown rendering, making it easier than ever to see your content come to life as you type.

- **Syntax Highlighting**: Write and edit code in style with syntax highlighting for various programming languages, ensuring your code looks as good as it works.

- **Color Customization**: Express your creativity by customizing the editor's color scheme to match your unique preferences or brand aesthetics.

- **Mermaid Charts**: Effortlessly integrate Mermaid charts into your documents for visually appealing data visualization.

- **Scroll Syncing**: Experience a fluid writing and reading experience with scroll syncing, keeping your place in your document no matter where you are.

## Installation

To embed this markdown editor into your project, simply follow the installation instructions provided [here](#/quickstart).

## Getting Started

Detailed instructions on how to get started and make the most of StackEdit Markdown Editor can be found in our [documentation](https://github.com/yourrepository/docs).

## Contributing

We welcome contributions from the community to make StackEdit Markdown Editor even more amazing. Please read our [contribution guidelines](https://github.com/yourrepository/contributing) for more information on how to get involved.

## License

This project is licensed under mixed MIT and Apache 2.0 Licenses. See the [LICENSE](https://github.com/knackstedt/stackedit/blob/master/src/app/editor/LICENSE) file for details.

---

StackEdit Markdown Editor - Designed to make you forget about all other markdown editors.

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

# Disclaimers
> This is a massive rewrite of [StackEdit](https://github.com/benweet/stackedit).
