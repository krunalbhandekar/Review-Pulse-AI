"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateSchedule,
} from "@/services/schedules";
import type { ScheduleInput } from "@/types/schedule";

export const schedulesKey = (productId?: string) =>
  productId
    ? (["schedules", { productId }] as const)
    : (["schedules"] as const);

export function useSchedules(productId?: string) {
  return useQuery({
    queryKey: schedulesKey(productId),
    queryFn: () => listSchedules(productId),
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleInput) => createSchedule(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ScheduleInput> }) =>
      updateSchedule(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}
