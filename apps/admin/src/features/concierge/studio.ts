// Pure Concierge Studio state helpers — parse/serialize the tenant-config `concierge` blob.
// Mirrors the backend's DEFAULT_CONCIERGE_CONFIG so an unsaved tenant shows real defaults.

export const TONES = ['warm', 'professional', 'playful'] as const;
export const ACCENT_TOKENS = ['gold', 'primary', 'accent'] as const;
export const WEIGHT_KEYS = ['value_at_risk', 'weather_fit', 'travel_fit', 'tier_urgency'] as const;

export type WeightKey = (typeof WEIGHT_KEYS)[number];

export interface StudioState {
  persona: { name: string; tone: string; accentToken: string };
  weights: Record<WeightKey, number>;
  guardrails: { quietStart: number; quietEnd: number; frequencyCap: number };
}

export const DEFAULT_STUDIO_STATE: StudioState = {
  persona: { name: 'Aria', tone: 'warm', accentToken: 'gold' },
  weights: { value_at_risk: 0.35, weather_fit: 0.25, travel_fit: 0.2, tier_urgency: 0.2 },
  guardrails: { quietStart: 22, quietEnd: 8, frequencyCap: 3 },
};

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampHour(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : NaN;
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
}

/** Read the stored tenant-config `concierge` dict into studio state (defaults filled). */
export function parseConciergeConfig(raw: Record<string, unknown> | undefined): StudioState {
  const persona = (raw?.persona ?? {}) as Record<string, unknown>;
  const weights = (raw?.weights ?? {}) as Record<string, unknown>;
  const guardrails = (raw?.guardrails ?? {}) as Record<string, unknown>;
  const d = DEFAULT_STUDIO_STATE;
  return {
    persona: {
      name: typeof persona.name === 'string' && persona.name ? persona.name : d.persona.name,
      tone: TONES.includes(persona.tone as (typeof TONES)[number])
        ? (persona.tone as string)
        : d.persona.tone,
      accentToken: ACCENT_TOKENS.includes(persona.accent_token as (typeof ACCENT_TOKENS)[number])
        ? (persona.accent_token as string)
        : d.persona.accentToken,
    },
    weights: Object.fromEntries(
      WEIGHT_KEYS.map((key) => [
        key,
        typeof weights[key] === 'number' ? clamp01(weights[key] as number) : d.weights[key],
      ]),
    ) as Record<WeightKey, number>,
    guardrails: {
      quietStart: clampHour(guardrails.quiet_hours_start, d.guardrails.quietStart),
      quietEnd: clampHour(guardrails.quiet_hours_end, d.guardrails.quietEnd),
      frequencyCap:
        typeof guardrails.frequency_cap_per_day === 'number' &&
        guardrails.frequency_cap_per_day >= 0
          ? Math.round(guardrails.frequency_cap_per_day)
          : d.guardrails.frequencyCap,
    },
  };
}

/** Serialize studio state back to the backend's snake_case `concierge` blob. */
export function buildConciergeConfig(state: StudioState): Record<string, unknown> {
  return {
    persona: {
      name: state.persona.name.trim() || DEFAULT_STUDIO_STATE.persona.name,
      tone: state.persona.tone,
      accent_token: state.persona.accentToken,
    },
    weights: Object.fromEntries(WEIGHT_KEYS.map((key) => [key, clamp01(state.weights[key])])),
    guardrails: {
      quiet_hours_start: state.guardrails.quietStart,
      quiet_hours_end: state.guardrails.quietEnd,
      frequency_cap_per_day: state.guardrails.frequencyCap,
    },
  };
}
