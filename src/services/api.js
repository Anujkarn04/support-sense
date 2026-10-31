// The only place the frontend talks to a backend.
// VITE_USE_MOCK=true  -> the in-browser demo backend (src/mock), same JSON contract
// VITE_USE_MOCK=false -> the FastAPI backend at VITE_API_BASE_URL
export const IS_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "true") === "true";
const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Token lives in sessionStorage (cleared when the tab closes); memory is the fallback.
const TOKEN_KEY = "supportsense.token";
let memoryToken = null;
export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}
export function setToken(token) {
  memoryToken = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function buildQuery(query) {
  const p = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

let mockModule = null;
async function mock() {
  if (!mockModule) mockModule = await import("../mock/router.js");
  return mockModule;
}

export async function request(method, path, { body, query } = {}) {
  const token = getToken();
  let status;
  let data;

  if (IS_MOCK) {
    const { mockRequest } = await mock();
    await new Promise((r) => setTimeout(r, 60));
    ({ status, data } = mockRequest(method, path, { body, query, token }));
  } else {
    let res;
    try {
      res = await fetch(`${BASE}/api${path}${buildQuery(query)}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, "Can't reach the server. Check that the backend is running.");
    }
    status = res.status;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { detail: text };
    }
  }

  if (status >= 200 && status < 300) return data;

  if (status === 401 && token && path !== "/auth/login") onUnauthorized();
  const detail = data && data.detail;
  const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : "Something went wrong.";
  throw new ApiError(status, message);
}

export const get = (path, query) => request("GET", path, { query });
export const post = (path, body) => request("POST", path, { body });
export const patch = (path, body) => request("PATCH", path, { body });
