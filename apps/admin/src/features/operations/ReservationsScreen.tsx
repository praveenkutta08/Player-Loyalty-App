import {
  useListReservationsQuery,
  useUpdateReservationMutation,
  type Reservation,
} from './reservationsApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Select, StatusPill, Table, useToast, type Column, type Tone } from '@/components/ui';

const STATUS: Record<string, Tone> = {
  requested: 'gold',
  confirmed: 'green',
  cancelled: 'red',
  completed: 'blue',
};
const TYPE_TONE: Record<string, Tone> = { hotel: 'purple', dining: 'gold', nightlife: 'blue' };
const OPTIONS = ['requested', 'confirmed', 'cancelled', 'completed'];

export function ReservationsScreen() {
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useListReservationsQuery();
  const [update] = useUpdateReservationMutation();

  const columns: Column<Reservation>[] = [
    {
      key: 'type',
      header: 'Venue',
      render: (r) => (
        <StatusPill tone={TYPE_TONE[r.type] ?? 'neutral'} dot={false} tag>
          {r.type}
        </StatusPill>
      ),
    },
    {
      key: 'player',
      header: 'Player',
      render: (r) => (
        <span className="font-mono text-[12px] text-muted">{r.player_id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'when',
      header: 'When',
      render: (r) => (
        <span className="text-text2">
          {r.start_at ? new Date(r.start_at).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'ref',
      header: 'Ref',
      render: (r) => (
        <span className="font-mono text-[12px] text-muted">{r.external_ref ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusPill tone={STATUS[r.status] ?? 'neutral'}>{r.status}</StatusPill>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Can permission="reservations:update" fallback={<span className="text-faint">—</span>}>
          <Select
            value={r.status}
            className="w-36"
            onChange={async (e) => {
              try {
                await update({ id: r.id, body: { status: e.target.value as never } }).unwrap();
                toast('Reservation updated');
              } catch {
                toast('Update failed', 'error');
              }
            }}
          >
            {OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <PageHeader kicker="RSV" title="Reservations" subtitle="Cross-venue bookings queue." />
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={isLoading ? 'Loading…' : 'No reservations.'}
      />
    </div>
  );
}
