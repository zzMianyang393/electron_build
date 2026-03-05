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
      params: {
        name: "lanhu_get_project_summary",
        arguments: {
          projectId: "demo-project"
        }
      }
    })
  );

  const init = await waitFor(messages, 1);
  const list = await waitFor(messages, 2);
  const call = await waitFor(messages, 3);

  if (init.result?.serverInfo?.name !== "lanhu-mcp-bridge") {
    throw new Error("initialize 响应异常");
  }

  if (!Array.isArray(list.result?.tools) || list.result.tools.length === 0) {
    throw new Error("tools/list 未返回工具");
  }

  const text = call.result?.content?.[0]?.text;
  const parsed = JSON.parse(text);
  if (parsed.project?.id !== "demo-project" || parsed.frames?.[0]?.id !== "node-1") {
    throw new Error("tools/call 返回结构异常");
  }

  child.kill();
  await new Promise((resolve) => server.close(resolve));
  console.log("MCP smoke test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
