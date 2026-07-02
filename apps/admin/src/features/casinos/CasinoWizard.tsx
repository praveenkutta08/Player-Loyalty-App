import { Check, Rocket } from 'lucide-react';
import { useState } from 'react';

import { Monogram } from './Monogram';

import { Button, Card, CardBody, Field, Input, Toggle, useToast } from '@/components/ui';
import { FLAGS } from '@/features/featureflags/flags';

const STEPS = ['Property Basics', 'Branding', 'Features', 'Theme', 'Review & Launch'] as const;

const THEME_PRESETS = [
  { key: 'luxe', name: 'Casino Luxe', color: '#E6B450' },
  { key: 'ruby', name: 'Ruby Nights', color: '#e5736b' },
  { key: 'emerald', name: 'Emerald Club', color: '#5cc48f' },
  { key: 'sapphire', name: 'Sapphire Bay', color: '#6aa6e8' },
];

interface WizardState {
  name: string;
  slug: string;
  location: string;
  primaryColor: string;
  flags: Record<string, boolean>;
  theme: string;
}

export function CasinoWizard({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    name: '',
    slug: '',
    location: '',
    primaryColor: '#E6B450',
    flags: { cardless: true, geofencing: true },
    theme: 'luxe',
  });

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const canContinue = step !== 0 || (state.name.trim() !== '' && state.slug.trim() !== '');
  const isLast = step === STEPS.length - 1;

  const launch = () => {
    // No tenant provisioning endpoint in the P1–P2 backend yet; this validates + confirms the flow.
    // Wires to POST /tenants (tenants:create) once that endpoint ships (GOLDEN RULE #7).
    toast(`${state.name || 'New casino'} queued for launch`);
    onDone();
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      {/* Stepper */}
      <ol className="space-y-1">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label}>
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-[13px] ${
                  active ? 'bg-gold-dim text-gold' : done ? 'text-text2' : 'text-faint'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    done
                      ? 'bg-green text-gold-ink'
                      : active
                        ? 'bg-gold-fill text-gold-ink'
                        : 'border border-border text-faint'
                  }`}
                >
                  {done ? <Check size={13} /> : i + 1}
                </span>
                <span className="font-semibold">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <Card>
        <CardBody className="min-h-[360px]">
          {step === 0 && (
            <div className="max-w-md space-y-4">
              <h2 className="display text-[18px] font-semibold text-text">Property Basics</h2>
              <Field label="Casino name">
                <Input
                  value={state.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    set('name', name);
                    if (!state.slug || state.slug === slugify(state.name))
                      set('slug', slugify(name));
                  }}
                  placeholder="Aurora Bay Resort"
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={state.slug}
                  onChange={(e) => set('slug', slugify(e.target.value))}
                  placeholder="aurora-bay"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={state.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="Atlantic City, NJ"
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="display text-[18px] font-semibold text-text">Branding</h2>
              <div className="flex items-center gap-4">
                <Monogram name={state.name || 'New Casino'} size={56} />
                <div>
                  <div className="text-[13px] font-semibold text-text">
                    {state.name || 'New Casino'}
                  </div>
                  <div className="text-[12px] text-muted">Logo & monogram preview</div>
                </div>
              </div>
              <Field label="Primary color">
                <div className="flex items-center gap-2">
                  {['#E6B450', '#e5736b', '#5cc48f', '#6aa6e8', '#b08ae0'].map((c) => (
                    <button
                      key={c}
                      onClick={() => set('primaryColor', c)}
                      className={`h-8 w-8 rounded-full ${state.primaryColor === c ? 'ring-2 ring-gold ring-offset-2 ring-offset-panel' : ''}`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="display text-[18px] font-semibold text-text">Features</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {FLAGS.map((flag) => (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between gap-3 rounded-control border border-border bg-panel2 px-3 py-2.5"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-text">{flag.name}</div>
                      <div className="text-[11px] text-muted">{flag.tag}</div>
                    </div>
                    <Toggle
                      checked={Boolean(state.flags[flag.key])}
                      onChange={(v) => set('flags', { ...state.flags, [flag.key]: v })}
                      label={flag.name}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="display text-[18px] font-semibold text-text">Theme</h2>
              <div className="grid grid-cols-2 gap-3">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => set('theme', preset.key)}
                    className={`flex items-center gap-3 rounded-card border p-3 text-left ${
                      state.theme === preset.key
                        ? 'border-gold bg-gold-dim'
                        : 'border-border bg-panel2'
                    }`}
                  >
                    <span
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-[13px] font-semibold text-text">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="display text-[18px] font-semibold text-text">Review & Launch</h2>
              <div className="rounded-card border border-border bg-panel2 p-4 text-[13px]">
                <Row label="Name" value={state.name || '—'} />
                <Row label="Slug" value={state.slug || '—'} />
                <Row label="Location" value={state.location || '—'} />
                <Row
                  label="Features"
                  value={
                    Object.entries(state.flags)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(', ') || 'none'
                  }
                />
                <Row
                  label="Theme"
                  value={THEME_PRESETS.find((t) => t.key === state.theme)?.name ?? '—'}
                />
              </div>
              <div className="flex items-center gap-2 rounded-control border border-gold bg-gold-dim px-3 py-2.5 text-[12px] text-gold">
                <Rocket size={15} /> Ready to launch. This creates the tenant, config and default
                theme.
              </div>
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button onClick={step === 0 ? onDone : () => setStep((s) => s - 1)}>
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>
            {isLast ? (
              <Button variant="primary" icon={<Rocket size={16} />} onClick={launch}>
                Launch Casino
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border-soft py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
