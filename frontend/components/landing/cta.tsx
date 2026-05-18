"use client";

import { GoogleLoginButton } from "@/components/landing/google-login-button";
import { BRAND } from "@/lib/config";

export function CTA() {
  return (
    <section id="cta" className="border-b">
      <div className="container py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl border bg-card/40 px-6 py-16 text-center md:px-12">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative">
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Stop scrolling reviews. Start shipping fixes.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
              {BRAND.name} replaces the weekly "what are users saying?"
              meeting with a doc your leadership already reads.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GoogleLoginButton />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free during preview · Cancel any time
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
