const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { scheduleUpdate } = require("electron-incremental-updater");

function createWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 360,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("demo:getVersion", () => app.getVersion());

ipcMain.handle("demo:update", (_event, targetVersion) => {
  const currentAppPath = path.join(process.resourcesPath, "app");
  const updatePayloadPath = path.join(process.resourcesPath, "updates", targetVersion);

  scheduleUpdate({
    currentAppPath,
    updatePayloadPath,
    relaunchArgs: [process.execPath, ...process.argv.slice(1)],
  });

  app.quit();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
