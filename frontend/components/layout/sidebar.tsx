"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { BRAND, ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Products", href: ROUTES.products, icon: Package },
  { label: "Schedules", href: ROUTES.schedules, icon: CalendarClock },
  { label: "Reports", href: ROUTES.reports, icon: FileText },
  { label: "Settings", href: ROUTES.settings, icon: Settings },
];

/**
 * Two-mode nav:
 *
 * * ``md+``: persistent sidebar rail (existing behaviour, collapsible).
 * * ``< md``: off-canvas drawer triggered from the topbar hamburger.
 *
 * The drawer auto-closes on route change so navigating to another page
 * doesn't leave it covering the content underneath.
 */
export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const mobileOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNav = useUIStore((s) => s.setMobileNav);

  // Close the mobile drawer whenever the route changes (clicking a nav
  // item or back/forward).
  React.useEffect(() => {
    setMobileNav(false);
  }, [pathname, setMobileNav]);

  // Lock body scroll while the drawer is open — otherwise the page
  // behind the overlay scrolls under the user's finger.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  // Close on Escape.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileNav]);

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-card/40 backdrop-blur-xl md:flex",
          collapsed ? "w-[68px]" : "w-60",
          "transition-[width] duration-200",
        )}
      >
        <Brand collapsed={collapsed} />
        <NavList pathname={pathname} collapsed={collapsed} />
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "m-2 inline-flex h-8 items-center justify-center gap-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed ? "w-12" : "self-end px-3",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" /> Collapse
            </>
          )}
        </button>
      </aside>

      {/* Mobile drawer + overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Primary navigation"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-card shadow-2xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
                <Sparkles className="size-4" />
              </span>
              <span className="text-sm font-semibold tracking-tight">
                {BRAND.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileNav(false)}
              aria-label="Close navigation"
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <NavList pathname={pathname} collapsed={false} />
        </aside>
      </div>
    </>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
        <Sparkles className="size-4" />
      </div>
      {!collapsed && (
        <span className="text-sm font-semibold tracking-tight">{BRAND.name}</span>
      )}
    </div>
  );
}

function NavList({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== ROUTES.dashboard && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // 44px min-height for comfortable touch targets on mobile.
              "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
