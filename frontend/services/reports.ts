import { api } from "@/services/api";
import { MOCK_REPORTS, withMockFallback } from "@/lib/mock-data";
import {
  DEFAULT_PAGE_SIZE,
  mockPage,
  type Page,
  type PageParams,
} from "@/types/pagination";
import type { Report, ReportStatus } from "@/types/report";

export type ReportSortBy = "generatedAt" | "reviewCount" | "reportTitle";
export type SortOrder = "asc" | "desc";

export interface ListReportsParams extends PageParams {
  productId?: string;
  status?: ReportStatus;
  search?: string;
  sortBy?: ReportSortBy;
  sortOrder?: SortOrder;
}

export async function listReports(
  params: ListReportsParams = {},
): Promise<Page<Report>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const search = params.search?.trim() || undefined;
  return withMockFallback(
    () =>
      api<Page<Report>>("/reports", {
        query: {
          productId: params.productId,
          status: params.status,
          search,
          page,
          limit,
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      }),
    mockPage(
      filterAndSortMocks(
        MOCK_REPORTS,
        params.productId,
        params.status,
        search,
        params.sortBy,
        params.sortOrder,
      ),
      page,
      limit,
    ),
  );
}

function filterAndSortMocks(
  rows: Report[],
  productId: string | undefined,
  status: ReportStatus | undefined,
  search: string | undefined,
  sortBy: ReportSortBy | undefined,
  sortOrder: SortOrder | undefined,
): Report[] {
  let out = rows.filter((r) => {
    if (productId && r.productId !== productId) return false;
    if (status && r.status !== status) return false;
    if (search && !r.reportTitle.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });
  const key = sortBy ?? "generatedAt";
  const dir = (sortOrder ?? "desc") === "desc" ? -1 : 1;
  out = out.sort((a, b) => {
    const av = a[key] as string | number;
    const bv = b[key] as string | number;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return out;
}

export async function getReport(id: string): Promise<Report> {
  return withMockFallback(
    () => api<Report>(`/reports/${id}`),
    MOCK_REPORTS.find((r) => r.id === id) ?? MOCK_REPORTS[0],
  );
}

export async function runReportNow(productId: string, wait = false): Promise<Report> {
  return api<Report>(`/reports/products/${productId}/run`, {
    method: "POST",
    query: { wait },
  });
}
