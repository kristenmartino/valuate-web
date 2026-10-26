import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const loadTs = createRequire(import.meta.url);

// Compile the small TypeScript API helpers without adding a runtime dependency.
loadTs.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const { correctionOptions, correctionRequest, parseCorrectionValue } = loadTs('../lib/corrections.ts');
const item = (value, source_quote = null) => ({ value, source: 'xbrl', confidence: 1, source_quote, xbrl_tag: 'us-gaap:Assets' });
const company = { periods: [{
  balance_sheet: { total_assets: item('1000'), total_liabilities: item('600'), shareholders_equity: item('350', 'Equity 350') },
  income_statement: { revenue: item('900'), diluted_shares_outstanding: item('100') },
}] };
const reconciliation = { field_path: 'balance_sheet', current_value: '1000', reason: 'Identity mismatch' };

test('reconciliation offers three specific targets with their own current values', () => {
  const options = correctionOptions(company, reconciliation);
  assert.deepEqual(options.map(o => [o.fieldPath, o.item.value]), [
    ['balance_sheet.total_assets', '1000'],
    ['balance_sheet.total_liabilities', '600'],
    ['balance_sheet.shareholders_equity', '350'],
  ]);
  assert.equal(options[2].item.source_quote, 'Equity 350');
});

test('every reconciliation selection submits a valid API field path', () => {
  for (const option of correctionOptions(company, reconciliation)) {
    assert.deepEqual(correctionRequest(company, reconciliation, option.fieldPath, '1.25B', '  Filing excerpt  '), {
      field_path: option.fieldPath, value: '1250000000', source_quote: 'Filing excerpt',
    });
  }
});

test('no aggregate, empty, unrelated, or malformed path can be submitted', () => {
  for (const fieldPath of ['', 'balance_sheet', 'income_statement.revenue', 'balance_sheet.total_assets.extra']) {
    assert.throws(() => correctionRequest(company, reconciliation, fieldPath, '1000', ''), /specific field/);
  }
  assert.deepEqual(correctionOptions(company, { field_path: 'balance_sheet.total_assets.extra' }), []);
});

test('unavailable fields are not offered', () => {
  assert.deepEqual(correctionOptions({ periods: [] }, reconciliation), []);
  const missingEquity = { periods: [{ balance_sheet: { total_assets: item('1000'), total_liabilities: item('600') } }] };
  assert.equal(correctionOptions(missingEquity, reconciliation).length, 2);
});

test('a reported noncontrolling-interest component can be corrected separately', () => {
  const withNci = structuredClone(company);
  withNci.periods[0].balance_sheet.noncontrolling_interests = item('50', 'Noncontrolling interests 50');
  const options = correctionOptions(withNci, reconciliation);
  assert.equal(options.length, 4);
  assert.equal(options[3].fieldPath, 'balance_sheet.noncontrolling_interests');
  assert.deepEqual(correctionRequest(withNci, reconciliation, options[3].fieldPath, '50', 'Filing'), {
    field_path: 'balance_sheet.noncontrolling_interests', value: '50', source_quote: 'Filing',
  });
});

test('single-field corrections keep their target and share units', () => {
  const flag = { field_path: 'income_statement.diluted_shares_outstanding', current_value: '100' };
  assert.deepEqual(correctionRequest(company, flag, flag.field_path, '150M', ''), {
    field_path: flag.field_path, value: '150000000', source_quote: null,
  });
  assert.throws(() => correctionRequest(company, flag, flag.field_path, '$150M', ''), /valid number/);
  assert.throws(() => correctionRequest(company, flag, 'balance_sheet.total_assets', '100', ''), /specific field/);
});

test('invalid numeric inputs cannot reach the API', () => {
  for (const raw of ['', 'NaN', 'Infinity', '1.2.3', 'hello']) {
    assert.equal(parseCorrectionValue(raw), null);
    assert.throws(() => correctionRequest(company, reconciliation, 'balance_sheet.total_assets', raw, ''), /valid number/);
  }
  assert.equal(parseCorrectionValue('$1,250,000'), '1250000');
  assert.equal(parseCorrectionValue('-2.5M'), '-2500000');
  assert.equal(parseCorrectionValue('0'), '0');
});


test('a proxy review uses its display scope while preserving the correction API field', () => {
  const c = structuredClone(company);
  c.operating_income_label = 'EBIT proxy';
  c.periods[0].income_statement.operating_income = item('12263000000', 'Calculated proxy source');
  const flag = { field_path: 'income_statement.operating_income', current_value: '12263000000' };
  assert.equal(correctionOptions(c, flag)[0].label, 'EBIT proxy');
  assert.deepEqual(correctionRequest(c, flag, 'income_statement.operating_income', '12.263B', 'Reviewed formula'), {
    field_path: 'income_statement.operating_income', value: '12263000000', source_quote: 'Reviewed formula',
  });
});
