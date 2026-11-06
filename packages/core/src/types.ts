export type ISODate = string; // 'YYYY-MM-DD', UTC calendar date, no time zone

export type Frequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type Category =
  | 'SPORTS' | 'ENERGY' | 'STREAMING' | 'HEALTH' | 'WATER' | 'RENT'
  | 'LOAN' | 'TELECOM' | 'CHARITY' | 'CLOUD' | 'INSURANCE';

export interface DebitRecord { date: ISODate; amountCents: number; }

export type Status = 'ACTIVE' | 'PAUSED' | 'LIMITED' | 'STOPPED';
export interface MandateState {
  status: Status;
  pausedUntil?: ISODate;   // set only when status === 'PAUSED'
  limitCents?: number;     // set when a limit exists (status LIMITED, or PAUSED with a limit kept)
}

export interface Mandate {
  id: string;              // 'MNDT-0001'
  creditorName: string;    // fictional
  creditorId: string;      // fictional, e.g. 'FAKE-CID-0001'
  maskedIban: string;      // fictional, display only, e.g. 'NL**TEST******0001'
  category: Category;
  frequency: Frequency;
  anchorDay: number;       // 1..28 (PoC limitation: 29-31 not supported)
  history: DebitRecord[];  // ascending by date; last item is the most recent debit
  state: MandateState;
}

export type FlagCode =
  | 'AMOUNT_HIGHER' | 'NEW_CREDITOR' | 'DUPLICATE_IN_PERIOD' | 'DORMANT_REACTIVATED';

export interface Flag {
  code: FlagCode;
  severity: 'attention';
  params: Record<string, number | string>;
}

export interface RulesConfig {
  recentDays: number;        // a debit counts as "recent" if it is at most this many days old
  amountRatio: number;       // AMOUNT_HIGHER: latest >= ratio * baseline
  amountMinDiffCents: number;// AMOUNT_HIGHER: and at least this much higher in absolute terms
  minHistory: number;        // AMOUNT_HIGHER: needs this many earlier debits for a baseline
  newCreditorDays: number;   // NEW_CREDITOR: first-ever debit at most this many days ago
  dormantFactor: number;     // DORMANT: gap >= factor * period length
  headsUpDays: number;       // pre-debit heads-up window
  upcomingDays: number;      // "coming up" list window
  maxPauseDays: number;      // action limit
  maxLimitFactor: number;    // action limit: limit <= factor * usual amount
}

export const DEFAULT_CONFIG: RulesConfig = {
  recentDays: 10, amountRatio: 1.5, amountMinDiffCents: 1000, minHistory: 3,
  newCreditorDays: 14, dormantFactor: 2, headsUpDays: 3, upcomingDays: 7,
  maxPauseDays: 90, maxLimitFactor: 5,
};

export const PERIOD_MONTHS: Record<Frequency, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };
export const PERIOD_DAYS: Record<Frequency, number> = { MONTHLY: 30, QUARTERLY: 91, YEARLY: 365 };