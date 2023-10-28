/**
 * This file controls the editor syntax highlighting.
 *
 * The order keys are assigned is _important_!
 * The parser checks if a regex matches based on the order of the key in the containing object.
 */

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

const scanSpan = (text: string) => {
    let spanDepth = 0;

    const rootNode = {
        depth: 0,
        children: [] as treeNode[],
        outerStartIndex: 0,
        innerStartIndex: 0,
        innerEndIndex: text.length,
        outerEndIndex: text.length
    } as treeNode;
    let spanTree: treeNode = rootNode as any;

    for (let i = 0; i < text.length; i++) {
        // Only do semantic checking when an opening angle bracket is encountered
        if (text.charCodeAt(i) != 0x3c) continue;

        const chunk = text.slice(i);

        // Encountered the start of a node
        if (chunk.match(/^<\s*?span\s+?style\s*?=/)) {
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

const blockNames = [
    'tip',
    'warning',
    'important',
    'example',
    'note',
    'info',
    'question'
];

export default (Prism) => {

    const spanStyled = {
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

                res['index'] = match?.outerStartIndex;
                res['input'] = str;
                res['groups'] = { foo: 'bar' };
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
                inside: Prism.languages.markdown
            },
            ['special-attr']: Prism.languages.markdown['special-attr'],
            punctuation: Prism.languages.markdown.punctuation,
            tag: Prism.languages.markdown.tag
        }
    };

    Prism.languages.insertBefore('markdown', 'url', {
        'img-url': {
            // [![<label>](<imgurl>)](<linkurl>)
            pattern: /\[!\[[^\]\n]+?\]\((?:\([^\)\n]+?\)|[^\(\)\n]+?)+?\)\]\([^\)\n]+?\)/,
            // pattern: /\[!\[[^\]]+\]\(/,
            lookbehind: true,
            greedy: true,
            inside: {
                'src': {
                    pattern: /(\()(?:\([^\)\r\n]+\)|[^\(\)\r\n])+?(?=\)$)/,
                    lookbehind: true
                }
            },
            alias: "token"
        },
        'img': {
            pattern: /!\[[^\]\r\n]+\]\((?:\([^\)\r\n]+\)|[^\(\)\r\n])+?\)/,
            lookbehind: true,
            greedy: true,
            inside: {
                'string': {
                    pattern: /(!\[)[^\]\r\n]+(?=\])/,
                    lookbehind: true,
                },
                'img-src': {
                    pattern: /(\]\()[^\r\n]+(?=\))/s,
                    lookbehind: true,
                },
                'punctuation': {
                    pattern: /[\[\]\(\)!]/,
                    greedy: true,
                    lookbehind: true
                }
            }
        },
        'link': {
            pattern: /\[[^\]]+?\]\([^)]+?\)/g,
            lookbehind: true,
            greedy: true,
            inside: {
                'string': {
                    pattern: /(\[)[^\]\r\n]+(?=\])/,
                    lookbehind: true,
                },
                'src': {
                    pattern: /(\]\()[^('" \t]+(?=[)'" \t])/,
                    lookbehind: true,
                    inside: {
                        'punctuation': {
                            pattern: /[\[\]\(\)]/,
                            greedy: true,
                            lookbehind: true
                        }
                    }
                },
                'punctuation': {
                    pattern: /[\[\]\(\)]/,
                    greedy: true,
                    lookbehind: true
                }
            }
        }
    });

    Prism.languages.markdown['code-snippet'].inside = {
        punctuation: {
            pattern: /`/,
            greedy: true,
            lookbehind: true
        }
    }

    Prism.languages.insertBefore('markdown', 'hr', {
        "linebreak": {
            pattern: /^[ ]{0,3}---/,
            greedy: true,
            lookbehind: true
        },
    });

    Prism.languages.insertBefore('markdown', 'comment', { 'span-styled': spanStyled });
    const basicRules = {
        color: Prism.languages.markdown.color,
        bold: Prism.languages.markdown.bold,
        italic: Prism.languages.markdown.italic,
        strike: Prism.languages.markdown.strike,
        'code-snippet': Prism.languages.markdown['code-snippet'],
        'span-styled': Prism.languages.markdown['span-styled'],
        'img-url': Prism.languages.markdown['img-url'],
        'img': Prism.languages.markdown['img'],
        'link': Prism.languages.markdown['link']
    }

    Prism.languages.insertBefore('markdown', 'title', {
        'h6': {
            pattern: /^[ ]{0,3}######[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true
        },
        'h5': {
            pattern: /^[ ]{0,3}#####[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true
        },
        'h4': {
            pattern: /^[ ]{0,3}####[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true
        },
        'h3': {
            pattern: /^[ ]{0,3}###[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true
        },
        'h2': {
            pattern: /^[ ]{0,3}##[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true
        },
        'h1': {
            pattern: /^[ ]{0,3}#[ \t]*?.+$/gm,
            lookbehind: true,
            greedy: true
        },

    });

    // Order of assignment is quite important
    Prism.languages.markdown['img-url'].inside.img = Prism.languages.markdown['img'];
    Prism.languages.markdown['img-url'].inside.punctuation = {
        pattern: /[\[\]\(\)!]/,
        greedy: true,
        lookbehind: true
    };

    Prism.languages.insertBefore('markdown', 'comment', {
        'image-spinner': {
            pattern: /```img-spinner```/g,
            lookbehind: true,
            greedy: true
        },
        'table-block': {
            // Regex match does not work as we need to match the closing </span> tag.
            // pattern: /<span style="color: #(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})">.*?<\/span>/g,
            pattern: /\s{0,3}\|(?:[^|]+\|)+\n(?:\s{0,3}\|\s*(?::?-+:?\s*\|)+)(?:\s{0,3}\|(?:[^|]+\|)+\n)+/s,
            lookbehind: true,
            greedy: false,
            inside: {
                'header-row': {
                    pattern: /^\s{0,3}\|(?:[^|\n]+\|)+\n(?=\s{0,3}\|\s*(?:-+\s*\|)+)/s,
                    lookbehind: true,
                    greedy: false,
                    inside: {
                        'cell': {
                            pattern: /(?<=\|)[^|]+(?=\|)/,
                            lookbehind: true,
                            greedy: false,
                            inside: basicRules
                        },
                        'pipe': /\|/
                    }
                },
                'table-row': {
                    pattern: /\n\s{0,3}\|(?:[^|\n]+\|)+(?=\n|$)/s,
                    lookbehind: true,
                    greedy: false,
                    inside: {
                        'cell': {
                            pattern: /(?<=\|)[^|]+(?=\|)/,
                            lookbehind: true,
                            greedy: false,
                            inside: basicRules
                        },
                        'pipe': /\|/
                    }
                },
                'break-row': {
                    pattern: /\s{0,3}\|\s*(?::?-+:?\s*\|)+/,
                    inside: {
                        'pipe': /\|/,
                        'dash': /\-+/,
                        'colon': /:/,
                    }
                }
            }
        },
        'blockquote': {
            pattern: /(^|\n)\s*>.+?(?=\n|$)/s,
            lookbehind: true,
            greedy: true,
            inside: {
                'punctuation': /(^|\n)\s*>/,
                'content': {
                    pattern: /.+/
                }
            }
        },
        'injection-fence': {
            pattern: /\`\`\`<injected>(?:.+?)<\/injected>\s*\`\`\`/s,
            greedy: true,
            lookbehind: true
        },
        'number-list': {
            pattern: /^\s+\d+\.\s+.+$/s,
            lookbehind: true,
            greedy: true,
            inside: {
                'punctuation': /(\n|^)\s+\d+\./,
                ...basicRules
            }
        },
        'check-list': {
            pattern: /^\s+[-*]\s+\[[Xx ]?\]\s+.+$/s,
            lookbehind: true,
            greedy: true,
            inside: {
                'punctuation': /(\n|^)\s+[-*]\s+\[[Xx ]?\]/,
                ...basicRules
            }
        },
        'bullet-list': {
            pattern: /^\s+[-*]\s+.+$/s,
            lookbehind: true,
            greedy: true,
            inside: {
                'punctuation': /(\n|^)\s+[-*]/,
                ...basicRules
            }
        }
    });
    Prism.languages.markdown['span-styled'].inside.content.inside.color = Prism.languages.markdown['span-styled'];
    Prism.languages.markdown['blockquote'].inside.content.inside = Prism.languages.markdown;

    // Add inside highlighting to the header levels
    for (let i = 1; i <= 6; i++) {
        Prism.languages.markdown['h' + i].inside = {
            ...basicRules,
            hash: /#+/
        }
    }

    const codeBlockRule = Prism.languages.markdown.code.find(c => !!c.inside)?.inside['code-block'];
    if (codeBlockRule) {
        codeBlockRule.pattern =
            /^(```.*(?:\n|\r\n?))[\s\S]+?(?:\n|\r\n?)(?=^```$)/m
        codeBlockRule.alias = "prism"; // add 'prism' class to code-blocks
    }

    Prism.hooks.add('wrap', (env: {
        attributes: { [key: string]: string },
        classes: string[],
        content: string,
        language: string,
        tag: string,
        type: string
    }) => {
        if (env.type == 'span-styled') {

            const { style } = env.content
                    .replace(/<[^>]+?>/g, '')
                    .match(/style="(?<style>[^"]+?)"/)?.groups || {};

            if (style)
                env.attributes['style'] = style;
        }
        else if (env.type == 'code') {
            // Questionable mermaid diagram detection
            if (env.content.match(/^<span class="token punctuation">```<\/span><span class="token code-language">mermaid<\/span>/)) {
                env.classes.push("mermaid");
            }
        }
    });
}
