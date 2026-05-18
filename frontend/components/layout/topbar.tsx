"use client";

import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/store/ui-store";

// Gutters intentionally match the dashboard layout's <main> padding
// (px-4 sm:px-6 lg:px-8). Mismatched gutters between topbar and page
// content make the right-aligned topbar icons line up with a different
// vertical edge than the cards below — which reads as the cards being
// "shifted right" relative to the chrome.
export function Topbar() {
  const setMobileNav = useUIStore((s) => s.setMobileNav);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-xl sm:gap-3 sm:px-6 lg:px-8">
      {/* Hamburger — visible only when the desktop rail is hidden. */}
      <button
        type="button"
        onClick={() => setMobileNav(true)}
        aria-label="Open navigation"
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/*
        Global search is intentionally desktop-only for now: it's a
        placeholder input not wired to any backend, and on a 360px
        viewport it would crowd the hamburger + actions. The per-page
        search inputs (products list, reports list) handle real search.
      */}
      <div className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products, reports…"
          className="h-9 pl-9"
          aria-label="Global search"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
