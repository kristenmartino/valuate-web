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
const { hasNegativeSensitivity, hasNegativeSimulations, scenarioOutputPresentation } = loadTs('../lib/scenarioOutputs.ts');
const mc = { mean: 10, median: 10, p10: 1, p25: 5, p75: 15, p90: 20, histogram: [[-2, 1], [0, 99]], central_histogram: { lower_bound: 1, upper_bound: 20 } };

test('a negative full-range tail is detected outside a positive percentile window', () => {
  const before = structuredClone(mc);
  assert.equal(hasNegativeSimulations(mc), true);
  assert.deepEqual(mc, before);
  assert.equal(hasNegativeSimulations({ ...mc, histogram: [[-2, 0], [1, 100]] }), false);
});

test('legacy simulation summaries still disclose negative outputs without histogram evidence', () => {
  assert.equal(hasNegativeSimulations({ ...mc, histogram: [], p10: -1 }), true);
  assert.equal(hasNegativeSimulations({ ...mc, histogram: [] }), false);
});

test('negative sensitivity detection preserves signed cells and ignores unavailable values', () => {
  const grid = { values: [[null, 0, 3], [-2, 5, null]] };
  const before = structuredClone(grid);
  assert.equal(hasNegativeSensitivity(grid), true);
  assert.deepEqual(grid, before);
  assert.equal(hasNegativeSensitivity({ values: [[null, 0, 3, NaN, Infinity]] }), false);
});

test('grid and simulation disclosures are derived independently of one another and the headline', () => {
  assert.match(scenarioOutputPresentation(hasNegativeSensitivity({ values: [[-1]] })).perShareLabel, /Model equity outputs/);
  assert.equal(scenarioOutputPresentation(hasNegativeSimulations({ ...mc, histogram: [[1, 100]] })).caveat, null);
  assert.equal(scenarioOutputPresentation(hasNegativeSensitivity({ values: [[1]] })).caveat, null);
  assert.match(scenarioOutputPresentation(hasNegativeSimulations(mc)).caveat, /not negative stock-price estimates/);
});

test('negative proxy outputs retain preferred-claim and common-share limitations', () => {
  const result = scenarioOutputPresentation(true, 'parent_equity_proxy');
  assert.equal(result.residualLabel, 'unfloored parent-equity proxy residual');
  assert.match(result.caveat, /Preferred claims remain included; common-share valuation is unverified/);
  assert.equal(scenarioOutputPresentation(false, 'parent_equity_proxy').perShareLabel, 'Parent-equity proxy outputs per share');
});
