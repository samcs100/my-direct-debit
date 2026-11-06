/** Fictional IBANs: valid format and checksum, bank code 'TEST' (not an existing Dutch bank code - verify against the current register). */
export function ibanCheckDigits(country: string, bban: string): string {
  const digits = (bban + country + '00').replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return String(98n - (BigInt(digits) % 97n)).padStart(2, '0');
}
export const fakeNlIban = (seq: number): string => {
  const bban = 'TEST' + String(seq).padStart(10, '0');
  return `NL${ibanCheckDigits('NL', bban)}${bban}`;
};
export const isValidIban = (iban: string): boolean => {
  const re = iban.slice(4) + iban.slice(0, 4);
  return BigInt(re.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))) % 97n === 1n;
};
export const maskIban = (iban: string): string => `${iban.slice(0, 2)}**${iban.slice(4, 8)}******${iban.slice(-4)}`;