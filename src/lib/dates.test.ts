import { describe, expect, it } from 'vitest';
import {
  addDays, addMonths, closedReason, computeDueDate, daysBetween, easterSunday, formatDate,
  isValidISO, monthGrid, nextOpenDay, ordinal, relativeDays, standardHolidays, todayISO, weekday,
} from './dates';
import type { CalendarSettings } from '../types';

const cal: CalendarSettings = { closedWeekdays: [0, 6], includeStandardHolidays: true, customHolidays: [], warnDays: 7 };
const calendarDays = (days: number, rollForward = true) => ({ days, counting: 'calendar' as const, rollForward });

describe('date arithmetic', () => {
  it('adds days across month and year ends, including leap years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months and clamps to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-13', 3)).toBe('2027-02-13');
    expect(addMonths('2026-05-15', -6)).toBe('2025-11-15');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-11-13', '2026-11-13')).toBe(0);
    expect(daysBetween('2026-11-13', '2026-12-04')).toBe(21);
    expect(daysBetween('2026-11-13', '2026-11-10')).toBe(-3);
  });

  it('validates ISO dates', () => {
    expect(isValidISO('2026-02-29')).toBe(false);
    expect(isValidISO('2028-02-29')).toBe(true);
    expect(isValidISO('13/11/2026')).toBe(false);
    expect(isValidISO('')).toBe(false);
  });

  it('knows the weekday', () => {
    expect(weekday('2026-11-13')).toBe(5); // Friday
    expect(weekday('2026-11-15')).toBe(0); // Sunday
  });

  it("uses the device's local date for today", () => {
    expect(todayISO(new Date(2026, 10, 13, 23, 59))).toBe('2026-11-13');
  });
});

describe('Nigerian public holidays', () => {
  it('computes Easter Sunday', () => {
    expect(easterSunday(2024)).toBe('2024-03-31');
    expect(easterSunday(2025)).toBe('2025-04-20');
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
  });

  it('includes Good Friday, Easter Monday and the fixed holidays', () => {
    const names = Object.fromEntries(standardHolidays(2026).map((h) => [h.name, h.date]));
    expect(names['Good Friday']).toBe('2026-04-03');
    expect(names['Easter Monday']).toBe('2026-04-06');
    expect(names['Democracy Day']).toBe('2026-06-12');
    expect(names['Independence Day']).toBe('2026-10-01');
    expect(names['Boxing Day']).toBe('2026-12-26');
  });

  it('treats weekends, standard holidays and custom holidays as closed', () => {
    expect(closedReason('2026-11-14', cal)).toBe('Saturday');
    expect(closedReason('2026-10-01', cal)).toBe('Independence Day');
    expect(closedReason('2026-11-13', cal)).toBeNull();
    const withEid = { ...cal, customHolidays: [{ date: '2026-03-20', name: 'Eid-el-Fitr' }] };
    expect(closedReason('2026-03-20', withEid)).toBe('Eid-el-Fitr');
    expect(closedReason('2026-10-01', { ...cal, includeStandardHolidays: false })).toBeNull();
  });

  it('skips a run of closed days', () => {
    // Fri 25 Dec 2026 (Christmas), Sat 26 (Boxing Day), Sun 27 → Mon 28.
    expect(nextOpenDay('2026-12-25', cal)).toBe('2026-12-28');
  });
});

describe('computeDueDate', () => {
  it('excludes the day of the triggering event', () => {
    // Served Fri 13 Nov 2026; 21 days later is Fri 4 Dec.
    const r = computeDueDate('2026-11-13', calendarDays(21), cal);
    expect(r.due).toBe('2026-12-04');
    expect(r.nominal).toBe('2026-12-04');
  });

  it('moves a deadline that lands on a weekend to the Monday', () => {
    // 14 days after Sat 31 Oct 2026 is Sat 14 Nov → Mon 16 Nov.
    const r = computeDueDate('2026-10-31', calendarDays(14), cal);
    expect(r.nominal).toBe('2026-11-14');
    expect(r.due).toBe('2026-11-16');
    expect(r.basis).toContain('Saturday');
  });

  it('moves a deadline that lands on a public holiday', () => {
    // 7 days after 18 Dec 2026 is Christmas Day (Fri) → Boxing Day, weekend → Mon 28 Dec.
    const r = computeDueDate('2026-12-18', calendarDays(7), cal);
    expect(r.nominal).toBe('2026-12-25');
    expect(r.due).toBe('2026-12-28');
    expect(r.basis).toContain('Christmas Day');
  });

  it('leaves the date alone when roll-forward is off', () => {
    const r = computeDueDate('2026-10-31', calendarDays(14, false), cal);
    expect(r.due).toBe('2026-11-14');
  });

  it('counts working days only', () => {
    // From Fri 13 Nov 2026, 5 working days: Mon 16 … Fri 20 Nov.
    const r = computeDueDate('2026-11-13', { days: 5, counting: 'working', rollForward: true }, cal);
    expect(r.due).toBe('2026-11-20');
    // Over Christmas: from Wed 23 Dec, 3 working days = Thu 24, Mon 28, Tue 29.
    expect(computeDueDate('2026-12-23', { days: 3, counting: 'working', rollForward: true }, cal).due).toBe('2026-12-29');
  });

  it('counts months', () => {
    // Three months from Fri 13 Nov 2026 is Sat 13 Feb 2027 → Mon 15 Feb.
    const r = computeDueDate('2026-11-13', { days: 3, counting: 'months', rollForward: true }, cal);
    expect(r.nominal).toBe('2027-02-13');
    expect(r.due).toBe('2027-02-15');
  });

  it('handles a zero-day period', () => {
    expect(computeDueDate('2026-11-13', calendarDays(0), cal).due).toBe('2026-11-13');
  });
});

describe('formatting', () => {
  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th',
    ]);
  });

  it('formats dates in each style', () => {
    expect(formatDate('2026-11-13')).toBe('13 Nov 2026');
    expect(formatDate('2026-11-13', 'long')).toBe('Friday, 13 November 2026');
    expect(formatDate('2026-11-13', 'letter')).toBe('13th November, 2026');
    expect(formatDate('2026-11-01', 'deed')).toBe('1st day of November, 2026');
  });

  it('describes relative days', () => {
    expect(relativeDays('2026-11-13', '2026-11-13')).toBe('today');
    expect(relativeDays('2026-11-14', '2026-11-13')).toBe('tomorrow');
    expect(relativeDays('2026-11-20', '2026-11-13')).toBe('in 7 days');
    expect(relativeDays('2026-11-10', '2026-11-13')).toBe('3 days ago');
  });

  it('builds a Monday-first month grid', () => {
    const grid = monthGrid(2026, 11);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-10-26'); // Monday before Sun 1 Nov
    expect(weekday(grid[0])).toBe(1);
    expect(grid).toContain('2026-11-30');
  });
});
