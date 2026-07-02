import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type PresignRequest = components['schemas']['PresignRequest'];
export type PresignResponse = components['schemas']['PresignResponse'];

// Media presign for direct-to-object-storage uploads (MinIO/S3). There is no media LIST endpoint
// in the P1–P2 backend, so the library grid is client-side; uploads are real via presign.
export const mediaApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    presignMedia: build.mutation<PresignResponse, PresignRequest>({
      query: (body) => ({ url: '/content/media/presign', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const { usePresignMediaMutation } = mediaApi;
