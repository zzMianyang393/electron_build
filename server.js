import { getDesignNodes, getProjectMeta, normalizeForPrompt } from "./lanhu-client.js";

const serverInfo = {
  name: "lanhu-mcp-bridge",
  version: "0.1.0"
};

const tools = [
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

function writeMessage(message) {
  const json = JSON.stringify(message);
  const payload = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
  process.stdout.write(payload);
}

function success(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function failure(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  });
}

async function handleRequest(message) {
  const { id, method, params } = message;

  try {
    switch (method) {
      case "initialize":
        return success(id, {
          protocolVersion: "2024-11-05",
          serverInfo,
          capabilities: {
            tools: {}
          }
        });

      case "notifications/initialized":
        return;

      case "tools/list":
        return success(id, { tools });

      case "tools/call": {
        const name = params?.name;
        const args = params?.arguments || {};

        if (name !== "lanhu_get_project_summary") {
          return failure(id, -32601, `未知工具: ${name}`);
        }

        const projectId = args.projectId;
        const nodeIds = args.nodeIds || [];

        if (!projectId) {
          return failure(id, -32602, "projectId 为必填参数");
        }

        const [meta, nodes] = await Promise.all([
          getProjectMeta(projectId),
          getDesignNodes(projectId, nodeIds)
        ]);
        const normalized = normalizeForPrompt(meta, nodes);

        return success(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(normalized, null, 2)
            }
          ]
        });
      }

      default:
        return failure(id, -32601, `不支持的方法: ${method}`);
    }
  } catch (error) {
    return failure(id, -32000, error?.message || "内部错误");
  }
}

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

    await handleRequest(message);
  }
});
