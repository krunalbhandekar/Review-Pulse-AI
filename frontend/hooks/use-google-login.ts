"use client";

import * as React from "react";
import { useServiceGate } from "@/components/shared/service-status";
import { startGoogleLogin } from "@/services/auth";

/**
 * "Continue with Google" handler that first makes sure the server is up.
 * The OAuth start is a full-page redirect to the server, so hitting it
 * while Render has the server asleep would land on a browser error page.
 */
export function useGoogleLogin() {
  const { ensureServer } = useServiceGate();
  const [pending, setPending] = React.useState(false);

  const login = React.useCallback(async () => {
    setPending(true);
    try {
      if (await ensureServer()) startGoogleLogin();
    } finally {
      setPending(false);
    }
  }, [ensureServer]);

  return { login, pending };
}
