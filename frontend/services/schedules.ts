import { api } from "@/services/api";
import { MOCK_SCHEDULES, withMockFallback } from "@/lib/mock-data";
import type { Schedule, ScheduleInput } from "@/types/schedule";

export async function listSchedules(productId?: string): Promise<Schedule[]> {
  return withMockFallback(
    () => api<Schedule[]>("/schedules", { query: { productId } }),
    productId ? MOCK_SCHEDULES.filter((s) => s.productId === productId) : MOCK_SCHEDULES,
  );
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  return api<Schedule>("/schedules", { method: "POST", body: input });
}

export async function updateSchedule(
  id: string,
  input: Partial<ScheduleInput>,
): Promise<Schedule> {
  return api<Schedule>(`/schedules/${id}`, { method: "PATCH", body: input });
}

export async function deleteSchedule(id: string): Promise<void> {
  await api<void>(`/schedules/${id}`, { method: "DELETE" });
}
