import type { GroupDoc, GroupMeta, User } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const TOKEN_KEY = "tiza:token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.error || `Error ${res.status}`);
  }
  return body as T;
}

/* ---- Auth ---------------------------------------------------------------- */

export interface AuthResult {
  token: string;
  user: User;
}

export function register(input: {
  email: string;
  password: string;
  name: string;
  school: string;
}): Promise<AuthResult> {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchMe(): Promise<{ user: User }> {
  return request("/api/me");
}

/* ---- Groups -------------------------------------------------------------- */

export function listGroups(): Promise<GroupMeta[]> {
  return request("/api/groups");
}

export function createGroup(input: {
  label: string;
  gradeLevel?: string;
  cycle?: string;
  trimester?: string;
}): Promise<GroupDoc> {
  return request("/api/groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchGroup(id: string): Promise<GroupDoc> {
  return request(`/api/groups/${id}`);
}

export function saveGroup(doc: GroupDoc): Promise<GroupDoc> {
  return request(`/api/groups/${doc.id}`, {
    method: "PUT",
    body: JSON.stringify(doc),
  });
}

export function deleteGroup(id: string): Promise<{ ok: true }> {
  return request(`/api/groups/${id}`, { method: "DELETE" });
}
