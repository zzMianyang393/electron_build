const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { scheduleUpdate } = require("electron-incremental-updater");

function updatesBasePath() {
  if (process.env.DEMO_UPDATES_PATH) {
    return process.env.DEMO_UPDATES_PATH;
  }

  const localUpdates = path.join(__dirname, "updates");
  if (fs.existsSync(localUpdates)) {
    return localUpdates;
  }

  const candidates = [
    path.join(process.resourcesPath, "..", "updates"),
    path.join(process.resourcesPath, "..", "..", "updates"),
    path.join(process.resourcesPath, "..", "..", "..", "updates"),
    path.join(process.resourcesPath, "..", "..", "..", "..", "updates"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || localUpdates;
}

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

ipcMain.handle("get-version", () => {
  return app.getVersion();
});

ipcMain.handle("update-to", async (_event, version) => {
  const updatePayloadPath = path.join(updatesBasePath(), version);
  const currentAppPath = app.isPackaged
    ? path.join(process.resourcesPath, "app")
    : app.getAppPath();

  scheduleUpdate({
    currentAppPath,
    updatePayloadPath,
    relaunchArgs: [process.execPath],
  });

  app.quit();
});

app.whenReady().then(createWindow);
