"use client";

import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/reports/status-badge";
import { fmtRelative } from "@/lib/format";
import { ROUTES } from "@/lib/config";
import type { Report } from "@/types/report";

interface RecentActivityProps {
  reports: Report[];
  /** Optional product-id → name map; renders product name under each row. */
  productNameById?: Record<string, string>;
}

export function RecentActivity({ reports, productNameById }: RecentActivityProps) {
  return (
    <Card>
      {/*
        Mobile: tighter card padding so the 360px viewport leaves more
        room for content. The header row uses ``min-w-0`` + ``truncate``
        on the title/description so a long product name in the
        description can't push the "View all" link off-screen.
      */}
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 sm:p-6">
        <div className="min-w-0">
          <CardTitle>Recent activity</CardTitle>
          <CardDescription className="truncate">
            Latest 5 report runs across your products
          </CardDescription>
        </div>
        <Link
          href={ROUTES.reports}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          View all <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5 p-3 pt-0 sm:space-y-2 sm:p-4 sm:pt-0">
        {reports.map((r) => {
          const productName = productNameById?.[r.productId];
          return (
            <Link
              key={r.id}
              href={ROUTES.report(r.id)}
              // gap-3 on mobile, gap-4 from sm; min-h-12 keeps the tap
              // target comfortable on phones (~48px).
              className="group flex min-h-12 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50 sm:gap-4 sm:p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.reportTitle}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {productName ? `${productName} · ` : ""}
                  {fmtRelative(r.generatedAt)} · {r.reviewCount} reviews
                </p>
              </div>
              {/*
                ``shrink-0`` so the badge keeps its readable width and
                the flex truncation budget lands on the text column
                instead of the badge.
              */}
              <div className="shrink-0">
                <StatusBadge status={r.status} />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
