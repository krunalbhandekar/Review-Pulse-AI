"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, FileText, Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableShimmer } from "@/components/shared/loading-shimmer";
import { Pagination } from "@/components/shared/pagination";
import { ReportFilters } from "@/components/reports/report-filters";
import { StatusBadge } from "@/components/reports/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProducts } from "@/hooks/use-products";
import { useReports } from "@/hooks/use-reports";
import { fmtDateTime, fmtCount } from "@/lib/format";
import { ROUTES } from "@/lib/config";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/types/pagination";
import type { Report, ReportStatus } from "@/types/report";

export default function ReportsPage() {
  const [page, setPage] = React.useState(1);
  const [productId, setProductId] = React.useState<string | "all">("all");

  // Reports are paginated server-side by productId. Status + free-text
  // search remain client-side filters over the current page; they reset
  // the page back to 1 when changed so the user always starts at the top
  // of a filtered view.
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useReports({
    page,
    limit: DEFAULT_PAGE_SIZE,
    productId: productId === "all" ? undefined : productId,
  });
  const reports = data?.items ?? [];

  const { data: productsPage } = useProducts({ limit: MAX_PAGE_SIZE });
  const products = productsPage?.items ?? [];

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<ReportStatus | "all">("all");

  const productNameById = React.useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.productName])),
    [products],
  );

  // Client-side narrowing on top of the current page.
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (q && !r.reportTitle.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [reports, search, status]);

  React.useEffect(() => {
    setPage(1);
  }, [search, status, productId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Every weekly digest your workspace has generated."
      />

      <ReportFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        productId={productId}
        onProductChange={setProductId}
        products={products}
      />

      {isLoading ? (
        <TableShimmer rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        data && data.total === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Reports show up here automatically after each scheduled run."
            action={
              <Button asChild>
                <Link href={ROUTES.products}>Add a product</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState icon={FileText} title="No matches for these filters" />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={ROUTES.report(r.id)}
                        className="flex flex-col underline-offset-4 hover:underline"
                      >
                        <span className="font-medium">{r.reportTitle}</span>
                        <span className="text-xs text-muted-foreground">
                          {productNameById[r.productId] ?? r.productId}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDateTime(r.generatedAt)}
                    </TableCell>
                    <TableCell>{fmtCount(r.reviewCount)}</TableCell>
                    <TableCell>
                      <DeliveryBadges report={r} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      {r.googleDocUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={r.googleDocUrl} target="_blank" rel="noreferrer">
                            <ExternalLink /> Doc
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.total_pages}
          total={data.total}
          unit="report"
          onPageChange={setPage}
          busy={isFetching}
        />
      )}
    </div>
  );
}

function DeliveryBadges({ report }: { report: Report }) {
  const docOk = Boolean(report.googleDocUrl) && !report.deliveryMeta.doc_error;
  const emailOk =
    report.deliveryMeta.email?.status === "success" && !report.deliveryMeta.email_error;
  const emailMode = report.deliveryMeta.email?.mode;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={docOk ? "success" : "muted"}>
        <FileText className="mr-1 size-3" /> Doc
      </Badge>
      <Badge variant={emailOk ? "success" : emailMode ? "warning" : "muted"}>
        <Mail className="mr-1 size-3" />
        {emailMode === "draft" ? "Draft" : emailOk ? "Email" : "—"}
      </Badge>
    </div>
  );
}
