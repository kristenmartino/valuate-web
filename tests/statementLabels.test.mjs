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
const { statementRowLabels, isCiscoCombinedDa, isAdobeAccretionDa } = loadTs('../lib/statementLabels.ts');
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

test('Alphabet PPE proxy is scoped to the filer and never labeled full D&A', () => {
  const context = { cik: '0001652044' };
  assert.equal(statementRowLabels('depreciation_amortization', 'D&A', [item('Depreciation')], context).label, 'PP&E depreciation (proxy)');
  assert.equal(statementRowLabels('depreciation_amortization', 'D&A', [item('Depreciation')], { cik: '789019' }).label, 'Depreciation (component; full D&A unverified)');
  const labels = statementRowLabels('depreciation_amortization', 'D&A', [item('Depreciation'), item('Depreciation', 'user_override')], context);
  assert.equal(labels.label, 'Add-backs (different coverage)');
  assert.deepEqual(labels.cellLabels, ['PP&E depreciation (proxy)', 'Add-back (coverage unspecified)']);
});

test('Alphabet legacy finance-lease debt coverage remains visible per period', () => {
  const context = { cik: '1652044', legacyDebt: [false, true] };
  const long = statementRowLabels('long_term_debt', 'Long-term debt', [item('LongTermDebtNoncurrent'), item('LongTermDebtAndCapitalLeaseObligations')], context);
  assert.equal(long.label, 'Noncurrent debt (different coverage)');
  assert.deepEqual(long.cellLabels, ['Noncurrent debt', 'Noncurrent debt including finance leases']);
  const current = statementRowLabels('short_term_debt', 'Short-term debt', [item('unused', 'derived'), item('unused', 'derived')], context);
  assert.deepEqual(current.cellLabels, ['Current maturities + commercial paper', 'Current debt including finance leases']);
  assert.equal(statementRowLabels('short_term_debt', 'Short-term debt', [item('unused', 'user_override')], context).label, 'Debt (reviewed; see source details)');
});

test('unqualified component tags never inherit a full D&A label on unfamiliar filers', () => {
  assert.equal(statementRowLabels('depreciation_amortization','D&A',[item('Depreciation')]).label,'Depreciation (component; full D&A unverified)');
  assert.equal(statementRowLabels('depreciation_amortization','D&A',[item('DepreciationDepletionAndAmortizationPropertyPlantAndEquipment')]).label,'PP&E depreciation and amortization (component)');
});
test('an inclusive or face-value debt concept never claims verified noncurrent carrying debt', () => {
  assert.equal(statementRowLabels('long_term_debt','Long-term debt',[item('LongTermDebt')]).label,'Debt amount (basis/current split unverified)');
  const labels=statementRowLabels('long_term_debt','Long-term debt',[item('LongTermDebt'),item('LongTermDebtNoncurrent')]);
  assert.equal(labels.label,'Debt amounts (different coverage)');
  assert.deepEqual(labels.cellLabels,['Debt amount (basis/current split unverified)','Noncurrent debt']);
});

test('Adobe noncurrent debt requires the scoped filing provenance and never relabels an unreviewed total', () => {
  const verified = { ...item('LongTermDebt'), source_quote: 'Noncurrent debt, excluding current maturities. Adobe balance-sheet noncurrent carrying debt.' };
  assert.equal(statementRowLabels('long_term_debt', 'Long-term debt', [verified], { cik: '0000796343' }).label, 'Noncurrent debt (filed carrying amount)');
  assert.equal(statementRowLabels('long_term_debt', 'Long-term debt', [item('LongTermDebt')], { cik: '0000796343' }).label, 'Debt amount (basis/current split unverified)');
  assert.equal(statementRowLabels('long_term_debt', 'Long-term debt', [verified], { cik: '97476' }).label, 'Debt amount (basis/current split unverified)');
});

test('EOG cash-flow add-back names depletion explicitly without relabeling other filers', () => {
  const i = item('DepreciationDepletionAndAmortization');
  assert.equal(statementRowLabels('depreciation_amortization', 'D&A', [i], { cik: '0000821189' }).label, 'Depreciation, depletion and amortization');
  assert.equal(statementRowLabels('depreciation_amortization', 'D&A', [i], { cik: '77476' }).label, 'D&A');
});


test('Adobe cash-flow accretion remains explicit and never becomes pure D&A', () => {
  const i = item('DepreciationDepletionAndAmortization');
  assert.equal(isAdobeAccretionDa(i, '0000796343'), true);
  assert.equal(isAdobeAccretionDa(i, '77476'), false);
  assert.equal(isAdobeAccretionDa({ ...i, source: 'user_override' }, '796343'), false);
  assert.equal(statementRowLabels('depreciation_amortization', 'D&A', [i], { cik: '796343' }).label, 'Depreciation, amortization and accretion');
});

test('Starbucks distinguishes cash-flow totals from operating expense D&A', () => {
  const context = { cik: '0000829224', statement: 'income' };
  assert.equal(statementRowLabels('depreciation_amortization','D&A',[item('DepreciationAndAmortization')],context).label,'D&A (operating expense line)');
  assert.equal(statementRowLabels('depreciation_amortization','D&A',[item('DepreciationDepletionAndAmortization')],{...context,statement:'cashflow'}).label,'D&A (cash-flow total)');
  assert.equal(statementRowLabels('depreciation_amortization','D&A',[item('DepreciationAndAmortization','user_override')],context).label,'D&A (see source details)');
  assert.equal(statementRowLabels('cost_of_revenue','Cost of revenue',[{...item('unused','llm_html'),source_quote:'Product and distribution costs 11,658.2'}],context).label,'Product and distribution costs (component)');
});
