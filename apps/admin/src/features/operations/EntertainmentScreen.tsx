import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, StatusPill, type Tone } from '@/components/ui';

// Event listings. No entertainment-catalog endpoint in the P1–P2 backend; presented as config,
// documented as pending that API.
interface EventItem {
  id: string;
  date: string;
  type: string;
  name: string;
  venue: string;
  ticket: 'selling' | 'available' | 'sold_out';
}

const EVENTS: EventItem[] = [
  {
    id: 'e1',
    date: 'JUL 12',
    type: 'Concert',
    name: 'Neon Nights Live',
    venue: 'Grand Theater',
    ticket: 'selling',
  },
  {
    id: 'e2',
    date: 'JUL 18',
    type: 'Comedy',
    name: 'Laugh Vault',
    venue: 'Club Lounge',
    ticket: 'available',
  },
  {
    id: 'e3',
    date: 'JUL 20',
    type: 'Boxing',
    name: 'Title Fight Night',
    venue: 'Arena',
    ticket: 'sold_out',
  },
  {
    id: 'e4',
    date: 'JUL 25',
    type: 'DJ Set',
    name: 'Midnight Pulse',
    venue: 'Sky Club',
    ticket: 'selling',
  },
];

const TICKET: Record<string, { tone: Tone; label: string }> = {
  selling: { tone: 'gold', label: 'Selling fast' },
  available: { tone: 'green', label: 'Available' },
  sold_out: { tone: 'red', label: 'Sold out' },
};

export function EntertainmentScreen() {
  return (
    <div>
      <PageHeader kicker="ENT" title="Entertainment" subtitle="Events and ticket status." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {EVENTS.map((e) => (
          <Card key={e.id}>
            <CardBody className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-card bg-panel2">
                <span className="font-mono text-[11px] text-muted">{e.date.split(' ')[0]}</span>
                <span className="display text-[20px] font-semibold text-text">
                  {e.date.split(' ')[1]}
                </span>
              </div>
              <div className="flex-1">
                <StatusPill tone="purple" dot={false} tag>
                  {e.type}
                </StatusPill>
                <div className="mt-1 text-[15px] font-bold text-text">{e.name}</div>
                <div className="text-[12px] text-muted">{e.venue}</div>
              </div>
              <StatusPill tone={TICKET[e.ticket]!.tone}>{TICKET[e.ticket]!.label}</StatusPill>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
