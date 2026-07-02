import { Car } from 'lucide-react';

import { useListValetQuery, useUpdateValetMutation, type Valet } from './reservationsApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Card,
  CardBody,
  Select,
  StatusPill,
  Table,
  Toggle,
  useToast,
  type Column,
  type Tone,
} from '@/components/ui';

const STATUS: Record<string, Tone> = {
  requested: 'gold',
  ready: 'green',
  delivered: 'blue',
  cancelled: 'red',
};
const OPTIONS = ['requested', 'ready', 'delivered', 'cancelled'];

export function ValetScreen() {
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useListValetQuery();
  const [update] = useUpdateValetMutation();

  const columns: Column<Valet>[] = [
    {
      key: 'ticket',
      header: 'Ticket',
      render: (v) => <span className="font-mono text-text">{v.ticket_ref}</span>,
    },
    {
      key: 'player',
      header: 'Player',
      render: (v) => (
        <span className="font-mono text-[12px] text-muted">{v.player_id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'requested',
      header: 'Requested',
      render: (v) => (
        <span className="text-text2">{new Date(v.requested_at).toLocaleTimeString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusPill tone={STATUS[v.status] ?? 'neutral'}>{v.status}</StatusPill>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (v) => (
        <Can permission="reservations:update" fallback={<span className="text-faint">—</span>}>
          <Select
            value={v.status}
            className="w-36"
            onChange={async (e) => {
              try {
                await update({ id: v.id, body: { status: e.target.value as never } }).unwrap();
                toast('Valet updated');
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
      <PageHeader
        kicker="VAL"
        title="Valet"
        subtitle="Valet configuration and live request queue."
      />

      <Card className="mb-5">
        <CardBody className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-gold-dim text-gold">
              <Car size={18} />
            </span>
            <div>
              <div className="text-[14px] font-semibold text-text">Valet service</div>
              <div className="text-[12px] text-muted">Accept in-app valet retrieval requests</div>
            </div>
          </div>
          <Toggle checked onChange={() => {}} label="Valet enabled" />
        </CardBody>
      </Card>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(v) => v.id}
        empty={isLoading ? 'Loading…' : 'No valet requests in the queue.'}
      />
    </div>
  );
}
