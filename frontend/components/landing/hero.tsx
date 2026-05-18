"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleLoginButton } from "@/components/landing/google-login-button";
import { BRAND } from "@/lib/config";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="container relative py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5" />
            <span>New · Multi-product workspaces</span>
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            {BRAND.tagline}.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            {BRAND.name} turns raw Play Store and App Store reviews into a
            weekly leadership digest — themes, quotes, sentiment, actions —
            delivered straight to your Google Doc and inbox.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GoogleLoginButton />
            <Button variant="ghost" size="lg" asChild>
              <a href="#workflow">
                See how it works <ArrowRight />
              </a>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            No credit card required · Connects with your own Google account
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="rounded-2xl border bg-card/60 p-2 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
            <div className="overflow-hidden rounded-xl border bg-background">
              <div className="flex items-center gap-1.5 border-b bg-muted/30 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-warning/70" />
                <span className="size-2.5 rounded-full bg-success/70" />
                <span className="ml-3 text-xs text-muted-foreground">
                  {BRAND.name.toLowerCase()}.app / dashboard
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
                {[
                  { label: "Reviews this week", value: "248", delta: "+12%" },
                  { label: "Net sentiment", value: "+72", delta: "+4 pts" },
                  { label: "Active products", value: "3", delta: "Stable" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border bg-card p-4 text-left"
                  >
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {kpi.value}
                    </p>
                    <p className="mt-1 text-xs text-success">{kpi.delta}</p>
                  </div>
                ))}
              </div>
              <div className="border-t bg-muted/20 p-6 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Top theme this week
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Login + 2FA friction</span> —
                  surfacing as the #1 complaint, especially on Android 14.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
