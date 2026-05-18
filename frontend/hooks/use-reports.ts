"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getReport,
  listReports,
  runReportNow,
  type ListReportsParams,
} from "@/services/reports";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

export const reportsKey = (params?: ListReportsParams) =>
  [
    "reports",
    "list",
    {
      productId: params?.productId ?? null,
      page: params?.page ?? 1,
      limit: params?.limit ?? DEFAULT_PAGE_SIZE,
    },
  ] as const;

export function useReports(params: ListReportsParams = {}) {
  return useQuery({
    queryKey: reportsKey(params),
    queryFn: () => listReports(params),
    placeholderData: keepPreviousData,
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["reports", id] as const,
    queryFn: () => getReport(id),
    enabled: Boolean(id),
  });
}

export function useRunReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, wait }: { productId: string; wait?: boolean }) =>
      runReportNow(productId, wait),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}
