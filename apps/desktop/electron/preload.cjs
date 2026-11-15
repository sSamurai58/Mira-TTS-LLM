const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("miraDesktop", {
  platform: process.platform,
});

contextBridge.exposeInMainWorld("miraUpdater", {
  getVersion: () => ipcRenderer.invoke("updater:version"),
  check: () => ipcRenderer.invoke("updater:check"),
  installAndRestart: () => ipcRenderer.invoke("updater:install"),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  },
});
