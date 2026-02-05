// Minimal JWT auth helper for the React app.
// Usage:
// import { login, logout, getAccessToken, authFetch } from '../services/auth'
// await login(email, password)

const TOKEN_URL = (path = '') => `http://localhost:8000/api/token/${path}`;

export async function login(email, password) {
  const res = await fetch(TOKEN_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid credentials');
  }
  const data = await res.json();
  // data: { access, refresh }
  localStorage.setItem('accessToken', data.access);
  localStorage.setItem('refreshToken', data.refresh);
  return data;
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export async function refreshAccessToken() {
  const refresh = localStorage.getItem('refreshToken');
  if (!refresh) return null;
  const res = await fetch(TOKEN_URL('refresh/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.access) localStorage.setItem('accessToken', data.access);
  return data.access;
}

export async function authFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  let token = getAccessToken();
  if (!token) {
    token = await refreshAccessToken();
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const opts = { ...init, headers };
  return fetch(input, opts);
}

const authService = { login, logout, getAccessToken, refreshAccessToken, authFetch };
export default authService;
