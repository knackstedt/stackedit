import Prism from 'prismjs';

import 'prismjs/components/prism-asciidoc';
import 'prismjs/components/prism-awk';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-batch';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cmake';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-cshtml';
import 'prismjs/components/prism-csp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-csv';
import 'prismjs/components/prism-dns-zone-file';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-erlang';
import 'prismjs/components/prism-excel-formula';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-gradle';
import 'prismjs/components/prism-groovy';
import 'prismjs/components/prism-hsts';
import 'prismjs/components/prism-http';
import 'prismjs/components/prism-icon';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jq';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-json5';
import 'prismjs/components/prism-jsonp';
import 'prismjs/components/prism-jsstacktrace';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-log';
import 'prismjs/components/prism-makefile';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-mermaid';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-perl';
// import 'prismjs/components/prism-php';
import 'prismjs/components/prism-plant-uml';
import 'prismjs/components/prism-powerquery';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-properties';
import 'prismjs/components/prism-puppet';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-rest';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sass';
import 'prismjs/components/prism-scheme';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-uri';
import 'prismjs/components/prism-yaml';

import customMarkdown from './custom-markdown';
customMarkdown(Prism);

const keywordSupport = {
    "import": {
        pattern: /^\s*import\s+[^;]+?(?:;|$|\n)/ms,
        greedy: true,
        lookbehind: true,
        inside: {
            "keyword": {
                pattern: /^import/,
                greedy: true,
                lookbehind: true
            },
            "string": {
                pattern: /(?:'[^']+?'|"[^"]+?"|`[^`]+?`)/,
                greedy: true,
                lookbehind: true
            },
            "subject": {
                pattern: /\{[^}]+?\}/,
                greedy: true,
                lookbehind: true,
                inside: {
                    "keyword": {
                        pattern: /import|from/,
                        greedy: true,
                        lookbehind: true
                    },
                    "punctuation": {
                        pattern: /[{},]/,
                        greedy: true,
                        lookbehind: true
                    }
                }
            },
            "default-subject": {
                pattern: /import\s*?([^'"`]+)\s*?(?:from|['"`])/,
                greedy: true,
                lookbehind: true,
                inside: {
                    "keyword": {
                        pattern: /import|from/,
                        greedy: true,
                        lookbehind: true
                    },
                    "punctuation": {
                        pattern: /[{},]/,
                        greedy: true,
                        lookbehind: true
                    }
                }
            },
            "punctuation": {
                pattern: /[,;]/,
                greedy: true,
                lookbehind: true
            },
            "keyword keyword-from": {
                pattern: /from/,
                greedy: true,
                lookbehind: true
            }
        }
    }
};

Prism.languages.insertBefore('typescript', 'keyword', keywordSupport);
Prism.languages.insertBefore('javascript', 'keyword', keywordSupport);

export default Prism;
