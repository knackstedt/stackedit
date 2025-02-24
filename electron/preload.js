const { contextBridge } = require('electron');
const { ipcRenderer: ipc } = require('electron-better-ipc');

contextBridge.exposeInMainWorld('electronFs', {
    access: (...args) => ipc.callMain("access", args),
    readdir: (...args) => ipc.callMain("readdir", args),
    readFile: (...args) => ipc.callMain("readFile", args),
    mkdir: (...args) => ipc.callMain("mkdir", args),
    rmdir: (...args) => ipc.callMain("rmdir", args),
    writeFile: (...args) => ipc.callMain("writeFile", args),
    unlink: (...args) => ipc.callMain("unlink", args),
});

contextBridge.exposeInMainWorld('electronGlobals', {
    devTools: (...args) => ipc.callMain("devtools", args),
    fullScreen: (...args) => ipc.callMain("fullscreen", args)
});

