# 蓝湖设计图 MCP Bridge（给 AI IDE 使用）

这是一个最小可运行的 MCP（Model Context Protocol）服务样例，让 Trae / Kiro / Cursor 等支持 MCP 的 AI IDE 可以通过工具调用读取蓝湖设计数据，再把结构化结果喂给代码生成模型。

## 你的核心痛点

你提到的问题是：**AI 目前看不到蓝湖设计稿里的结构信息**（页面层级、尺寸、颜色、字体、间距、组件命名）。

这个项目的做法是：

1. 由 MCP Server 负责访问蓝湖 API；
2. 把原始设计数据归一化成适合 Prompt 的 JSON；
3. AI IDE 在编码前先调用工具 `lanhu_get_project_summary` 获取上下文；
4. 再基于该上下文生成前端代码。

## 快速开始

```bash
npm install
export LANHU_TOKEN="你的蓝湖访问令牌"
# 可选，默认 https://api.lanhuapp.com
export LANHU_API_BASE="https://api.lanhuapp.com"
npm start
```

## 我如何测试？

你可以按下面 3 层来测试：

### 1) 语法检查（最快）

```bash
npm run check
```

### 2) 本地冒烟测试（推荐）

项目内置了一个 **mock 蓝湖 API** + **MCP 协议调用脚本**，会自动验证：

- MCP `initialize` 是否正常
- `tools/list` 是否能列出工具
- `tools/call` 是否能拿到并归一化项目与节点数据

```bash
npm run test:smoke
```

如果看到 `MCP smoke test passed`，说明主链路可用。

### 3) 在 AI IDE 中联调（真实场景）

把服务配置到 Trae/Kiro/Cursor 的 `mcpServers` 后，直接在 IDE 里调用：

- 工具名：`lanhu_get_project_summary`
- 参数示例：

```json
{
  "projectId": "你的蓝湖项目ID",
  "nodeIds": ["可选节点ID"]
}
```

如果返回了项目信息 + frames 数组，表示 IDE 侧已打通。

## 在 AI IDE 中配置 MCP

不同 IDE 配置名称略有差异，一般会是 `mcpServers`：

```json
{
  "mcpServers": {
    "lanhu": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"],
      "env": {
        "LANHU_TOKEN": "your_token"
      }
    }
  }
}
```

## 当前提供的工具

### `lanhu_get_project_summary`

入参：

- `projectId` (string, required)
- `nodeIds` (string[], optional)

返回：

- 项目基础信息
- 设计节点的尺寸、布局、字体、颜色、资产信息（归一化后）

## 生产落地建议

1. **确认蓝湖开放 API 字段**：`lanhu-client.js` 里目前用的是示意路径，需按你团队可用 API 调整。
2. **加缓存层**：减少重复拉取设计稿（如 Redis + 版本戳）。
3. **加鉴权代理**：不要在 IDE 明文分发主 token，可改为团队网关签发短期 token。
4. **做设计到代码映射**：建立 design-token（颜色、字号、间距）到前端主题系统的映射。
5. **加入增量更新**：按节点更新时间同步，避免每次全量读取。

## 常见扩展工具（下一步）

- `lanhu_get_assets`：导出切图/图标 URL
- `lanhu_get_component_spec`：读取单组件约束（状态、交互、变体）
- `lanhu_compare_versions`：比对两个版本设计差异，驱动 AI 自动改代码

---

如果你愿意，我下一步可以直接帮你把这个样例升级成：

- 可直接连 Trae/Kiro 的完整配置模板；
- 带缓存和重试；
- 支持你当前技术栈（React/Vue/Flutter）的代码生成提示词模板。
