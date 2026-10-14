"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Cold-start gate for the Render free tier.
 *
 * The server sleeps when idle and takes up to a minute to wake. We ping
 * its /health and block the UI with a "starting up" overlay if it's slow.
 * MCP is never awaited here: the browser doesn't call it, and the server
 * wakes it on startup and waits for it before delivering a report. We
 * still fire one /health/services call to nudge it awake early.
 */

type Phase = "checking" | "server" | "ready" | "unreachable";

// Show the banner only if a check takes longer than this — a warm
// server answers well under it, so users never see a flash.
const SLOW_MS = 2_500;
const POLL_MS = 4_000;
// Render cold starts are ~30-60s; give up and show an error after this.
const GIVE_UP_MS = 150_000;

async function getJson(path: string, timeoutMs: number): Promise<unknown | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ServiceGateValue {
  /**
   * Re-check the server before an action that hits it directly (e.g. a
   * full-page redirect to Google OAuth). Shows the overlay while it wakes;
   * resolves ``true`` once it's up, ``false`` if it's unreachable.
   */
  ensureServer: () => Promise<boolean>;
}

const ServiceGateContext = React.createContext<ServiceGateValue>({
  ensureServer: () => Promise.resolve(true),
});

export const useServiceGate = () => React.useContext(ServiceGateContext);

function useServiceStatus() {
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    const expired = () => Date.now() - startedAt > GIVE_UP_MS;
    const set = (p: Phase) => !cancelled && setPhase(p);

    const slowTimer = setTimeout(() => set("server"), SLOW_MS);

    (async () => {
      // 1. Server. A sleeping Render service holds the request open while
      //    it boots, so one long request usually covers the whole wake-up.
      while (!cancelled && !(await getJson("/health", 60_000))) {
        if (expired()) return set("unreachable");
        await sleep(POLL_MS);
      }
      clearTimeout(slowTimer);
      set("ready");

      // 2. Fire-and-forget: probing MCP via the server wakes it.
      void getJson("/health/services", 15_000);
    })();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [attempt]);

  const retry = React.useCallback(() => {
    setPhase("checking");
    setAttempt((n) => n + 1);
  }, []);

  return { phase, retry };
}

const COPY: Record<"server" | "unreachable", { title: string; body: string }> = {
  server: {
    title: "Starting up the server…",
    body: "Our server sleeps when idle and can take up to a minute to wake. The app will unlock automatically — thanks for your patience.",
  },
  unreachable: {
    title: "We can't reach the server right now",
    body: "It may still be starting. Please try again in a minute.",
  },
};

/**
 * Wraps the app. While a service is waking up (or unreachable) the page
 * is made ``inert`` and covered by a modal, so users can't trigger calls
 * — e.g. "Continue with Google" — that would hit a sleeping server.
 */
export function ServiceGate({ children }: { children: React.ReactNode }) {
  const { phase, retry } = useServiceStatus();
  const waiters = React.useRef<((ok: boolean) => void)[]>([]);

  React.useEffect(() => {
    if (phase !== "ready" && phase !== "unreachable") return;
    const pending = waiters.current;
    waiters.current = [];
    pending.forEach((resolve) => resolve(phase === "ready"));
  }, [phase]);

  const ensureServer = React.useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        waiters.current.push(resolve);
        retry();
      }),
    [retry],
  );
  const value = React.useMemo(() => ({ ensureServer }), [ensureServer]);
  const blocked = phase !== "ready";
  // "checking" blocks silently: a warm server answers in milliseconds,
  // so the overlay only appears once a check is actually slow.
  const visible = phase === "server" || phase === "unreachable";

  return (
    <ServiceGateContext.Provider value={value}>
      <div className="contents" inert={blocked}>
        {children}
      </div>
      {visible && <StatusOverlay phase={phase} onRetry={retry} />}
    </ServiceGateContext.Provider>
  );
}

function StatusOverlay({
  phase,
  onRetry,
}: {
  phase: "server" | "unreachable";
  onRetry: () => void;
}) {
  const copy = COPY[phase];
  const isError = phase === "unreachable";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-live="polite"
        aria-labelledby="service-status-title"
        className={cn(
          "flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-xl",
          isError && "border-destructive/40",
        )}
      >
        {isError ? (
          <AlertTriangle className="size-8 text-destructive" />
        ) : (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        )}
        <div>
          <p id="service-status-title" className="text-base font-semibold">
            {copy.title}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{copy.body}</p>
        </div>
        {isError && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border px-4 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
