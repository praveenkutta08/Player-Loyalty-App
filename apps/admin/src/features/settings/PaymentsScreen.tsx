import { useState } from 'react';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  StatusPill,
  Table,
  Toggle,
  useToast,
  type Column,
  type Tone,
} from '@/components/ui';

// Cashless oversight. Wallet endpoints are player-scoped in P1–P2 (no admin transactions/
// reconciliation endpoint), so the ledger view is representative and documented as pending.
interface Txn {
  id: string;
  player: string;
  type: 'fund' | 'cashout' | 'transfer';
  amountCents: number;
  status: 'settled' | 'pending';
  at: string;
}

const TXNS: Txn[] = [
  { id: 't1', player: 'a•••', type: 'fund', amountCents: 50000, status: 'settled', at: '10:02' },
  {
    id: 't2',
    player: 'd•••',
    type: 'cashout',
    amountCents: 120000,
    status: 'pending',
    at: '09:41',
  },
  {
    id: 't3',
    player: 'b•••',
    type: 'transfer',
    amountCents: 15000,
    status: 'settled',
    at: '09:15',
  },
  { id: 't4', player: 'a•••', type: 'fund', amountCents: 20000, status: 'settled', at: '08:58' },
];

const TYPE_TONE: Record<string, Tone> = { fund: 'green', cashout: 'gold', transfer: 'blue' };

export function PaymentsScreen() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [limits, setLimits] = useState({ dailyFund: '5000', dailyCashout: '10000' });

  const columns: Column<Txn>[] = [
    {
      key: 'at',
      header: 'Time',
      render: (t) => <span className="font-mono text-[12px] text-muted">{t.at}</span>,
    },
    {
      key: 'player',
      header: 'Player',
      render: (t) => <span className="font-mono text-[12px] text-text2">{t.player}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (t) => (
        <StatusPill tone={TYPE_TONE[t.type] ?? 'neutral'} dot={false} tag>
          {t.type}
        </StatusPill>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (t) => (
        <span className="font-mono font-semibold text-text">
          ${(t.amountCents / 100).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <StatusPill tone={t.status === 'settled' ? 'green' : 'gold'}>{t.status}</StatusPill>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="PAY"
        title="Payments & Cashless"
        subtitle="Enable, set limits, and reconcile transactions."
      />

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Cashless" />
          <CardBody className="flex items-center justify-between pt-3">
            <div>
              <div className="text-[13px] font-semibold text-text">Cashless wallet</div>
              <div className="text-[12px] text-muted">Fund / cash out via CashlessPort (mock)</div>
            </div>
            <Toggle checked={enabled} onChange={setEnabled} label="Cashless" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Limits" />
          <CardBody className="grid grid-cols-2 gap-4 pt-3">
            <Field label="Daily fund ($)">
              <Input
                value={limits.dailyFund}
                onChange={(e) => setLimits({ ...limits, dailyFund: e.target.value })}
                type="number"
              />
            </Field>
            <Field label="Daily cashout ($)">
              <Input
                value={limits.dailyCashout}
                onChange={(e) => setLimits({ ...limits, dailyCashout: e.target.value })}
                type="number"
              />
            </Field>
            <div className="col-span-2">
              <Can permission="wallet:read">
                <button
                  className="text-[12px] text-gold hover:underline"
                  onClick={() => toast('Limits saved')}
                >
                  Save limits
                </button>
              </Can>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mb-2 text-label uppercase text-muted">
        Transactions / reconciliation (read)
      </div>
      <Can
        permission="wallet:read"
        fallback={
          <p className="text-[13px] text-muted">You need wallet:read to view transactions.</p>
        }
      >
        <Table columns={columns} rows={TXNS} rowKey={(t) => t.id} />
      </Can>
    </div>
  );
}
