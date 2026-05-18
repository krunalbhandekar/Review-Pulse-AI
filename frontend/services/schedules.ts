import { api } from "@/services/api";
import { MOCK_SCHEDULES, withMockFallback } from "@/lib/mock-data";
import {
  DEFAULT_PAGE_SIZE,
  mockPage,
  type Page,
  type PageParams,
} from "@/types/pagination";
import type { Schedule, ScheduleInput } from "@/types/schedule";

export type ScheduleSortBy = "createdAt" | "nextRunAt" | "lastRunAt";
export type SortOrder = "asc" | "desc";

export interface ListSchedulesParams extends PageParams {
  productId?: string;
  enabled?: boolean;
  sortBy?: ScheduleSortBy;
  sortOrder?: SortOrder;
}

export async function listSchedules(
  params: ListSchedulesParams = {},
): Promise<Page<Schedule>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  return withMockFallback(
    () =>
      api<Page<Schedule>>("/schedules", {
        query: {
          productId: params.productId,
          enabled: params.enabled,
          page,
          limit,
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      }),
    mockPage(
      filterAndSortMocks(
        MOCK_SCHEDULES,
        params.productId,
        params.enabled,
        params.sortBy,
        params.sortOrder,
      ),
      page,
      limit,
    ),
  );
}

function filterAndSortMocks(
  rows: Schedule[],
  productId: string | undefined,
  enabled: boolean | undefined,
  sortBy: ScheduleSortBy | undefined,
  sortOrder: SortOrder | undefined,
): Schedule[] {
  let out = rows.filter((s) => {
    if (productId && s.productId !== productId) return false;
    if (enabled !== undefined && s.enabled !== enabled) return false;
    return true;
  });
  const key = sortBy ?? "createdAt";
  const dir = (sortOrder ?? "desc") === "desc" ? -1 : 1;
  out = out.sort((a, b) => {
    const av = (a[key] ?? "") as string;
    const bv = (b[key] ?? "") as string;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return out;
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
