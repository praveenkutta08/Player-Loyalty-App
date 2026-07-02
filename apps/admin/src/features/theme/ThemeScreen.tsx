import { useEffect, useRef, useState } from 'react';

import { useUpdateAppearanceMutation } from './appearanceApi';
import { MobilePreview } from './MobilePreview';
import { TYPOGRAPHY_PAIRINGS } from './pairings';
import { buildSplashPayload, parseSplash, DEFAULT_SPLASH_STATE, type SplashState } from './splash';
import { SplashPreview } from './SplashPreview';
import { SplashSection } from './SplashSection';
import {
  useActivateThemeMutation,
  useCreateThemeMutation,
  useListThemesQuery,
  useUpdateThemeMutation,
} from './themesApi';
import { DEFAULT_TOKENS, fromTokens, toTokens, type BrandTokens } from './tokens';

import { useAppSelector } from '@/app/store';
import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, CardBody, CardHeader, Input, Label, Tabs, useToast } from '@/components/ui';
import { useGetConfigQuery } from '@/features/casinos/configApi';

export function ThemeScreen() {
  const { toast } = useToast();
  const activeTenantId = useAppSelector((s) => s.session.activeTenantId);
  const brandName =
    useAppSelector((s) => s.session.tenants.find((t) => t.id === activeTenantId)?.name) ?? 'Casino';

  const { data: themes } = useListThemesQuery();
  const { data: config } = useGetConfigQuery();
  const [createTheme] = useCreateThemeMutation();
  const [updateTheme] = useUpdateThemeMutation();
  const [activateTheme] = useActivateThemeMutation();
  const [updateAppearance] = useUpdateAppearanceMutation();

  const [name, setName] = useState('Casino Luxe');
  const [tokens, setTokens] = useState<BrandTokens>(DEFAULT_TOKENS);
  const [splash, setSplash] = useState<SplashState>(DEFAULT_SPLASH_STATE);
  const [previewMode, setPreviewMode] = useState('splash');
  const [busy, setBusy] = useState(false);
  const themesSeeded = useRef(false);
  const splashSeeded = useRef(false);

  // Seed the editor once from the active (or first) theme when themes load.
  useEffect(() => {
    if (themesSeeded.current || !themes) return;
    const active = themes.find((t) => t.is_active) ?? themes[0];
    if (active) {
      setName(active.name);
      setTokens(fromTokens(active.tokens as Record<string, unknown>));
    }
    themesSeeded.current = true;
  }, [themes]);

  // Seed splash + pairing from the stored appearance config.
  useEffect(() => {
    if (splashSeeded.current || !config) return;
    const appearance = (config.appearance ?? {}) as Record<string, Record<string, unknown>>;
    setSplash(parseSplash(appearance.splash));
    const pairing = (appearance.typography ?? {}).pairing;
    if (typeof pairing === 'string') setTokens((t) => ({ ...t, pairing }));
    splashSeeded.current = true;
  }, [config]);

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
        // Publish = theme tokens + the appearance block (splash, pairing) in one action.
        await updateAppearance({
          splash: buildSplashPayload(splash),
          typography_pairing: tokens.pairing,
        }).unwrap();
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

          {/* P7.2 typography retrofit: a curated pairing GALLERY (bundled, open-license fonts).
              No free-form family input, no uploads — sizes/weights stay token values. */}
          <Card>
            <CardHeader
              title="Typography"
              subtitle="Curated pairings bundled in the app — custom fonts are a later enterprise phase."
            />
            <CardBody className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
              {TYPOGRAPHY_PAIRINGS.map((pairing) => (
                <button
                  key={pairing.key}
                  onClick={() => set('pairing', pairing.key)}
                  data-testid={`pairing-${pairing.key}`}
                  className={`rounded-card border p-4 text-left ${
                    tokens.pairing === pairing.key
                      ? 'border-gold bg-gold-dim'
                      : 'border-border bg-panel2'
                  }`}
                >
                  <div
                    className="text-[20px] text-text"
                    style={{ fontFamily: `'${pairing.display}', serif` }}
                  >
                    {brandName}
                  </div>
                  <div
                    className="text-[12px] text-text2"
                    style={{ fontFamily: `'${pairing.sans}', sans-serif` }}
                  >
                    Your rewards, dining and reservations.
                  </div>
                  <div className="mt-2 text-[12px] font-semibold text-text">{pairing.label}</div>
                  <div className="text-[11px] text-muted">
                    {pairing.display} + {pairing.sans} — {pairing.hint}
                  </div>
                </button>
              ))}
            </CardBody>
          </Card>

          <SplashSection splash={splash} onChange={setSplash} gold={tokens.gold} />

          <Card>
            <CardHeader title="Theme" />
            <CardBody className="pt-3">
              <Label>Theme name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </CardBody>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2">
            <Tabs
              items={[
                { key: 'splash', label: 'Splash' },
                { key: 'home', label: 'Home' },
              ]}
              value={previewMode}
              onChange={setPreviewMode}
            />
          </div>
          {previewMode === 'splash' ? (
            <SplashPreview splash={splash} brandName={brandName} gold={tokens.gold} />
          ) : (
            <MobilePreview tokens={tokens} brandName={brandName} />
          )}
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
