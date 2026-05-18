import { API_URL } from "@/lib/config";

/**
 * Typed fetch wrapper.
 *
 * - `credentials: "include"` so the session cookie set by the FastAPI
 *   server flows on every call.
 * - Throws `ApiError` for any non-2xx so React Query treats them as errors.
 * - JSON in, JSON out; pass `body` as a plain object.
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, opts?: { code?: string; payload?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = opts?.code;
    this.payload = opts?.payload;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  const init: RequestInit = {
    method: opts.method ?? "GET",
    credentials: "include",
    signal: opts.signal,
    headers: { Accept: "application/json" },
  };
  if (opts.body !== undefined) {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(opts.body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network error",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      isJson && data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    const code =
      isJson && data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : undefined;
    throw new ApiError(message, response.status, { code, payload: data });
  }

  return data as T;
}
