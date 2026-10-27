import type { Company } from './api';

// Missing/legacy status is never permission to calculate or show a valuation.
export function canUseValuation(company: Company | null | undefined): boolean {
  return company?.qualification?.status === 'qualified';
}

export function inputName(path: string): string {
  const field = path.split('.').at(-1) ?? path;
  return ({company: 'Filing coverage', depreciation_amortization: 'Cash-flow add-back', short_term_debt: 'Current debt', long_term_debt: 'Noncurrent debt'} as Record<string,string>)[field] ?? field.replaceAll('_',' ');
}
