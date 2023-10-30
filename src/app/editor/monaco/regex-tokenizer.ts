import * as Monaco from 'monaco-editor';


const basicFlags: [RegExp, any][] = [
    // +*?
    // Mark invalid quantifiers
    [/[+?*][+?][+*?]/, "invalid"],
    [/[+?*][*]/, "invalid"],

    [/[+?*][+?]?/, "quantifier"],
    [/\|/, "alternator"],

    [/\\u[A-F0-9a-f]{2}/, "unicode"],
    [/\\x[A-F0-9a-f]{4}/, "unicode"],
    [/\\\d{3}/, "octal"],

    [/\\./, "escape"],

    [/\(\?#/, { token: "comment", bracket: '@open', next: "@comment" }],
    [/\(/, { token: "group-terminator", bracket: '@open', next: "@group" }],


    [/\{/, { token: "quantifier", bracket: '@open', next: "@quantifier" }],
    [/\[\[:/, { token: "posix", bracket: '@open', next: "@posix" }],
    [/\[\^/, { token: "neg-literal", bracket: '@open', next: '@negativeLiteral' }],
    [/\[/, { token: "literal", bracket: '@open', next: '@literal' }],
];

export function setupRegexLanguage(monaco: typeof Monaco) {
    monaco.languages.register({ id: 'rgx' });

    monaco.languages.setMonarchTokensProvider('rgx', {
        defaultToken: "basic",
        tokenPostfix: ".rgx",
        tokenizer: {
            root: [
                ...basicFlags
            ],

            group: [
                [/\?:/, { token: "non-capture-group", bracket: '@open', next: "@nonCaptureGroup" }],
                [/\?=/, { token: "lookahead", bracket: '@open', next: "@lookahead" }],
                [/\?<=/, { token: "lookbehind", bracket: '@open', next: "@lookbehind" }],
                [/\?</, { token: "group-name", bracket: '@open', next: "@namedGroup" }],
                [/\?!/, { token: "negative-lookahead", bracket: '@open', next: "@negativeLookahead" }],
                // [/\(/, { token: "capture-group", bracket: '@open', next: "@captureGroup" }],
                ...basicFlags,
                [/\)/, { token: "group-terminator", bracket: "@close", next: '@pop' }]
            ],

            //(?#...)
            comment: [

                [/\\./, "comment"],
                [/\)/, { token: "comment", bracket: "@close", next: '@pop' }],
                [/./, 'comment'],
            ],

            //(...)
            captureGroup: [
                ...basicFlags,
            ],

            //(?:...)
            nonCaptureGroup: [
                ...basicFlags,
                [/\)/, { token: "group-terminator", bracket: "@close", next: '@pop' }]
            ],

            //(?=...)
            lookahead: [
                ...basicFlags,
                [/\)/, { token: "group-terminator", bracket: "@close", next: '@pop' }]
            ],

            //(?<foobar>baz)
            namedGroup: [
                [/\\./, "group-name"],
                [/>/, { token: "group-name", bracket: "@close", next: '@pop' }],
                [/./, 'group-name'],
            ],

            //(?<=...)
            lookbehind: [
                ...basicFlags,
                [/\)/, { token: "group-terminator", bracket: "@close", next: '@pop' }]
            ],

            //(?!...)
            negativeLookahead: [
                ...basicFlags,
                [/\)/, { token: "group-terminator", bracket: "@close", next: '@pop' }]
            ],

            // {1,99} {99} {,99} {99,}
            quantifier: [
                [/\d+/, 'quantifier'],
                [/,/, 'quantifier'],
                [/\}/, { token: "quantifier", bracket: "@close", next: '@pop' }]
            ],

            // [[:alnum:]]
            posix: [
                [/./, "posix-operator"],
                [/:\]\]/, { token: "posix", bracket: "@close", next: '@pop' }],
            ],

            // [a-z] [abcdef()] [^abcdef] [abc\]def]
            literal: [
                [/\\x[A-F0-9a-f]{2}(?:-)/i, { token: "unicode-range", bracket: '@open', next: "@unicodeRange" }],
                [/\\u[A-F0-9a-f]{4}(?:-)/i, { token: "unicode-range", bracket: '@open', next: "@unicodeRange" }],
                [/\\\d{3}(?:-)/i, { token: "octal-range", bracket: '@open', next: "@unicodeRange" }],

                [/\\x[A-F0-9a-f]{2}/, "literal-unicode"],
                [/\\u[A-F0-9a-f]{4}/, "literal-unicode"],
                [/\\\d{3}/, "octal"],

                [/\\./, "literal-escape"],

                [/.(?:-)/i, { token: "char-range", bracket: '@open', next: "@charRange" }],

                // [/(?<=\/)\]/, "literal"],
                [/\]/, { token: "literal", bracket: "@close", next: '@pop' }],
                [/./, 'literal']
            ],

            negativeLiteral: [
                [/\\x[A-F0-9a-f]{2}(?=-)/i, { token: "unicode-range", bracket: '@open', next: "@unicodeRange" }],
                [/\\u[A-F0-9a-f]{4}(?=-)/i, { token: "unicode-range", bracket: '@open', next: "@unicodeRange" }],
                [/\\\d{3}(?=-)/i, { token: "octal-range", bracket: '@open', next: "@unicodeRange" }],

                [/\\x[A-F0-9a-f]{2}/, "neg-literal-unicode"],
                [/\\u[A-F0-9a-f]{4}/, "neg-literal-unicode"],
                [/\\\d{3}/, "octal"],

                [/\\./, "literal-escape"],

                [/.(?:-)/i, { token: "char-range", bracket: '@open', next: "@charRange" }],

                [/\]/, { token: "neg-literal", bracket: "@close", next: '@pop' }],
                [/./, 'neg-literal']
            ],

            octalRange: [
                [/-/, "octal-range"],
                [/\\\d{3}/, { token: "octal-range", bracket: "@close", next: '@pop' }],
            ],

            unicodeRange: [
                [/-/, "unicode-range"],
                [/\\x[a-f0-9A-F]{2}/, { token: "unicode-range", bracket: "@close", next: '@pop' }],
                [/\\u[a-f0-9A-F]{4}/, { token: "unicode-range", bracket: "@close", next: '@pop' }],
            ],

            charRange: [
                [/-/, "char-range"],
                [/\\x[a-f0-9A-F]{2}/, { token: "char-range", bracket: "@close", next: '@pop' }],
                [/\\u[a-f0-9A-F]{4}/, { token: "char-range", bracket: "@close", next: '@pop' }],
                [/./, { token: "char-range", bracket: "@close", next: '@pop' }],
            ]
        }
    });

    monaco.editor.defineTheme('vs-dark', {
        base: 'vs-dark',
        inherit: true,
        colors: {},
        rules: [
            { token: 'basic.rgx', foreground: '#aedaae', },
            { token: 'unicode.rgx', foreground: '#ffa500' },

            { token: 'invalid.rgx', foreground: '#ff0000', fontStyle: 'italic' },
            { token: 'comment.rgx', foreground: '#6a9955', fontStyle: 'italic' },
            { token: 'posix.rgx', foreground: '#8eff8e', },
            { token: 'posix-operator.rgx', foreground: '#8eff8e' },

            { token: 'literal.rgx', foreground: '#dcdc96' },
            { token: 'literal-unicode.rgx', foreground: '#ffa500', fontStyle: "italic" },
            { token: 'literal-escape.rgx', foreground: '#8eff8e' },
            { token: 'octal.rgx', foreground: '#ff00ff', fontStyle: "italic" },
            { token: 'octal-range.rgx', foreground: '#ffff00', fontStyle: "italic" },

            { token: 'char-range.rgx', foreground: '#f0f064' },
            { token: 'unicode-range.rgx', foreground: '#f0f064', fontStyle: "italic" },

            { token: 'neg-literal.rgx', foreground: '#d27878' },
            { token: 'neg-literal-unicode.rgx', foreground: '#eb6464', fontStyle: "italic" },


            { token: 'quantifier.rgx', foreground: '#80c4ff' },
            { token: 'escape.rgx', foreground: '#8e8eff' },
            { token: 'alternator.rgx', foreground: '#ffffff' },

            { token: 'negative-lookahead.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'capture-group.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'non-capture-group.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'lookahead.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'lookbehind.rgx', foreground: '#999999', fontStyle: "italic" },
        ],
    });

    monaco.editor.defineTheme('vs', {
        base: 'vs',
        inherit: true,
        colors: {},
        rules: [
            { token: 'basic.rgx', foreground: '#aedaae', },
            { token: 'unicode.rgx', foreground: '#ffa500' },

            { token: 'invalid.rgx', foreground: '#ff0000', fontStyle: 'italic' },
            { token: 'comment.rgx', foreground: '#6a9955', fontStyle: 'italic' },
            { token: 'posix.rgx', foreground: '#8eff8e', },
            { token: 'posix-operator.rgx', foreground: '#8eff8e' },

            { token: 'literal.rgx', foreground: '#dcdc96' },
            { token: 'literal-unicode.rgx', foreground: '#ffa500', fontStyle: "italic" },
            { token: 'literal-escape.rgx', foreground: '#8eff8e' },
            { token: 'octal.rgx', foreground: '#ff00ff', fontStyle: "italic" },
            { token: 'octal-range.rgx', foreground: '#ffff00', fontStyle: "italic" },

            { token: 'char-range.rgx', foreground: '#f0f064' },
            { token: 'unicode-range.rgx', foreground: '#f0f064', fontStyle: "italic" },

            { token: 'neg-literal.rgx', foreground: '#d27878' },
            { token: 'neg-literal-unicode.rgx', foreground: '#eb6464', fontStyle: "italic" },


            { token: 'quantifier.rgx', foreground: '#80c4ff' },
            { token: 'escape.rgx', foreground: '#8e8eff' },
            { token: 'alternator.rgx', foreground: '#ffffff' },

            { token: 'negative-lookahead.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'capture-group.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'non-capture-group.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'lookahead.rgx', foreground: '#999999', fontStyle: "italic" },
            { token: 'lookbehind.rgx', foreground: '#999999', fontStyle: "italic" },
        ],
    });
}
