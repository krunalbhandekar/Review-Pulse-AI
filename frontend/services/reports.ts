import { api } from "@/services/api";
import { MOCK_REPORTS, withMockFallback } from "@/lib/mock-data";
import type { Report } from "@/types/report";

export interface ListReportsParams {
  productId?: string;
  limit?: number;
  skip?: number;
}

export async function listReports(params: ListReportsParams = {}): Promise<Report[]> {
  return withMockFallback(
    () => api<Report[]>("/reports", { query: { productId: params.productId, limit: params.limit, skip: params.skip } }),
    params.productId
      ? MOCK_REPORTS.filter((r) => r.productId === params.productId)
      : MOCK_REPORTS,
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
