# Electron 更新 Demo

此 demo 是一个完整 Electron 项目，演示使用 `electron-incremental-updater` 进行资源替换与重启。

## 目录结构

- `demo/`：Electron 项目（当前版本为 1.0.0）
- `demo/updates/v1..v4`：更新包目录，模拟不同版本的 `resources/app`

## 运行方式

```bash
cd demo
npm install
npm run electron:pack
```

`electron:pack` 会：

1. 使用 `electron-builder` 打包到 `demo/dist`。
2. 把 `demo/updates` 复制到 `demo/dist/updates`。
3. 启动打包后的应用并设置 `DEMO_UPDATES_PATH`。

启动后可看到当前版本号，点击按钮会触发更新、退出应用、替换资源并重启。
