import { resolveDeepLink } from '../src/features/notifications/deepLinks';
import notificationsReducer, {
  markAllRead,
  markRead,
  receiveMessage,
  unreadCount,
} from '../src/features/notifications/notificationsSlice';
import prefsReducer, {
  inQuietHours,
  setQuietHours,
  setQuietHoursEnabled,
  toggleChannel,
} from '../src/features/notifications/prefsSlice';

import type { InboxMessage } from '../src/features/notifications/notificationsSlice';

describe('resolveDeepLink', () => {
  it('routes structured offer/promotion payloads to the right segment', () => {
    expect(resolveDeepLink({ type: 'offer', id: 'o1' })).toEqual({ kind: 'offers', segment: 'offers' });
    expect(resolveDeepLink({ type: 'promotion', id: 'p1' })).toEqual({
      kind: 'offers',
      segment: 'promotions',
    });
  });

  it('routes reservations + messages by id', () => {
    expect(resolveDeepLink({ type: 'reservation', id: 'r1' })).toEqual({ kind: 'reservation', id: 'r1' });
    expect(resolveDeepLink({ type: 'message', id: 'm1' })).toEqual({ kind: 'message', id: 'm1' });
  });

  it('parses URL payloads (scheme + https)', () => {
    expect(resolveDeepLink({ url: 'casino://reservations/r9' })).toEqual({
      kind: 'reservation',
      id: 'r9',
    });
    expect(resolveDeepLink({ url: 'https://play.example.com/offers/o2' })).toEqual({
      kind: 'offers',
      segment: 'offers',
    });
  });

  it('falls back to home for unknown payloads', () => {
    expect(resolveDeepLink({})).toEqual({ kind: 'home' });
    expect(resolveDeepLink({ type: 'mystery' })).toEqual({ kind: 'home' });
  });
});

describe('notifications inbox', () => {
  const msg: InboxMessage = {
    id: 'n1',
    title: 'Hi',
    body: 'there',
    receivedAt: '2026-07-01T00:00:00.000Z',
    read: false,
  };

  it('adds messages (deduped) and tracks unread', () => {
    let state = notificationsReducer({ messages: [] }, receiveMessage(msg));
    state = notificationsReducer(state, receiveMessage(msg)); // dup ignored
    expect(state.messages).toHaveLength(1);
    expect(unreadCount(state)).toBe(1);
  });

  it('marks read individually and in bulk', () => {
    const start = notificationsReducer({ messages: [] }, receiveMessage(msg));
    expect(unreadCount(notificationsReducer(start, markRead('n1')))).toBe(0);
    expect(unreadCount(notificationsReducer(start, markAllRead()))).toBe(0);
  });
});

describe('notification prefs', () => {
  it('toggles a channel', () => {
    const start = prefsReducer(undefined, { type: '@@init' });
    const next = prefsReducer(start, toggleChannel('offers'));
    expect(next.channels.offers).toBe(!start.channels.offers);
  });

  it('computes quiet hours with midnight wrap', () => {
    let state = prefsReducer(undefined, setQuietHoursEnabled(true));
    state = prefsReducer(state, setQuietHours({ startHour: 22, endHour: 8 }));
    expect(inQuietHours(state, 23)).toBe(true);
    expect(inQuietHours(state, 3)).toBe(true);
    expect(inQuietHours(state, 12)).toBe(false);
  });

  it('is quiet-free when disabled', () => {
    const state = prefsReducer(undefined, { type: '@@init' });
    expect(inQuietHours(state, 23)).toBe(false);
  });
});
