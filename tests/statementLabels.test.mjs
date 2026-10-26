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
const { statementRowLabels, isCiscoCombinedDa } = loadTs('../lib/statementLabels.ts');
const item = (tag, source = 'xbrl') => ({ value: '17816000000', source, xbrl_tag: `us-gaap:${tag}` });

test('Cisco cash-flow adjustment retains its combined scope, including mixed history', () => {
  const combined = { ...item('unused'), xbrl_tag: 'csco:DepreciationAmortizationAndOther' };
  assert.equal(isCiscoCombinedDa(combined), true);
  assert.equal(isCiscoCombinedDa({ ...combined, source: 'user_override' }), false);
  assert.equal(statementRowLabels('depreciation_amortization', 'Depreciation and amortization', [combined, combined, null]).label, 'Depreciation, amortization and other');
  const mixed = statementRowLabels('depreciation_amortization', 'Depreciation and amortization', [combined, item('DepreciationDepletionAndAmortization')]);
  assert.equal(mixed.label, 'D&A adjustments (different coverage)');
  assert.deepEqual(mixed.cellLabels, ['Depreciation, amortization and other', 'D&A amount (coverage unspecified)']);
  assert.equal(statementRowLabels('depreciation_amortization', 'Depreciation and amortization', [item('DepreciationAndAmortization')]).label, 'Depreciation and amortization');
});

test('CRM combined payables and accruals never claim standalone accounts payable', () => {
  assert.equal(statementRowLabels('accounts_payable', 'Accounts payable', [item('AccountsPayableAndOtherAccruedLiabilitiesCurrent')]).label, 'Accounts payable, accrued expenses and other liabilities');
  assert.equal(statementRowLabels('accounts_payable', '', [item('AccountsPayableCurrent')]).label, 'Accounts payable');
  for (const source of ['llm_html', 'derived', 'user_override']) {
    assert.equal(statementRowLabels('accounts_payable', '', [item('AccountsPayableCurrent', source)]).label, 'Payables or accrued liabilities (coverage unspecified)');
  }
});

test('mixed payables coverage is shown beside each period rather than as one total', () => {
  const result = statementRowLabels('accounts_payable', '', [item('AccountsPayableCurrent'), item('AccountsPayableAndOtherAccruedLiabilitiesCurrent'), null]);
  assert.equal(result.label, 'Payables and accrued liabilities (different coverage)');
  assert.deepEqual(result.cellLabels, ['Accounts payable', 'Accounts payable, accrued expenses and other liabilities', null]);
});

test('Berkshire fixed maturities are not labeled as the whole investment portfolio', () => {
  const labels = statementRowLabels('investments', 'Investments', [
    item('AvailableForSaleSecuritiesDebtSecurities'), item('AvailableForSaleSecuritiesDebtSecurities'), null,
  ]);
  assert.equal(labels.label, 'Fixed-maturity securities (available for sale)');
  assert.deepEqual(labels.cellLabels, [null, null, null]);
});

test('future benefits and combined claims liabilities keep distinct coverage', () => {
  assert.equal(statementRowLabels('insurance_reserves', '', [item('LiabilityForFuturePolicyBenefits')]).label, 'Future policy benefits');
  assert.equal(statementRowLabels('insurance_reserves', '', [item('LiabilityForUnpaidClaimsAndClaimsAdjustmentExpense')]).label, 'Unpaid claims and adjustment expenses');
  assert.equal(statementRowLabels('insurance_reserves', '', [item('LiabilityForFuturePolicyBenefitsAndUnpaidClaimsAndClaimsAdjustmentExpense')]).label, 'Future policy benefits + unpaid claims and adjustment expenses');
});

test('different source coverage across years is visible beside each value', () => {
  const labels = statementRowLabels('investments', 'Investments', [
    item('Investments'), item('AvailableForSaleSecuritiesDebtSecurities'), null,
  ]);
  assert.equal(labels.label, 'Investment amounts (different coverage)');
  assert.deepEqual(labels.cellLabels, ['Reported investments', 'Fixed-maturity securities (available for sale)', null]);
});

test('AI, corrected, calculated, and unrecognized facts never inherit total coverage', () => {
  for (const source of ['llm_html', 'user_override', 'derived']) {
    assert.equal(statementRowLabels('investments', 'Investments', [item('Investments', source)]).label, 'Investment amount (coverage unspecified)');
  }
  assert.equal(statementRowLabels('insurance_reserves', '', [item('UnknownConcept')]).label, 'Policy or claims liability (coverage unspecified)');
});

test('unrelated statement labels and missing values stay unchanged', () => {
  assert.deepEqual(statementRowLabels('total_assets', 'Total assets', [item('Assets'), null]), { label: 'Total assets', cellLabels: [null, null] });
});

test('parent and consolidated equity coverage are distinguished', () => {
  assert.equal(statementRowLabels('shareholders_equity', '', [item('StockholdersEquity')]).label, "Parent shareholders' equity");
  assert.equal(statementRowLabels('shareholders_equity', '', [item('StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest')]).label, 'Equity including noncontrolling interests');
  const mixed = statementRowLabels('shareholders_equity', '', [item('StockholdersEquity'), item('StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest')]);
  assert.equal(mixed.label, 'Equity (different coverage)');
  assert.deepEqual(mixed.cellLabels, ["Parent shareholders' equity", 'Equity including noncontrolling interests']);
  assert.equal(statementRowLabels('shareholders_equity', '', [item('StockholdersEquity', 'llm_html')]).label, "Shareholders' equity (coverage unspecified)");
});
