const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const demoRoot = path.resolve(__dirname, "..");
const distDir = path.join(demoRoot, "dist");
const updatesSource = path.join(demoRoot, "updates");
const updatesTarget = path.join(distDir, "updates");

function runBuilder() {
  const result = spawnSync("npx", ["electron-builder", "--dir"], {
    cwd: demoRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function copyUpdates() {
  fs.rmSync(updatesTarget, { recursive: true, force: true });
  fs.mkdirSync(updatesTarget, { recursive: true });
  fs.cpSync(updatesSource, updatesTarget, { recursive: true });
}

function locateExecutable() {
  const productName = "UpdaterDemo";
  if (process.platform === "win32") {
    const exePath = path.join(distDir, "win-unpacked", `${productName}.exe`);
    if (fs.existsSync(exePath)) {
      return exePath;
    }
  }

  if (process.platform === "darwin") {
    const appPath = path.join(distDir, "mac", `${productName}.app`, "Contents", "MacOS", productName);
    if (fs.existsSync(appPath)) {
      return appPath;
    }
  }

  const linuxPath = path.join(distDir, "linux-unpacked", productName);
  if (fs.existsSync(linuxPath)) {
    return linuxPath;
  }

  const distItems = fs.readdirSync(distDir, { withFileTypes: true }).map((item) => item.name);
  throw new Error(`Unable to locate packed app. Dist contents: ${distItems.join(", ")}`);
}

runBuilder();
copyUpdates();

const executable = locateExecutable();
spawn(executable, [], {
  detached: true,
  stdio: "inherit",
  env: {
    ...process.env,
    DEMO_UPDATES_PATH: updatesTarget,
  },
});
