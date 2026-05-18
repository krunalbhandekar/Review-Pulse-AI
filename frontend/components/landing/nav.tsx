"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND, ROUTES } from "@/lib/config";
import { startGoogleLogin } from "@/services/auth";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-14 items-center">
        <Link href={ROUTES.landing} className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">{BRAND.name}</span>
        </Link>
        <nav className="ml-8 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#workflow" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#cta" className="transition-colors hover:text-foreground">Get started</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" variant="ghost" asChild>
            <Link href={ROUTES.login}>Sign in</Link>
          </Button>
          <Button size="sm" onClick={startGoogleLogin}>
            Start free
          </Button>
        </div>
      </div>
    </header>
  );
}
