import { TrendingDown, TrendingUp } from 'lucide-react';

import { Bars, Donut, DualLine } from './charts';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { useAnalyticsSummaryQuery } from '@/features/audit/auditApi';

// Analytics (ANL): KPI cards + DAU dual-line + revenue-by-channel donut + top promotions bars +
// push funnel. Counts seed from /analytics/summary; series are representative.
const DAU_THIS = [900, 1020, 980, 1180, 1240, 1200, 1360];
const DAU_LAST = [820, 880, 900, 960, 1010, 990, 1080];

export function AnalyticsScreen() {
  const { data: summary } = useAnalyticsSummaryQuery();
  const n = (key: string, fallback: number) => summary?.[key] ?? fallback;

  const kpis = [
    { label: 'Active Users', value: n('dau', 1240).toLocaleString(), delta: 12.4, up: true },
    { label: 'Avg Session', value: '8m 42s', delta: 3.1, up: true },
    { label: 'Redemptions', value: n('redemptions', 318).toLocaleString(), delta: -2.2, up: false },
    { label: 'Retention (D30)', value: '41%', delta: 1.8, up: true },
  ];

  const revenue = [
    { label: 'Slots', value: 52, color: 'var(--gold-fill)' },
    { label: 'Tables', value: 24, color: 'var(--blue)' },
    { label: 'Hotel', value: 14, color: 'var(--purple)' },
    { label: 'Dining', value: 10, color: 'var(--green)' },
  ];

  const topPromos = [
    { label: 'Weekend x2 Points', value: 4820 },
    { label: 'Welcome Offer', value: 3910 },
    { label: 'Birthday Bonus', value: 2740 },
    { label: 'Steakhouse Dwell', value: 1560 },
  ];

  const funnel = [
    { label: 'Sent', value: 12000 },
    { label: 'Opened', value: 7200 },
    { label: 'Tapped', value: 3100 },
    { label: 'Redeemed', value: 940 },
  ];

  return (
    <div>
      <PageHeader
        kicker="ANL"
        title="Analytics"
        subtitle="Engagement, revenue and campaign funnels."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardBody>
              <div className="kicker mb-1.5">{k.label}</div>
              <div className="display text-[28px] font-semibold text-text">{k.value}</div>
              <div
                className={`mt-1 flex items-center gap-1 text-[12px] ${k.up ? 'text-green' : 'text-red'}`}
              >
                {k.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {Math.abs(k.delta)}%
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="Daily Active Users" subtitle="This month vs last (dashed)" />
          <CardBody>
            <DualLine current={DAU_THIS} previous={DAU_LAST} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Revenue by Channel" />
          <CardBody className="pt-4">
            <Donut segments={revenue} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top Promotions" subtitle="Redemptions" />
          <CardBody className="pt-4">
            <Bars data={topPromos} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Push Performance" subtitle="Funnel" />
          <CardBody className="pt-4">
            <Bars data={funnel} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
