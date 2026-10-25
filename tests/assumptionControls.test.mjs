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
const { sliderBounds, sliderKeyValue, assumptionsChanged } = loadTs('../lib/assumptionControls.ts');
const capex = { min: 0, max: 0.2, step: 0.001 };
const starting = {
  revenue_growth: -0.00914675473708515,
  operating_margin: 0.4206450676037147,
  terminal_growth: 0.025,
  wacc: 0.0702191687485805,
  tax_rate: 0.15,
  capex_ratio: 0.22576254758204173,
  da_ratio: 0.07185968313593324,
  working_capital_ratio: 0.05,
};

test('TXN default stays within the selectable bounds after an edit below the old ceiling', () => {
  for (const current of [starting.capex_ratio, 0.199, 0.1]) {
    const bounds = sliderBounds(capex, current, starting.capex_ratio);
    assert.equal(bounds.min, 0);
    assert.ok(bounds.max >= starting.capex_ratio);
    assert.ok(bounds.max < starting.capex_ratio + capex.step);
  }
  assert.equal(starting.capex_ratio, 0.22576254758204173);
});

test('shared ranges also include negative or larger starting values without narrowing ordinary ranges', () => {
  assert.deepEqual(sliderBounds(capex, 0.1, 0.05), { min: 0, max: 0.2 });
  const range = { min: -0.1, max: 0.25, step: 0.005 };
  const lower = sliderBounds(range, 0.1, -0.1834567);
  assert.ok(lower.min <= -0.1834567);
  assert.equal(lower.max, 0.25);
  const upper = sliderBounds(range, 0.55, 0.1);
  assert.ok(upper.max >= 0.55);
});

test('keyboard movement starts at the full-precision default and respects the expanded bounds', () => {
  const range = { ...sliderBounds(capex, starting.capex_ratio, starting.capex_ratio), step: capex.step };
  assert.equal(sliderKeyValue('ArrowLeft', starting.capex_ratio, range), starting.capex_ratio - 0.001);
  assert.equal(sliderKeyValue('ArrowRight', 0.199, range), 0.2);
  assert.equal(sliderKeyValue('ArrowRight', starting.capex_ratio, range), range.max);
  assert.equal(sliderKeyValue('PageDown', starting.capex_ratio, range), starting.capex_ratio - 0.01);
  assert.equal(sliderKeyValue('Home', starting.capex_ratio, range), 0);
  assert.equal(sliderKeyValue('End', starting.capex_ratio, range), range.max);
  assert.equal(sliderKeyValue('ArrowRight', range.max, range), range.max);
  assert.equal(sliderKeyValue('ArrowLeft', range.min, range), range.min);
  assert.equal(sliderKeyValue('Enter', starting.capex_ratio, range), null);
});

test('restore availability compares full precision across all starting assumptions', () => {
  assert.equal(assumptionsChanged({ ...starting }, starting), false);
  assert.equal(assumptionsChanged({ ...starting, capex_ratio: 0.2258 }, starting), true);
  assert.equal(assumptionsChanged({ ...starting, wacc: starting.wacc + 1e-10 }, starting), true);
});
