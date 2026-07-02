import { useEffect, useState } from 'react';

import { VARIANT_META, type SplashState } from './splash';

/**
 * Phone-frame splash preview (P7.2) — a WEB RECREATION of the design handoff's variants
 * (design/splash/, esp. Splash Variant Studio.dc.html): close, not pixel-perfect, and labeled
 * "preview". CSS keyframes approximate each timeline using the tenant's actual colors, logo and
 * tagline; the duration slider rescales via animation-duration.
 */
export function SplashPreview({
  splash,
  brandName,
  gold,
  logoUrl,
}: {
  splash: SplashState;
  brandName: string;
  gold: string;
  logoUrl?: string;
}) {
  const [replayKey, setReplayKey] = useState(0);
  useEffect(() => {
    // Restart the animation whenever the config changes.
    setReplayKey((k) => k + 1);
  }, [splash]);

  const duration = (splash.durationMs ?? VARIANT_META[splash.variant].nativeMs) / 1000;
  const bg = `linear-gradient(178deg, ${splash.backgroundTop}, ${splash.backgroundBottom} 72%)`;

  return (
    <div>
      <style>{KEYFRAMES}</style>
      <div
        key={replayKey}
        className="relative mx-auto w-[280px] overflow-hidden rounded-[32px] border-4 border-border shadow-md"
        style={{ background: bg, height: 560 }}
        data-testid="splash-preview"
      >
        {/* Variant-specific decorative layers */}
        {splash.variant === 'silk' && <SilkLayers gold={gold} duration={duration} />}
        {splash.variant === 'portal' && <PortalLayers gold={gold} duration={duration} />}
        {splash.variant === 'collection' && <CollectionLayers gold={gold} duration={duration} />}
        {splash.variant === 'journey' && (
          <JourneyLayers gold={gold} duration={duration} environment={splash.environmentTheme} />
        )}

        {/* Emblem slot (logo from the Media Library, or a placeholder monogram) */}
        <div
          className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{
            animation: `spl-emblem ${duration}s both`,
            clipPath: splash.variant === 'portal' ? undefined : undefined,
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} className="max-h-full max-w-full object-contain" alt="" />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border text-[28px]"
              style={{ borderColor: gold, color: gold, fontFamily: "'Marcellus', serif" }}
            >
              {brandName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* Wordmark block at 60% height (62% for collection) */}
        <div
          className="absolute left-0 right-0 flex flex-col items-center gap-3 px-6 text-center"
          style={{ top: splash.variant === 'collection' ? '62%' : '60%' }}
        >
          <div
            className="text-[20px] uppercase text-[#F3ECDD]"
            style={{
              fontFamily: "'Marcellus', serif",
              letterSpacing: '0.3em',
              animation: `spl-rise ${duration}s both`,
              animationDelay: `${duration * 0.5}s`,
            }}
          >
            {brandName}
          </div>
          <div
            className="h-px w-[54px]"
            style={{
              background: gold,
              animation: `spl-rule ${duration}s both`,
              animationDelay: `${duration * 0.62}s`,
            }}
          />
          {splash.tagline ? (
            <div
              className="text-[9px] uppercase"
              style={{
                color: gold,
                letterSpacing: '0.34em',
                animation: `spl-rise ${duration}s both`,
                animationDelay: `${duration * 0.68}s`,
              }}
            >
              {splash.tagline}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between px-2">
        <span className="text-[11px] uppercase tracking-wide text-faint">
          Preview — close, not pixel-perfect
        </span>
        <button
          className="text-[11px] text-gold hover:underline"
          onClick={() => setReplayKey((k) => k + 1)}
        >
          Replay
        </button>
      </div>
    </div>
  );
}

function SilkLayers({ gold, duration }: { gold: string; duration: number }) {
  const ribbon = (top: string, rotate: number, delay: number, peak: number) => (
    <div
      className="absolute left-[-45%] h-[70px] w-[190%] rounded-[50%]"
      style={{
        top,
        transform: `rotate(${rotate}deg)`,
        background: `linear-gradient(90deg, transparent 4%, ${gold}55 32%, #fffaee99 50%, ${gold}55 68%, transparent 96%)`,
        filter: 'blur(10px)',
        animation: `spl-ribbon ${duration}s both`,
        animationDelay: `${delay}s`,
        opacity: peak,
      }}
    />
  );
  return (
    <>
      {ribbon('34%', -16, 0.1 * duration, 0.4)}
      {ribbon('45%', -10, 0.16 * duration, 0.7)}
      {ribbon('57%', -13, 0.22 * duration, 0.3)}
    </>
  );
}

function PortalLayers({ gold, duration }: { gold: string; duration: number }) {
  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(closest-side, ${gold}44, transparent 72%)`,
          animation: `spl-bloom ${duration}s both`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{
          borderColor: `${gold}D9`,
          boxShadow: `0 0 18px ${gold}4D, inset 0 0 18px ${gold}29`,
          animation: `spl-ring ${duration}s both`,
        }}
      />
    </>
  );
}

function CollectionLayers({ gold, duration }: { gold: string; duration: number }) {
  const card = (rotate: number, delay: number, background: string, z: number) => (
    <div
      className="absolute left-1/2 top-[40%] h-[105px] w-[168px] rounded-xl border border-white/20"
      style={{
        zIndex: z,
        background,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        boxShadow: '0 8px 17px -7px rgba(0,0,0,.75)',
        animation: `spl-card ${duration}s both`,
        animationDelay: `${delay}s`,
      }}
    />
  );
  return (
    <>
      {card(-8, 0, `linear-gradient(135deg, ${gold}38 0%, #0d1019 100%)`, 1)}
      {card(4, 0.06 * duration, `linear-gradient(135deg, ${gold}5C 0%, #10141f 100%)`, 2)}
      {card(-1, 0.12 * duration, `linear-gradient(135deg, #ECEDF1 0%, ${gold}52 100%)`, 3)}
    </>
  );
}

function JourneyLayers({
  gold,
  duration,
  environment,
}: {
  gold: string;
  duration: number;
  environment: string;
}) {
  // Terrain silhouettes per environment (same catalog paths the manifest serves).
  const PATHS: Record<string, { back: string; front: string }> = {
    coast: {
      back: 'M0 172 Q25 164 50 172 Q75 179 100 168 L100 216 L0 216 Z',
      front: 'M0 186 Q30 180 58 187 Q80 192 100 184 L100 216 L0 216 Z',
    },
    mountain: {
      back: 'M0 178 L18 148 L34 172 L52 142 L70 170 L86 154 L100 174 L100 216 L0 216 Z',
      front: 'M0 192 L22 176 L44 190 L68 174 L88 188 L100 182 L100 216 L0 216 Z',
    },
    desert: {
      back: 'M0 176 Q30 154 60 174 Q80 184 100 166 L100 216 L0 216 Z',
      front: 'M0 190 Q35 200 65 186 Q85 178 100 190 L100 216 L0 216 Z',
    },
    skyline: {
      back: 'M0 180 L0 168 L10 168 L10 154 L20 154 L20 172 L32 172 L32 146 L42 146 L42 166 L54 166 L54 152 L64 152 L64 170 L76 170 L76 158 L88 158 L88 174 L100 174 L100 216 L0 216 Z',
      front:
        'M0 196 L14 196 L14 186 L26 186 L26 194 L44 194 L44 182 L58 182 L58 192 L76 192 L76 186 L90 186 L90 196 L100 196 L100 216 L0 216 Z',
    },
    forest: {
      back: 'M0 178 Q8 156 16 178 Q24 158 32 178 Q40 152 50 178 Q58 160 66 178 Q74 154 84 178 Q92 162 100 178 L100 216 L0 216 Z',
      front:
        'M0 194 Q10 180 20 194 Q30 178 40 194 Q50 180 60 194 Q70 178 80 194 Q90 182 100 194 L100 216 L0 216 Z',
    },
  };
  const paths = PATHS[environment] ?? PATHS.coast!;
  return (
    <svg
      viewBox="0 0 100 216"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      style={{ animation: `spl-terrain ${duration}s both` }}
    >
      <path d={paths.back} fill={`${gold}2E`} />
      <path d={paths.front} fill={`${gold}1A`} />
      <path
        d="M14 196 Q70 164 50 108"
        stroke={gold}
        strokeWidth="0.8"
        fill="none"
        strokeDasharray="140"
        strokeDashoffset="140"
        style={{ animation: `spl-path ${duration}s both` }}
      />
    </svg>
  );
}

const KEYFRAMES = `
@keyframes spl-emblem { 0%,30% { opacity: 0; transform: translate(-50%,-46%) scale(.92); filter: blur(6px); }
  60%,100% { opacity: 1; transform: translate(-50%,-50%) scale(1); filter: blur(0); } }
@keyframes spl-rise { 0% { opacity: 0; transform: translateY(8px); } 40%,100% { opacity: 1; transform: translateY(0); } }
@keyframes spl-rule { 0% { transform: scaleX(0); } 40%,100% { transform: scaleX(1); } }
@keyframes spl-ribbon { 0% { opacity: 0; transform: translateX(-18%); } 45% { opacity: .85; }
  100% { opacity: .16; transform: translateX(10%); } }
@keyframes spl-bloom { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.35); }
  40%,100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
@keyframes spl-ring { 0%,15% { opacity: 0; transform: translate(-50%,-50%) scale(.55); }
  50%,100% { opacity: .9; transform: translate(-50%,-50%) scale(1); } }
@keyframes spl-card { 0% { opacity: 0; margin-top: -240px; } 20% { opacity: 1; }
  55%,100% { opacity: 1; margin-top: 0; } }
@keyframes spl-terrain { 0% { opacity: 0; transform: translateY(10px); }
  45%,100% { opacity: 1; transform: translateY(0); } }
@keyframes spl-path { 0%,20% { stroke-dashoffset: 140; opacity: .85; }
  60% { stroke-dashoffset: 0; opacity: .85; } 80%,100% { stroke-dashoffset: 0; opacity: 0; } }
`;
