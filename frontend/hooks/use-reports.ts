"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReport, listReports, runReportNow } from "@/services/reports";

export const reportsKey = (productId?: string) =>
  productId
    ? (["reports", { productId }] as const)
    : (["reports"] as const);

export function useReports(productId?: string) {
  return useQuery({
    queryKey: reportsKey(productId),
    queryFn: () => listReports({ productId }),
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
