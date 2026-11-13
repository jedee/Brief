import type { Data, Deadline, Hearing, ISODate, Kobo } from '../types';
import { daysBetween } from './dates';

export type DeadlineStatus = 'done' | 'overdue' | 'today' | 'soon' | 'later';

export function deadlineStatus(d: Deadline, today: ISODate, warnDays: number): DeadlineStatus {
  if (d.done) return 'done';
  const n = daysBetween(today, d.dueDate);
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  if (n <= warnDays) return 'soon';
  return 'later';
}

export const byDate =
  <T,>(get: (x: T) => string) =>
  (a: T, b: T) =>
    get(a).localeCompare(get(b));

export const hearingOrder = (a: Hearing, b: Hearing) =>
  a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99');

export interface Ledger {
  billed: Kobo;
  paid: Kobo;
  balance: Kobo;
}

export function ledgerFor(data: Data, matterId: string): Ledger {
  const billed = data.charges.filter((c) => c.matterId === matterId).reduce((s, c) => s + c.amount, 0);
  const paid = data.payments.filter((p) => p.matterId === matterId).reduce((s, p) => s + p.amount, 0);
  return { billed, paid, balance: billed - paid };
}

/** Sum of balances still owed, ignoring matters where the client is in credit. */
export function totalOutstanding(data: Data): Kobo {
  return data.matters.reduce((s, m) => s + Math.max(0, ledgerFor(data, m.id).balance), 0);
}

export function nextHearing(data: Data, matterId: string, today: ISODate): Hearing | undefined {
  return data.hearings
    .filter((h) => h.matterId === matterId && h.date >= today)
    .sort(hearingOrder)[0];
}

/** The earliest upcoming thing on a matter: an open deadline (even overdue) or a hearing. */
export function nextEvent(
  data: Data,
  matterId: string,
  today: ISODate,
): { date: ISODate; label: string; kind: 'deadline' | 'hearing' } | undefined {
  const deadlines = data.deadlines
    .filter((d) => d.matterId === matterId && !d.done)
    .map((d) => ({ date: d.dueDate, label: d.title, kind: 'deadline' as const }));
  const hearing = nextHearing(data, matterId, today);
  const all = hearing ? [...deadlines, { date: hearing.date, label: hearing.purpose, kind: 'hearing' as const }] : deadlines;
  return all.sort(byDate((x) => x.date))[0];
}
