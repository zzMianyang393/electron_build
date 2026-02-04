const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("demo", {
  getVersion: () => ipcRenderer.invoke("demo:getVersion"),
  updateTo: (version) => ipcRenderer.invoke("demo:update", version),
});
