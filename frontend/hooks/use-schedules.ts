"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateSchedule,
  type ListSchedulesParams,
} from "@/services/schedules";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { ScheduleInput } from "@/types/schedule";

export const schedulesListKey = (params: ListSchedulesParams = {}) =>
  [
    "schedules",
    "list",
    {
      productId: params.productId ?? null,
      enabled: params.enabled ?? null,
      page: params.page ?? 1,
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? "desc",
    },
  ] as const;

export function useSchedules(params: ListSchedulesParams = {}) {
  return useQuery({
    queryKey: schedulesListKey(params),
    queryFn: () => listSchedules(params),
    placeholderData: keepPreviousData,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["schedules"] });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleInput) => createSchedule(input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ScheduleInput> }) =>
      updateSchedule(id, input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => invalidateAll(qc),
  });
}
