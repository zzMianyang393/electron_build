const path = require("path");
const { spawn } = require("child_process");
const { downloadFile } = require("./network");

const workerPath = path.join(__dirname, "updater-worker.js");

async function downloadUpdate({ url, destinationPath, onProgress }) {
  if (!url || !destinationPath) {
    throw new Error("downloadUpdate requires url and destinationPath");
  }
  return downloadFile({ url, destinationPath, onProgress });
}

function scheduleUpdate({ currentAppPath, updatePayloadPath, relaunchArgs = [] }) {
  if (!currentAppPath || !updatePayloadPath) {
    throw new Error("scheduleUpdate requires currentAppPath and updatePayloadPath");
  }

  const child = spawn(process.execPath, [
    workerPath,
    "--pid",
    String(process.pid),
    "--current",
    currentAppPath,
    "--payload",
    updatePayloadPath,
    "--relaunch",
    ...relaunchArgs,
  ], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
}

module.exports = {
  downloadUpdate,
  scheduleUpdate,
};
