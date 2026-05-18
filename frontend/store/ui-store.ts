"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  /** Desktop rail collapsed/expanded — persisted across sessions. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebar: (collapsed: boolean) => void;
  /**
   * Mobile drawer open/closed — *not* persisted; we never want the
   * drawer to be remembered as "open" across page loads.
   */
  mobileNavOpen: boolean;
  setMobileNav: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (sidebarCollapsed) => set({ sidebarCollapsed }),
      mobileNavOpen: false,
      setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: "pulse-ui",
      // Persist only the desktop preference. ``mobileNavOpen`` is
      // session-only — leaking it via localStorage would re-open the
      // drawer on next page load.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
