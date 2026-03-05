import http from "node:http";
import {
  getCanvasDetail,
  getDesignNodes,
  getProjectMeta,
  listProjectCanvases,
  listTeamProjects,
  listTeams,
  normalizeCanvasForPrompt,
  normalizeCanvases,
  normalizeForPrompt,
  normalizeProjects,
  normalizeTeams
} from "./lanhu-client.js";

const serverInfo = {
  name: "lanhu-mcp-bridge",
  version: "0.2.0"
};

const tools = [
  {
    name: "lanhu_list_teams",
    description: "列出当前 token 可访问的设计团队。",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "lanhu_list_team_projects",
    description: "列出某个设计团队下的项目（可理解为团队文件）。",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "团队 ID" }
      },
      required: ["teamId"]
    }
  },
  {
    name: "lanhu_list_project_canvases",
    description: "列出项目下的画布。",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "项目 ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "lanhu_get_canvas_context",
    description: "按 projectId + canvasId 获取单画布上下文，适合定向生成代码。",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "项目 ID" },
        canvasId: { type: "string", description: "画布 ID" }
      },
      required: ["projectId", "canvasId"]
    }
  },
  {
    name: "lanhu_get_project_summary",
    description: "读取蓝湖项目概要，返回适合 AI IDE 使用的设计上下文。",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "蓝湖项目 ID" },
        nodeIds: {
          type: "array",
          items: { type: "string" },
          description: "可选，要拉取的节点 ID 列表"
        }
      },
      required: ["projectId"]
    }
  }
];

function asTextResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function processRequest(message) {
  const { id, method, params } = message;

  const success = (result) => ({ jsonrpc: "2.0", id, result });
  const failure = (code, text) => ({ jsonrpc: "2.0", id, error: { code, message: text } });

  return (async () => {
    switch (method) {
      case "initialize":
        return success({
          protocolVersion: "2024-11-05",
          serverInfo,
          capabilities: { tools: {} }
        });

      case "notifications/initialized":
        return null;

      case "tools/list":
        return success({ tools });

      case "tools/call": {
        const name = params?.name;
        const args = params?.arguments || {};

        if (name === "lanhu_list_teams") {
          const payload = await listTeams();
          return success(asTextResult({ teams: normalizeTeams(payload) }));
        }

        if (name === "lanhu_list_team_projects") {
          if (!args.teamId) return failure(-32602, "teamId 为必填参数");
          const payload = await listTeamProjects(args.teamId);
          return success(asTextResult({ projects: normalizeProjects(payload) }));
        }

        if (name === "lanhu_list_project_canvases") {
          if (!args.projectId) return failure(-32602, "projectId 为必填参数");
          const payload = await listProjectCanvases(args.projectId);
          return success(asTextResult({ canvases: normalizeCanvases(payload) }));
        }

        if (name === "lanhu_get_canvas_context") {
          if (!args.projectId || !args.canvasId) {
            return failure(-32602, "projectId 与 canvasId 为必填参数");
          }
          const [meta, canvas] = await Promise.all([
            getProjectMeta(args.projectId),
            getCanvasDetail(args.projectId, args.canvasId)
          ]);
          return success(asTextResult(normalizeCanvasForPrompt(meta, canvas)));
        }

        if (name === "lanhu_get_project_summary") {
          const projectId = args.projectId;
          const nodeIds = args.nodeIds || [];

          if (!projectId) return failure(-32602, "projectId 为必填参数");

          const [meta, nodes] = await Promise.all([getProjectMeta(projectId), getDesignNodes(projectId, nodeIds)]);
          return success(asTextResult(normalizeForPrompt(meta, nodes)));
        }

        return failure(-32601, `未知工具: ${name}`);
      }

      default:
        return failure(-32601, `不支持的方法: ${method}`);
    }
  })().catch((error) => failure(-32000, error?.message || "内部错误"));
}

function writeStdio(message) {
  const json = JSON.stringify(message);
  const payload = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
  process.stdout.write(payload);
}

function runStdioServer() {
  let buffer = "";

  process.stdin.on("data", async (chunk) => {
    buffer += chunk.toString("utf8");

    while (true) {
      const sepIndex = buffer.indexOf("\r\n\r\n");
      if (sepIndex === -1) return;

      const header = buffer.slice(0, sepIndex);
      const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!lengthMatch) {
        buffer = "";
        return;
      }

      const contentLength = Number(lengthMatch[1]);
      const bodyStart = sepIndex + 4;
      if (buffer.length < bodyStart + contentLength) return;

      const body = buffer.slice(bodyStart, bodyStart + contentLength);
      buffer = buffer.slice(bodyStart + contentLength);

      let message;
      try {
        message = JSON.parse(body);
      } catch {
        continue;
      }

      const response = await processRequest(message);
      if (response) writeStdio(response);
    }
  });
}

function runHttpServer(port) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const message = JSON.parse(body || "{}");
        const response = await processRequest(message);

        if (!response) {
          res.writeHead(204);
          res.end();
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error?.message || "Bad Request" }));
      }
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Lanhu MCP HTTP server running at http://0.0.0.0:${port}/mcp`);
  });
}

const transport = process.env.MCP_TRANSPORT || "stdio";
if (transport === "http") {
  runHttpServer(Number(process.env.PORT || 8787));
} else {
  runStdioServer();
}
