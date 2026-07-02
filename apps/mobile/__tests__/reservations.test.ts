import {
  isUpcoming,
  reservationTone,
  reservationTypeLabel,
  valetTone,
} from '../src/features/reservations/format';

describe('reservation formatting', () => {
  it('labels categories', () => {
    expect(reservationTypeLabel('hotel')).toBe('Hotel');
    expect(reservationTypeLabel('nightlife')).toBe('Nightlife');
    expect(reservationTypeLabel('other')).toBe('other');
  });

  it('tones reservation statuses', () => {
    expect(reservationTone('confirmed')).toBe('success');
    expect(reservationTone('cancelled')).toBe('error');
    expect(reservationTone('completed')).toBe('muted');
  });

  it('treats requested/confirmed as upcoming only', () => {
    expect(isUpcoming('requested')).toBe(true);
    expect(isUpcoming('confirmed')).toBe(true);
    expect(isUpcoming('completed')).toBe(false);
    expect(isUpcoming('cancelled')).toBe(false);
  });

  it('tones valet statuses', () => {
    expect(valetTone('ready')).toBe('success');
    expect(valetTone('requested')).toBe('warning');
    expect(valetTone('cancelled')).toBe('error');
  });
});
