import { spawn } from "node:child_process";
import { startMockLanhuApi } from "./mock-lanhu-api.js";

function encode(message) {
  const json = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
}

function createParser(onMessage) {
  let buffer = Buffer.alloc(0);
  const separator = Buffer.from("\r\n\r\n", "utf8");

  return (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const sepIndex = buffer.indexOf(separator);
      if (sepIndex === -1) return;

      const header = buffer.slice(0, sepIndex).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = Buffer.alloc(0);
        return;
      }

      const length = Number(match[1]);
      const bodyStart = sepIndex + separator.length;
      const totalLength = bodyStart + length;
      if (buffer.length < totalLength) return;

      const body = buffer.slice(bodyStart, totalLength).toString("utf8");
      buffer = buffer.slice(totalLength);
      onMessage(JSON.parse(body));
    }
  };
}

function waitFor(messages, id, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const hit = messages.find((msg) => msg.id === id);
      if (hit) {
        clearInterval(timer);
        resolve(hit);
        return;
      }

      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`等待响应超时: id=${id}`));
      }
    }, 20);
  });
}

async function run() {
  const { server, port } = await startMockLanhuApi();
  const messages = [];

  const child = spawn("node", ["server.js"], {
    env: {
      ...process.env,
      LANHU_TOKEN: "test-token",
      LANHU_API_BASE: `http://127.0.0.1:${port}`
    },
    stdio: ["pipe", "pipe", "inherit"]
  });

  child.stdout.on("data", createParser((msg) => messages.push(msg)));

  child.stdin.write(encode({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }));
  child.stdin.write(encode({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));
  child.stdin.write(
    encode({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "lanhu_list_teams", arguments: {} }
    })
  );
  child.stdin.write(
    encode({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "lanhu_list_team_projects", arguments: { teamId: "team-1" } }
    })
  );
  child.stdin.write(
    encode({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "lanhu_list_project_canvases", arguments: { projectId: "demo-project" } }
    })
  );
  child.stdin.write(
    encode({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "lanhu_get_canvas_context",
        arguments: { projectId: "demo-project", canvasId: "canvas-1" }
      }
    })
  );

  const init = await waitFor(messages, 1);
  const list = await waitFor(messages, 2);
  const teams = await waitFor(messages, 3);
  const projects = await waitFor(messages, 4);
  const canvases = await waitFor(messages, 5);
  const canvasCtx = await waitFor(messages, 6);

  if (init.result?.serverInfo?.name !== "lanhu-mcp-bridge") throw new Error("initialize 响应异常");
  if (!Array.isArray(list.result?.tools) || list.result.tools.length < 5) throw new Error("tools/list 返回异常");

  const teamsPayload = JSON.parse(teams.result?.content?.[0]?.text || "{}");
  const projectsPayload = JSON.parse(projects.result?.content?.[0]?.text || "{}");
  const canvasesPayload = JSON.parse(canvases.result?.content?.[0]?.text || "{}");
  const canvasPayload = JSON.parse(canvasCtx.result?.content?.[0]?.text || "{}");

  if (teamsPayload.teams?.[0]?.id !== "team-1") throw new Error("团队列表异常");
  if (projectsPayload.projects?.[0]?.id !== "demo-project") throw new Error("项目列表异常");
  if (canvasesPayload.canvases?.[0]?.id !== "canvas-1") throw new Error("画布列表异常");
  if (canvasPayload.canvas?.id !== "canvas-1" || canvasPayload.canvas?.nodes?.[0]?.id !== "node-1") {
    throw new Error("画布上下文异常");
  }

  child.kill();
  await new Promise((resolve) => server.close(resolve));
  console.log("MCP smoke test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
