const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { ipcMain: ipc } = require('electron-better-ipc');
const fs = require("fs/promises");
const Path = require("path");

console.log("Electron shell booting");

app.commandLine.appendSwitch('--enable-unsafe-webgpu');
app.commandLine.appendSwitch('--enable-precise-memory-info');
app.commandLine.appendSwitch('--enable-font-antialiasing');
// app.commandLine.appendSwitch('--force-browser-crash-on-gpu-crash');

function isDev() {
    return !app.getAppPath().includes('app.asar');
}

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            // Eventually move the APIs into something else. For now, this is the simplest.
            sandbox: false,
            preload: __dirname + '/preload.js',
            devTools: true,
        }
    });

    Menu.setApplicationMenu(null)

    if (isDev()) {
        win.loadURL('https://localhost:4400', { })
        win.webContents.openDevTools();
    }
    else {
        win.loadFile('index.html');
        win.webContents.openDevTools();
    }
    return win;
};


// SSL/TSL: this is the self signed certificate support
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // On certificate error we disable default behaviour (stop loading the page)
    // and we then say "it is all fine - true" to the callback
    event.preventDefault();
    callback(true);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
// MacOS patch.
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
})

function getAppDataPath() {
    switch (process.platform) {
        case "darwin": {
            return Path.join(process.env.HOME, "Library", "Application Support", "StackEdit");
        }
        case "win32": {
            return Path.join(process.env.APPDATA, "StackEdit");
        }
        case "linux": {
            return Path.join(process.env.HOME, "Documents", "StackEdit");
        }
        default: {
            console.log("Unsupported platform!");
            process.exit(1);
        }
    }
};

const rootPath = getAppDataPath();

fs.mkdir(rootPath, { recursive: true }).catch(e => console.log(e));

function checkPath(path) {
    let nPath = Path.normalize(rootPath + '/' + path);
    if (!nPath.startsWith(rootPath))
        throw new Error("Invalid path");
    return nPath;
}

app.whenReady().then(() => {


    ipc.answerRenderer("access", ([path], bw) => fs.access(checkPath(path), fs.constants.R_OK | fs.constants.W_OK));
    ipc.answerRenderer("readdir", ([path], bw) => fs.readdir(checkPath(path), { withFileTypes: true })
        .then(arr => arr.map(a => {
            return {
                ...a,
                isDirectory: a.isDirectory(),
                isFile: a.isFile(),
                path: a.path.replace(rootPath, ''),
                parentPath: a.parentPath.replace(rootPath, '')
            }
        }))
    );
    ipc.answerRenderer("readFile", ([path, encoding], bw) => fs.readFile(checkPath(path), encoding));
    ipc.answerRenderer("mkdir", ([path, opts], bw) => fs.mkdir(checkPath(path), opts));
    ipc.answerRenderer("writeFile", ([path, data], bw) => fs.writeFile(checkPath(path), data));
    ipc.answerRenderer("unlink", ([path, opts], bw) => fs.unlink(checkPath(path), opts));
    ipc.answerRenderer("rmdir", ([path, opts], bw) => fs.rmdir(checkPath(path), opts));
    ipc.answerRenderer("devtools", (args, bw) => bw.openDevTools());
    ipc.answerRenderer("fullscreen", (args, bw) => bw.setFullScreen(!bw.fullScreen));

    createWindow();

    console.log("Electron shell ready");
});
