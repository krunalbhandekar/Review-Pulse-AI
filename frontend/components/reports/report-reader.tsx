"use client";

import * as React from "react";
import { Quote, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight renderer for the AI-generated digest.
 *
 * The summariser emits markdown with H2 sections (Top themes, Notable
 * quotes, Recommended actions, Overall sentiment). Rather than pulling
 * in a full markdown library we parse the few structures we need into
 * styled cards that match the "premium analytics report" aesthetic.
 */

type Section = {
  heading: string;
  lines: string[];
};

function parseSections(summary: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const raw of summary.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      if (current) sections.push(current);
      current = { heading: h[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else if (line.trim()) {
      current = { heading: "Executive summary", lines: [line] };
    }
  }
  if (current) sections.push(current);
  return sections;
}

function inlineMarkdown(text: string): React.ReactNode {
  // Replace **bold** and *italic* lazily; this avoids pulling in a parser.
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={key++} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function categorize(heading: string): "themes" | "quotes" | "actions" | "summary" {
  const h = heading.toLowerCase();
  if (h.includes("quote")) return "quotes";
  if (h.includes("action")) return "actions";
  if (h.includes("theme")) return "themes";
  return "summary";
}

export function ReportReader({ summary }: { summary: string }) {
  const sections = React.useMemo(() => parseSections(summary), [summary]);

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const kind = categorize(section.heading);
        return (
          <section
            key={section.heading}
            className={cn(
              "rounded-2xl border bg-card p-6",
              kind === "summary" && "bg-gradient-to-br from-card to-accent/20",
            )}
          >
            <header className="mb-4 flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md",
                  kind === "summary" && "bg-foreground text-background",
                  kind === "themes" && "bg-accent text-accent-foreground",
                  kind === "actions" && "bg-success/15 text-success",
                  kind === "quotes" && "bg-warning/15 text-warning",
                )}
              >
                {kind === "quotes" ? (
                  <Quote className="size-3.5" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                {section.heading}
              </h2>
            </header>
            <Body section={section} kind={kind} />
          </section>
        );
      })}
    </div>
  );
}

function Body({ section, kind }: { section: Section; kind: ReturnType<typeof categorize> }) {
  const items: string[] = [];
  const prose: string[] = [];

  for (const line of section.lines) {
    if (/^\s*[-*]\s+/.test(line)) {
      items.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (/^\s*\d+\.\s+/.test(line)) {
      items.push(line.replace(/^\s*\d+\.\s+/, ""));
    } else if (/^>\s?/.test(line)) {
      items.push(line.replace(/^>\s?/, ""));
    } else if (line.trim()) {
      prose.push(line);
    }
  }

  if (kind === "quotes" && items.length) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((q, i) => (
          <blockquote
            key={i}
            className="rounded-lg border bg-background p-4 text-sm italic text-muted-foreground"
          >
            <Quote className="mb-2 size-4 text-warning" />
            {inlineMarkdown(q)}
          </blockquote>
        ))}
      </div>
    );
  }

  if (items.length) {
    return (
      <ul
        className={cn(
          "space-y-2 text-sm",
          kind === "actions" && "list-decimal pl-5 marker:text-success marker:font-semibold",
          kind !== "actions" && "list-none",
        )}
      >
        {items.map((it, i) => (
          <li
            key={i}
            className={cn(
              "flex gap-3",
              kind === "actions" && "list-item pl-0",
            )}
          >
            {kind !== "actions" && (
              <span
                className={cn(
                  "mt-1.5 inline-block size-1.5 shrink-0 rounded-full",
                  kind === "themes" && "bg-foreground",
                  kind === "summary" && "bg-muted-foreground",
                )}
              />
            )}
            <span className="leading-relaxed">{inlineMarkdown(it)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
      {prose.map((p, i) => (
        <p key={i}>{inlineMarkdown(p)}</p>
      ))}
    </div>
  );
}
