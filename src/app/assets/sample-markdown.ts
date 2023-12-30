export const page = {
    "path": "data/01HE5GSV1P5AA9VNX2VKR1J0TQ.json",
    "created": 1698844961846,
    "kind": "markdown",
    "modified": 1699485729611,
    "autoName": false,
    "order": -40,
    "name": "Sample Markdown Page",
    "options": {},
    "icon": "ondemand_video",
    "content": `# @dotglitch StackEdit

#### Basic Styling


<span style="color: #33b579">Markdown</span> is a ~~heavyweight~~ lightweight and easy-to-read markup language used for text formatting. It was designed to provide a simple and straightforward way to structure and style plain text documents using a set of plain text symbols. In Markdown, you can easily create headers, emphasis (such as _italics_, **bold** text, and ~~strikethroughs~~), lists, links, code blocks, and more, all by using a **minimalistic** _syntax_ that resembles the way people often naturally format text in plain email or text documents. Markdown is widely used for creating documentation, writing \`web content\`, and even in [software development](https://en.wikipedia.org/wiki/Software_development), making it a popular choice for those who value simplicity and readability in their writing and document creation processes.

#### Colored text
 > Full-featured, <span style="color: #33b579">open-source <span style="color: #f4d679">Markdown</span> editor based </span> on PageDown, the <span style="color: #11b3a5">Markdown</span> library used by Stack Overflow and the other Stack <span style="color: #eaa100">Exchange</span> sites.

#### Images

> ![clown fish](https://unsplash.com/photos/rEM3cK8F1pk/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8M3x8ZmlzaHxlbnwwfHx8fDE2OTg1NzkxMDV8MA&force=true&w=640)
> Photo by <a href="https://unsplash.com/@rachelhisko?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Rachel Hisko</a> on <a href="https://unsplash.com/photos/clown-fish-in-shallow-focus-photography-rEM3cK8F1pk?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>

> ![lava](https://unsplash.com/photos/80x3QULJDN4/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8M3x8bGF2YXxlbnwwfHx8fDE2OTg1ODk0MjF8MA&force=true&w=640)
> Photo by <a href="https://unsplash.com/@tetiana_grypachevska?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Tetiana Grypachevska</a> on <a href="https://unsplash.com/photos/brown-and-black-mountain-under-white-clouds-80x3QULJDN4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>

> ![split rock](https://unsplash.com/photos/an3qaxZ-2bY/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8ODZ8fHJvY2t8ZW58MHx8fHwxNjk4NTgzNjM2fDA&force=true&w=640)
> Photo by <a href="https://unsplash.com/@pabloheimplatz?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Pablo Heimplatz</a> on <a href="https://unsplash.com/photos/gray-rock-cut-in-half-an3qaxZ-2bY?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>

> ![tornado](https://unsplash.com/photos/n_3kdpSkrJo/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8M3x8dG9ybmFkb3xlbnwwfHx8fDE2OTg1ODk1NzZ8MA&force=true&w=640)
> Photo by <a href="https://unsplash.com/@nikolasnoonan?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Nikolas Noonan</a> on <a href="https://unsplash.com/photos/long-exposure-photography-of-hurricane-n_3kdpSkrJo?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>

#### Links

We autodetect links via the gfm extension
> Something Nice: https://www.npmjs.com/package/@dotglitch/ngx-common

But you can also embed links normally like [so](https://npmgraph.js.org/?q=ngx-stackedit).

#### Lists

 - A bulleted list from dashes
 - Can have n number of entries

 1. Now when we number a _list_, things can get spicy.
 2. we can add some pretty neat <span style="color: #36955f">colors</span>.
 3. We can also put a table inside of the list.

 - [X] Install Linux
 - [ ] Stop using Google

#### Tables

| Tables   |      Are      |  Cool |
|----------|:-------------:|------:|
| col 1 is |  left-aligned | $1600 |
| col 2 is |    centered   |   $12 |
| col 3 is | right-aligned |    $1 |


#### Code blocks
\`\`\`ts
import 'zone.js';  // Included with Angular CLI.

import { AppComponent } from './app/app.component';
import { isDevMode, importProvidersFrom } from '@angular/core';
import { ServiceWorkerModule } from '@angular/service-worker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(CommonModule, BrowserModule,
            MatButtonModule, MatSidenavModule, MatDialogModule,
            ServiceWorkerModule.register('ngsw-worker.js', {
                enabled: !isDevMode(),
                // Register the ServiceWorker as soon as the application is stable
                // or after 30 seconds (whichever comes first).
                registrationStrategy: 'registerWhenStable:30000'
            })),
        provideAnimations(),
        provideHttpClient(withInterceptorsFromDi())
    ]
})
    .catch(err => console.error(err));

\`\`\`

\`\`\`css
body { margin: 0; }
html, body {
    height: 100 %;
    width: 100 %;
    overflow: hidden;
    font-family: 'Fira Sans', Arial;
    background-color: var(--background - color, #121212);
    color: var(--text - color);
}
\`\`\`

\`\`\`bash
#!/usr/bin/env bash;
for file in ./*.yaml
do
    tmp="You shouldnt see this text"
    tmp=$(perl -pe 's/\\$\{([_A-Z]+)\}/defined $ENV{$1} ? $ENV{$1} : "\\\${$1}"/eg' < $file > "$file.tmp")
    tmp=$(cat $file.tmp)

    err=$(echo "$tmp" | grep -E '\\\${[^}]*}')

    # If the variable hasn't been replaced, exit with an error
    if [ \${#err} -ge 1 ]; then
        >&2 echo "$tmp" | grep --color -E '\\\${[^}]*}'
        exit 1;
    fi

    echo "$tmp" > $file
done
\`\`\`

#### Mermaid Diagrams

\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs": 386
    "Cats": 85
    "Rats": 15
\`\`\`

\`\`\`mermaid
classDiagram
    note "From Duck till Zebra"
Animal <|--Duck
    note for Duck "can fly
    can swim
    can dive
    can help in debugging"

Animal <|--Fish
Animal <|--Zebra
Animal: +int age
Animal: +String gender
Animal: +isMammal()
Animal: +mate()
class Duck {
    +String beakColor
    + swim()
    + quack()
}
class Fish {
    -int sizeInFeet
    - canEat()
}
class Zebra {
    +bool is_wild
    + run()
}
\`\`\`
`
};
