import { AreaSparkline } from './charts';

import { useAppSelector } from '@/app/store';
import { useMe } from '@/auth/useAuth';
import { Card, CardBody, CardHeader, StatusPill } from '@/components/ui';
import { useAnalyticsSummaryQuery } from '@/features/audit/auditApi';

// Role-aware dashboard (DSH). KPI row differs Platform vs Casino. App-sessions chart, system
// health, approval queue, recent changes, feature flags + scheduled. Some counts come from the
// real /analytics/summary; the rest are representative.
const SESSIONS = [420, 510, 480, 640, 700, 660, 820];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function DashboardScreen() {
  const scope = useAppSelector((s) => s.session.scope);
  const me = useMe();
  const { data: summary } = useAnalyticsSummaryQuery();

  const name = me?.full_name?.split(' ')[0] ?? 'there';
  const n = (key: string, fallback: number) => summary?.[key] ?? fallback;

  const kpis =
    scope === 'platform'
      ? [
          { label: 'Active Casinos', value: n('tenants', 3).toLocaleString(), accent: true },
          { label: 'Total Members', value: n('players', 12480).toLocaleString() },
          { label: 'Publishes Today', value: n('publishes_today', 7).toLocaleString() },
          { label: 'Awaiting You', value: n('pending_approvals', 2).toLocaleString(), gold: true },
        ]
      : [
          { label: 'Members', value: n('players', 4820).toLocaleString(), accent: true },
          { label: 'DAU', value: n('dau', 1240).toLocaleString() },
          { label: 'Redemptions', value: n('redemptions', 318).toLocaleString() },
          { label: 'Awaiting You', value: n('pending_approvals', 1).toLocaleString(), gold: true },
        ];

  const health = [
    { label: 'API', status: 'Operational', tone: 'green' as const, value: '99.98%' },
    { label: 'Database', status: 'Operational', tone: 'green' as const, value: '100%' },
    { label: 'Push adapter', status: 'Degraded', tone: 'gold' as const, value: '97.2%' },
    { label: 'Geo adapter', status: 'Operational', tone: 'green' as const, value: '99.9%' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="kicker mb-1">
          {scope === 'platform' ? 'Platform overview' : 'Casino overview'}
        </div>
        <h1 className="display text-[28px] font-semibold text-text">Good evening, {name}</h1>
        <p className="text-[13px] text-muted">Here's what's happening across your {scope}.</p>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} accent={k.accent ? 'var(--gold-fill)' : undefined}>
            <CardBody className={k.gold ? 'bg-gold-dim' : undefined}>
              <div className="kicker mb-1.5">{k.label}</div>
              <div className="display text-[30px] font-semibold text-text">{k.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Sessions + health */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="App Sessions" subtitle="Last 7 days" />
          <CardBody>
            <AreaSparkline values={SESSIONS} />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
              {DAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="System Health" />
          <CardBody className="space-y-2.5 pt-3">
            {health.map((h) => (
              <div key={h.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] text-text2">
                  <span
                    className={`h-2 w-2 rounded-full ${h.tone === 'gold' ? 'bg-gold' : 'bg-green'}`}
                  />
                  {h.label}
                </span>
                <span className="font-mono text-[12px] text-muted">{h.value}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Approval queue + recent + flags */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Approval Queue" />
          <CardBody className="space-y-2 pt-3">
            {['Weekend Promo', 'Summer Theme'].map((t) => (
              <div
                key={t}
                className="flex items-center justify-between rounded-control bg-panel2 px-3 py-2"
              >
                <span className="text-[13px] text-text2">{t}</span>
                <StatusPill tone="gold">Review</StatusPill>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent Changes" />
          <CardBody className="space-y-2 pt-3 text-[13px] text-text2">
            <div>Theme published · 2h ago</div>
            <div>Welcome offer updated · 4h ago</div>
            <div>Steakhouse trigger created · 1d ago</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Feature Flags & Scheduled" />
          <CardBody className="space-y-2 pt-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text2">Cardless Play</span>
              <StatusPill tone="green">On</StatusPill>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text2">Cashless (75%)</span>
              <StatusPill tone="gold">Rollout</StatusPill>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text2">Next: Double Points</span>
              <span className="font-mono text-[11px] text-muted">Fri</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
