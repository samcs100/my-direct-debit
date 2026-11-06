import type { ISODate } from './types.ts';

const MS_PER_DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export const toDays = (d: ISODate): number => {
  const [y, m, day] = d.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, day) / MS_PER_DAY);
};
export const fromDays = (n: number): ISODate => new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
export const addDays = (d: ISODate, n: number): ISODate => fromDays(toDays(d) + n);
export const diffDays = (a: ISODate, b: ISODate): number => toDays(a) - toDays(b); // a - b
export const weekday = (d: ISODate): number => new Date(toDays(d) * MS_PER_DAY).getUTCDay(); // 0 = Sunday

export const parts = (d: ISODate) => {
  const [year, month, day] = d.split('-').map(Number);
  return { year, month, day };
};

/** Add whole months, then force the day-of-month to `day`, clamped to the last day of the target month. */
export function addMonthsOnDay(d: ISODate, months: number, day: number): ISODate {
  const { year, month } = parts(d);
  const idx = year * 12 + (month - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = idx % 12; // 0-based
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(day, lastDay))}`;
}

export const isWorkingDay = (d: ISODate, holidays: ReadonlySet<ISODate>): boolean => {
  const w = weekday(d);
  return w !== 0 && w !== 6 && !holidays.has(d);
};
export function nextWorkingDay(d: ISODate, holidays: ReadonlySet<ISODate>): ISODate {
  let x = d;
  while (!isWorkingDay(x, holidays)) x = addDays(x, 1);
  return x;
}