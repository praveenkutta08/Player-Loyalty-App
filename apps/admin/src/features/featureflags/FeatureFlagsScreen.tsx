import { useMemo } from 'react';

import { FLAGS } from './flags';

import { useAppSelector } from '@/app/store';
import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, StatusPill, Toggle, useToast } from '@/components/ui';
import { useGetConfigQuery, useUpdateConfigMutation } from '@/features/casinos/configApi';

export function FeatureFlagsScreen() {
  const { toast } = useToast();
  const activeTenantId = useAppSelector((s) => s.session.activeTenantId);
  const tenantName =
    useAppSelector((s) => s.session.tenants.find((t) => t.id === activeTenantId)?.name) ??
    'the active casino';
  const { data: config, isLoading } = useGetConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateConfigMutation();

  const flags = useMemo(() => (config?.feature_flags ?? {}) as Record<string, boolean>, [config]);

  const setFlag = async (key: string, value: boolean) => {
    try {
      await updateConfig({ feature_flags: { ...flags, [key]: value } }).unwrap();
      toast(`${key} ${value ? 'enabled' : 'disabled'}`);
    } catch {
      toast('Could not update flag (is the backend running?)', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        kicker="FLG"
        title="Feature Flags"
        subtitle={`Per-casino feature rollout — ${tenantName}.`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FLAGS.map((flag) => {
          const on = Boolean(flags[flag.key]);
          return (
            <Card key={flag.key}>
              <CardBody className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[14px] font-bold text-text">{flag.name}</span>
                    <StatusPill tone="neutral" dot={false} tag>
                      {flag.tag}
                    </StatusPill>
                  </div>
                  <p className="mb-2 text-[12px] text-muted">{flag.description}</p>
                  {/* Backend stores booleans — no rollout %. Show only the real on/off state (M12). */}
                  <div className="flex items-center gap-2 text-[11px] text-faint">
                    <StatusPill tone={on ? 'green' : 'neutral'}>{on ? 'Live' : 'Off'}</StatusPill>
                  </div>
                </div>
                <Can
                  permission="tenant_config:update"
                  fallback={<Toggle checked={on} onChange={() => {}} disabled label={flag.name} />}
                >
                  <Toggle
                    checked={on}
                    onChange={(v) => void setFlag(flag.key, v)}
                    disabled={isLoading || saving}
                    label={flag.name}
                  />
                </Can>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {!config && !isLoading && (
        <p className="mt-4 text-[12px] text-faint">
          No config loaded. Feature flags read/write <span className="font-mono">/config</span> for
          the selected casino; start the backend and pick a casino to edit live values.
        </p>
      )}
    </div>
  );
}
