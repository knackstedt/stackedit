import * as Monaco from 'monaco-editor';
// ! Extremely helpful demonstrations:
// https://microsoft.github.io/monaco-editor/monarch.html

/** Important notes:
 *  - Regex flags do not effect tokenization. You must specify both lowercase and uppercase text.
 *  - Tokenization does not effect link detection.
 */

export function setupLogLanguage(monaco: typeof Monaco){
    monaco.languages.register({ id: 'log' });

    monaco.languages.setMonarchTokensProvider('log', {
        defaultToken: "",
        tokenPostfix: ".log",
        tokenizer: {
            root: [

                // Match exception "at"
                [/^(  at|\tat|    at| --- at) /gm, { token: 'exception-stack', bracket: '@open', next: '@exception' }],

                // Known Types.
                [/\b(TypeError|Generator|Promise|httpAdapter|Axios|Function|JSON|Require stack|<anonymous>)\b/g, "type"],

                // Common NodeJS System Errors.
                // https://nodejs.org/api/errors.html
                [/(EACCES|EADDRINUSE|ECONNREFUSED|ECONNRESET|EEXIST|EISDIR|EMFILE|ENOENT|ENOTDIR|ENOTEMPTY|ENOTFOUND|EPERM|EPIPE|ETIMEDOUT)/, "system-error"],
                // socket timeout exception: java.net.NoRouteToHostException
                [/\b(FILE_NOT_FOUND)\b/, "system-error"],
                [/\b(GET|POST|PUT|PATCH|DELETE|COPY|HEAD|OPTIONS|LINK|UNLINK|PURGE|LOCK|UNLOCK|PROPFIND|VIEW)\b/, "http-method"],


                // Technology specific Exceptions
                [/\b(java\.[a-z0-9A-Z]+?\.[A-Za-z]+?Exception)\b/, "severity-error"],


                // Trace/Verbose
                [/[\b:\s\[](TRACE|[Tt]race|verb|verbose)[\b:\s\]]/, "severity-verbose"],
                // DEBUG
                [/[\b\[\s](debug|DEBUG)[\b\s\]]/, "severity-debug"],
                // INFO
                [ /[\b\s\[](INFO|EVENT|hint|info|INFO|information|notice)[\b:\s\]]/, "severity-info" ],
                // Warn
                [ /[\b\[\s](WARNING|[Ww]arning|[Ww]arn|WARN)[\b:\s\]]/, "severity-warning" ],
                // Error
                [/[\[\b\s](error|fatal|alert|critical|crash|emergency|PROTERR|ERROR)[\b:\s\]]/, "severity-error"],




                // Match the GMT log format from (apache)?
                // e.g. Fri, 03 Dec 2021 15:31:37 GMT
                // Monarch is ignoring the case-insensitive flag.
                [/([mM]on|[tT]ue|[wW]ed|[tT]hu|[fF]ri|[sS]at|[sS]un), \d\d ([jJ]an|[fF]eb|[mM]ar|[aA]pr|[mM]ay|[jJ]un|[jJ]ul|[aA]ug|[sS]ep|[oO]ct|[nN]ov|[dD]ec) 20\d\d \d\d:\d\d:\d\d [A-Z]{3}/i, "date"],

                // ISO dates ("2020-01-01")
                [/\b\d{4}-\d{2}-\d{2}(T|\b)/, "date"],
                // Culture specific dates ("01/01/2020", "01.01.2020")
                [/\b\d{2}[^\w\s]\d{2}[^\w\s]\d{4}\b/, "date"],
                // Clock times with optional timezone ("01:01:01", "01:01:01.001", "01:01:01+01:01")
                [ /\d{1,2}:\d{2}(:\d{2}([.,]\d{1,})?)?(Z| ?[+-]\d{1,2}:\d{2})?\b/, "date" ],
                [ /\d{9,10}0000/, "date" ],

                // 20171223-23:55:24:443
                [/2[01]\d{6}-\d{1,2}:\d{1,2}:\d{1,2}:\d{1,3}/, "date"],

                // [Mon Dec 05 19:00:54 2005]
                [/\[[A-Z][a-z]{2} [A-Z][a-z]{2} \d\d \d\d:\d\d:\d\d 2[01]\d\d\]/, "date"],

                // Jul 27 14:41:59 | Jul  9 22:53:22
                [/[A-Z][a-z]{2} [\d ]\d \d\d:\d\d:\d\d/, "date"],

                // 17/06/09 20:11:10
                [/\d\d\/\d\d\/\d\d \d\d:\d\d:\d\d/, "date"],

                // 1131567328 2005.11.09
                [/\d{9,14} 2[01]\d\d\.\d\d\.\d\d/, "date"],

                // Nov 9 12:11:23
                [/[A-Z][a-z]{2} \d \d\d:\d\d:\d\d/, "date"],

                // TODO: Sat Feb 19 07:28:05 UTC 2022

                // API scope matching
                // e.g. [Library]
                [/\[[^\]]+\]+/, "scope"],
                [/\|[a-zA-Z0-9_]+\|/, "scope"],
                [/\*{3,}/, "scope"],




                // Git commit hashes of length 40, 10, or 7
                [/[\b ]([0-9a-fA-F]{40}|[0-9a-fA-F]{10}|[0-9a-fA-F]{7})[\b \n,]/, "constant" ],
                // Guids
                [/[0-9a-fA-F]{8}[-]?([0-9a-fA-F]{4}[-]?){3}[0-9a-fA-F]{12}/, "constant" ],
                // Constants
                [/[\b ]([0-9a-f]{16}|true|false|null|new)[\b \n,]/, "constant"],

                // Addresses such as 0x00000000002ec640
                [/[\b ](\u0040?0x[0-9a-fA-F]{2,64})[\b \n,]/g, "constant"],

                // Nan and Undefined may be important.
                [/NaN|[Uu]ndefiend/, "severity-warning"],

                // Match numbers
                [/\d+(s|ms|b)/g, "number"],
                [/[\b ](\d\.\d+)[\b \n,]/g, "number"],
                [/[\b ](\d+)[\b \n,]/g, "number"],
                [/[\b ](\(\d+\))[\b \n,]/g, "number"],
                [/[\b ]([0-9A-F]{28})[\b \n,]/g, "number"],
                // 0x08701021
                // TODO: ip:55dccd85bc63 sp:7ffc3c6eaf40

                // Strings
                [/"[^"]*"/, "string"],
                [/(?<![\w])'[^']*'/, "string"],

                // Match remote Urls
                // Fully qualified with protocol
                [/(https?|ftps?|sftp|ftpes|tls|ssh|git|file|pop3?):\/\/\S+/, "file-uri1"],
                [/(https?|ftps?|hfds):\/\/[^ \n]+/, "file-uri2"],

                // C:\
                //
                [/([A-Z]:\\|\/[a-z]\/)(([^\\\/\n])+?[\\\/])+([^\\\/\n])+?[^\s\[\]\(\)\,\#]+/, "file-uri3"],
                // [/([A-Z]:\\|\/[a-z]\/)(([^\\\/\n])+?[\\\/])+([^\\\/\n])+?\.[a-z0-9]{2,12}/, "file-uri"],

                // TODO: /usr/share/fonts/truetype/freefont


                // linux-headers-6.2.0-76060200-generic:amd64
                // (6.2.0-76060200.202302191831~1677858327~22.04~3cea1be)

                [/(>= |= )[\d\.~\-a-z]+/, "version-map"],

                // Intercept BEFORE ip address.
                // CurrentState:112

                // Match IP addresses
                //      [::ffff:192.168.1.107]                                                           [2001:0db8:85a3:0000:0000:8a2e:0370:7334]
                // ::ffff:127.0.0.1
                // IPv6
                [/\b(::1|::ffff:(([12]\d\d|\d\d?)\.([12]\d\d|\d\d?)\.([12]\d\d|\d\d?)\.([12]\d\d|\d\d?))|([a-f0-9]{0,4}:){1,7}[a-f0-9]{1,4})(:\d{2,5})?\b/g, "ip-address"],
                // IPv4
                [/\b(([12]\d\d|\d\d?)\.([12]\d\d|\d\d?)\.([12]\d\d|\d\d?)\.([12]\d\d|\d\d?))(:\d{2,5})?\b/g, "ip-address"],

                // /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad
                // [/[\b :](\/[^\/\\\[\]:\n]+)+\/?/, "file-uri4"],

                [/\b\.\.\.\b/, "muted"],

                // @ref http_logging section.
                [/\(/, "control", "@http_logging"],
            ],

            exception: [
                [/(\s{2,4}|\t)at/, 'exception-stack'],
                [/([A-Z]:\\|\/[a-z]\/)?[a-zA-Z0-9\/\\_~.\-\u0040 ]+?\.(js|ts|go)/, 'file-uri5'],
                [/:\d+:\d+/, 'file-position'],
                [/[\b ]([0-9a-f]{16}|true|false|null|new)[\b \n,]/, "constant"],

                [/^(?=[^\s]{4})/, { token: "control", bracket: '@close', next: "@pop"}]
            ],

            http_logging: [
                [/GET|POST|PUT|PATCH|DELETE|COPY|HEAD|OPTIONS|LINK|UNLINK|PURGE|LOCK|UNLOCK|PROPFIND|VIEW/i, "http-method"],

                [/ -?\d+ |-?\d{4,99}|\b\d{1,2}\b/g, "number"],
                [/[\b ]0x[0-9a-fA-F]{2,64}[\b ]/g, "number"],

                [/1\d\d/i, "severity-verbose"],
                [/2\d\d/i, "severity-debug"],
                [/3\d\d/i, "constant"],
                [/4\d\d/i, "severity-warning"],
                [/5\d\d/i, "severity-error"],
                [/\)|\s/, 'control', '@pop']
            ]
        }
    });

    monaco.editor.defineTheme('vs-dark', {
        base: 'vs-dark',
        inherit: true,
        colors: {

        },
        rules: [
            { token: 'severity-verbose.log', foreground: '#90a4ae' },
            { token: 'severity-debug.log',   foreground: '#7cace8' },
            { token: 'severity-info.log',    foreground: '#4caf50' },
            { token: 'severity-error.log',   foreground: '#e43e3e', fontStyle: 'bold' },
            { token: 'severity-warning.log', foreground: '#ff9800' },

            { token: 'date.log',             foreground: '#00bfae' },
            { token: 'scope.log',            foreground: '#aaaaaa' },
            { token: 'code.log',             foreground: '#8aacbc' },

            { token: 'exception-stack.log',  foreground: '#ff9800', fontStyle: 'bold' },
            { token: 'file-uri.log',         foreground: '#90caf9', fontStyle: 'italic' },
            { token: 'file-uri1.log',        foreground: '#90caf8', fontStyle: 'italic' },
            { token: 'file-uri2.log',        foreground: '#90caf7', fontStyle: 'italic' },
            { token: 'file-uri3.log',        foreground: '#90caf6', fontStyle: 'italic' },
            { token: 'file-uri4.log',        foreground: '#90caf5', fontStyle: 'italic' },
            { token: 'file-uri5.log',        foreground: '#90caf4', fontStyle: 'italic' },
            { token: 'file-uri6.log',        foreground: '#90caf3', fontStyle: 'italic' },
            { token: 'file-uri7.log',        foreground: '#90caf2', fontStyle: 'italic' },
            { token: 'ip-address.log',       foreground: '#90f998', fontStyle: 'italic' },
            { token: 'file-position.log',    foreground: '#b6e7ff' },
            { token: 'type.log',             foreground: '#2196f3' },
            { token: 'http-method.log',      foreground: '#bdbdbd' },
            { token: 'system-error.log',     foreground: '#ffc107' },
            { token: 'muted.log',            foreground: '#777777' },
        ],
    });

    monaco.editor.defineTheme('vs', {
        base: 'vs',
        inherit: true,
        colors: {

        },
        rules: [
            { token: 'severity-verbose.log', foreground: '#90a4ae' },
            { token: 'severity-debug.log', foreground: '#7cace8' },
            { token: 'severity-info.log', foreground: '#4caf50' },
            { token: 'severity-error.log', foreground: '#e43e3e', fontStyle: 'bold' },
            { token: 'severity-warning.log', foreground: '#ff9800' },

            { token: 'date.log', foreground: '#00bfae' },
            { token: 'scope.log', foreground: '#aaaaaa' },
            { token: 'code.log', foreground: '#8aacbc' },

            { token: 'exception-stack.log', foreground: '#ff9800', fontStyle: 'bold' },
            { token: 'file-uri.log', foreground: '#90caf9', fontStyle: 'italic' },
            { token: 'file-uri1.log', foreground: '#90caf8', fontStyle: 'italic' },
            { token: 'file-uri2.log', foreground: '#90caf7', fontStyle: 'italic' },
            { token: 'file-uri3.log', foreground: '#90caf6', fontStyle: 'italic' },
            { token: 'file-uri4.log', foreground: '#90caf5', fontStyle: 'italic' },
            { token: 'file-uri5.log', foreground: '#90caf4', fontStyle: 'italic' },
            { token: 'file-uri6.log', foreground: '#90caf3', fontStyle: 'italic' },
            { token: 'file-uri7.log', foreground: '#90caf2', fontStyle: 'italic' },
            { token: 'ip-address.log', foreground: '#90f998', fontStyle: 'italic' },
            { token: 'file-position.log', foreground: '#b6e7ff' },
            { token: 'type.log', foreground: '#2196f3' },
            { token: 'http-method.log', foreground: '#bdbdbd' },
            { token: 'system-error.log', foreground: '#ffc107' },
            { token: 'muted.log', foreground: '#777777' },
        ],
    });
}
