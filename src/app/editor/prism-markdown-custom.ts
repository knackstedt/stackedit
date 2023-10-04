const scanSpan = (text: string) => {
    // TODO: preprocess inline span syntax highlighting
    // <span style="">{...}</span>
    let spanDepth = 0;
    type treeNode = {
        parent: Omit<treeNode, 'parent'>,
        children: treeNode[],
        depth: number,
        nodeAttributes: {
            [key: string]: string;
        },

        /**
         * The index of the opening `<` in the span tag
         * e.g.
         * foobar <span color="">...</span>
         *        ^
         */
        outerStartIndex: number,
        /**
         * The index of the first character of content in the span tag
         * e.g.
         * foobar <span color="">...</span>
         *                       ^
         */
        innerStartIndex: number,
        /**
         * The index of the last character inside of the span tag
         * e.g.
         * foobar <span color="">...</span>
         *                         ^
         */
        innerEndIndex: number,
        /**
         * The index of the final terminating '>' of the span tag.
         * e.g.
         * foobar <span color="">...</span>
         *                                ^
         */
        outerEndIndex: number,
    };

    const rootNode = {
        depth: 0,
        children: [] as treeNode[],
        outerStartIndex: 0,
        innerStartIndex: 0,
        innerEndIndex: text.length,
        outerEndIndex: text.length
    };
    let spanTree: treeNode = rootNode as any;

    for (let i = 0; i < text.length; i++) {
        // Only do semantic checking when an opening angle bracket is encountered
        if (text[i] != '<') continue;

        const chunk = text.slice(i);

        // Encountered the start of a node
        if (chunk.match(/^<\s*?span\s*?style=/)) {
            spanDepth++;

            const tagMatch = chunk.match(/^<\s*?span([\s]*?style\s*?=\s*?(?<style>"[^"]+"|'[']+'))\s*?[^>]*?>/);

            const newItem: treeNode = {
                children: [],
                parent: spanTree,
                depth: spanDepth,
                outerStartIndex: i,
                innerStartIndex: i + tagMatch[0]?.length,
                innerEndIndex: -1,
                outerEndIndex: -1,
                nodeAttributes: tagMatch.groups
            };

            spanTree.children.push(newItem);
            spanTree = newItem;
        }
        // Navigate up the tree by one level
        else if (chunk.match(/^<\s*?\/\s*?span\s*?>/)) {
            spanDepth--;

            // This scenario can happen when there are more
            // closing span tags than there should be
            if (!spanTree.parent || spanDepth < 0) {
                break; // give up -- bad input
            }

            spanTree.innerEndIndex = i;
            spanTree.outerEndIndex = i + chunk.match(/^<\s*?\/\s*?span\s*?>/)[0].length;

            spanTree = spanTree.parent as any;
        }
    }
    return rootNode;
}

export default (Prism) => {
    Prism.languages.insertBefore('markdown', 'title', {
        'h6': {
            pattern: /^######[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true,
            inside: {
                'cl cl-hash': new RegExp(`^#`),
            }
        },
        'h5': {
            pattern: /^#####[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true,
            inside: {
                'cl cl-hash': new RegExp(`^#`),
            }
        },
        'h4': {
            pattern: /^####[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true,
            inside: {
                'cl cl-hash': new RegExp(`^#`),
            }
        },
        'h3': {
            pattern: /^###[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true,
            inside: {
                'cl cl-hash': new RegExp(`^#`),
            }
        },
        'h2': {
            pattern: /^##[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true,
            inside: {
                'cl cl-hash': new RegExp(`^#`),
            }
        },
        'h1': {
            pattern: /^#[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true,
            inside: {
                'cl cl-hash': new RegExp(`^#`),
            }
        },

    });

    Prism.languages.insertBefore('markdown', 'url', {
        'img-url': {
            // pattern: /.*/g,

            // [![<label>](<imgurl>)](<linkurl>)
            pattern: /\[!\[[^\]]+\]\([^)]+\)\]\([^)]+\)/g,
            lookbehind: true,
            greedy: true,
            inside: {
                'cl cl-title': /['‘][^'’]*['’]|["“][^"”]*["”](?=\)$)/,
                'cl cl-src': {
                    pattern: /(\]\()[^('" \t]+(?=[)'" \t])/,
                    lookbehind: true,
                }
            },
            alias: "token img"
        },
        'img': {
            // pattern: /.*/g,
            pattern: /!\[[^\]]+\]\([^)]+\)/g,
            lookbehind: true,
            greedy: true,
            alias: "token",
            inside: {
                'cl cl-title': /['‘][^'’]*['’]|["“][^"”]*["”](?=\)$)/,
                'cl cl-src': {
                    pattern: /(\]\()[^('" \t]+(?=[)'" \t])/,
                    lookbehind: true,
                }
            }
        }
    });

    Prism.languages.insertBefore('markdown', 'comment', {
        'image-spinner': {
            pattern: /```img-spinner```/g,
            lookbehind: true,
            greedy: true
        },
        'span-styled': {
            // Regex match does not work as we need to match the closing </span> tag.
            // pattern: /<span style="color: #(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})">.*?<\/span>/g,
            pattern: {
                /**
                 * Instead we implement the exec method that Prism ultimately calls.
                 * Return `null` if there are no matches, or the first match in the
                 * format of a regex exec result.
                 */
                exec: (str: string) => {
                    const root = scanSpan(str);
                    const match = root.children[0];

                    if (!match)
                        return null;

                    const res = [match].map(m => str.slice(m.outerStartIndex, m.outerEndIndex));
                    console.log(str, res, root);

                    res['index'] = match?.outerStartIndex;
                    res['input'] = str;
                    res['groups'] = { foo: 'bar'};
                    return res;
                }
            },
            lookbehind: true,
            greedy: false,
            inside: {
                "color-hex": {
                    pattern: /#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})(?=[^A-Fa-f0-9])/,
                    lookbehind: true,
                    greedy: true
                },
                "content": {
                    pattern: /(?<=<span style="color: #(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})">).+(?=<\/span>)/,
                    lookbehind: true,
                    greedy: true,
                    inside: Prism.languages.markdown,
                    // inside: {
                    //     url: Prism.languages.markdown.url,
                    //     bold: Prism.languages.markdown.bold,
                    //     italic: Prism.languages.markdown.italic,
                    //     strike: Prism.languages.markdown.strike,
                    //     'code-snippet': Prism.languages.markdown['code-snippet'],
                    //     'span-styled': Prism.languages.markdown.color,
                    //     img: Prism.languages.markdown.img,
                    //     'img-url': Prism.languages.markdown['img-url']
                    // }
                },
                ['special-attr']: Prism.languages.markdown['special-attr'],
                punctuation: Prism.languages.markdown.punctuation,
                tag: Prism.languages.markdown.tag
            }
        }
    });
    Prism.languages.markdown['span-styled'].inside.content.inside.color = Prism.languages.markdown['span-styled'];

    // Add inside highlighting to the header levels
    for (let i = 1; i <= 6; i++) {
        Prism.languages.markdown['h' + i].inside.color = Prism.languages.markdown.color;
        Prism.languages.markdown['h' + i].inside.bold = Prism.languages.markdown.bold;
        Prism.languages.markdown['h' + i].inside.italic = Prism.languages.markdown.italic;
        Prism.languages.markdown['h' + i].inside.strike = Prism.languages.markdown.strike;
    }

    const tableCell = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
    const tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function () { return tableCell; });
    const tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;

    Prism.languages.insertBefore('markdown', 'table', {
        'table1': {
            pattern: RegExp('^' + tableRow + tableLine + '(?:' + tableRow + ')*', 'm'),
            inside: {
                'table-data-rows': {
                    pattern: RegExp('^(' + tableRow + tableLine + ')(?:' + tableRow + ')*$'),
                    lookbehind: true,
                    inside: {
                        'table-data': {
                            pattern: RegExp(tableCell),
                            inside: Prism.languages.markdown
                        },
                        'cl cl-pipe': /\|/
                    }
                },
                'table-line': {
                    pattern: RegExp('^(' + tableRow + ')' + tableLine + '$'),
                    lookbehind: true,
                    inside: {
                        'cl cl-pipe': /\|/,
                        'cl-title-separator': /:?-{3,}:?/
                    }
                },
                'table-header-row': {
                    pattern: RegExp('^' + tableRow + '$'),
                    inside: {
                        'table-header': {
                            pattern: RegExp(tableCell),
                            alias: 'important',
                            inside: Prism.languages.markdown
                        },
                        'cl cl-pipe': /\|/
                    }
                }
            }
        }
    });

    Prism.languages.insertBefore('markdown', 'comment', {
        'injection-fence': {
            pattern: /\`\`\`<injected>(?:.+?)<\/injected>\s*\`\`\`/s,
            greedy: true,
            lookbehind: true
        },
    });

    /**
     * All known whitespace characters are matched so when
     * whitespace visibility is enabled we can visualize them
     *
     * ? Is this problematic for non-latin languages
     */
    const invisibleChars: [string, number][] = [
        [ "CHARACTER TABULATION",         0x0009 ],
        [ "SPACE",                        0x0020 ],
        [ "NO-BREAK SPACE",               0x00A0 ],
        [ "SOFT HYPHEN",                  0x00AD ],
        [ "COMBINING GRAPHEME JOINER",    0x034F ],
        [ "ARABIC LETTER MARK",           0x061C ],
        [ "HANGUL CHOSEONG FILLER",       0x115F ],
        [ "HANGUL JUNGSEONG FILLER",      0x1160 ],
        [ "KHMER VOWEL INHERENT AQ",      0x17B4 ],
        [ "KHMER VOWEL INHERENT AA",      0x17B5 ],
        [ "MONGOLIAN VOWEL SEPARATOR",    0x180E ],
        [ "EN QUAD",                      0x2000 ],
        [ "EM QUAD",                      0x2001 ],
        [ "EN SPACE",                     0x2002 ],
        [ "EM SPACE",                     0x2003 ],
        [ "THREE-PER-EM SPACE",           0x2004 ],
        [ "FOUR-PER-EM SPACE",            0x2005 ],
        [ "SIX-PER-EM SPACE",             0x2006 ],
        [ "FIGURE SPACE",                 0x2007 ],
        [ "PUNCTUATION SPACE",            0x2008 ],
        [ "THIN SPACE",                   0x2009 ],
        [ "HAIR SPACE",                   0x200A ],
        [ "ZERO WIDTH SPACE",             0x200B ],
        [ "ZERO WIDTH NON-JOINER",        0x200C ],
        [ "ZERO WIDTH JOINER",            0x200D ],
        [ "LEFT-TO-RIGHT MARK",           0x200E ],
        [ "RIGHT-TO-LEFT MARK",           0x200F ],
        [ "NARROW NO-BREAK SPACE",        0x202F ],
        [ "MEDIUM MATHEMATICAL SPACE",    0x205F ],
        [ "WORD JOINER",                  0x2060 ],
        [ "FUNCTION APPLICATION",         0x2061 ],
        [ "INVISIBLE TIMES",              0x2062 ],
        [ "INVISIBLE SEPARATOR",          0x2063 ],
        [ "INVISIBLE PLUS",               0x2064 ],
        [ "INHIBIT SYMMETRIC SWAPPING",   0x206A ],
        [ "ACTIVATE SYMMETRIC SWAPPING",  0x206B ],
        [ "INHIBIT ARABIC FORM SHAPING",  0x206C ],
        [ "ACTIVATE ARABIC FORM SHAPING", 0x206D ],
        [ "NATIONAL DIGIT SHAPES",        0x206E ],
        [ "NOMINAL DIGIT SHAPES",         0x206F ],
        [ "IDEOGRAPHIC SPACE",            0x3000 ],
        [ "BRAILLE PATTERN BLANK",        0x2800 ],
        [ "HANGUL FILLER",                0x3164 ],
        [ "ZERO WIDTH NO-BREAK SPACE",    0xFEFF ],
        [ "HALFWIDTH HANGUL FILLER",      0xFFA0 ],
        [ "MUSICAL SYMBOL NULL NOTEHEAD", 0x1D159 ],
        [ "MUSICAL SYMBOL BEGIN BEAM",    0x1D173 ],
        [ "MUSICAL SYMBOL END BEAM",      0x1D174 ],
        [ "MUSICAL SYMBOL BEGIN TIE",     0x1D175 ],
        [ "MUSICAL SYMBOL END TIE",       0x1D176 ],
        [ "MUSICAL SYMBOL BEGIN SLUR",    0x1D177 ],
        [ "MUSICAL SYMBOL END SLUR",      0x1D178 ],
        [ "MUSICAL SYMBOL BEGIN PHRASE",  0x1D179 ],
        [ "MUSICAL SYMBOL END PHRASE",    0x1D17A ],
    ]

    Prism.languages.insertBefore('markdown', 'comment',
        invisibleChars.map(([name, code]) => {
            const className = name.replace(/ /g, '-').toLowerCase();
            return {
                [className]: {
                    pattern: new RegExp(`\\u\{${code.toString(16)}\}`, 'u'),
                }
            };
        })
        .reduce((a, b) => ({ ...a, ...b }), {}));

    Prism.hooks.add('wrap', function (env) {
        // Render a custom img element
        // if (env.type == 'img-url') {
        //     // [![<label>](<imgurl>)](<linkurl>)
        //     const { label, imgurl, linkurl } = env.content?.match(/\[!\[(?<label>[^\]]*)\]\((?<imgurl>[^\)]+)\)\]\((?<linkurl>[^\)]+)\)/)?.groups || {};
        //     // const data = env.content?.match(/"token content">(?<label>[^<]+)<\/span>\]\(<span class="token url">(?<url>[^<]+)/)?.groups;
        //     env.tag = "a";

        //     // [![<label>](<imgurl>)](<linkurl>)

        //     env.attributes.source = env.content; //`[![${label}](${url})]()`;
        //     // env.attributes.src = linkurl;
        //     // env.attributes.target = linkurl;
        //     env.content = `<img src="${imgurl}">`;
        // }
        // else if (env.type == 'img') {
        //     const { label, link } = env.content?.match(/\[(?<label>[^\]]*)\]\((?<link>[^\)]+)\)/)?.groups || {};
        //     env.tag = "img";

        //     env.attributes.source = `[![${label}](${link})`;
        //     env.attributes.src = link;
        //     env.content = "";
        // }
        // else if (env.type == 'url') {

        //     // urls come through 2 times in parsing.
        //     // The first time, we don't have the right object
        //     // so we wait until it's semantically correct before
        //     // we transform it into an actual anchor element.
        //     if (env.content.startsWith("[<span class=\"token content\">")) {
        //         const data = env.content?.match(/"token content">(?<label>[^<]+)<\/span>\]\(<span class="token url">(?<url>[^<]+)/)?.groups;
        //         const label = data?.label;
        //         const url = data?.url;

        //         env.tag = "a";
        //         env.attributes.href = url;
        //         env.attributes.target = '_blank';
        //         // env.attributes.source = env.content;
        //         env.attributes.source = `[${label}](${url})`;
        //         env.content = label;
        //     }
        // }


        // if (env.type == 'color-hex') {
        //     const color = env.content;//.match(/#(?<color>[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})(?=[^A-Fa-f0-9])/)?.groups || {};
        //     console.log(color)
        //     if (color)
        //         env.attributes.style="color: " + color;
        //         // env.content = env.content.replace(/class=\"token color-hex\"/, `class="token color-hex" style="color: #${color}"`);
        // }
        if (env.type == 'span-styled') {

            const { style } = env.content
                    .replace(/<[^>]+?>/g, '')
                    .match(/style="(?<style>[^"]+?)"/)?.groups || {};

            if (style)
                env.attributes.style = style;
        }
    });
}
