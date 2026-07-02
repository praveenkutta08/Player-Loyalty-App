import { useEffect, useRef, useState } from 'react';

import { MobilePreview } from './MobilePreview';
import {
  useActivateThemeMutation,
  useCreateThemeMutation,
  useListThemesQuery,
  useUpdateThemeMutation,
} from './themesApi';
import {
  BODY_FONTS,
  DEFAULT_TOKENS,
  DISPLAY_FONTS,
  fromTokens,
  toTokens,
  type BrandTokens,
} from './tokens';

import { useAppSelector } from '@/app/store';
import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Label,
  Select,
  useToast,
} from '@/components/ui';

const NAV_STYLES: { key: BrandTokens['navStyle']; label: string; hint: string }[] = [
  { key: 'tab', label: 'Tab Bar', hint: 'Solid bottom tabs' },
  { key: 'floating', label: 'Floating', hint: 'Elevated pill bar' },
  { key: 'minimal', label: 'Minimal', hint: 'Icons only' },
];

export function ThemeScreen() {
  const { toast } = useToast();
  const activeTenantId = useAppSelector((s) => s.session.activeTenantId);
  const brandName =
    useAppSelector((s) => s.session.tenants.find((t) => t.id === activeTenantId)?.name) ?? 'Casino';

  const { data: themes } = useListThemesQuery();
  const [createTheme] = useCreateThemeMutation();
  const [updateTheme] = useUpdateThemeMutation();
  const [activateTheme] = useActivateThemeMutation();

  const [name, setName] = useState('Casino Luxe');
  const [tokens, setTokens] = useState<BrandTokens>(DEFAULT_TOKENS);
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

  // Seed the editor once from the active (or first) theme when themes load.
  useEffect(() => {
    if (initialized.current || !themes) return;
    const active = themes.find((t) => t.is_active) ?? themes[0];
    if (active) {
      setName(active.name);
      setTokens(fromTokens(active.tokens as Record<string, unknown>));
    }
    initialized.current = true;
  }, [themes]);

  const currentTheme = themes?.find((t) => t.is_active) ?? themes?.[0];
  const set = <K extends keyof BrandTokens>(key: K, value: BrandTokens[K]) =>
    setTokens((t) => ({ ...t, [key]: value }));

  const persist = async (activate: boolean) => {
    setBusy(true);
    try {
      const body = { name, tokens: toTokens(tokens) };
      let id = currentTheme?.id;
      if (id) {
        await updateTheme({ id, body }).unwrap();
      } else {
        const created = await createTheme({ ...body, is_active: false }).unwrap();
        id = created.id;
      }
      if (activate && id) {
        await activateTheme(id).unwrap();
        toast('Published — manifest version bumped');
      } else {
        toast('Draft saved');
      }
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="THM"
        title="Theme Management"
        subtitle={`Brand the ${brandName} app — changes preview live; publishing bumps the manifest.`}
        actions={
          <Can permission="branding:update">
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void persist(false)}>
                Save Draft
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => void persist(true)}
              >
                Publish
              </Button>
            </div>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Brand Colors" />
            <CardBody className="grid grid-cols-2 gap-4 pt-3 sm:grid-cols-3">
              <ColorField
                label="Primary"
                value={tokens.primary}
                onChange={(v) => set('primary', v)}
              />
              <ColorField
                label="Gold / Accent"
                value={tokens.gold}
                onChange={(v) => set('gold', v)}
              />
              <ColorField label="Background" value={tokens.bg} onChange={(v) => set('bg', v)} />
              <ColorField
                label="Surface"
                value={tokens.surface}
                onChange={(v) => set('surface', v)}
              />
              <ColorField label="Text" value={tokens.text} onChange={(v) => set('text', v)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Typography" />
            <CardBody className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
              <Field label="Display font">
                <Select
                  value={tokens.fontDisplay}
                  onChange={(e) => set('fontDisplay', e.target.value)}
                >
                  {DISPLAY_FONTS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Body font">
                <Select value={tokens.fontBody} onChange={(e) => set('fontBody', e.target.value)}>
                  {BODY_FONTS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Navigation Style" />
            <CardBody className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-3">
              {NAV_STYLES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => set('navStyle', s.key)}
                  className={`rounded-card border p-3 text-left ${
                    tokens.navStyle === s.key
                      ? 'border-gold bg-gold-dim'
                      : 'border-border bg-panel2'
                  }`}
                >
                  <div className="text-[13px] font-semibold text-text">{s.label}</div>
                  <div className="text-[11px] text-muted">{s.hint}</div>
                </button>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assets" subtitle="Referenced from the Media Library (P3.13)" />
            <CardBody className="pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Theme name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-card border border-dashed border-border text-[11px] text-muted">
                    Logo
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-card border border-dashed border-border text-[11px] text-muted">
                    Splash
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 text-label uppercase text-muted">Live preview</div>
          <MobilePreview tokens={tokens} brandName={brandName} />
          {currentTheme && (
            <p className="mt-3 text-center text-[11px] text-faint">
              Active theme: <span className="text-text2">{currentTheme.name}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-control border border-border bg-transparent p-0.5"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-[12px]"
        />
      </div>
    </div>
  );
}
