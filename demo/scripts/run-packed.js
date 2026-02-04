const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const distDir = path.join(__dirname, "..", "dist");
const entries = fs.readdirSync(distDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

if (entries.length === 0) {
  console.error("No packaged app found in dist/. Did electron-builder run?");
  process.exit(1);
}

const latest = entries.sort().slice(-1)[0];
const appDir = path.join(distDir, latest);

const executableName = process.platform === "win32"
  ? "UpdaterDemo.exe"
  : process.platform === "darwin"
    ? "UpdaterDemo.app/Contents/MacOS/UpdaterDemo"
    : "UpdaterDemo";

const executablePath = path.join(appDir, executableName);

console.log(`Launching ${executablePath}`);
spawn(executablePath, [], {
  stdio: "inherit",
});
