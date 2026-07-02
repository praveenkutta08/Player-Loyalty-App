import { UtensilsCrossed } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader, StatusPill, Table, type Column } from '@/components/ui';

// Restaurant catalog + today's specials. No dining-catalog endpoint in the P1–P2 backend
// (reservations are player-side); presented as config, documented as pending that API.
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  hours: string;
  reservations: number;
  status: 'open' | 'closed';
}

const RESTAURANTS: Restaurant[] = [
  {
    id: 'd1',
    name: 'The Gilded Steakhouse',
    cuisine: 'Steakhouse',
    hours: '17:00–23:00',
    reservations: 42,
    status: 'open',
  },
  {
    id: 'd2',
    name: 'Sakura Sushi',
    cuisine: 'Japanese',
    hours: '12:00–22:00',
    reservations: 28,
    status: 'open',
  },
  {
    id: 'd3',
    name: 'Terrazza',
    cuisine: 'Italian',
    hours: '18:00–23:30',
    reservations: 15,
    status: 'open',
  },
  {
    id: 'd4',
    name: 'Café Aurora',
    cuisine: 'All-day',
    hours: '06:00–15:00',
    reservations: 0,
    status: 'closed',
  },
];

const SPECIALS = [
  { title: 'Happy Hour', detail: 'Half-price cocktails 4–6pm', color: 'var(--gold-fill)' },
  { title: "Chef's Tasting", detail: '7-course menu · The Gilded', color: 'var(--red)' },
  { title: 'Sushi Sunday', detail: 'BOGO nigiri · Sakura', color: 'var(--green)' },
];

const columns: Column<Restaurant>[] = [
  {
    key: 'name',
    header: 'Restaurant',
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-dim text-gold">
          <UtensilsCrossed size={15} />
        </span>
        <span className="font-semibold text-text">{r.name}</span>
      </div>
    ),
  },
  {
    key: 'cuisine',
    header: 'Cuisine',
    render: (r) => <span className="text-text2">{r.cuisine}</span>,
  },
  {
    key: 'hours',
    header: 'Hours',
    render: (r) => <span className="font-mono text-[12px] text-muted">{r.hours}</span>,
  },
  {
    key: 'res',
    header: 'Reservations',
    align: 'right',
    render: (r) => <span className="font-mono text-text2">{r.reservations}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => (
      <StatusPill tone={r.status === 'open' ? 'green' : 'neutral'}>{r.status}</StatusPill>
    ),
  },
];

export function DiningScreen() {
  return (
    <div>
      <PageHeader kicker="DIN" title="Dining" subtitle="Restaurants, hours and today's specials." />

      <div className="mb-5">
        <Table columns={columns} rows={RESTAURANTS} rowKey={(r) => r.id} />
      </div>

      <Card>
        <CardHeader title="Today's Specials & Happy Hours" />
        <CardBody className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-3">
          {SPECIALS.map((s) => (
            <div
              key={s.title}
              className="rounded-card border border-border bg-panel2 p-4"
              style={{ borderLeft: `3px solid ${s.color}` }}
            >
              <div className="text-[14px] font-bold text-text">{s.title}</div>
              <div className="text-[12px] text-muted">{s.detail}</div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
