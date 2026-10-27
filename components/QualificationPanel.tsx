import type { Company } from '@/lib/api';
import { canUseValuation, inputName } from '@/lib/qualification';

export default function QualificationPanel({ company }: { company: Company }) {
  const q = company.qualification;
  const qualified = canUseValuation(company);
  return (
    <section data-testid="qualification-gate" className={`min-w-0 rounded-lg border p-4 sm:p-6 [overflow-wrap:anywhere] ${qualified ? 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}>
      <h3 className="font-semibold">{qualified ? 'Filing input checks passed' : 'Valuation withheld — input review required'}</h3>
      <p className="mt-2 text-sm">{qualified ? 'The saved inputs passed the coverage checks for this specific annual filing and simplified model. This does not mean every displayed figure was manually reviewed or that the valuation predicts a market price.' : 'The financials are available for inspection. This filing has not passed all required coverage and source checks, so estimates, assumptions and simulations are unavailable.'}</p>
      {q?.method === 'reusable_statement_rules' && <p className="mt-2 text-sm">Checked automatically against SEC statement relationships and annual source contexts. This is not a manual filing review.</p>}
      {!qualified && <p className="mt-2 text-sm">A saved record, a high extraction score or a user correction does not grant publication approval. Clearing an extraction flag does not by itself qualify a valuation.</p>}
      {!!q?.issues.length && <ul className="mt-3 space-y-2 text-sm">{q.issues.map((issue, i) => <li key={`${issue.code}-${issue.field_path}-${issue.period_end}-${i}`}><strong className="capitalize">{inputName(issue.field_path)}</strong>{issue.period_end ? ` · ${issue.period_end}` : ''}: {issue.message}</li>)}</ul>}
      {!!q?.disclosures.length && <details className="mt-3 text-sm"><summary className="cursor-pointer underline underline-offset-4">Model coverage and limitations</summary><ul className="mt-2 space-y-2">{q.disclosures.map(text => <li key={text}>{text}</li>)}</ul></details>}
      {!!q?.inputs.length && <details className="mt-3 text-sm"><summary className="cursor-pointer underline underline-offset-4">Filing evidence for {q.inputs.length} checked values</summary><div className="mt-3 space-y-3">{q.inputs.map((input,i)=><div key={`${input.field_path}-${input.period_end}-${i}`} className="border-t border-zinc-300 pt-2 dark:border-zinc-700"><p className="capitalize font-medium">{input.display_label ?? inputName(input.field_path)} · {input.period_end}</p><p className="mt-1 break-words">{input.scope}</p><p className="mt-1 text-xs">{input.value} {input.unit} · {input.basis} · SEC accession {input.accession}</p>{!!input.operands.length && <details className="mt-1"><summary className="cursor-pointer">Calculation operands</summary>{input.operands.map((operand,j)=><p className="mt-1 break-words text-xs" key={j}>{operand.concept}: {operand.value} {operand.unit} · {operand.start ? `${operand.start} to ` : 'year-end '}{operand.end} · {operand.accession}{operand.usage ? ` · ${operand.usage}` : ''}{operand.source_url?.startsWith('https://www.sec.gov/Archives/') && <> · <a className="underline underline-offset-4" href={operand.source_url} target="_blank" rel="noreferrer">SEC filing</a></>}</p>)}</details>}</div>)}</div></details>}
    </section>
  );
}
