import { API_URL, ROUTES } from "@/lib/config";
import { api } from "@/services/api";
import type { User } from "@/types/auth";

export async function getCurrentUser(signal?: AbortSignal): Promise<User | null> {
  try {
    return await api<User>("/auth/me", { signal });
  } catch (err) {
    if ((err as { status?: number }).status === 401) return null;
    throw err;
  }
}

export async function logout(): Promise<void> {
  await api<void>("/auth/logout", { method: "POST" });
}

/**
 * Redirect the browser to the FastAPI server's Google OAuth start route.
 * The server eventually redirects back to POST_LOGIN_REDIRECT (set in
 * the server's .env) which should point at our `/dashboard`.
 */
export function startGoogleLogin(): void {
  if (typeof window === "undefined") return;
  window.location.href = `${API_URL}/auth/google/login`;
}

export const AUTH_REDIRECTS = {
  loggedIn: ROUTES.dashboard,
  loggedOut: ROUTES.login,
} as const;
