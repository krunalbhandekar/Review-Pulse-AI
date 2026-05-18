import { api } from "@/services/api";
import { MOCK_SCHEDULES, withMockFallback } from "@/lib/mock-data";
import {
  DEFAULT_PAGE_SIZE,
  mockPage,
  type Page,
  type PageParams,
} from "@/types/pagination";
import type { Schedule, ScheduleInput } from "@/types/schedule";

export interface ListSchedulesParams extends PageParams {
  productId?: string;
}

export async function listSchedules(
  params: ListSchedulesParams = {},
): Promise<Page<Schedule>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const filtered = params.productId
    ? MOCK_SCHEDULES.filter((s) => s.productId === params.productId)
    : MOCK_SCHEDULES;
  return withMockFallback(
    () =>
      api<Page<Schedule>>("/schedules", {
        query: { productId: params.productId, page, limit },
      }),
    mockPage(filtered, page, limit),
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
