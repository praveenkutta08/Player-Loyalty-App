import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { usePresignMediaMutation } from '../media/mediaApi';

import {
  ENVIRONMENT_THEMES,
  SPLASH_VARIANTS,
  VARIANT_META,
  clampDuration,
  DURATION_MAX_MS,
  DURATION_MIN_MS,
  type SplashState,
} from './splash';

import { Button, Card, CardBody, CardHeader, Field, Input, Label, Select } from '@/components/ui';

/**
 * "Splash Screen" section of Theme Management (P7.2): a 4-card variant gallery (animated
 * thumbnail per variant) + the config form (logo via Media Library upload, gradient, tagline,
 * duration slider labeled as a rescale, and — journey only — the environment picker).
 */
export function SplashSection({
  splash,
  onChange,
  gold,
}: {
  splash: SplashState;
  onChange: (next: SplashState) => void;
  gold: string;
}) {
  const [presign] = usePresignMediaMutation();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof SplashState>(key: K, value: SplashState[K]) =>
    onChange({ ...splash, [key]: value });

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const res = await presign({ filename: file.name, content_type: file.type }).unwrap();
      await fetch(res.upload_url, { method: 'PUT', body: file });
      onChange({ ...splash, logoAssetId: res.key });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Splash Screen"
        subtitle="Tenant-selected cold-start experience — delivered via the manifest, no rebuild."
      />
      <CardBody className="space-y-4 pt-3">
        {/* Variant gallery */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {SPLASH_VARIANTS.map((variant) => (
            <button
              key={variant}
              onClick={() => set('variant', variant)}
              data-testid={`splash-variant-${variant}`}
              className={`rounded-card border p-3 text-left ${
                splash.variant === variant ? 'border-gold bg-gold-dim' : 'border-border bg-panel2'
              }`}
            >
              <VariantThumb variant={variant} gold={gold} />
              <div className="mt-2 text-[13px] font-semibold text-text">
                {VARIANT_META[variant].label}
              </div>
              <div className="text-[11px] text-muted">{VARIANT_META[variant].hint}</div>
            </button>
          ))}
        </div>

        {/* Config form */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Logo (Media Library)</Label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                icon={<Upload size={14} />}
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Uploading…' : splash.logoAssetId ? 'Replace' : 'Upload'}
              </Button>
              <span className="truncate font-mono text-[11px] text-muted">
                {splash.logoAssetId ?? 'No logo — monogram fallback'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/svg+xml,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadLogo(file);
                }}
              />
            </div>
          </div>
          <Field label="Tagline (optional)">
            <Input
              value={splash.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="GRAND RESORT & CLUB"
            />
          </Field>
          <div>
            <Label>Background gradient (top → bottom)</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={splash.backgroundTop}
                onChange={(e) => set('backgroundTop', e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-control border border-border bg-transparent p-0.5"
                aria-label="Background top"
              />
              <input
                type="color"
                value={splash.backgroundBottom}
                onChange={(e) => set('backgroundBottom', e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-control border border-border bg-transparent p-0.5"
                aria-label="Background bottom"
              />
              <span className="font-mono text-[11px] text-muted">
                {splash.backgroundTop} → {splash.backgroundBottom}
              </span>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-label uppercase text-muted">
              <span>Duration — rescales the animation</span>
              <span className="font-mono text-text2">
                {splash.durationMs == null
                  ? `native ${(VARIANT_META[splash.variant].nativeMs / 1000).toFixed(1)}s`
                  : `${(splash.durationMs / 1000).toFixed(1)}s`}
              </span>
            </div>
            <input
              type="range"
              min={DURATION_MIN_MS}
              max={DURATION_MAX_MS}
              step={100}
              value={splash.durationMs ?? VARIANT_META[splash.variant].nativeMs}
              onChange={(e) => set('durationMs', clampDuration(Number(e.target.value)))}
              className="w-full accent-[var(--gold-fill)]"
              aria-label="Animation duration"
            />
          </div>
          {splash.variant === 'journey' ? (
            <Field label="Environment theme (journey)">
              <Select
                value={splash.environmentTheme}
                onChange={(e) =>
                  set('environmentTheme', e.target.value as SplashState['environmentTheme'])
                }
              >
                {ENVIRONMENT_THEMES.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

/** Tiny looping CSS thumbnail per variant — enough motion to tell them apart at a glance. */
function VariantThumb({ variant, gold }: { variant: string; gold: string }) {
  return (
    <div className="relative h-16 overflow-hidden rounded-control bg-[#0a0710]">
      <style>{THUMB_KEYFRAMES}</style>
      {variant === 'silk' && (
        <div
          className="absolute left-[-40%] top-[40%] h-4 w-[180%] rounded-[50%] blur-[4px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${gold}88, transparent)`,
            animation: 'thumb-drift 2.4s ease-in-out infinite alternate',
          }}
        />
      )}
      {variant === 'portal' && (
        <div
          className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ borderColor: gold, animation: 'thumb-pulse 2.2s ease-out infinite' }}
        />
      )}
      {variant === 'collection' && (
        <>
          <div
            className="absolute left-1/2 top-1/2 h-6 w-10 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] rounded-sm"
            style={{ background: `${gold}44`, animation: 'thumb-drop 2.4s ease-in-out infinite' }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-6 w-10 -translate-x-1/2 -translate-y-1/2 rotate-[3deg] rounded-sm border border-white/30"
            style={{
              background: `${gold}77`,
              animation: 'thumb-drop 2.4s ease-in-out infinite .15s',
            }}
          />
        </>
      )}
      {variant === 'journey' && (
        <svg viewBox="0 0 100 40" className="absolute inset-0 h-full w-full">
          <path d="M0 30 Q25 24 50 30 Q75 35 100 28 L100 40 L0 40 Z" fill={`${gold}33`} />
          <circle r="2" fill={gold} style={{ animation: 'thumb-travel 2.6s linear infinite' }}>
            <animateMotion dur="2.6s" repeatCount="indefinite" path="M10 34 Q50 26 62 14" />
          </circle>
        </svg>
      )}
    </div>
  );
}

const THUMB_KEYFRAMES = `
@keyframes thumb-drift { from { transform: translateX(-8%); opacity:.4; } to { transform: translateX(8%); opacity:.9; } }
@keyframes thumb-pulse { 0% { transform: translate(-50%,-50%) scale(.55); opacity: 0; }
  45% { opacity: .95; } 100% { transform: translate(-50%,-50%) scale(1.15); opacity: 0; } }
@keyframes thumb-drop { 0% { margin-top: -26px; opacity: 0; } 30% { opacity: 1; }
  60%,100% { margin-top: 0; opacity: 1; } }
@keyframes thumb-travel { from { opacity: .4; } to { opacity: 1; } }
`;
