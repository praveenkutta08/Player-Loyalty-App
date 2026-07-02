/**
 * "More" tab stack: the menu hub (M1) plus the concierge/service detail screens that don't warrant
 * their own bottom-tab. Grown per prompt (reservations/valet here; digital key + support later).
 */
export type MoreStackParamList = {
  MoreHome: undefined;
  Appearance: undefined;
  Reservations: undefined;
  ReservationBook: undefined;
  ReservationDetail: { id: string };
  Valet: undefined;
  DigitalKey: undefined;
  NotificationPreferences: undefined;
  Nearby: undefined;
  LocationConsent: undefined;
  Games: undefined;
};
