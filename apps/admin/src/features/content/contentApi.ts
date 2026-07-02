import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type ContentItem = components['schemas']['ContentItemOut'];
export type ContentCreate = components['schemas']['ContentCreate'];
export type ContentUpdate = components['schemas']['ContentUpdate'];

// CMS content for the acting tenant. Publishing bumps the manifest server-side.
export const contentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listContent: build.query<ContentItem[], void>({
      query: () => ({ url: '/content' }),
      providesTags: ['Content'],
    }),
    createContent: build.mutation<ContentItem, ContentCreate>({
      query: (body) => ({ url: '/content', method: 'POST', body }),
      invalidatesTags: ['Content'],
    }),
    updateContent: build.mutation<ContentItem, { id: string; body: ContentUpdate }>({
      query: ({ id, body }) => ({ url: `/content/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Content'],
    }),
    publishContent: build.mutation<ContentItem, string>({
      query: (id) => ({ url: `/content/${id}/publish`, method: 'POST' }),
      invalidatesTags: ['Content', 'Manifest'],
    }),
    deleteContent: build.mutation<void, string>({
      query: (id) => ({ url: `/content/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Content'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListContentQuery,
  useCreateContentMutation,
  useUpdateContentMutation,
  usePublishContentMutation,
  useDeleteContentMutation,
} = contentApi;
