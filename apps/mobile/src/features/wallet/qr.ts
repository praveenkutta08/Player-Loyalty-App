/**
 * QR pairing fallback (mock). A machine's QR encodes its EGM id; we accept a few shapes so the demo
 * is forgiving: a bare id (`EGM-1042`), a `casino://egm/EGM-1042` deep link, or a query form
 * (`...?egm=EGM-1042`). Returns the normalized EGM id, or null if the payload isn't a machine code.
 */
const EGM_ID = /^EGM-[A-Z0-9]{2,}$/i;

export function parseMachineQr(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  // Query form: anything with an ?egm=... or /egm/... segment.
  const query = raw.match(/[?&]egm=([^&\s]+)/i);
  if (query) return normalize(query[1]);

  const path = raw.match(/egm\/([^/?\s]+)/i);
  if (path) return normalize(path[1]);

  // Bare id.
  return EGM_ID.test(raw) ? raw.toUpperCase() : null;
}

function normalize(candidate: string): string | null {
  const id = decodeURIComponent(candidate).toUpperCase();
  return EGM_ID.test(id) ? id : null;
}
