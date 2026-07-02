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
  Security: undefined;
  Support: undefined;
  /** Dev-only concierge kit gallery (P6.5); the row is __DEV__-gated in Appearance. */
  ConciergeKit: undefined;
  /** Dev-only splash variant gallery (P7.3); __DEV__-gated in Appearance. */
  SplashGallery: undefined;
};
