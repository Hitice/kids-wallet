import { ApiError } from '../api/mempool';
import { VaultError } from '../core';

const DATE_UTC = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
const DATETIME_LOCAL = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** "15 June 2038" (calendar day in UTC). */
export function formatUtcDate(unixSeconds: number): string {
  return DATE_UTC.format(new Date(unixSeconds * 1000));
}

export function formatLocalDateTime(unixSeconds: number): string {
  return DATETIME_LOCAL.format(new Date(unixSeconds * 1000));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Calendar distance from `from` to `to`, for example "11 years, 7 months". */
export function timeUntil(to: number, from: number): string {
  if (to <= from) return 'now';
  const a = new Date(from * 1000);
  const b = new Date(to * 1000);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years > 0) return restMonths > 0 ? `${plural(years, 'year')}, ${plural(restMonths, 'month')}` : plural(years, 'year');
  if (months > 0) return plural(months, 'month');
  const days = Math.ceil((to - from) / 86_400);
  if (days > 1) return plural(days, 'day');
  const hours = Math.ceil((to - from) / 3600);
  return plural(hours, 'hour');
}

export function shortHex(hex: string, keep = 8): string {
  return hex.length <= keep * 2 + 3 ? hex : `${hex.slice(0, keep)}...${hex.slice(-keep)}`;
}

/** User-facing message for any error thrown by the core or the API client. */
export function errorMessage(e: unknown): string {
  if (e instanceof VaultError || e instanceof ApiError) return e.message;
  if (e instanceof Error && /Can not sign|No inputs were signed/.test(e.message)) {
    return 'This key cannot sign for this vault.';
  }
  return e instanceof Error && e.message ? `Unexpected error: ${e.message}` : 'Unexpected error. Check the details and try again.';
}
