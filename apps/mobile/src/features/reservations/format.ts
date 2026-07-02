import type { StatusTone } from '../../components';

/** Display label for a reservation category. */
export function reservationTypeLabel(type: string): string {
  switch (type) {
    case 'hotel':
      return 'Hotel';
    case 'dining':
      return 'Dining';
    case 'nightlife':
      return 'Nightlife';
    default:
      return type;
  }
}

/** Status-pill tone for a reservation status. */
export function reservationTone(status: string): StatusTone {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'requested':
      return 'info';
    case 'completed':
      return 'muted';
    case 'cancelled':
      return 'error';
    default:
      return 'muted';
  }
}

/** Status-pill tone for a valet request. */
export function valetTone(status: string): StatusTone {
  switch (status) {
    case 'ready':
      return 'success';
    case 'requested':
      return 'warning';
    case 'delivered':
      return 'muted';
    case 'cancelled':
      return 'error';
    default:
      return 'muted';
  }
}

/** A reservation is "upcoming" while it is still requested or confirmed. */
export function isUpcoming(status: string): boolean {
  return status === 'requested' || status === 'confirmed';
}

/** Short date/time for a reservation slot, or a placeholder when unscheduled. */
export function formatSlot(iso: string | null | undefined): string {
  if (!iso) return 'Flexible time';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Flexible time';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
