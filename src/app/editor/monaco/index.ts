import * as MonacoEditor from 'monaco-editor';

let isMonacoInstalled = false;
const installationLocation = '/lib/monaco/vs';

export function installMonaco() {
    // if (isMonacoInstalled) return;

    // // Monaco has a UMD loader that requires this
    // // Merge with any pre-existing global require objects.
    // if (!window['require']) window['require'] = {} as any;
    // if (!window['require']['paths']) window['require']['paths'] = {};

    // window['require']['paths'].vs = installationLocation;

    // const monacoFiles = [
    //     'loader.js',
    //     'editor/editor.main.nls.js',
    //     'editor/editor.main.js',
    // ];

    // for (let i = 0; i < monacoFiles.length; i++) {
    //     const script = document.createElement("script");
    //     script.setAttribute("defer", "");
    //     script.setAttribute("src", installationLocation + '/' + monacoFiles[i]);
    //     document.body.append(script);
    // }
    // isMonacoInstalled = true;
}

export function waitForMonacoInstall() {
    return new Promise((res, rej) => {
        let count = 0;
        let i = window.setInterval(() => {
            count++;

            if (window['monaco'] != undefined) {
                window.clearInterval(i);

                res(true);
            }
            if (count >= 100) {
                window.clearInterval(i);
                res(false);
            }
        }, 100);
    });
}

export const MonacoAliasMap = {
    'ts': 'typescript',
    'js': 'javascript',
    'sh': 'shell',
    'bash': 'shell',
    'ash': 'shell',
    'zsh': 'shell',
    'yml': 'yaml',
    'rb': 'ruby',
    'ps1': 'powershell',
    'pwsh': 'powershell',
    'py': 'python',
    'py2': 'python',
    'py3': 'python',
    'python2': 'python',
    'python3': 'python',
    'md': 'markdown',
    'c#': 'csharp',
    'cs': 'csharp',
    'c++': 'cpp',
    'h': 'cpp',
};

export const invokableLanguages = [
    "javascript"
]
