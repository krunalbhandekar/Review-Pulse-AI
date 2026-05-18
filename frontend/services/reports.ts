import { api } from "@/services/api";
import { MOCK_REPORTS, withMockFallback } from "@/lib/mock-data";
import {
  DEFAULT_PAGE_SIZE,
  mockPage,
  type Page,
  type PageParams,
} from "@/types/pagination";
import type { Report } from "@/types/report";

export interface ListReportsParams extends PageParams {
  productId?: string;
}

export async function listReports(
  params: ListReportsParams = {},
): Promise<Page<Report>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const filtered = params.productId
    ? MOCK_REPORTS.filter((r) => r.productId === params.productId)
    : MOCK_REPORTS;
  return withMockFallback(
    () =>
      api<Page<Report>>("/reports", {
        query: { productId: params.productId, page, limit },
      }),
    mockPage(filtered, page, limit),
  );
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
