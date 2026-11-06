import type { Mandate, Flag, FlagCode, Category, Frequency } from './types.ts';
import { usualAmountCents } from './predict.ts';

export type Lang = 'en' | 'nl';

export const eur = (cents: number): string => {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `€${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${rest}`;
};

/** The ONLY thing that may be sent to a language model. No names, no IBANs, no dates, no ids. */
export interface ExplainInput {
  lang: Lang;
  category: Category;
  frequency: Frequency;
  usualAmount: string;
  latestAmount: string;
  flags: { code: FlagCode; ratioBand?: number; daysAgo?: number; count?: number; monthsGap?: number }[];
}

export function buildExplainInput(m: Mandate, flags: Flag[], lang: Lang): ExplainInput {
  return {
    lang, category: m.category, frequency: m.frequency,
    usualAmount: eur(usualAmountCents(m)),
    latestAmount: eur(m.history[m.history.length - 1].amountCents),
    flags: flags.map((f) => ({ code: f.code, ...(f.params as object) })),
  };
}

const num = (n: number, lang: Lang) => (lang === 'nl' ? String(n).replace('.', ',') : String(n));

export function templateExplanation(i: ExplainInput): string {
  if (!i.flags.length) {
    return i.lang === 'nl' ? 'Geen opvallende activiteit gevonden voor deze incasso.' : 'No unusual activity found for this direct debit.';
  }
  const t = (f: ExplainInput['flags'][number]): string => {
    const nl = i.lang === 'nl';
    switch (f.code) {
      case 'AMOUNT_HIGHER':
        return nl
          ? `Deze incasso is ongeveer ${num(f.ratioBand!, 'nl')} keer zo hoog als gebruikelijk (${i.latestAmount} in plaats van ${i.usualAmount}). Controleer of dit klopt.`
          : `This debit is about ${num(f.ratioBand!, 'en')} times the usual amount (${i.latestAmount} instead of ${i.usualAmount}). Worth checking.`;
      case 'NEW_CREDITOR':
        return nl
          ? `Dit bedrijf heeft ${f.daysAgo} dagen geleden voor het eerst geïncasseerd. Herken je het bedrijf?`
          : `This company first collected from your account ${f.daysAgo} days ago. Do you recognise it?`;
      case 'DUPLICATE_IN_PERIOD':
        return nl
          ? `Dit bedrijf heeft ${f.count} keer geïncasseerd in dezelfde periode. Normaal verwacht je één keer.`
          : `This company collected ${f.count} times in the same period. You would normally expect one.`;
      case 'DORMANT_REACTIVATED':
        return nl
          ? `Er was ongeveer ${f.monthsGap} maanden geen incasso en nu is de machtiging opnieuw gebruikt. Wil je dit nog?`
          : `There was no debit for about ${f.monthsGap} months and this agreement has just been used again. Do you still want it?`;
    }
  };
  return i.flags.map(t).join(' ');
}

/** Phrases that signal each flag. Used to catch text about a flag that did NOT fire (heuristic guard). */
const FLAG_PHRASES: Record<FlagCode, RegExp> = {
  AMOUNT_HIGHER: /(times the usual|higher than usual|keer zo hoog|hoger dan gebruikelijk)/i,
  NEW_CREDITOR: /(first collected|for the first time|voor het eerst)/i,
  DUPLICATE_IN_PERIOD: /(times in the same period|twice|double|dubbel|keer in dezelfde periode)/i,
  DORMANT_REACTIVATED: /(no debit for|used again|geen incasso|opnieuw gebruikt)/i,
};

const numberTokens = (s: string) => s.match(/\d+(?:[.,]\d+)*/g) ?? [];

export function allowedNumbers(i: ExplainInput): Set<string> {
  const out = new Set<string>();
  const add = (v: string | number | undefined) => {
    if (v === undefined) return;
    for (const tok of numberTokens(String(v))) {
      out.add(tok);
      out.add(tok.replace('.', ','));
      out.add(tok.replace(',', '.'));
      const intPart = tok.split(/[.,]/)[0];
      if (/^\d+$/.test(intPart)) out.add(intPart); // "€118" is fine when "118,00" was supplied
    }
  };
  add(i.usualAmount); add(i.latestAmount);
  for (const f of i.flags) { add(f.ratioBand); add(f.daysAgo); add(f.count); add(f.monthsGap); }
  return out;
}

export interface Validation { ok: boolean; reasons: string[]; }

export function validateExplanation(text: string, i: ExplainInput): Validation {
  const reasons: string[] = [];
  if (!text.trim()) reasons.push('EMPTY');
  if (text.length > 400) reasons.push('TOO_LONG');
  if (/[<>{}]|https?:|www\./i.test(text)) reasons.push('MARKUP_OR_LINK');
  const allowed = allowedNumbers(i);
  for (const tok of numberTokens(text)) if (!allowed.has(tok)) reasons.push(`UNKNOWN_NUMBER:${tok}`);
  // Model output must explicitly express each fired finding in the requested language.
  // This is still a heuristic, not a guarantee of factual accuracy.
  const required: Record<FlagCode, RegExp> = i.lang === 'nl' ? {
    AMOUNT_HIGHER: /keer zo hoog|hoger dan gebruikelijk/i,
    NEW_CREDITOR: /voor het eerst/i,
    DUPLICATE_IN_PERIOD: /keer.*(?:dezelfde periode|deze maand)/i,
    DORMANT_REACTIVATED: /(?:geen incasso|geen afschrijving).*(?:opnieuw|weer)/i,
  } : {
    AMOUNT_HIGHER: /times the usual|higher than usual/i,
    NEW_CREDITOR: /first collected/i,
    DUPLICATE_IN_PERIOD: /collected.*(?:times|twice|double)/i,
    DORMANT_REACTIVATED: /no debit.*(?:used again|again)/i,
  };
  for (const flag of i.flags) {
    if (!required[flag.code].test(text)) reasons.push(`MISSING_FINDING:${flag.code}`);
  }
  if (!i.flags.length && text.trim() !== templateExplanation(i)) reasons.push('NO_FLAGS_USE_TEMPLATE');
  const fired = new Set(i.flags.map((f) => f.code));
  for (const code of Object.keys(FLAG_PHRASES) as FlagCode[]) {
    if (!fired.has(code) && FLAG_PHRASES[code].test(text)) reasons.push(`UNFIRED_FLAG_MENTIONED:${code}`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** Fallback wrapper: use the model text only if it passes validation, else the template. */
export function safeExplanation(modelText: string | null, i: ExplainInput): { text: string; source: 'MODEL' | 'TEMPLATE'; reasons: string[] } {
  if (modelText !== null) {
    const v = validateExplanation(modelText, i);
    if (v.ok) return { text: modelText.trim(), source: 'MODEL', reasons: [] };
    return { text: templateExplanation(i), source: 'TEMPLATE', reasons: v.reasons };
  }
  return { text: templateExplanation(i), source: 'TEMPLATE', reasons: [] };
}
