"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Optional unit label, e.g. "report" → "12 reports". */
  unit?: string;
  onPageChange: (page: number) => void;
  /** When true, disables both buttons (e.g. while refetching). */
  busy?: boolean;
}

/**
 * Lightweight Prev / page X of Y / Next pager. Only renders when there
 * is more than one page to navigate; pages with a single page stay
 * uncluttered.
 */
export function Pagination({
  page,
  totalPages,
  total,
  unit,
  onPageChange,
  busy = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const atFirst = page <= 1;
  const atLast = page >= totalPages;
  const label = unit ? `${total} ${unit}${total === 1 ? "" : "s"}` : `${total}`;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages} · {label}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={atFirst || busy}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={atLast || busy}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
