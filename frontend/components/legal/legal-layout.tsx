import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BRAND, CONTACT_US, ROUTES } from "@/lib/config";
import { ThemeToggle } from "@/components/theme-toggle";

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-14 items-center">
          <Link href={ROUTES.landing} className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {BRAND.name}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
        <div className="mb-10 border-b border-border/60 pb-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {BRAND.name} · Legal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          ) : null}
          <p className="mt-6 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Last Updated:</span>{" "}
            {lastUpdated}
          </p>
        </div>

        <article
          className="prose-legal text-[15px] leading-7 text-foreground/90
            [&_h2]:mt-12 [&_h2]:scroll-mt-20 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground sm:[&_h2]:text-2xl
            [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground sm:[&_h3]:text-lg
            [&_p]:mt-4
            [&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:marker:text-muted-foreground
            [&_ol]:mt-4 [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:marker:text-muted-foreground
            [&_li]:pl-1
            [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-foreground/30 hover:[&_a]:decoration-foreground
            [&_strong]:font-semibold [&_strong]:text-foreground"
        >
          {children}
        </article>

        <div className="mt-16 border-t border-border/60 pt-8 text-sm text-muted-foreground">
          <p>
            Questions about this page? Contact us at{" "}
            <a
              href={`mailto:${CONTACT_US.email.support}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {CONTACT_US.email.support}
            </a>
            .
          </p>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
        <nav className="flex items-center gap-5">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link
            href="/privacy-policy"
            className="transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="transition-colors hover:text-foreground"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
