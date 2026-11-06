import type { MandateState, Mandate, ISODate, RulesConfig } from './types.ts';
import { addDays, diffDays } from './dates.ts';
import { usualAmountCents } from './predict.ts';

export type Action =
  | { type: 'PAUSE'; until: ISODate }
  | { type: 'LIMIT'; limitCents: number }
  | { type: 'STOP' }
  | { type: 'RESUME' };

export type ActionError =
  | 'NOT_ALLOWED_FROM_STATE' | 'INVALID_DATE' | 'PAUSE_TOO_LONG' | 'INVALID_LIMIT' | 'LIMIT_TOO_HIGH';

export type ActionResult = { ok: true; state: MandateState } | { ok: false; reason: ActionError };

export function applyAction(m: Mandate, a: Action, today: ISODate, cfg: RulesConfig): ActionResult {
  const s = m.state;
  if (s.status === 'STOPPED') return { ok: false, reason: 'NOT_ALLOWED_FROM_STATE' }; // terminal in the PoC

  switch (a.type) {
    case 'PAUSE': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.until) || diffDays(a.until, today) <= 0) return { ok: false, reason: 'INVALID_DATE' };
      if (diffDays(a.until, today) > cfg.maxPauseDays) return { ok: false, reason: 'PAUSE_TOO_LONG' };
      return { ok: true, state: { status: 'PAUSED', pausedUntil: a.until, limitCents: s.limitCents } };
    }
    case 'LIMIT': {
      if (s.status === 'PAUSED') return { ok: false, reason: 'NOT_ALLOWED_FROM_STATE' };
      if (!Number.isInteger(a.limitCents) || a.limitCents <= 0) return { ok: false, reason: 'INVALID_LIMIT' };
      if (a.limitCents > cfg.maxLimitFactor * usualAmountCents(m)) return { ok: false, reason: 'LIMIT_TOO_HIGH' };
      return { ok: true, state: { status: 'LIMITED', limitCents: a.limitCents } };
    }
    case 'RESUME': {
      if (s.status !== 'PAUSED') return { ok: false, reason: 'NOT_ALLOWED_FROM_STATE' };
      return { ok: true, state: s.limitCents ? { status: 'LIMITED', limitCents: s.limitCents } : { status: 'ACTIVE' } };
    }
    case 'STOP':
      return { ok: true, state: { status: 'STOPPED' } };
  }
}

/** A pause that has run out behaves like the state before it. */
export function effectiveState(s: MandateState, today: ISODate): MandateState {
  if (s.status === 'PAUSED' && s.pausedUntil && diffDays(today, s.pausedUntil) > 0) {
    return s.limitCents ? { status: 'LIMITED', limitCents: s.limitCents } : { status: 'ACTIVE' };
  }
  return s;
}

export type DebitOutcome = 'PAID' | 'REFUSED_PAUSED' | 'REFUSED_OVER_LIMIT' | 'REFUSED_STOPPED';

/** Pure simulation used by the "Simulate next debit" button. Moves no money. */
export function simulateDebit(s: MandateState, amountCents: number, onDate: ISODate): DebitOutcome {
  const e = effectiveState(s, onDate);
  if (e.status === 'STOPPED') return 'REFUSED_STOPPED';
  if (e.status === 'PAUSED') return 'REFUSED_PAUSED';
  if (e.limitCents !== undefined && amountCents > e.limitCents) return 'REFUSED_OVER_LIMIT';
  return 'PAID';
}

export const pauseUntilFromDays = (today: ISODate, days: number): ISODate => addDays(today, days);