import type { Company } from './api';

// Missing/legacy status is never permission to calculate or show a valuation.
export function canUseValuation(company: Company | null | undefined): boolean {
  return company?.qualification?.status === 'qualified';
}

export function inputName(path: string): string {
  const field = path.split('.').at(-1) ?? path;
  return ({company: 'Filing coverage', depreciation_amortization: 'Cash-flow add-back', short_term_debt: 'Current debt', long_term_debt: 'Noncurrent debt'} as Record<string,string>)[field] ?? field.replaceAll('_',' ');
}

// Use machine-readable filing evidence rather than guessing scope from a
// company name or a source-quote substring. Historical proxy ratios matter too.
export function reusableCashFlowScope(company: Company | null | undefined) {
  if (company?.qualification?.method !== 'reusable_statement_rules') return null;
  const inputs = company.qualification.inputs.filter(i => i.field_path === 'cash_flow_statement.depreciation_amortization');
  if (!inputs.length) return null;
  const isProxy = inputs.some(i => i.is_proxy);
  return { isProxy, label: isProxy ? 'Combined cash-flow add-back' : 'Filed cash-flow D&A' };
}
