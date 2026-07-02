import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

import { useGetConfigQuery, useUpdateConfigMutation } from './configApi';
import { formatUsd, propertyStats } from './demoStats';
import { Monogram } from './Monogram';

import type { TenantOut } from '@/auth/types';

import { Can } from '@/auth/Can';
import { Button, Card, CardBody, CardHeader, StatusPill, Toggle, useToast } from '@/components/ui';
import { FLAGS } from '@/features/featureflags/flags';

// Mock publishing history (audit pipeline is P3.17). Kept illustrative here.
const DOT: Record<string, string> = {
  green: 'bg-green',
  gold: 'bg-gold',
  blue: 'bg-blue',
  neutral: 'bg-muted',
};

const HISTORY = [
  { at: '2h ago', label: 'Theme published', tone: 'green' },
  { at: 'Yesterday', label: 'Welcome offer updated', tone: 'gold' },
  { at: '3d ago', label: 'Homepage layout published', tone: 'blue' },
  { at: '1w ago', label: 'Casino created', tone: 'neutral' },
];

export function CasinoDetail({ tenant, onBack }: { tenant: TenantOut; onBack: () => void }) {
  const { toast } = useToast();
  // Config targets the acting tenant, which the parent set to this property before rendering.
  const { data: config } = useGetConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateConfigMutation();
  const stats = useMemo(() => propertyStats(tenant.id), [tenant.id]);
  const flags = (config?.feature_flags ?? {}) as Record<string, boolean>;

  const setFlag = async (key: string, value: boolean) => {
    try {
      await updateConfig({ feature_flags: { ...flags, [key]: value } }).unwrap();
      toast(`${key} ${value ? 'enabled' : 'disabled'}`);
    } catch {
      toast('Could not update (is the backend running?)', 'error');
    }
  };

  const statCards = [
    { label: 'Members', value: stats.members.toLocaleString() },
    { label: 'Revenue · MTD', value: formatUsd(stats.revenueMtdCents) },
    { label: 'Active offers', value: String(stats.activeOffers) },
    { label: 'App version', value: `v${stats.appVersion}` },
  ];

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-text"
      >
        <ArrowLeft size={15} /> Back to directory
      </button>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Monogram name={tenant.name} size={56} />
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="display text-[24px] font-semibold text-text">{tenant.name}</h1>
            <StatusPill tone={tenant.status === 'active' ? 'green' : 'gold'}>
              {tenant.status}
            </StatusPill>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[12px] text-muted">
            <span className="font-mono">{tenant.slug}</span>
            <span className="font-mono text-faint">{tenant.id}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm">Publish History</Button>
          <Can permission="tenant_config:update">
            <Button size="sm" variant="primary">
              Edit
            </Button>
          </Can>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <Card key={s.label} accent={i === 0 ? 'var(--gold-fill)' : undefined}>
            <CardBody>
              <div className="kicker mb-1.5">{s.label}</div>
              <div className="display text-[26px] font-semibold text-text">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Feature config + publishing history */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Feature Configuration" subtitle="Live per-casino flags" />
          <CardBody className="space-y-3 pt-3">
            {FLAGS.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[13px] font-semibold text-text">{flag.name}</div>
                  <div className="text-[12px] text-muted">{flag.description}</div>
                </div>
                <Can
                  permission="tenant_config:update"
                  fallback={
                    <Toggle checked={Boolean(flags[flag.key])} onChange={() => {}} disabled />
                  }
                >
                  <Toggle
                    checked={Boolean(flags[flag.key])}
                    onChange={(v) => void setFlag(flag.key, v)}
                    disabled={saving}
                    label={flag.name}
                  />
                </Can>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Publishing History" />
          <CardBody className="pt-3">
            <ol className="relative ml-1 space-y-4 border-l border-border pl-4">
              {HISTORY.map((h) => (
                <li key={h.label} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${DOT[h.tone]}`}
                  />
                  <div className="text-[13px] font-medium text-text">{h.label}</div>
                  <div className="text-[11px] text-faint">{h.at}</div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
