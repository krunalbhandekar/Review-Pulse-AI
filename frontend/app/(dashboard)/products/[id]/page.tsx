"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  FileText,
  Mail,
  Pencil,
  PlayCircle,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { StatusBadge } from "@/components/reports/status-badge";
import { useProduct } from "@/hooks/use-products";
import { useReports, useRunReport } from "@/hooks/use-reports";
import { useSchedules } from "@/hooks/use-schedules";
import { useToast } from "@/hooks/use-toast";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { ROUTES } from "@/lib/config";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, isError, refetch } = useProduct(params.id);
  // Detail page only needs the first page of each — schedules per product
  // is tiny (usually 1), and reports show the most-recent slice.
  const { data: schedulesPage } = useSchedules({ productId: params.id });
  const schedules = schedulesPage?.items ?? [];
  const { data: reportsPage } = useReports({ productId: params.id });
  const reports = reportsPage?.items ?? [];
  const run = useRunReport();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const schedule = schedules[0];
  const lastReport = reports[0];

  async function runNow() {
    try {
      await run.mutateAsync({ productId: product!.id });
      toast({ title: "Run queued", description: product!.productName });
    } catch (err) {
      toast({
        title: "Couldn't queue run",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.push(ROUTES.products)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to products
      </button>

      <PageHeader
        title={product.productName}
        description={`Last updated ${fmtRelative(product.updatedAt)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button onClick={runNow} disabled={run.isPending}>
              <PlayCircle /> Run now
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>How this product is tracked and delivered.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <InfoRow icon={<Smartphone className="size-4" />} label="Play Store ID">
              {product.playstoreAppId ?? <Muted>Not set</Muted>}
            </InfoRow>
            <InfoRow icon={<Smartphone className="size-4" />} label="App Store ID">
              {product.appstoreAppId ?? <Muted>Not set</Muted>}
            </InfoRow>
            <InfoRow icon={<ExternalLink className="size-4" />} label="Google Doc">
              {product.googleDocId ? (
                <a
                  href={`https://docs.google.com/document/d/${product.googleDocId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  Open <ExternalLink className="size-3" />
                </a>
              ) : (
                <Muted>Auto-create on first run</Muted>
              )}
            </InfoRow>
            <InfoRow icon={<Mail className="size-4" />} label="Email to">
              <span className="flex items-center gap-2">
                {product.emailTo ?? <Muted>Not set</Muted>}
                {product.emailTo && (
                  <Badge variant={product.emailMode === "send" ? "success" : "warning"}>
                    {product.emailMode === "send" ? "Send" : "Draft"}
                  </Badge>
                )}
              </span>
            </InfoRow>
            <InfoRow icon={<CalendarClock className="size-4" />} label="Lookback">
              {product.lookbackWeeks} weeks
            </InfoRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>When the next pulse will run.</CardDescription>
          </CardHeader>
          <CardContent>
            {schedule ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="capitalize">{schedule.frequency}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next run</span>
                  <span>{fmtDateTime(schedule.nextRunAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last run</span>
                  <span>{fmtRelative(schedule.lastRunAt)}</span>
                </div>
                <Separator />
                <Badge variant={schedule.enabled ? "success" : "muted"}>
                  {schedule.enabled ? "Active" : "Paused"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No schedule yet.{" "}
                <Link
                  href={ROUTES.schedules}
                  className="underline-offset-4 hover:underline"
                >
                  Create one
                </Link>{" "}
                to automate this product.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Report history</CardTitle>
            <CardDescription>Every digest generated for this product.</CardDescription>
          </div>
          {lastReport?.googleDocUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={lastReport.googleDocUrl} target="_blank" rel="noreferrer">
                <ExternalLink /> Open latest doc
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports yet"
              description="Trigger a run or wait for the next scheduled cycle."
              action={
                <Button onClick={runNow} disabled={run.isPending}>
                  <PlayCircle /> Run now
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <Link
                  key={r.id}
                  href={ROUTES.report(r.id)}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.reportTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(r.generatedAt)} · {r.reviewCount} reviews
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card/40 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-md bg-muted">
          {icon}
        </span>
        {label}
      </div>
      <div className="truncate text-sm">{children}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
