import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { usePreviewBriefMutation, useListConciergeAnswersQuery } from './conciergeApi';
import {
  ACCENT_TOKENS,
  TONES,
  WEIGHT_KEYS,
  buildConciergeConfig,
  parseConciergeConfig,
  type StudioState,
  type WeightKey,
} from './studio';

import type { AdminAnswer } from './conciergeApi';

import { Can } from '@/auth/Can';
import { useHasPermission } from '@/auth/useAuth';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  StatusPill,
  Table,
  Toggle,
  useToast,
  type Column,
} from '@/components/ui';
import { useGetConfigQuery, useUpdateConfigMutation } from '@/features/casinos/configApi';

const WEIGHT_LABELS: Record<WeightKey, string> = {
  value_at_risk: 'Value at risk',
  weather_fit: 'Weather fit',
  travel_fit: 'Travel fit',
  tier_urgency: 'Tier urgency',
};

export function ConciergeStudioScreen() {
  const { toast } = useToast();
  const { data: config } = useGetConfigQuery();
  const [updateConfig] = useUpdateConfigMutation();
  const [previewBrief, previewState] = usePreviewBriefMutation();
  const canUpdate = useHasPermission('tenant_config:update');

  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<StudioState>(() => parseConciergeConfig(undefined));
  const [busy, setBusy] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (config && !seeded.current) {
      seeded.current = true;
      setEnabled(Boolean((config.feature_flags ?? {}).concierge));
      setState(parseConciergeConfig(config.concierge as Record<string, unknown>));
    }
  }, [config]);

  // Live preview: weight changes re-run the what-if brief (debounced; admin-only endpoint).
  useEffect(() => {
    if (!canUpdate) return;
    const timer = setTimeout(() => {
      void previewBrief({ weights: state.weights });
    }, 500);
    return () => clearTimeout(timer);
  }, [state.weights, canUpdate, previewBrief]);

  const publish = async () => {
    setBusy(true);
    try {
      await updateConfig({
        feature_flags: { ...(config?.feature_flags ?? {}), concierge: enabled },
        concierge: buildConciergeConfig(state),
      }).unwrap();
      toast('Published — manifest version bumped');
    } catch {
      toast('Publish failed (is the backend running?)', 'error');
    } finally {
      setBusy(false);
    }
  };

  const preview = previewState.data;

  return (
    <div>
      <PageHeader
        kicker="AI"
        title="Concierge Studio"
        subtitle="Persona, scoring weights and guardrails for the in-app concierge."
        actions={
          <Can permission="tenant_config:update">
            <Button variant="primary" disabled={busy} onClick={() => void publish()}>
              Publish
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Concierge"
              subtitle="Writes the `concierge` feature flag; publish bumps the manifest."
            />
            <CardBody className="pt-3">
              <Can
                permission="tenant_config:update"
                fallback={<Toggle checked={enabled} onChange={() => {}} disabled label="Enabled" />}
              >
                <Toggle checked={enabled} onChange={setEnabled} label="Enabled" />
              </Can>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Persona" subtitle="Tenant-branded; never hardcoded in the app." />
            <CardBody className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-3">
              <Field label="Name">
                <Input
                  value={state.persona.name}
                  onChange={(e) =>
                    setState((s) => ({ ...s, persona: { ...s.persona, name: e.target.value } }))
                  }
                  placeholder="Aria"
                />
              </Field>
              <Field label="Tone">
                <Select
                  value={state.persona.tone}
                  onChange={(e) =>
                    setState((s) => ({ ...s, persona: { ...s.persona, tone: e.target.value } }))
                  }
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Orb accent token">
                <Select
                  value={state.persona.accentToken}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      persona: { ...s.persona, accentToken: e.target.value },
                    }))
                  }
                >
                  {ACCENT_TOKENS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Scoring weights"
              subtitle="visit_fit = Σ weight × component — preview updates live."
            />
            <CardBody className="space-y-4 pt-3">
              {WEIGHT_KEYS.map((key) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-label uppercase text-muted">
                    <span>{WEIGHT_LABELS[key]}</span>
                    <span className="font-mono text-text2">{state.weights[key].toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.weights[key]}
                    disabled={!canUpdate}
                    aria-label={WEIGHT_LABELS[key]}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        weights: { ...s.weights, [key]: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-[var(--gold-fill)]"
                  />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Guardrails" />
            <CardBody className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Quiet hours start">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={state.guardrails.quietStart}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        guardrails: { ...s.guardrails, quietStart: Number(e.target.value) },
                      }))
                    }
                  />
                </Field>
                <Field label="Quiet hours end">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={state.guardrails.quietEnd}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        guardrails: { ...s.guardrails, quietEnd: Number(e.target.value) },
                      }))
                    }
                  />
                </Field>
                <Field label="Nudge cap / day">
                  <Input
                    type="number"
                    min={0}
                    value={state.guardrails.frequencyCap}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        guardrails: { ...s.guardrails, frequencyCap: Number(e.target.value) },
                      }))
                    }
                  />
                </Field>
              </div>
              {/* RG policy is enforced server-side and is deliberately NOT configurable. */}
              <div className="flex items-center gap-3 rounded-control bg-panel2 px-3 py-2">
                <ShieldCheck size={16} className="text-green" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-text">Responsible gaming</div>
                  <div className="text-[12px] text-muted">
                    Self-excluded, cooling-off, or limit-flagged players never receive visit nudges
                    — the server enforces a neutral brief.
                  </div>
                </div>
                <StatusPill tone="green" dot={false} tag>
                  Enforced
                </StatusPill>
              </div>
            </CardBody>
          </Card>

          <Can permission="audit_logs:read">
            <Card>
              <CardHeader
                title="Recent answers"
                subtitle="Append-only concierge_answers audit trail."
              />
              <CardBody className="pt-3">
                <AnswersTable />
              </CardBody>
            </Card>
          </Can>
        </div>

        {/* Live preview panel — runs the real orchestrator for a seed player (what-if mode). */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card accent="var(--gold-fill)">
            <CardHeader
              title="Live preview"
              subtitle="Brief for a seed player with the weights above."
              action={
                <Can permission="tenant_config:update">
                  <Button
                    size="sm"
                    icon={<RefreshCw size={14} />}
                    disabled={previewState.isLoading}
                    onClick={() => void previewBrief({ weights: state.weights })}
                  >
                    Refresh
                  </Button>
                </Can>
              }
            />
            <CardBody className="space-y-3 pt-3">
              {!canUpdate ? (
                <p className="text-[12px] text-muted">
                  Preview requires the tenant_config:update permission.
                </p>
              ) : preview ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[34px] font-bold text-gold">
                      {preview.fit_score ?? '—'}
                    </span>
                    <span className="text-[12px] uppercase text-muted">
                      visit fit · {preview.confidence}
                    </span>
                  </div>
                  <p className="text-[13px] text-text2">{preview.verdict}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.reasons.map((r) => (
                      <StatusPill key={r.code + r.chip} tone="gold" dot={false} tag>
                        {r.chip}
                      </StatusPill>
                    ))}
                  </div>
                  {preview.degraded.length > 0 && (
                    <p className="text-[11px] text-muted">
                      Degraded: {preview.degraded.join(', ')}
                    </p>
                  )}
                  <p className="text-[11px] text-muted">
                    Sources: {preview.sources.join(' · ') || '—'}
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-muted">
                  {previewState.isLoading
                    ? 'Computing…'
                    : 'Adjust a weight (or press Refresh) to preview. Needs at least one player.'}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AnswersTable() {
  const { data: answers = [], isLoading } = useListConciergeAnswersQuery();
  const columns: Column<AdminAnswer>[] = [
    {
      key: 'ts',
      header: 'When',
      render: (a) => (
        <span className="font-mono text-[12px] text-muted">
          {new Date(a.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'use_case',
      header: 'Use case',
      render: (a) => (
        <StatusPill tone="blue" dot={false} tag>
          {a.use_case}
        </StatusPill>
      ),
    },
    {
      key: 'fit',
      header: 'Fit',
      align: 'right',
      render: (a) => <span className="font-mono text-text2">{a.fit_score ?? '—'}</span>,
    },
    {
      key: 'verdict',
      header: 'Verdict',
      render: (a) => <span className="text-[12px] text-text2">{a.verdict}</span>,
    },
  ];
  return (
    <Table
      columns={columns}
      rows={answers}
      rowKey={(a) => a.id}
      empty={isLoading ? 'Loading…' : 'No concierge answers yet.'}
    />
  );
}
