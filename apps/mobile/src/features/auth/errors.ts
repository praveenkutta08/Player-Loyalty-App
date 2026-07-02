/**
 * Extract a human-readable message from an RTK Query error. The backend returns RFC 7807
 * problem+json ({ title, detail, ... }); fall back to the provided default when nothing usable is
 * present (e.g. a network failure).
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      const problem = data as { detail?: unknown; title?: unknown };
      if (typeof problem.detail === 'string') return problem.detail;
      if (typeof problem.title === 'string') return problem.title;
    }
    // Network / fetch error with a string status.
    const status = (error as { status?: unknown }).status;
    if (status === 'FETCH_ERROR') return 'Network error — check your connection.';
  }
  return fallback;
}
