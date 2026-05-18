import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {/* Slightly smaller title on phones so a long product name + back
            action don't fight for vertical space. */}
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        // ``flex-wrap`` covers the (rare) case where actions overflow
        // the narrow viewport; ``shrink-0`` is dropped because at very
        // small widths we'd rather let the button wrap than clip.
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
