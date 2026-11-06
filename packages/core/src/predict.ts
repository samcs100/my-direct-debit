import type { Mandate, DebitRecord } from './types.ts';
import { PERIOD_MONTHS } from './types.ts';
import { addMonthsOnDay, nextWorkingDay, parts } from './dates.ts';
import type { ISODate } from './types.ts';

/** Calendar cycle index of a date for a mandate's frequency (month / quarter / year). */
export function cycleKey(m: Pick<Mandate, 'frequency'>, d: ISODate): number {
  const { year, month } = parts(d);
  const monthIdx = year * 12 + (month - 1);
  return Math.floor(monthIdx / PERIOD_MONTHS[m.frequency]);
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Earlier debits = everything before the most recent one. */
export const earlier = (m: Mandate): DebitRecord[] => m.history.slice(0, -1);

/** Usual amount = median of earlier debits; falls back to the only debit we have. */
export function usualAmountCents(m: Mandate): number {
  const e = earlier(m);
  return e.length ? median(e.map((h) => h.amountCents)) : m.history[m.history.length - 1].amountCents;
}

/**
 * Expected next debit date. This is a PREDICTION from history, not a date announced by the creditor.
 * Regular debit of the latest cycle = first debit inside the latest cycle (so an extra/duplicate debit
 * in the same cycle does not shift the schedule).
 */
export function nextExpected(m: Mandate, holidays: ReadonlySet<ISODate>): ISODate {
  const last = m.history[m.history.length - 1];
  const key = cycleKey(m, last.date);
  const regular = m.history.find((h) => cycleKey(m, h.date) === key)!;
  const raw = addMonthsOnDay(regular.date, PERIOD_MONTHS[m.frequency], m.anchorDay);
  return nextWorkingDay(raw, holidays);
}