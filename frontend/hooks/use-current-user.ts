"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/services/auth";

export const CURRENT_USER_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: ({ signal }) => getCurrentUser(signal),
    // One retry absorbs a Render free-tier cold-start blip on the very
    // first /auth/me after OAuth; 401s are already swallowed inside
    // getCurrentUser so they don't waste a retry.
    retry: 1,
    retryDelay: 500,
    staleTime: 60_000,
    // Refetch when the browser tab regains focus so returning from the
    // Google consent tab re-checks auth instead of trusting a stale null.
    refetchOnWindowFocus: true,
  });
}
