import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';

const loadTs = createRequire(import.meta.url);
loadTs.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const { formatMultiple, positivePeerCounts } = loadTs('../lib/compsDisplay.ts');

test('missing or nonfinite multiples stay a dash; real zero and negative values retain units', () => {
  for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
    assert.equal(formatMultiple(value), '—');
  }
  assert.equal(formatMultiple(0), '0.0x');
  assert.equal(formatMultiple(-4.4), '-4.4x');
  assert.equal(formatMultiple(13.94), '13.9x');
});

test('each median discloses its own usable peer population rather than the table row count', () => {
  // Four returned peers: one negative EV/revenue, no usable EV/EBITDA,
  // and one missing P/E. The target is deliberately not part of this input.
  const peers = [
    { pe_ratio: 12.1, ev_revenue: 1.1, ev_ebitda: null },
    { pe_ratio: 11.5, ev_revenue: 1.3, ev_ebitda: null },
    { pe_ratio: 11.8, ev_revenue: -4.4, ev_ebitda: null },
    { pe_ratio: null, ev_revenue: 1.5, ev_ebitda: null },
  ];
  assert.deepEqual(positivePeerCounts(peers), {
    pe_ratio: 3, ev_revenue: 3, ev_ebitda: 0,
  });
});

test('no peers and nonfinite or nonpositive values never imply available coverage', () => {
  assert.deepEqual(positivePeerCounts([]), { pe_ratio: 0, ev_revenue: 0, ev_ebitda: 0 });
  assert.deepEqual(positivePeerCounts([
    { pe_ratio: 0, ev_revenue: NaN, ev_ebitda: Infinity },
    { pe_ratio: -1, ev_revenue: null, ev_ebitda: -Infinity },
  ]), { pe_ratio: 0, ev_revenue: 0, ev_ebitda: 0 });
});
