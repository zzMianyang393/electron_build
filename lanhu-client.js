const LANHU_API_BASE = process.env.LANHU_API_BASE || "https://api.lanhuapp.com";
const LANHU_TOKEN = process.env.LANHU_TOKEN;

function requireToken() {
  if (!LANHU_TOKEN) {
    throw new Error("缺少 LANHU_TOKEN，请在环境变量中配置蓝湖访问令牌");
  }
}

async function request(path, options = {}) {
  requireToken();

  const response = await fetch(`${LANHU_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LANHU_TOKEN}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`蓝湖 API 请求失败: ${response.status} ${response.statusText} - ${body}`);
  }

  return response.json();
}

export async function getProjectMeta(projectId) {
  // 注意：具体路径需要按你团队蓝湖开放 API 实际文档调整。
  return request(`/v1/projects/${projectId}`);
}

export async function getDesignNodes(projectId, nodeIds = []) {
  const query = nodeIds.length ? `?node_ids=${encodeURIComponent(nodeIds.join(","))}` : "";
  return request(`/v1/projects/${projectId}/nodes${query}`);
}

export function normalizeForPrompt(projectMeta, nodes) {
  const frames = (nodes?.data || []).map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    size: {
      width: node.width,
      height: node.height
    },
    layout: node.layout || null,
    typography: node.typography || null,
    colors: node.colors || [],
    spacing: node.spacing || null,
    assets: node.assets || []
  }));

  return {
    project: {
      id: projectMeta?.id,
      name: projectMeta?.name,
      updatedAt: projectMeta?.updated_at
    },
    frames
  };
}
