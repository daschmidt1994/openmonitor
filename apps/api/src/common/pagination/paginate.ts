import type { PaginatedResult } from "@openmonitor/shared";

export function buildPaginatedResult<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
