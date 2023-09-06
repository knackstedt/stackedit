export default (Prism) => {
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
        'color': {
            pattern: /<span style="color: #(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})">.*<\/span>/g,
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
                    inside: {
                        url: Prism.languages.markdown.url,
                        bold: Prism.languages.markdown.bold,
                        italic: Prism.languages.markdown.italic,
                        strike: Prism.languages.markdown.strike,
                        'code-snippet': Prism.languages.markdown['code-snippet'],
                        color: Prism.languages.markdown.color,
                        img: Prism.languages.markdown.img,
                        'img-url': Prism.languages.markdown['img-url']
                    }
                }
            }
        }
    });
    Prism.languages.markdown.color.inside.content.inside.color = Prism.languages.markdown.color;

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
        }
    });

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
        if (env.type == 'color') {
            const { color } = env.content.match(/#(?<color>[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})(?=[^A-Fa-f0-9])/)?.groups || {};

            env.content = env.content.replace(/class=\"token content\"/, `class="token content" style="color: #${color}"`);
        }
    });
}
