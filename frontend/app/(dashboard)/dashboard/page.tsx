"use client";

import { CalendarClock, FileText, Package, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendsChart } from "@/components/dashboard/trends-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { OnboardingCTA } from "@/components/dashboard/onboarding-cta";
import {
  StatCardShimmer,
  TableShimmer,
} from "@/components/shared/loading-shimmer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";
import { useReports } from "@/hooks/use-reports";
import { useSchedules } from "@/hooks/use-schedules";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fmtRelative } from "@/lib/format";
import { ROUTES } from "@/lib/config";
import { MAX_PAGE_SIZE } from "@/types/pagination";
import * as React from "react";

// "Recent activity" is intentionally a single, dedicated request — 5
// newest reports — rather than the first page of /reports. Keeps the
// dashboard cache independent of the user's last position on the
// reports list page.
const RECENT_ACTIVITY_LIMIT = 5;

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  // Stat counts only need ``.total`` from each query. We over-fetch
  // products here (up to MAX_PAGE_SIZE) so the Recent Activity rows can
  // resolve productId → product name without an extra round-trip.
  const { data: productsPage, isLoading: pLoading } = useProducts({
    limit: MAX_PAGE_SIZE,
  });
  const { data: schedulesPage, isLoading: sLoading } = useSchedules({
    limit: 1,
  });
  const { data: recentReports, isLoading: rLoading } = useReports({
    limit: RECENT_ACTIVITY_LIMIT,
  });

  const productCount = productsPage?.total ?? 0;
  const scheduleCount = schedulesPage?.total ?? 0;
  const reportCount = recentReports?.total ?? 0;
  const reports = recentReports?.items ?? [];
  const lastReport = reports[0];

  const productNameById = React.useMemo(
    () =>
      Object.fromEntries(
        (productsPage?.items ?? []).map((p) => [p.id, p.productName]),
      ),
    [productsPage],
  );

  const isEmpty = !pLoading && productCount === 0;
  const loading = pLoading || rLoading || sLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi${user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋`}
        description="Your Review Pulse AI workspace at a glance."
        actions={
          <Button asChild>
            <Link href={ROUTES.products}>
              <Package /> Manage products
            </Link>
          </Button>
        }
      />

      {isEmpty ? (
        <OnboardingCTA />
      ) : (
        <>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardShimmer key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Products"
                value={productCount}
                icon={Package}
                hint={`${productCount} tracked`}
              />
              <StatCard
                label="Reports generated"
                value={reportCount}
                icon={FileText}
                delta={{ value: "+12%", direction: "up" }}
                hint="vs. last month"
              />
              <StatCard
                label="Schedules"
                value={scheduleCount}
                icon={CalendarClock}
                hint={`${scheduleCount === 1 ? "1 cadence" : `${scheduleCount} cadences`} configured`}
              />
              <StatCard
                label="Last generated"
                value={lastReport ? fmtRelative(lastReport.generatedAt) : "—"}
                icon={Sparkles}
                hint={lastReport?.reportTitle ?? "No runs yet"}
              />
            </div>
          )}

          {/*
            ``min-w-0`` on the grid cells is load-bearing: grid items
            default to ``min-width: auto`` which makes a cell expand to
            its child's intrinsic min-content width. Recharts' SVG has
            a wider intrinsic min-width than a 360px phone viewport, so
            without this the chart pushes the whole page wider than the
            screen and forces horizontal scrolling. Once ``min-w-0`` lets
            the cell shrink below its content, ``ResponsiveContainer``
            measures the constrained width and the SVG sizes correctly.
          */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              {loading ? <TableShimmer rows={5} /> : <TrendsChart />}
            </div>
            <div className="min-w-0">
              {loading ? (
                <TableShimmer rows={4} />
              ) : reports.length > 0 ? (
                <RecentActivity
                  reports={reports}
                  productNameById={productNameById}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent activity</CardTitle>
                    <CardDescription>Runs will show up here.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Trigger a manual run from any product to generate your
                      first report.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
