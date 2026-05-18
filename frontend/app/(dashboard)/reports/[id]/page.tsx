"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Mail, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { ReportReader } from "@/components/reports/report-reader";
import { StatusBadge } from "@/components/reports/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/hooks/use-reports";
import { useProduct } from "@/hooks/use-products";
import { fmtDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/config";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: report, isLoading, isError, refetch } = useReport(params.id);
  const { data: product } = useProduct(report?.productId ?? "");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !report) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const emailMode = report.deliveryMeta.email?.mode;
  const emailDelivered = report.deliveryMeta.email?.status === "success";

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.push(ROUTES.reports)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to reports
      </button>

      <PageHeader
        title={report.reportTitle}
        description={`Generated ${fmtDateTime(report.generatedAt)}`}
        actions={
          report.googleDocUrl && (
            <Button asChild>
              <a href={report.googleDocUrl} target="_blank" rel="noreferrer">
                <ExternalLink /> Open in Google Docs
              </a>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Status">
          <StatusBadge status={report.status} />
        </Stat>
        <Stat label="Reviews analysed" value={report.reviewCount.toString()} icon={MessagesSquare} />
        <Stat label="Doc">
          <Badge variant={report.googleDocUrl ? "success" : "muted"}>
            <FileText className="mr-1 size-3" />
            {report.googleDocUrl ? "Delivered" : "—"}
          </Badge>
        </Stat>
        <Stat label="Email">
          <Badge variant={emailDelivered ? "success" : emailMode ? "warning" : "muted"}>
            <Mail className="mr-1 size-3" />
            {emailMode === "draft"
              ? "Drafted"
              : emailDelivered
                ? "Sent"
                : report.deliveryMeta.email_error
                  ? "Failed"
                  : "—"}
          </Badge>
        </Stat>
      </div>

      {report.error && (
        <Card>
          <CardContent className="border-l-4 border-destructive bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium">Pipeline error</p>
            <p className="mt-1 font-mono text-xs">{report.error}</p>
          </CardContent>
        </Card>
      )}

      <ReportReader summary={report.summary} />

      {product && (
        <div className="rounded-xl border bg-card/40 p-4 text-sm">
          <span className="text-muted-foreground">Product:</span>{" "}
          <Link
            href={ROUTES.product(product.id)}
            className="font-medium underline-offset-4 hover:underline"
          >
            {product.productName}
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  children,
}: {
  label: string;
  value?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {value ? <p className="text-xl font-semibold">{value}</p> : children}
        </div>
      </CardContent>
    </Card>
  );
}
