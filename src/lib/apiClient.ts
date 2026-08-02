/**
 * Simple API client wrapper for BuzzNa UI
 * - Provides lightweight post/get helpers used by pages to call server endpoints.
 * - Respects VITE_API_BASE_URL if provided; otherwise uses relative paths.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '';

async function request(method: string, path: string, body?: any, opts: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  };

  const res = await fetch(url, init);
  // Best-effort: if no JSON returned, resolve to undefined
  const text = await res.text();
  if (!res.ok) {
    // Try to bubble up JSON error if present
    let parsed: any = undefined;
    try { parsed = text ? JSON.parse(text) : undefined; } catch {}
    const msg = (parsed && parsed.error) || (parsed && parsed.message) || res.statusText || `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.body = parsed ?? text;
    throw err;
  }

  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; }
}

export const apiClient = {
  get: (path: string, opts?: RequestInit) => request('GET', path, undefined, opts),
  post: (path: string, payload?: any, opts?: RequestInit) => request('POST', path, payload, opts),
  put: (path: string, payload?: any, opts?: RequestInit) => request('PUT', path, payload, opts),
  del: (path: string, payload?: any, opts?: RequestInit) => request('DELETE', path, payload, opts),
};

export default apiClient;
