import type { Skill, SkillDetail, SkillSource, PaginatedSkills } from './types';

// In static demo mode (GitLab Pages) requests are served from pre-generated
// JSON files under /static-api/ instead of a live Express backend.
const STATIC_MODE = import.meta.env.VITE_STATIC_DEMO === 'true';
const BASE = '/api/v1';
const STATIC_BASE = `${import.meta.env.BASE_URL}static-api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (STATIC_MODE && (!options || options.method === undefined || options.method === 'GET')) {
    // Map /skills, /skills/:id, /sources to static JSON files
    const staticPath = path.replace(/^\/skills\/([^?]+)(\?.*)?$/, '/skills/$1.json')
                           .replace(/^\/skills(\?.*)?$/, '/skills.json')
                           .replace(/^\/sources(\?.*)?$/, '/sources.json');
    const res = await fetch(`${STATIC_BASE}${staticPath}`);
    if (!res.ok) throw new Error(res.statusText);
    return res.json() as Promise<T>;
  }
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface GetSkillsParams {
  page?: number;
  per_page?: number;
  sort?: 'name' | 'description' | 'lastModified' | 'category';
  order?: 'asc' | 'desc';
}

export async function getSkills(params: GetSkillsParams = {}): Promise<PaginatedSkills> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  if (params.sort) qs.set('sort', params.sort);
  if (params.order) qs.set('order', params.order);
  const query = qs.toString();
  return request(`/skills${query ? `?${query}` : ''}`);
}

export async function searchSkills(q: string): Promise<{ skills: Skill[]; total: number; query: string }> {
  return request(`/skills/search?q=${encodeURIComponent(q)}`);
}

export async function getSkill(id: string): Promise<SkillDetail> {
  return request(`/skills/${encodeURIComponent(id)}`);
}

export async function getSources(): Promise<{ sources: SkillSource[] }> {
  return request('/sources');
}

export async function addSource(
  token: string,
  source: { path: string; label: string }
): Promise<{ source: SkillSource }> {
  return request('/sources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(source),
  });
}

export async function updateSource(
  token: string,
  id: string,
  source: { path: string; label: string }
): Promise<{ source: SkillSource }> {
  return request(`/sources/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(source),
  });
}

export async function syncSource(
  token: string,
  id: string
): Promise<{ synced: boolean; count: number; lastSynced: string }> {
  return request(`/sources/${id}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function syncSkill(
  token: string,
  skillId: string
): Promise<{ synced: boolean; skillId: string; lastSynced: string }> {
  return request(`/skills/${encodeURIComponent(skillId)}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteSource(token: string, id: string): Promise<{ ok: boolean; skillsRemoved: number }> {
  return request(`/sources/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteSkill(token: string, id: string): Promise<void> {
  return request(`/skills/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function syncSources(
  token: string
): Promise<{ synced: boolean; count: number }> {
  return fetch('/api/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()) as Promise<{ synced: boolean; count: number }>;
}

export async function checkHealth(): Promise<boolean> {
  if (STATIC_MODE) return true;
  try {
    const res = await fetch('/healthz');
    return res.ok;
  } catch {
    return false;
  }
}

export const isStaticDemo = STATIC_MODE;
