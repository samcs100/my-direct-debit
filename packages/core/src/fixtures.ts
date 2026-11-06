import type { Mandate, DebitRecord, Category, Frequency, ISODate } from './types.ts';
import { fakeNlIban, maskIban } from './iban.ts';

export const DEMO_TODAY: ISODate = '2026-11-12'; // a Thursday
/** TARGET closing days (verify against the official ECB list before relying on it). */
export const HOLIDAYS: ReadonlySet<ISODate> = new Set([
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-12-25', '2026-12-26',
]);

const h = (date: ISODate, amountCents: number): DebitRecord => ({ date, amountCents });
const mk = (n: number, creditorName: string, category: Category, frequency: Frequency, anchorDay: number, history: DebitRecord[]): Mandate => ({
  id: `MNDT-${String(n).padStart(4, '0')}`,
  creditorName,
  creditorId: `FAKE-CID-${String(n).padStart(4, '0')}`,
  maskedIban: maskIban(fakeNlIban(n)),
  category, frequency, anchorDay, history,
  state: { status: 'ACTIVE' },
});

const first = (cents: number): DebitRecord[] => [
  h('2026-07-01', cents), h('2026-08-03', cents), h('2026-09-01', cents), h('2026-10-01', cents), h('2026-11-02', cents),
];

export const MANDATES: Mandate[] = [
  mk(1, 'FitNova Sportclub', 'SPORTS', 'MONTHLY', 1, first(2999)),
  mk(2, 'Voltara Energie', 'ENERGY', 'MONTHLY', 5, [
    h('2026-07-06', 11800), h('2026-08-05', 11800), h('2026-09-07', 11800), h('2026-10-05', 11800), h('2026-11-05', 21450)]),
  mk(3, 'StreamBox NL', 'STREAMING', 'MONTHLY', 3, [
    h('2026-07-03', 1399), h('2026-08-03', 1399), h('2026-09-03', 1399), h('2026-10-05', 1399), h('2026-11-03', 1399), h('2026-11-09', 1399)]),
  mk(4, 'Zorgwijs Zorgverzekering', 'HEALTH', 'MONTHLY', 1, first(13900)),
  mk(5, 'NordWater', 'WATER', 'MONTHLY', 15, [
    h('2026-07-15', 2200), h('2026-08-17', 2200), h('2026-09-15', 2200), h('2026-10-15', 2200)]),
  mk(6, 'Huurhuis Verhuur', 'RENT', 'MONTHLY', 1, first(105000)),
  mk(7, 'QuickLoan Pro', 'LOAN', 'MONTHLY', 9, [h('2026-11-09', 4900)]),
  mk(8, 'OldTime Fitness', 'SPORTS', 'MONTHLY', 12, [
    h('2026-01-12', 1900), h('2026-02-12', 1900), h('2026-03-12', 1900), h('2026-11-12', 1900)]),
  mk(9, 'TelcoNext Mobiel', 'TELECOM', 'MONTHLY', 13, [
    h('2026-07-13', 2450), h('2026-08-13', 2450), h('2026-09-14', 2450), h('2026-10-13', 2450)]),
  mk(10, 'CharityHeart', 'CHARITY', 'MONTHLY', 25, [
    h('2026-07-27', 1000), h('2026-08-25', 1000), h('2026-09-25', 1000), h('2026-10-26', 1000)]),
  mk(11, 'CloudDrive Plus', 'CLOUD', 'YEARLY', 18, [h('2023-11-20', 9999), h('2024-11-18', 9999), h('2025-11-18', 9999)]),
  mk(12, 'SafeHome Verzekeringen', 'INSURANCE', 'QUARTERLY', 14, [
    h('2026-02-16', 8740), h('2026-05-14', 8740), h('2026-08-14', 8740)]),
];