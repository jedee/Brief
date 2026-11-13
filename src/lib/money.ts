import type { Kobo } from '../types';

const formatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 46000000 kobo → "₦460,000.00" */
export function naira(kobo: Kobo): string {
  return formatter.format(kobo / 100).replace('NGN', '₦').replace(/ /g, '');
}

/**
 * Parse what a person types into an amount field.
 * Accepts "460000", "460,000", "₦460,000.50", "N460k" and "1.2m".
 * Returns kobo, or null if the text is not a valid amount.
 */
export function parseAmount(input: string): Kobo | null {
  const s = input.trim().toLowerCase().replace(/[₦,\s]/g, '').replace(/^n(?=\d)/, '');
  const m = /^(\d+(?:\.\d+)?)([km])?$/.exec(s);
  if (!m) return null;
  const multiplier = m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1;
  return Math.round(Number(m[1]) * multiplier * 100);
}

/** Kobo → plain editable text, e.g. 46000050 → "460000.50". */
export function amountInput(kobo: Kobo): string {
  return kobo % 100 === 0 ? String(kobo / 100) : (kobo / 100).toFixed(2);
}
