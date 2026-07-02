/**
 * Deep-link resolution for push notifications. A campaign carries either a structured data payload
 * (`{ type, id }`) or a URL (`casino://offers/<id>`, `https://host/reservations/<id>`). Both resolve
 * to a target the app knows how to navigate to. Pure + tested so routing is deterministic across
 * foreground / background / quit-state opens.
 */
export type DeepLinkTarget =
  | { kind: 'offers'; segment: 'offers' | 'promotions' }
  | { kind: 'reservation'; id: string }
  | { kind: 'message'; id: string }
  | { kind: 'home' };

const SEGMENT_FOR: Record<string, 'offers' | 'promotions'> = {
  offer: 'offers',
  offers: 'offers',
  promotion: 'promotions',
  promotions: 'promotions',
};

/** Notification data payload (string-valued, as delivered by FCM/APNs). */
export type PushData = Record<string, string | undefined>;

export function resolveDeepLink(data: PushData): DeepLinkTarget {
  const parsed = data.url ? fromUrl(data.url) : { type: data.type, id: data.id };
  const type = (parsed.type ?? '').toLowerCase();
  const id = parsed.id;

  if (type in SEGMENT_FOR) return { kind: 'offers', segment: SEGMENT_FOR[type] };
  if ((type === 'reservation' || type === 'reservations') && id) {
    return { kind: 'reservation', id };
  }
  if ((type === 'message' || type === 'inbox') && id) return { kind: 'message', id };
  return { kind: 'home' };
}

/** Parse `scheme://type/id` or `https://host/type/id` into a { type, id }. */
function fromUrl(url: string): { type?: string; id?: string } {
  const withoutScheme = url.replace(/^[a-z]+:\/\//i, '');
  const path = withoutScheme.split('?')[0];
  const segments = path.split('/').filter(Boolean);
  // Drop a leading host segment for https-style links (contains a dot).
  if (segments.length > 0 && segments[0].includes('.')) segments.shift();
  const [type, id] = segments;
  return { type, id };
}
