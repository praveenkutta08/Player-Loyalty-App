import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type AuditLog = components['schemas']['AuditLogOut'];

// Immutable audit log + analytics summary for the acting tenant.
export const auditApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAuditLogs: build.query<AuditLog[], void>({
      query: () => ({ url: '/audit-logs' }),
      providesTags: ['AuditLog'],
    }),
    analyticsSummary: build.query<Record<string, number>, void>({
      query: () => ({ url: '/analytics/summary' }),
    }),
  }),
  overrideExisting: false,
});

export const { useListAuditLogsQuery, useAnalyticsSummaryQuery } = auditApi;
