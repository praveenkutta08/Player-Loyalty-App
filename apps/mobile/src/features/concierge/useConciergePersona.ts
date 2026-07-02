import { useManifest } from '../../app/manifest/ManifestProvider';
import { useTheme } from '../../theme/ThemeProvider';

export interface ConciergePersona {
  name: string;
  tone: string;
  /** Resolved accent color for the orb/highlights — a brand token, never a hardcoded hex. */
  accentColor: string;
}

/**
 * Persona from the tenant manifest (golden rule #5): name, tone and the accent token resolved
 * against the active theme palette. Defaults keep the kit rendering before any manifest lands.
 */
export function useConciergePersona(): ConciergePersona {
  const theme = useTheme();
  const { manifest } = useManifest();
  const concierge = manifest?.concierge;
  const accentToken = concierge?.accentToken ?? 'gold';
  const brand = theme.colors.brand as Record<string, string>;
  return {
    name: concierge?.personaName ?? 'Concierge',
    tone: concierge?.tone ?? 'warm',
    accentColor: brand[accentToken] ?? theme.colors.brand.gold,
  };
}
