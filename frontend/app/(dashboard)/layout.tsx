import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGate } from "@/components/layout/auth-gate";

export const metadata: Metadata = { title: "Workspace" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          {/*
            Horizontal gutters mirror the Topbar so the chrome and the
            page content share the same vertical edges at every
            breakpoint. Vertical padding scales independently.
          */}
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
