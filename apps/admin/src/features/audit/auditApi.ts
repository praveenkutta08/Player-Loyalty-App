import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type AuditLog = components['schemas']['AuditLogOut'];
export type AuditLogPage = components['schemas']['AuditLogPage'];

// Immutable audit log + analytics summary for the acting tenant.
export const auditApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Cursor-paginated (M2); pass the response's next_cursor back as `cursor` for the next page.
    listAuditLogs: build.query<AuditLogPage, { cursor?: string } | void>({
      query: (arg) => ({ url: '/audit-logs', params: arg?.cursor ? { cursor: arg.cursor } : {} }),
      providesTags: ['AuditLog'],
    }),
    analyticsSummary: build.query<Record<string, number>, void>({
      query: () => ({ url: '/analytics/summary' }),
    }),
  }),
  overrideExisting: false,
});

export const { useListAuditLogsQuery, useAnalyticsSummaryQuery } = auditApi;
