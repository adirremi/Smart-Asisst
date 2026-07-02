#!/usr/bin/env node
// Golden regression runner for the WhatsApp NLU.
//
// Usage:
//   OPENAI_API_KEY=sk-...  node tests/run-golden.mjs
//   AI_PROVIDER=gemini GEMINI_API_KEY=...  node tests/run-golden.mjs
//
// Calls the REAL model (same code path as production) for each case and checks
// only the fields declared in `expect`. Exits non-zero if any case fails.

import { interpretMessage } from '../api/_lib/ai.js';
import { CONTEXT, CASES } from './golden.cases.js';

function attendeesOf(result) {
  const a = result.attendees || result.add_attendees || [];
  return Array.isArray(a) ? a.map((x) => String(x)) : [];
}

function checkCase(expect, result) {
  const fails = [];
  const eq = (k) => {
    if (expect[k] !== undefined && result[k] !== expect[k]) {
      fails.push(`${k}: expected "${expect[k]}", got "${result[k]}"`);
    }
  };
  eq('intent');
  eq('scope');
  eq('range');
  eq('target_type');

  if (expect.timeEndsWith !== undefined) {
    const s = result.start_datetime || '';
    if (!s.endsWith(expect.timeEndsWith)) fails.push(`time: expected end "${expect.timeEndsWith}", got "${s}"`);
  }
  if (expect.dateStartsWith !== undefined) {
    const s = result.start_datetime || '';
    if (!s.startsWith(expect.dateStartsWith)) fails.push(`date: expected start "${expect.dateStartsWith}", got "${s}"`);
  }
  if (expect.hasAttendees !== undefined) {
    const has = attendeesOf(result).length > 0;
    if (has !== expect.hasAttendees) fails.push(`hasAttendees: expected ${expect.hasAttendees}, got ${has}`);
  }
  if (expect.attendeesInclude) {
    const a = attendeesOf(result).join(' | ');
    for (const name of expect.attendeesInclude) {
      if (!attendeesOf(result).some((x) => x.includes(name) || name.includes(x))) {
        fails.push(`attendeesInclude: "${name}" missing (got [${a}])`);
      }
    }
  }
  if (expect.attendeesExclude) {
    for (const name of expect.attendeesExclude) {
      if (attendeesOf(result).some((x) => x.includes(name) || name.includes(x))) {
        fails.push(`attendeesExclude: "${name}" should not be an attendee`);
      }
    }
  }
  if (expect.titleExcludes) {
    const title = result.title || '';
    for (const tok of expect.titleExcludes) {
      if (title.includes(tok)) fails.push(`titleExcludes: title still contains "${tok}" ("${title}")`);
    }
  }
  if (expect.itemsAtLeast !== undefined) {
    const n = Array.isArray(result.items) ? result.items.length : 0;
    if (n < expect.itemsAtLeast) fails.push(`itemsAtLeast: expected >= ${expect.itemsAtLeast}, got ${n}`);
  }
  if (expect.minConfidence !== undefined && (result.confidence ?? 1) < expect.minConfidence) {
    fails.push(`minConfidence: expected >= ${expect.minConfidence}, got ${result.confidence}`);
  }
  if (expect.maxConfidence !== undefined && (result.confidence ?? 1) > expect.maxConfidence) {
    fails.push(`maxConfidence: expected <= ${expect.maxConfidence}, got ${result.confidence}`);
  }
  return fails;
}

async function main() {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const key = provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  if (!key) {
    console.error(`Missing API key for provider "${provider}". Set OPENAI_API_KEY or GEMINI_API_KEY.`);
    process.exit(2);
  }

  console.log(`Running ${CASES.length} golden cases via ${provider}...\n`);
  let passed = 0;
  const failedCases = [];

  for (const c of CASES) {
    let result;
    try {
      result = await interpretMessage({ message: c.message, ...CONTEXT });
    } catch (err) {
      failedCases.push({ name: c.name, fails: [`threw: ${err.message}`] });
      console.log(`✗ ${c.name}\n    threw: ${err.message}`);
      continue;
    }
    const fails = checkCase(c.expect, result);
    if (fails.length === 0) {
      passed += 1;
      console.log(`✓ ${c.name}`);
    } else {
      failedCases.push({ name: c.name, fails, result });
      console.log(`✗ ${c.name}`);
      for (const f of fails) console.log(`    - ${f}`);
      console.log(`    got: ${JSON.stringify(result)}`);
    }
  }

  console.log(`\n${passed}/${CASES.length} passed.`);
  if (failedCases.length) {
    console.log(`${failedCases.length} failed.`);
    process.exit(1);
  }
}

main();
