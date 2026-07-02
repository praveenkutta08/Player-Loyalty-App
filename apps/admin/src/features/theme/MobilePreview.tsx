import { Gift, Home, QrCode, User, Utensils } from 'lucide-react';

import type { BrandTokens } from './tokens';

/** Live phone preview of the themed player home, rendered purely from the edited brand tokens. */
export function MobilePreview({ tokens, brandName }: { tokens: BrandTokens; brandName: string }) {
  return (
    <div
      className="mx-auto w-[280px] overflow-hidden rounded-[32px] border-4 shadow-md"
      style={{ borderColor: tokens.surface, background: tokens.bg, color: tokens.text }}
    >
      {/* Notch */}
      <div className="flex justify-center py-2">
        <span className="h-1.5 w-16 rounded-full" style={{ background: tokens.surface }} />
      </div>

      <div className="px-4 pb-4">
        {/* Hero */}
        <div
          className="mb-3 rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.gold})` }}
        >
          <div
            className="text-[16px] font-semibold"
            style={{ fontFamily: `'${tokens.fontDisplay}', serif`, color: '#1a1408' }}
          >
            {brandName}
          </div>
          <div className="text-[11px]" style={{ color: '#1a1408', opacity: 0.8 }}>
            Welcome back — your rewards await
          </div>
        </div>

        {/* Loyalty card */}
        <div
          className="mb-3 rounded-xl border p-3"
          style={{ background: tokens.surface, borderColor: tokens.gold }}
        >
          <div className="text-[10px] uppercase tracking-wide" style={{ color: tokens.gold }}>
            Gold Tier
          </div>
          <div
            className="text-[20px] font-semibold"
            style={{ fontFamily: `'${tokens.fontDisplay}', serif` }}
          >
            12,480 pts
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[
            { icon: QrCode, label: 'Scan' },
            { icon: Gift, label: 'Offers' },
            { icon: Utensils, label: 'Dining' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5"
              style={{ background: tokens.surface }}
            >
              <Icon size={18} style={{ color: tokens.gold }} />
              <span
                className="text-[10px]"
                style={{ fontFamily: `'${tokens.fontBody}', sans-serif` }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom nav (style variant) */}
        <div
          className="flex items-center justify-around rounded-2xl px-2 py-2"
          style={{
            background: tokens.navStyle === 'minimal' ? 'transparent' : tokens.surface,
            border: tokens.navStyle === 'floating' ? `1px solid ${tokens.gold}` : 'none',
          }}
        >
          {[Home, Gift, QrCode, User].map((Icon, i) => (
            <Icon
              key={i}
              size={18}
              style={{ color: i === 0 ? tokens.gold : tokens.text, opacity: i === 0 ? 1 : 0.5 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
