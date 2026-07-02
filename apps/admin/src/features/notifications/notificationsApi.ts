import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type Notification = components['schemas']['NotificationOut'];
export type NotificationCreate = components['schemas']['NotificationCreate'];
export type SendResult = components['schemas']['SendResult'];
export type Delivery = components['schemas']['DeliveryOut'];

// Notification campaigns for the acting tenant. The backend delivers via the PushPort (mock in
// MVP); other channels (in-app/email/SMS) and A/B are composed in the UI and noted as pending
// backend support.
export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.query<Notification[], void>({
      query: () => ({ url: '/notifications' }),
      providesTags: ['PushCampaign'],
    }),
    createNotification: build.mutation<Notification, NotificationCreate>({
      query: (body) => ({ url: '/notifications', method: 'POST', body }),
      invalidatesTags: ['PushCampaign'],
    }),
    sendNotification: build.mutation<SendResult, string>({
      query: (id) => ({ url: `/notifications/${id}/send`, method: 'POST' }),
      invalidatesTags: ['PushCampaign'],
    }),
    listDeliveries: build.query<Delivery[], string>({
      query: (id) => ({ url: `/notifications/${id}/deliveries` }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useListNotificationsQuery,
  useCreateNotificationMutation,
  useSendNotificationMutation,
  useListDeliveriesQuery,
} = notificationsApi;
