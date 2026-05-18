"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { GoogleLoginButton } from "@/components/landing/google-login-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BRAND, ROUTES } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  React.useEffect(() => {
    if (!isLoading && user) router.replace(ROUTES.dashboard);
  }, [user, isLoading, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full rounded-2xl border bg-card/70 p-8 shadow-xl backdrop-blur-xl"
        >
          <Link href={ROUTES.landing} className="mb-6 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {BRAND.name}
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with the Google account that owns your Doc + Gmail.
          </p>

          <div className="mt-8">
            <GoogleLoginButton className="w-full" />
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            By continuing you agree to authorise {BRAND.name} to read your
            Google profile and write to the Docs / Gmail you connect.
          </p>
        </motion.div>

        <p className="mt-6 text-xs text-muted-foreground">
          New here?{" "}
          <Link className="underline-offset-4 hover:underline" href={ROUTES.landing}>
            Take the tour
          </Link>
        </p>
      </main>
    </div>
  );
}
