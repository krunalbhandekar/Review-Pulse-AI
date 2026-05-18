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

export function RecentActivity({ reports }: { reports: Report[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest report runs across your products</CardDescription>
        </div>
        <Link
          href={ROUTES.reports}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          View all <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.slice(0, 5).map((r) => (
          <Link
            key={r.id}
            href={ROUTES.report(r.id)}
            className="group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-accent/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.reportTitle}</p>
              <p className="text-xs text-muted-foreground">
                {fmtRelative(r.generatedAt)} · {r.reviewCount} reviews
              </p>
            </div>
            <StatusBadge status={r.status} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
