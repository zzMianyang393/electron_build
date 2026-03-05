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

// 注意：以下路径是通用示意。落地时请按你们团队蓝湖 OpenAPI 文档替换。
export async function listTeams() {
  return request("/v1/teams");
}

export async function listTeamProjects(teamId) {
  return request(`/v1/teams/${teamId}/projects`);
}

export async function listProjectCanvases(projectId) {
  return request(`/v1/projects/${projectId}/canvases`);
}

export async function getProjectMeta(projectId) {
  return request(`/v1/projects/${projectId}`);
}

export async function getDesignNodes(projectId, nodeIds = []) {
  const query = nodeIds.length ? `?node_ids=${encodeURIComponent(nodeIds.join(","))}` : "";
  return request(`/v1/projects/${projectId}/nodes${query}`);
}

export async function getCanvasDetail(projectId, canvasId) {
  return request(`/v1/projects/${projectId}/canvases/${canvasId}`);
}

export function normalizeTeams(payload) {
  const items = payload?.data || payload?.teams || [];
  return items.map((team) => ({
    id: team.id,
    name: team.name,
    role: team.role || null
  }));
}

export function normalizeProjects(payload) {
  const items = payload?.data || payload?.projects || [];
  return items.map((project) => ({
    id: project.id,
    name: project.name,
    updatedAt: project.updated_at || null
  }));
}

export function normalizeCanvases(payload) {
  const items = payload?.data || payload?.canvases || [];
  return items.map((canvas) => ({
    id: canvas.id,
    name: canvas.name,
    type: canvas.type || null,
    updatedAt: canvas.updated_at || null
  }));
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

export function normalizeCanvasForPrompt(projectMeta, canvasDetail) {
  return {
    project: {
      id: projectMeta?.id,
      name: projectMeta?.name
    },
    canvas: {
      id: canvasDetail?.id,
      name: canvasDetail?.name,
      width: canvasDetail?.width || null,
      height: canvasDetail?.height || null,
      nodes: canvasDetail?.nodes || []
    }
  };
}
