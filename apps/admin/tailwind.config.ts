import type { Config } from 'tailwindcss';

// Every color maps to a CSS custom property defined in src/styles/tokens.css (light + dark under
// `data-theme`). Components use Tailwind utility names; the actual values come from the token
// layer, so there are NO hardcoded colors anywhere in the component tree (design-system rule).
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        content: 'var(--content)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        input: 'var(--input)',
        border: 'var(--border)',
        'border-soft': 'var(--border-soft)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        text2: 'var(--text2)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        gold: 'var(--gold)',
        'gold-fill': 'var(--gold-fill)',
        'gold-bright': 'var(--gold-bright)',
        'gold-ink': 'var(--gold-ink)',
        'nav-active': 'var(--nav-active-bg)',
        green: 'var(--green)',
        red: 'var(--red)',
        blue: 'var(--blue)',
        purple: 'var(--purple)',
        warning: 'var(--gold)',
      },
      backgroundColor: {
        'gold-dim': 'var(--gold-dim)',
        'green-dim': 'var(--green-dim)',
        'red-dim': 'var(--red-dim)',
        'blue-dim': 'var(--blue-dim)',
        'purple-dim': 'var(--purple-dim)',
        track: 'var(--track-empty)',
      },
      borderColor: {
        gold: 'var(--gold-border)',
      },
      fontFamily: {
        display: ['"Bodoni Moda"', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        kicker: ['10.5px', { lineHeight: '13px', letterSpacing: '0.16em' }],
        label: ['11px', { lineHeight: '14px', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        control: '9px',
        card: '15px',
        pill: '20px',
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        md: '0 8px 24px rgba(0,0,0,0.30)',
        'gold-glow': '0 0 0 1px var(--gold-border)',
      },
      maxWidth: {
        content: '1500px',
      },
    },
  },
  plugins: [],
};

export default config;
