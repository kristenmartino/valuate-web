import { type Qualification, formatUSD } from '@/lib/api';

const names: Record<string, string> = {
  'balance_sheet.total_assets': 'Assets',
  'balance_sheet.total_liabilities': 'Liabilities',
  'balance_sheet.shareholders_equity': 'Parent / reported equity',
  'balance_sheet.noncontrolling_interests': 'Noncontrolling interests',
};

export default function StatementWarnings({ qualification }: { qualification?: Qualification | null }) {
  const warnings = qualification?.statement_warnings ?? [];
  if (!warnings.length) return null;
  return (
    <div id="historical-balance-warnings" className="mt-3 scroll-mt-6 space-y-3">
      {warnings.map(w => <article key={w.period_end} data-testid={`historical-balance-warning-${w.fiscal_year}`} data-gap-usd={w.difference} className="min-w-0 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 [overflow-wrap:anywhere] dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <h5 className="font-semibold">FY{w.fiscal_year}: historical balance-sheet basis unresolved</h5>
        <p className="mt-2">{w.message}</p>
        <p className="mt-2 font-medium">{w.code === 'historical_ownership_incomplete' ? 'Unallocated residual' : 'Reconciliation gap'}: {formatUSD(Number(w.difference))}.</p>
        <p className="mt-2">These are display-data warnings. Keep the separately checked model inputs; a correction to the latest year will not resolve this historical basis.</p>
        {!!Object.keys(w.source_accessions).length && <details className="mt-2"><summary className="cursor-pointer underline underline-offset-4">Source bases for these rows</summary><dl className="mt-2 space-y-2">{Object.entries(w.source_accessions).map(([path, accession]) => <div key={path}><dt className="font-medium">{names[path] ?? path}</dt><dd className="font-mono text-xs">SEC accession {accession}</dd></div>)}</dl></details>}
      </article>)}
    </div>
  );
}
