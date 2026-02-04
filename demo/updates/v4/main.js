const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { scheduleUpdate } = require("electron-incremental-updater");

function updatesBasePath() {
  if (process.env.DEMO_UPDATES_PATH) {
    return process.env.DEMO_UPDATES_PATH;
  }

  const parentUpdates = path.join(__dirname, "..");
  if (fs.existsSync(parentUpdates)) {
    return parentUpdates;
  }

  const candidates = [
    path.join(process.resourcesPath, "..", "updates"),
    path.join(process.resourcesPath, "..", "..", "updates"),
    path.join(process.resourcesPath, "..", "..", "..", "updates"),
    path.join(process.resourcesPath, "..", "..", "..", "..", "updates"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || parentUpdates;
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

ipcMain.handle("get-version", () => app.getVersion());

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
