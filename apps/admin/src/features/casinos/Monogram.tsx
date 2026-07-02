/** Gradient property monogram (first letters of the casino name). */
export function Monogram({ name, size = 40 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className="flex items-center justify-center rounded-[10px] bg-gradient-to-br from-gold-bright to-gold-fill font-bold text-gold-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {letters}
    </span>
  );
}
