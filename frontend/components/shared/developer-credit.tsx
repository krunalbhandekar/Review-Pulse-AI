import { Linkedin, Mail } from "lucide-react";
import { DEVELOPER } from "@/lib/config";
import { cn } from "@/lib/utils";

export function DeveloperCredit({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>
        Developed by <span className="font-medium text-foreground">{DEVELOPER.name}</span>
      </span>
      <a
        href={`mailto:${DEVELOPER.email}`}
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Mail className="size-3" />
        {DEVELOPER.email}
      </a>
      <a
        href={DEVELOPER.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Linkedin className="size-3" />
        LinkedIn
      </a>
    </div>
  );
}
