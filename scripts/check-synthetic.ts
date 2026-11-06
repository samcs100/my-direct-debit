import { MANDATES, HOLIDAYS } from '../packages/core/src/fixtures.ts';
import { isWorkingDay } from '../packages/core/src/dates.ts';
import assert from 'node:assert/strict';
assert.equal(MANDATES.length,12);
for (const m of MANDATES) { assert.match(m.creditorId,/^FAKE-CID-/); assert.match(m.maskedIban,/^NL\*\*TEST\*{6}\d{4}$/); for (const h of m.history) assert.ok(isWorkingDay(h.date,HOLIDAYS)); }
console.log('Synthetic fixture checks passed.');
