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
const { assumptionIssue } = loadTs('../lib/assumptionValidation.ts');
test('all perpetuity models reject equal or inverted discount and growth rates', () => {
  for (const industry of ['standard', 'bank', 'insurer', 'reit']) {
    for (const wacc of [0.04, 0.06]) {
      assert.match(assumptionIssue({wacc, terminal_growth:0.06, operating_margin:0.12}, industry), /must exceed/);
    }
    assert.equal(assumptionIssue({wacc:0.08, terminal_growth:0.06, operating_margin:0.12}, industry), null);
  }
});
test('energy has no perpetuity constraint; insurer needs ROE above growth', () => {
  assert.equal(assumptionIssue({wacc:0.04, terminal_growth:0.06}, 'energy'), null);
  assert.match(assumptionIssue({wacc:0.09, terminal_growth:0.03, operating_margin:0.03}, 'insurer'), /Return on equity must exceed/);
});
