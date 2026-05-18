"use client";

import { CalendarClock, FileText, Package, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendsChart } from "@/components/dashboard/trends-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { OnboardingCTA } from "@/components/dashboard/onboarding-cta";
import { StatCardShimmer, TableShimmer } from "@/components/shared/loading-shimmer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";
import { useReports } from "@/hooks/use-reports";
import { useSchedules } from "@/hooks/use-schedules";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fmtRelative } from "@/lib/format";
import { ROUTES } from "@/lib/config";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: products = [], isLoading: pLoading } = useProducts();
  const { data: reports = [], isLoading: rLoading } = useReports();
  const { data: schedules = [], isLoading: sLoading } = useSchedules();

  const activeSchedules = schedules.filter((s) => s.enabled);
  const lastReport = reports[0];

  const isEmpty = !pLoading && products.length === 0;
  const loading = pLoading || rLoading || sLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi${user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋`}
        description="Your review intelligence at a glance."
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
                value={products.length}
                icon={Package}
                hint={`${products.length} tracked`}
              />
              <StatCard
                label="Reports generated"
                value={reports.length}
                icon={FileText}
                delta={{ value: "+12%", direction: "up" }}
                hint="vs. last month"
              />
              <StatCard
                label="Active schedules"
                value={activeSchedules.length}
                icon={CalendarClock}
                hint={`${schedules.length - activeSchedules.length} paused`}
              />
              <StatCard
                label="Last generated"
                value={
                  lastReport ? fmtRelative(lastReport.generatedAt) : "—"
                }
                icon={Sparkles}
                hint={lastReport?.reportTitle ?? "No runs yet"}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {loading ? <TableShimmer rows={5} /> : <TrendsChart />}
            </div>
            <div>
              {loading ? (
                <TableShimmer rows={4} />
              ) : reports.length > 0 ? (
                <RecentActivity reports={reports} />
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
