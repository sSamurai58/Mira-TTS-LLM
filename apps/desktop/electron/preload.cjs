const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("miraDesktop", {
  platform: process.platform,
});
