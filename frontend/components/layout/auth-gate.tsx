"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES } from "@/lib/config";

/**
 * Client-side route guard for protected pages.
 *
 * We rely on the FastAPI server's session cookie to determine auth state;
 * `GET /auth/me` returns the user when valid and 401 otherwise. We don't
 * try to gate at the edge — middleware can't read HttpOnly cookies set
 * for a *different* origin (the FastAPI server) anyway.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace(ROUTES.login);
    }
  }, [user, isLoading, router]);

  if (isLoading || (!user && !isError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex size-7 animate-pulse items-center justify-center rounded-md bg-foreground text-background">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm">Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
