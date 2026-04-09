// Cloudflare Worker API client

const BASE = "https://song-vault-api.arranhathawaygallagher.workers.dev";

function getToken() { return localStorage.getItem("sv_token"); }
function setToken(t) { localStorage.setItem("sv_token", t); }
function clearToken() { localStorage.removeItem("sv_token"); }

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiSignup(email, password, username) {
  const data = await request("POST", "/api/auth/signup", { email, password, username });
  if (data.token) setToken(data.token);
  return data;
}

export async function apiLogin(email, password) {
  const data = await request("POST", "/api/auth/login", { email, password });
  if (data.token) setToken(data.token);
  return data;
}

export function apiLogout() {
  clearToken();
}

export function getStoredSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) { clearToken(); return null; }
    return { token, user: { id: payload.sub, email: payload.email, username: payload.username } };
  } catch { clearToken(); return null; }
}

export async function apiGetData() {
  return request("GET", "/api/data");
}

export async function apiSaveData(data) {
  return request("PUT", "/api/data", { data });
}

export async function apiSearchUsers(query) {
  return request("GET", `/api/users/search?q=${encodeURIComponent(query)}`);
}

