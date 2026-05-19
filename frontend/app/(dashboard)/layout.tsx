import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGate } from "@/components/layout/auth-gate";

export const metadata: Metadata = { title: "Workspace" };

// Auth-gated routes depend on the server's session cookie, which doesn't
// exist at build time. Prerendering them yields nothing useful (just a
// loading spinner) and forces every leaf page to be SSR'd during build —
// which can OOM on Vercel's cloud build container even when local builds
// succeed. Mark the whole segment dynamic so it renders only at request
// time.
export const dynamic = "force-dynamic";

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
