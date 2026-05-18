import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Workflow } from "@/components/landing/workflow";
import { CTA } from "@/components/landing/cta";
import { BRAND } from "@/lib/config";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <CTA />
      </main>
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {BRAND.name}. Crafted for product teams.</p>
          <div className="flex items-center gap-4">
            <a className="hover:text-foreground" href="#features">Features</a>
            <a className="hover:text-foreground" href="#workflow">How it works</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
