import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    markdownText = `
# StackEdit

[![Build Status](https://img.shields.io/travis/benweet/stackedit.svg?style=flat)](https://travis-ci.org/benweet/stackedit) [![NPM version](https://img.shields.io/npm/v/stackedit.svg?style=flat)](https://www.npmjs.org/package/stackedit)

> Full-featured, <span style="color: #33b579">open-source <span style="color: #f4d679">Markdown</span> editor based </span> on PageDown, the Markdown library used by Stack Overflow and the other Stack Exchange sites.

\`\`\`mermaid
flowchart LR
    markdown[This ** is ** _Markdown_]
    newLines["Line1
    Line 2
    Line 3"]
    markdown --> newLines
\`\`\`

- [x] Finish my changes
- [ ] Push my commits to GitHub
- [ ] Open a pull request
- [x] @mentions, #refs, [links](), **formatting**, and <del>tags</del> supported
- [x] list syntax required (any unordered or ordered list supported)
- [ ] this is a complete item
- [ ] this is an incomplete item
    `
    constructor(
    ) {
        // this.onResize();
    }

    // openInfo() {
    //     this.dialog.open(AboutComponent);
    // }


    // @HostListener("window:resize", ["$event"])
    // onResize() {
    //     this.isMobile = (window.innerHeight / window.innerWidth > 1.5) || window.innerWidth < 900;
    //     document.body.classList.remove("mobile");
    //     document.body.classList.remove("desktop");

    //     this.isMobile && document.body.classList.add("mobile");
    //     !this.isMobile && document.body.classList.add("desktop");
    // }
}
