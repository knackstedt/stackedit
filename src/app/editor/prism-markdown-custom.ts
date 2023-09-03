declare const Prism;

Prism.languages.insertBefore('markdown', 'title', {
    'h6': {
        pattern: /^######[ \t]?.+$/gm,
        lookbehind: true,
        greedy: true,
        inside: {
            'cl cl-hash': new RegExp(`^#`),
        }
    },
    'h5': {
        pattern: /^#####[ \t]?.+$/gm,
        lookbehind: true,
        greedy: true,
        inside: {
            'cl cl-hash': new RegExp(`^#`),
        }
    },
    'h4': {
        pattern: /^####[ \t]?.+$/gm,
        lookbehind: true,
        greedy: true,
        inside: {
            'cl cl-hash': new RegExp(`^#`),
        }
    },
    'h3': {
        pattern: /^###[ \t]?.+$/gm,
        lookbehind: true,
        greedy: true,
        inside: {
            'cl cl-hash': new RegExp(`^#`),
        }
    },
    'h2': {
        pattern: /^##[ \t]?.+$/gm,
        lookbehind: true,
        greedy: true,
        inside: {
            'cl cl-hash': new RegExp(`^#`),
        }
    },
    'h1': {
        pattern: /^#[ \t]?.+$/gm,
        lookbehind: true,
        greedy: true,
        inside: {
            'cl cl-hash': new RegExp(`^#`),
        }
    },

});

Prism.languages.insertBefore('markdown', 'url', {
    'img': {
        // pattern: /.*/g,
        pattern: /!\[[^\]]+\]\([^)]+\)/g,
        lookbehind: true,
        greedy: true,
        inside: {
            'cl cl-title': /['‘][^'’]*['’]|["“][^"”]*["”](?=\)$)/,
            'cl cl-src': {
                pattern: /(\]\()[^('" \t]+(?=[)'" \t])/,
                lookbehind: true,
            }
        }
    },
});


var tableCell = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
var tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function () { return tableCell; });
var tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;

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
        pattern: /\`\`\`<injected>(?:.+?)\`\`\`/s,
        greedy: true,
        lookbehind: true
    }
});

Prism.hooks.add('wrap', function (env) {
    // Render a custom img element
    if (env.type == 'img') {
        const url = env.content?.match(/>(?<link>[^<]+)<\/span>\)/)?.groups?.link;
        env.tag = "img";
        env.attributes.src = url;
        env.content = "";
    }
    else if (env.type == 'url') {

        // urls come through 2 times in parsing.
        // The first time, we don't have the right object
        // so we wait until it's semantically correct before
        // we transform it into an actual anchor element.
        if (env.content.startsWith("[<span class=\"token content\">")) {
            const data = env.content?.match(/"token content">(?<label>[^<]+)<\/span>\]\(<span class="token url">(?<url>[^<]+)/)?.groups;
            const label = data?.label;
            const url = data?.url;

            env.tag = "a";
            env.attributes.href = url;
            env.attributes.target = '_blank';
            env.attributes.source = env.content;
            env.content = label;
        }
    }
    // else if (env.type == 'injection-fence') {
    //     env.tag = "portal";
    //     env.attributes.source = env.content;
    //     // ...
    // }
});
