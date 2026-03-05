import http from "node:http";

export function startMockLanhuApi(port = 0) {
  const server = http.createServer((req, res) => {
    const auth = req.headers.authorization;
    if (auth !== "Bearer test-token") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Unauthorized" }));
      return;
    }

    if (req.url === "/v1/teams") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "team-1", name: "电商设计组", role: "owner" }] }));
      return;
    }

    if (req.url === "/v1/teams/team-1/projects") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "demo-project", name: "商城改版", updated_at: "2026-01-01" }] }));
      return;
    }

    if (req.url === "/v1/projects/demo-project") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "demo-project", name: "商城改版", updated_at: "2026-01-01" }));
      return;
    }

    if (req.url === "/v1/projects/demo-project/canvases") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "canvas-1", name: "登录页", type: "frame", updated_at: "2026-01-01" }] }));
      return;
    }

    if (req.url === "/v1/projects/demo-project/canvases/canvas-1") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "canvas-1",
          name: "登录页",
          width: 390,
          height: 844,
          nodes: [{ id: "node-1", name: "手机号输入框", type: "input" }]
        })
      );
      return;
    }

    if (req.url?.startsWith("/v1/projects/demo-project/nodes")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          data: [
            {
              id: "node-1",
              name: "登录页",
              type: "frame",
              width: 390,
              height: 844,
              layout: { mode: "vertical" },
              typography: { fontSize: 14 },
              colors: ["#FFFFFF", "#111111"],
              spacing: { padding: 16 },
              assets: ["https://example.com/banner.png"]
            }
          ]
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Not Found" }));
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}
