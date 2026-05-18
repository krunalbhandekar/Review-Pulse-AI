// Wire format mirrors server/app/models/pagination.py.
// ``total_pages`` is intentionally snake_case to match the API envelope.
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

export const DEFAULT_PAGE_SIZE = 10;
// Mirrors server/app/models/pagination.py MAX_PAGE_SIZE. Used when a
// caller needs "give me the whole set" (e.g. populating a dropdown).
export const MAX_PAGE_SIZE = 100;

export function emptyPage<T>(limit = DEFAULT_PAGE_SIZE): Page<T> {
  return { items: [], page: 1, limit, total: 0, total_pages: 0 };
}

export function mockPage<T>(items: T[], page = 1, limit = DEFAULT_PAGE_SIZE): Page<T> {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    page,
    limit,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
