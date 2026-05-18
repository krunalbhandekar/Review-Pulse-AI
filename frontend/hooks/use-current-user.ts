"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/services/auth";

export const CURRENT_USER_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
    staleTime: 60_000,
  });
}
