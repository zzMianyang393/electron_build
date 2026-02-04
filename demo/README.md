# Demo: Electron 增量更新示例

该 demo 是一个完整的 Electron 项目，已在 `demo/` 目录内集成增量更新插件。

## 目录结构

```
demo/
  main.js
  preload.js
  index.html
  renderer.js
  updates/
    v1
    v2
    v3
    v4
```

`updates/v1..v4` 为不同版本的完整 app 目录（模拟解压后的更新包）。

## 使用方式

```bash
cd demo
npm install
npm run electron:pack
```

打包完成后会自动启动应用。界面会显示当前版本号，点击按钮即可触发更新。
更新流程为：退出 -> 替换资源 -> 重启，启动后即可看到版本号变化。
