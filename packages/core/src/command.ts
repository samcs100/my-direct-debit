import type { Mandate, Category } from './types.ts';

export type Intent = 'PAUSE' | 'LIMIT' | 'STOP' | 'EXPLAIN' | 'UNKNOWN';
export interface ParsedCommand { intent: Intent; targetPhrase: string; days?: number; limitCents?: number; }

const ALIASES: Record<Category, string[]> = {
  SPORTS: ['gym', 'fitness', 'sport', 'sportschool'],
  ENERGY: ['energy', 'energie', 'electricity', 'stroom', 'gas'],
  STREAMING: ['streaming', 'stream', 'tv', 'series', 'films'],
  HEALTH: ['health', 'zorg', 'zorgverzekering'],
  WATER: ['water'],
  RENT: ['rent', 'huur'],
  LOAN: ['loan', 'lening', 'krediet'],
  TELECOM: ['phone', 'mobile', 'telefoon', 'mobiel', 'telecom'],
  CHARITY: ['charity', 'donation', 'goed doel', 'donatie'],
  CLOUD: ['cloud', 'storage', 'opslag'],
  INSURANCE: ['insurance', 'verzekering', 'home', 'huis'],
};

const STOPWORDS = new Set(['the', 'my', 'a', 'an', 'to', 'for', 'of', 'debit', 'incasso', 'de', 'het', 'mijn', 'een', 'voor', 'please', 'payment', 'betaling', 'on', 'op', 'tot', 'max', 'limit']);

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function parseCommandRules(text: string): ParsedCommand {
  const t = norm(text).trim().slice(0, 200); // hard length cap on untrusted input
  const money = t.match(/(?:max(?:imum)?|limit|cap|beperk(?:t)?(?:\s+tot)?)\D{0,12}?(\d+(?:[.,]\d{1,2})?)/);
  const dur = t.match(/(\d+)\s*(day|days|dag|dagen|week|weeks|weken)\b/);
  let intent: Intent = 'UNKNOWN';
  let days: number | undefined;
  let limitCents: number | undefined;

  if (/\b(why|waarom|what is|wat is|explain|uitleg)\b/.test(t)) intent = 'EXPLAIN';
  else if (money) { intent = 'LIMIT'; limitCents = Math.round(parseFloat(money[1].replace(',', '.')) * 100); }
  else if (dur || /\b(pause|pauzeer|hold|uitstel)\b/.test(t)) {
    intent = 'PAUSE';
    if (dur) days = Number(dur[1]) * (/^w/.test(dur[2]) ? 7 : 1);
  } else if (/\b(stop|cancel|block|blokkeer|stopzet|intrek|opzeg)\w*/.test(t)) intent = 'STOP';

  const phrase = t
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w) && !/^\d+$/.test(w) && !/^(pause|pauzeer|hold|stop|cancel|block|blokkeer|why|waarom|what|wat|is|explain|uitleg|week|weeks|weken|day|days|dag|dagen|cap|beperkt|beperk)$/.test(w))
    .join(' ');
  return { intent, targetPhrase: phrase, days, limitCents };
}

export type Resolution =
  | { kind: 'ONE'; mandateId: string }
  | { kind: 'AMBIGUOUS'; mandateIds: string[] }
  | { kind: 'NONE' };

/** Deterministic target matching. The model never sees the mandate list. */
export function resolveTarget(phrase: string, mandates: Mandate[]): Resolution {
  const words = norm(phrase).split(/\s+/).filter(Boolean);
  if (!words.length) return { kind: 'NONE' };
  const scored = mandates
    .map((m) => {
      const name = norm(m.creditorName);
      const aliases = ALIASES[m.category];
      let score = 0;
      for (const w of words) {
        if (name.split(/\s+/).some((n) => n.startsWith(w) && w.length >= 3)) score += 2;
        if (aliases.some((a) => a === w)) score += 1;
      }
      return { id: m.id, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { kind: 'NONE' };
  const top = scored.filter((s) => s.score === scored[0].score);
  return top.length === 1 ? { kind: 'ONE', mandateId: top[0].id } : { kind: 'AMBIGUOUS', mandateIds: top.map((t) => t.id) };
}

/**
 * Best-effort redaction of the ONE free-text field that could carry personal data (the typed command).
 * Not a complete PII detector - the command box is optional, off by default, and capped at 200 chars.
 */
export function redactForModel(text: string): string {
  return text
    .slice(0, 200)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[redacted]')          // e-mail addresses
    .replace(/\b[A-Za-z]{2}\d{2}[A-Za-z0-9]{10,30}\b/g, '[redacted]') // IBAN without spaces
    .replace(/\d[\d\s.-]{5,}\d/g, '[redacted]');                // runs of 7+ digits/separators (phone, account, card)
}