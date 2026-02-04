const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("demoApi", {
  getVersion: () => ipcRenderer.invoke("get-version"),
  updateTo: (version) => ipcRenderer.invoke("update-to", version),
});
