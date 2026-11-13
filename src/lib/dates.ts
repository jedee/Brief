import type { CalendarSettings, Counting, Holiday, ISODate } from '../types';

const MS_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function fromParts(year: number, month: number, day: number): ISODate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isValidISO(s: string | undefined | null): s is ISODate {
  if (!s) return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** All arithmetic happens in UTC so a date never shifts by a day. */
function toMs(s: ISODate): number {
  const m = ISO_RE.exec(s);
  if (!m) throw new Error(`Invalid date: ${s}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromMs(ms: number): ISODate {
  const d = new Date(ms);
  return fromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function parts(s: ISODate): { year: number; month: number; day: number } {
  const d = new Date(toMs(s));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Today's date on the user's own clock. */
export function todayISO(now: Date = new Date()): ISODate {
  return fromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(s: ISODate, n: number): ISODate {
  return fromMs(toMs(s) + n * MS_DAY);
}

export function addMonths(s: ISODate, n: number): ISODate {
  const { year, month, day } = parts(s);
  const total = year * 12 + (month - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return fromParts(y, m, Math.min(day, lastDay));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toMs(to) - toMs(from)) / MS_DAY);
}

export function weekday(s: ISODate): number {
  return new Date(toMs(s)).getUTCDay();
}

/** Western (Gregorian) Easter Sunday — anonymous Gregorian algorithm. */
export function easterSunday(year: number): ISODate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return fromParts(year, month, day);
}

/**
 * Nigerian public holidays that can be worked out in advance.
 * Eid holidays and any extra days the Federal Government declares are
 * announced each year, so they are added by hand in Settings.
 */
export function standardHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  return [
    { date: fromParts(year, 1, 1), name: "New Year's Day" },
    { date: addDays(easter, -2), name: 'Good Friday' },
    { date: addDays(easter, 1), name: 'Easter Monday' },
    { date: fromParts(year, 5, 1), name: "Workers' Day" },
    { date: fromParts(year, 6, 12), name: 'Democracy Day' },
    { date: fromParts(year, 10, 1), name: 'Independence Day' },
    { date: fromParts(year, 12, 25), name: 'Christmas Day' },
    { date: fromParts(year, 12, 26), name: 'Boxing Day' },
  ].sort((x, y) => x.date.localeCompare(y.date));
}

export function holidaysInYear(year: number, cal: CalendarSettings): Holiday[] {
  const list = cal.includeStandardHolidays ? standardHolidays(year) : [];
  const custom = cal.customHolidays.filter((h) => h.date.startsWith(`${year}-`));
  return [...list, ...custom].sort((x, y) => x.date.localeCompare(y.date));
}

export function holidayName(date: ISODate, cal: CalendarSettings): string | null {
  const custom = cal.customHolidays.find((h) => h.date === date);
  if (custom) return custom.name;
  if (!cal.includeStandardHolidays) return null;
  return standardHolidays(parts(date).year).find((h) => h.date === date)?.name ?? null;
}

/** Why the registry is closed on `date`, or null if it is open. */
export function closedReason(date: ISODate, cal: CalendarSettings): string | null {
  const holiday = holidayName(date, cal);
  if (holiday) return holiday;
  const wd = weekday(date);
  if (cal.closedWeekdays.includes(wd)) return WEEKDAYS[wd];
  return null;
}

export function nextOpenDay(date: ISODate, cal: CalendarSettings): ISODate {
  let d = date;
  // Guard against a misconfigured calendar where every weekday is closed.
  for (let i = 0; i < 366 && closedReason(d, cal); i++) d = addDays(d, 1);
  return d;
}

export interface DueDate {
  due: ISODate;
  /** The plain count before any roll-forward. */
  nominal: ISODate;
  basis: string;
}

/**
 * Work out a filing deadline.
 *
 * The day of the triggering event is excluded, so "within 14 days of service"
 * on the 1st ends on the 15th. When `rollForward` is on and the last day falls
 * on a day the registry is closed, the deadline moves to the next open day.
 */
export function computeDueDate(
  trigger: ISODate,
  rule: { days: number; counting: Counting; rollForward: boolean },
  cal: CalendarSettings,
): DueDate {
  const n = Math.max(0, Math.floor(rule.days));

  if (rule.counting === 'working') {
    let d = trigger;
    let counted = 0;
    for (let guard = 0; counted < n && guard < 3660; guard++) {
      d = addDays(d, 1);
      if (!closedReason(d, cal)) counted++;
    }
    return {
      due: d,
      nominal: d,
      basis: `${n} working day${n === 1 ? '' : 's'} after ${formatDate(trigger)}, skipping closed days.`,
    };
  }

  const nominal = rule.counting === 'months' ? addMonths(trigger, n) : addDays(trigger, n);
  const unit = rule.counting === 'months' ? `month${n === 1 ? '' : 's'}` : `day${n === 1 ? '' : 's'}`;
  let basis = `${n} ${unit} after ${formatDate(trigger)} is ${formatDate(nominal)}.`;
  let due = nominal;

  if (rule.rollForward) {
    const reason = closedReason(nominal, cal);
    if (reason) {
      due = nextOpenDay(nominal, cal);
      basis += ` That is ${reason === WEEKDAYS[weekday(nominal)] ? 'a ' + reason : reason}, so it moves to ${formatDate(due)}.`;
    }
  }
  return { due, nominal, basis };
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * short:  13 Nov 2026
 * long:   Friday, 13 November 2026
 * letter: 13th November, 2026
 * deed:   13th day of November, 2026
 */
export function formatDate(s: ISODate, style: 'short' | 'long' | 'letter' | 'deed' = 'short'): string {
  if (!isValidISO(s)) return s || '';
  const { year, month, day } = parts(s);
  const monthName = MONTHS[month - 1];
  switch (style) {
    case 'long': return `${WEEKDAYS[weekday(s)]}, ${day} ${monthName} ${year}`;
    case 'letter': return `${ordinal(day)} ${monthName}, ${year}`;
    case 'deed': return `${ordinal(day)} day of ${monthName}, ${year}`;
    default: return `${day} ${monthName.slice(0, 3)} ${year}`;
  }
}

export function relativeDays(date: ISODate, today: ISODate): string {
  const n = daysBetween(today, date);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

/** 42 dates (six Monday-first weeks) covering the given month. */
export function monthGrid(year: number, month: number): ISODate[] {
  const first = fromParts(year, month, 1);
  const offset = (weekday(first) + 6) % 7; // Monday = 0
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
