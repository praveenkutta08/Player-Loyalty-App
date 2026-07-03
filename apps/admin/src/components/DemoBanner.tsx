import { FlaskConical } from 'lucide-react';

/**
 * Honest labelling for surfaces still backed by client-only demo data (M12). Screens that
 * fabricate records or metrics with no server endpoint render this so operators never mistake
 * preview data for the real thing.
 */
export function DemoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-control border border-gold-border bg-gold-dim px-3.5 py-2.5">
      <FlaskConical size={15} className="mt-0.5 shrink-0 text-gold" />
      <p className="text-[12px] text-text2">{children}</p>
    </div>
  );
}
