const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--")) {
      continue;
    }
    if (key === "--relaunch") {
      args.relaunch = argv.slice(i + 1);
      break;
    }
    args[key.replace(/^--/, "")] = value;
    i += 1;
  }
  return args;
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForExit(pid, timeoutMs = 30000) {
  const start = Date.now();
  while (pidAlive(pid)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for the app to exit");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function copyFileSync(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirSync(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function removeDirSync(target) {
  if (!fs.existsSync(target)) {
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
}

function replaceApp(currentAppPath, updatePayloadPath) {
  const backupPath = `${currentAppPath}.bak`;

  removeDirSync(backupPath);
  if (fs.existsSync(currentAppPath)) {
    fs.renameSync(currentAppPath, backupPath);
  }

  try {
    fs.renameSync(updatePayloadPath, currentAppPath);
  } catch (error) {
    copyDirSync(updatePayloadPath, currentAppPath);
  }

  removeDirSync(backupPath);
}

async function main() {
  const args = parseArgs(process.argv);
  const pid = Number(args.pid);
  const currentAppPath = args.current;
  const updatePayloadPath = args.payload;
  const relaunchArgs = args.relaunch || [];

  if (!pid || !currentAppPath || !updatePayloadPath) {
    throw new Error("Missing required arguments: --pid, --current, --payload");
  }

  await waitForExit(pid);
  replaceApp(currentAppPath, updatePayloadPath);

  if (relaunchArgs.length > 0) {
    const relaunchExecutable = relaunchArgs[0];
    const relaunchParams = relaunchArgs.slice(1);
    spawn(relaunchExecutable, relaunchParams, {
      detached: true,
      stdio: "ignore",
    }).unref();
  }
}

main().catch((error) => {
  try {
    fs.writeFileSync(path.join(process.cwd(), "update-error.log"), String(error.stack || error));
  } catch (writeError) {
    // ignore
  }
  process.exit(1);
});
