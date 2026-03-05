# 蓝湖设计图 MCP Bridge（给 AI IDE 使用）

这是一个 MCP（Model Context Protocol）服务，让 Trae / Kiro / Cursor 等支持 MCP 的 AI IDE 可以读取蓝湖设计数据，并在生成代码前自动拿到结构化设计上下文。

## 你这次的目标（已支持）

你希望做到：

1. 在 IDE 里直接用 MCP；
2. 尽量不依赖“本地跑一个服务”；
3. 支持可选择 **设计团队 → 团队项目（文件）→ 画布**；
4. 再让 AI 按指定画布进行开发。

本项目现在已提供对应工具链。

## 提供的 MCP 工具

- `lanhu_list_teams`：列出团队
- `lanhu_list_team_projects`：列出团队下项目（团队文件）
- `lanhu_list_project_canvases`：列出项目画布
- `lanhu_get_canvas_context`：获取单画布上下文（推荐用于定向开发）
- `lanhu_get_project_summary`：获取项目级汇总上下文

## 使用方式 A：本地 stdio（最容易先跑通）

```bash
npm install
export LANHU_TOKEN="你的蓝湖访问令牌"
export LANHU_API_BASE="https://api.lanhuapp.com"
npm start
```

IDE MCP 配置示例：

```json
{
  "mcpServers": {
    "lanhu": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"],
      "env": {
        "LANHU_TOKEN": "your_token",
        "LANHU_API_BASE": "https://api.lanhuapp.com"
      }
    }
  }
}
```

## 使用方式 B：远程 HTTP MCP（不依赖本机常驻服务）

### 1) 部署为远程服务

```bash
MCP_TRANSPORT=http PORT=8787 LANHU_TOKEN=your_token node server.js
```

服务会暴露：`POST /mcp`

### 2) 在 IDE 里接远程 MCP

如果你的 IDE 原生支持 URL 型 MCP，直接填：

- `https://your-domain.com/mcp`

如果 IDE 只支持 command/stdio，可用通用桥接器（例如 `mcp-remote`）：

```json
{
  "mcpServers": {
    "lanhu": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-domain.com/mcp"]
    }
  }
}
```

> 这样你不需要在本地跑蓝湖 MCP 业务进程；本地仅有一个轻量转发命令。

## 在 IDE 里怎么“按团队/项目/画布”开发

建议在对话里明确让 AI 按下面顺序调用工具：

1. 调 `lanhu_list_teams` 选择团队
2. 调 `lanhu_list_team_projects` 选择项目
3. 调 `lanhu_list_project_canvases` 选择目标画布
4. 调 `lanhu_get_canvas_context` 获取画布详情
5. 基于返回 JSON 生成页面代码

你可以直接把下面提示词发给 IDE：

```text
请按以下流程调用 MCP：
1) lanhu_list_teams
2) lanhu_list_team_projects(teamId=我选中的团队)
3) lanhu_list_project_canvases(projectId=我选中的项目)
4) lanhu_get_canvas_context(projectId=..., canvasId=...)
然后根据画布节点结构、尺寸、颜色、字体、间距生成 React + Tailwind 页面。
```

## 我如何测试？

### 1) 语法检查

```bash
npm run check
```

### 2) MCP 冒烟测试（含团队/项目/画布链路）

```bash
npm run test:smoke
```

通过标志：输出 `MCP smoke test passed`。

## 重要说明

- `lanhu-client.js` 中 API 路径是“通用示意”，请按你们蓝湖开放平台文档做映射。
- 生产建议加：鉴权网关、缓存层、限流重试、审计日志。
