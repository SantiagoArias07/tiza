import type { PersistedState } from "./types";

/**
 * Base URL of the Tiza backend. Set NEXT_PUBLIC_API_URL in Vercel to your
 * Render URL (e.g. https://tiza-server.onrender.com). Falls back to localhost
 * for development.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

/** Fetch persisted state from the backend. Returns null if unreachable. */
export async function fetchState(
  groupId: string
): Promise<Partial<PersistedState> | null> {
  try {
    const res = await fetch(`${API_URL}/api/group/${groupId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Partial<PersistedState>;
  } catch {
    return null;
  }
}

/** Persist state to the backend. Returns true on success. */
export async function saveState(
  groupId: string,
  state: PersistedState
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/group/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch {
    return false;
  }
}
