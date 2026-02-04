# Electron 增量更新插件（无 setup.exe）

这个模块提供一个最小化的 Electron 增量更新流程，**不依赖 setup.exe**。更新流程如下：

1. 下载更新包（通常是解压后的 app 目录或资源目录）。
2. 客户端主动退出。
3. 独立的更新进程替换本地资源。
4. 重新启动客户端。

## 安装

```bash
npm install electron-incremental-updater
```

## 使用示例（主进程）

```js
const path = require("path");
const { app } = require("electron");
const { downloadUpdate, scheduleUpdate } = require("electron-incremental-updater");

async function runUpdate() {
  const downloadPath = path.join(app.getPath("temp"), "my-update", "update.zip");
  await downloadUpdate({
    url: "https://example.com/update.zip",
    destinationPath: downloadPath,
    onProgress: ({ received, total }) => {
      console.log("download", received, total);
    },
  });

  // 你需要自行解压 update.zip，解压后的目录即 updatePayloadPath
  const updatePayloadPath = path.join(app.getPath("temp"), "my-update", "app");

  const currentAppPath = path.join(process.resourcesPath, "app");
  scheduleUpdate({
    currentAppPath,
    updatePayloadPath,
    relaunchArgs: [process.execPath, ...process.argv.slice(1)],
  });

  app.quit();
}
```

## 说明

- `downloadUpdate` 只负责下载，不包含解压逻辑。你可以使用自己的解压库（如 `adm-zip`、`extract-zip`）。
- `scheduleUpdate` 会启动一个独立的 Node 进程等待应用退出，然后替换目录并重新启动。
- 需要保证 `updatePayloadPath` 是**完整的可运行 app 目录**（例如 `resources/app` 的完整内容）。

## Demo（打包后更新）

`demo/` 目录是一个完整 Electron 项目，已经集成此插件，提供 `electron:pack` 脚本用于打包并启动。
打包完成后，点击按钮即可触发更新并看到版本号变化。

## API

### `downloadUpdate({ url, destinationPath, onProgress })`

- `url`: 更新包地址。
- `destinationPath`: 下载到本地的路径。
- `onProgress`: 可选回调，参数 `{ received, total }`。

### `scheduleUpdate({ currentAppPath, updatePayloadPath, relaunchArgs })`

- `currentAppPath`: 当前运行的 app 目录（通常为 `process.resourcesPath/app`）。
- `updatePayloadPath`: 已解压的更新包目录。
- `relaunchArgs`: 重新启动命令参数数组（默认空数组，可传 `[process.execPath, ...process.argv.slice(1)]`）。
