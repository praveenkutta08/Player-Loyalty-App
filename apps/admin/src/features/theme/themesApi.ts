import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type Theme = components['schemas']['ThemeOut'];
export type ThemeCreate = components['schemas']['ThemeCreate'];
export type ThemeUpdate = components['schemas']['ThemeUpdate'];

// Themes for the acting tenant (X-Tenant sent by baseApi). Activating a theme bumps the manifest
// version on the server, which is what the mobile app polls (manifest-driven theming, GOLDEN #5).
export const themesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listThemes: build.query<Theme[], void>({
      query: () => ({ url: '/config/themes' }),
      providesTags: ['Manifest'],
    }),
    createTheme: build.mutation<Theme, ThemeCreate>({
      query: (body) => ({ url: '/config/themes', method: 'POST', body }),
      invalidatesTags: ['Manifest'],
    }),
    updateTheme: build.mutation<Theme, { id: string; body: ThemeUpdate }>({
      query: ({ id, body }) => ({ url: `/config/themes/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Manifest'],
    }),
    activateTheme: build.mutation<Theme, string>({
      query: (id) => ({ url: `/config/themes/${id}/activate`, method: 'POST' }),
      invalidatesTags: ['Manifest'],
    }),
    deleteTheme: build.mutation<void, string>({
      query: (id) => ({ url: `/config/themes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Manifest'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListThemesQuery,
  useCreateThemeMutation,
  useUpdateThemeMutation,
  useActivateThemeMutation,
  useDeleteThemeMutation,
} = themesApi;
