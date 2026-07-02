// Lightweight dependency-free SVG/CSS charts for the dashboard + analytics screens. Colors come
// from the token layer via currentColor / CSS vars so they stay theme-aware.

function points(values: number[], w: number, h: number, pad = 4): string {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Gold area sparkline with gradient fill + end dot. */
export function AreaSparkline({ values, height = 120 }: { values: number[]; height?: number }) {
  const w = 600;
  const line = points(values, w, height);
  const last = line.split(' ').at(-1)!.split(',');
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height }}
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold-fill)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--gold-fill)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`4,${height - 4} ${line} ${w - 4},${height - 4}`} fill="url(#spark)" />
      <polyline points={line} fill="none" stroke="var(--gold-fill)" strokeWidth="2" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--gold-fill)" />
    </svg>
  );
}

/** Two-series line chart (solid current + dashed previous). */
export function DualLine({
  current,
  previous,
  height = 160,
}: {
  current: number[];
  previous: number[];
  height?: number;
}) {
  const w = 600;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height }}
    >
      <polyline
        points={points(previous, w, height)}
        fill="none"
        stroke="var(--faint)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />
      <polyline
        points={points(current, w, height)}
        fill="none"
        stroke="var(--gold-fill)"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Conic-gradient donut with legend. */
export function Donut({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = segments
    .map((s) => {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(', ');
  return (
    <div className="flex items-center gap-5">
      <div
        className="h-32 w-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-panel" />
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-text2">{s.label}</span>
            <span className="font-mono text-muted">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal labeled bars. */
export function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-0.5 flex justify-between text-[12px]">
            <span className="text-text2">{d.label}</span>
            <span className="font-mono text-muted">{d.value.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full bg-gold-fill"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
