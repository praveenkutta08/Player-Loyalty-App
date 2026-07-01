/** Cross-cutting value objects reused across the backend contract, admin console, and mobile app. */

/**
 * Money as an integer number of minor units (cents) plus an ISO 4217 currency code.
 *
 * GOLDEN RULE #4: money is an append-only ledger. Never represent money as a float — always
 * integer minor units to avoid rounding drift.
 */
export interface Money {
  /** Amount in the currency's minor unit (e.g. cents). May be negative for debits. */
  amountCents: number;
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
}

/** Parameters for a cursor-paginated request (see backend `core/pagination.py`). */
export interface CursorPageParams {
  /** Opaque cursor returned by the previous page; omit/null for the first page. */
  cursor?: string | null;
  /** Max items to return. */
  limit?: number;
}

/** A cursor-paginated response envelope. */
export interface Paginated<T> {
  items: T[];
  /** Opaque cursor for the next page, or null when there are no more items. */
  nextCursor: string | null;
  /** True when another page is available. */
  hasMore: boolean;
}

/**
 * RFC 7807 problem+json error body. The backend returns this shape for all errors; additional
 * members beyond the standard fields are permitted (the index signature).
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type. Defaults to "about:blank". */
  type: string;
  /** Short, human-readable summary of the problem type. */
  title: string;
  /** HTTP status code. */
  status: number;
  /** Human-readable explanation specific to this occurrence. */
  detail?: string;
  /** URI reference identifying the specific occurrence. */
  instance?: string;
  /** Problem-type-specific extension members. */
  [key: string]: unknown;
}
