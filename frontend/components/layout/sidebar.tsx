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

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-card/40 backdrop-blur-xl md:flex",
        collapsed ? "w-[68px]" : "w-60",
        "transition-[width] duration-200",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
          <Sparkles className="size-4" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">{BRAND.name}</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
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
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={toggle}
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
  );
}
