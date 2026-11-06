import type { Mandate, Flag, RulesConfig, ISODate } from './types.ts';
import { PERIOD_DAYS } from './types.ts';
import { diffDays } from './dates.ts';
import { cycleKey, earlier, median } from './predict.ts';

type Rule = (m: Mandate, today: ISODate, cfg: RulesConfig) => Flag | null;

const latest = (m: Mandate) => m.history[m.history.length - 1];
const isRecent = (m: Mandate, today: ISODate, cfg: RulesConfig) => {
  const age = diffDays(today, latest(m).date);
  return age >= 0 && age <= cfg.recentDays;
};
/** Round a ratio to the nearest 0.5 so the AI only ever sees a coarse band. */
export const ratioBand = (r: number) => Math.round(r * 2) / 2;

export const amountHigher: Rule = (m, today, cfg) => {
  const e = earlier(m);
  if (!isRecent(m, today, cfg) || e.length < cfg.minHistory) return null;
  const baseline = median(e.map((h) => h.amountCents));
  const amt = latest(m).amountCents;
  if (amt >= baseline * cfg.amountRatio && amt - baseline >= cfg.amountMinDiffCents) {
    return { code: 'AMOUNT_HIGHER', severity: 'attention', params: { ratioBand: ratioBand(amt / baseline) } };
  }
  return null;
};

export const newCreditor: Rule = (m, today, cfg) => {
  const first = m.history[0].date;
  const age = diffDays(today, first);
  return age >= 0 && age <= cfg.newCreditorDays
    ? { code: 'NEW_CREDITOR', severity: 'attention', params: { daysAgo: age } }
    : null;
};

export const duplicateInPeriod: Rule = (m, today, cfg) => {
  if (!isRecent(m, today, cfg)) return null;
  const key = cycleKey(m, latest(m).date);
  const count = m.history.filter((h) => cycleKey(m, h.date) === key).length;
  return count >= 2 ? { code: 'DUPLICATE_IN_PERIOD', severity: 'attention', params: { count } } : null;
};

export const dormantReactivated: Rule = (m, today, cfg) => {
  if (!isRecent(m, today, cfg) || m.history.length < 2) return null;
  const prev = m.history[m.history.length - 2].date;
  const gap = diffDays(latest(m).date, prev);
  return gap >= cfg.dormantFactor * PERIOD_DAYS[m.frequency]
    ? { code: 'DORMANT_REACTIVATED', severity: 'attention', params: { monthsGap: Math.round(gap / 30) } }
    : null;
};

export const RULES: readonly Rule[] = [amountHigher, newCreditor, duplicateInPeriod, dormantReactivated];

export const evaluate = (m: Mandate, today: ISODate, cfg: RulesConfig): Flag[] =>
  RULES.map((r) => r(m, today, cfg)).filter((f): f is Flag => f !== null);