import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { chromium } from 'playwright';

const fixtures = JSON.parse(await readFile(new URL('./recorded-responses.json', import.meta.url)));
fixtures.MET = JSON.parse(await readFile(new URL('./met-response.json', import.meta.url)));
const base = process.env.BROWSER_TEST_BASE_URL || 'http://127.0.0.1:4317';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Browser fixtures must never target a public deployment');
const artifacts = '.browser-artifacts';
let server, browser;

async function until(check, message, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

before(async () => {
  await mkdir(artifacts, { recursive: true });
  if (!process.env.BROWSER_TEST_BASE_URL) {
    const log = createWriteStream(`${artifacts}/server.log`);
    let exit;
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '4317'], { stdio: 'pipe' });
    server.stdout.pipe(log); server.stderr.pipe(log);
    server.once('exit', code => { exit = code; });
    await until(async () => {
      if (exit !== undefined) throw new Error(`Local server exited (${exit}); inspect ${artifacts}/server.log`);
      try { return (await fetch(base)).ok; } catch { return false; }
    }, 'Local production server did not start', 30000);
  }
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); server?.kill(); });

async function workspace(t, ticker, options = {}) {
  const data = structuredClone(fixtures[ticker]);
  options.mutate?.(data.company);
  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const calls = [], errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) { external.push(url.href); return route.abort(); }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    calls.push({ path: url.pathname, method: route.request().method(), body: route.request().postDataJSON() });
    let response;
    if (url.pathname === `/api/company/${ticker}`) response = data.company;
    else if (url.pathname === `/api/value/${ticker}/defaults`) response = data.defaults;
    else if (url.pathname === `/api/value/${ticker}` && route.request().method() === 'POST') {
      if (options.rejectRecompute && calls.filter(c => c.method === 'POST').length > 1) {
        data.company.qualification.status = 'review_required';
        return route.fulfill({ status: 422, json: { detail: { code: 'valuation_not_qualified' } } });
      }
      response = structuredClone(data.valuation);
      const inputs = route.request().postDataJSON().assumptions;
      response.projection.assumptions = inputs;
      if (JSON.stringify(inputs) !== JSON.stringify(data.defaults)) response.projection.fair_value_per_share -= 1;
    } else if (url.pathname === `/api/comps/${ticker}`) response = {
      target_ticker: ticker, target_market: { ticker, name: 'Recorded UI fixture market context', market_cap: 100e9, enterprise_value: 110e9, revenue: 20e9, ebitda: 5e9, pe_ratio: 20, ev_revenue: 5, ev_ebitda: 22 },
      peers: [], median_pe: null, median_ev_revenue: null, median_ev_ebitda: null,
    };
    else throw new Error(`Unexpected API operation in read-only browser test: ${route.request().method()} ${url.pathname}`);
    return route.fulfill({ json: response });
  });
  t.after(async () => {
    assert.deepEqual(errors, [], 'Browser runtime error');
    assert.deepEqual(external, [], 'Browser test attempted an external request');
    assert.ok(calls.every(c => c.method === 'GET' || /\/value\//.test(c.path)), 'Browser test attempted a correction or extraction');
    await context.close();
  });
  await page.goto(`${base}/v/${ticker}`);
  await page.getByRole('heading', { name: data.company.qualification.status === 'qualified' ? data.company.periods[0].industry === 'insurer' ? 'Parent-equity proxy input checks passed' : 'Filing input checks passed' : 'Valuation withheld — input review required' }).waitFor();
  if (data.company.qualification.status === 'qualified') {
    await page.getByRole('heading', { name: /Estimated value per share|Model equity residual per share|Parent-equity proxy per share/ }).waitFor();
  }
  return { page, calls, data };
}

test('capex outside the usual range changes and restores the complete exact request', async t => {
  const { page, calls, data } = await workspace(t, 'TXN');
  const slider = page.getByRole('slider', { name: /^Capex \/ revenue/ });
  assert.ok(Number(await slider.getAttribute('max')) >= data.defaults.capex_ratio);
  const values = () => calls.filter(c => c.method === 'POST');
  const initial = values().length;
  await slider.focus(); await page.keyboard.press('ArrowLeft');
  await until(() => values().length > initial, 'Changed scenario request missing');
  assert.notEqual(values().at(-1).body.assumptions.capex_ratio, data.defaults.capex_ratio);
  const changed = values().length;
  await page.getByRole('button', { name: 'Restore starting assumptions' }).click();
  await until(() => values().length > changed, 'Restore request missing');
  assert.deepEqual(values().at(-1).body.assumptions, data.defaults);
  assert.equal(await page.getByRole('button', { name: 'Restore starting assumptions' }).isDisabled(), true);
});

for (const width of [320, 375]) {
  test(`long saved review remains readable and returns focus at ${width}px`, async t => {
    const { page, data } = await workspace(t, 'ADBE', { viewport: { width, height: 812 }, mutate: c => {
      c.periods[0].income_statement.selling_general_administrative.source_quote += ' UI_TEST_ONLY_LONG_TOKEN_' + 'x'.repeat(600);
    }});
    const control = page.getByRole('button', { name: /Selling, general and administrative, FY2025: User correction source details/ });
    await control.click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    assert.ok((await dialog.innerText()).includes(data.company.periods[0].income_statement.selling_general_administrative.source_quote));
    const size = await dialog.evaluate(e => ({ width: e.getBoundingClientRect().width, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth, height: e.getBoundingClientRect().height, scrollHeight: e.scrollHeight, clientHeight: e.clientHeight }));
    assert.ok(size.width <= width - 30 && size.scrollWidth <= size.clientWidth);
    assert.ok(size.height <= 812 * 0.85 + 2);
    assert.ok(size.scrollHeight > size.clientHeight, 'Long evidence must be vertically scrollable');
    await page.screenshot({ path: `${artifacts}/long-source-${width}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await control.evaluate(e => e === document.activeElement), true);
  });
}

test('unqualified financials never request defaults or a valuation', async t => {
  const { page, calls } = await workspace(t, 'NVDA', { mutate: c => { c.qualification.status = 'review_required'; c.qualification.issues = [{ code: 'fixture_missing_scope', field_path: 'balance_sheet.long_term_debt', period_end: null, message: 'TEST ONLY: source coverage missing' }]; }});
  await page.getByRole('heading', { name: 'Extracted statements' }).waitFor();
  assert.equal(await page.getByRole('slider').count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'Estimated value per share' }).count(), 0);
  assert.ok(!calls.some(c => c.path.startsWith('/api/value/')));
});

test('normalized share history retains exact calculation evidence', async t => {
  const { page } = await workspace(t, 'NVDA');
  const row = page.getByRole('row').filter({ hasText: 'Diluted shares (split-adjusted history)' });
  assert.match(await row.innerText(), /25\.1B shares/); assert.match(await row.innerText(), /25\.4B shares/);
  await page.locator('summary[aria-label="Diluted shares (split-adjusted history), FY2022: Calculated source details"]').click();
  assert.match(await row.innerText(), /selected amount 25350000000 shares/);
  assert.match(await row.innerText(), /split factor 10/);
});

test('bank paid-common DPS stays supplemental and retains cent precision', async t => {
  const { page } = await workspace(t, 'BAC');
  await page.getByRole('heading', { name: /Supplemental dividend disclosure \(DDM input\)/i }).waitFor();
  const text = await page.getByRole('row').filter({ hasText: 'Common cash dividends paid per share (supplemental DDM input)' }).innerText();
  assert.match(text, /\$1\.08 \/ share/); assert.match(text, /\$1\.00 \/ share/);
  assert.match(await page.locator('body').innerText(), /not an aggregate cash-flow statement subtotal/);
  assert.match(await page.locator('body').innerText(), /Positive sustainable growth is capped at 8%/);
});

test('combined add-back cannot be presented as model-implied EBITDA', async t => {
  const { page } = await workspace(t, 'WMT');
  const row = page.getByRole('row').filter({ hasText: 'DCF IMPLIES' });
  await row.waitFor();
  assert.equal((await row.getByRole('cell').last().innerText()).trim(), '—');
  assert.match(await page.locator('body').innerText(), /combined cash-flow/i);
});

test('negative equity residual cannot be presented as a negative stock-price estimate', async t => {
  const { page } = await workspace(t, 'ORCL');
  assert.equal(await page.getByRole('heading', { name: 'Model equity residual per share' }).count(), 1);
  assert.match(await page.locator('body').innerText(), /unfloored model residual, not a stock-price estimate/);
  assert.equal(await page.getByRole('row').filter({ hasText: 'DCF IMPLIES' }).count(), 0);
});

test('Berkshire share class and IBM proxy remain explicit', async t => {
  const first = await workspace(t, 'BRK-B');
  assert.match(await first.page.locator('body').innerText(), /annual average equivalent Class B shares/);
  const second = await workspace(t, 'IBM');
  assert.match(await second.page.locator('body').innerText(), /EBIT proxy/);
  assert.match(await second.page.locator('body').innerText(), /not reported operating income|not IBM.*operating/i);
});

test('long qualification evidence cannot widen the mobile reading viewport', async t => {
  const { page } = await workspace(t, 'NVDA', { viewport: { width: 375, height: 812 }, mutate: c => {
    c.qualification.disclosures.push('UI_TEST_ONLY_LONG_IDENTIFIER_' + 'x'.repeat(800));
  }});
  await page.locator('[data-testid="qualification-gate"] summary').filter({ hasText: 'Model coverage and limitations' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
});

test('qualification loss during a scenario clears the previously displayed estimate', async t => {
  const { page } = await workspace(t, 'NVDA', { rejectRecompute: true });
  await page.getByRole('slider', { name: /^Revenue growth/ }).focus();
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('heading', { name: 'Valuation withheld — input review required' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Estimated value per share' }).count(), 0);
  assert.equal(await page.getByRole('slider').count(), 0);
});


test('equity source dimensions distinguish parent and noncontrolling columns on mobile', async t => {
  const { page } = await workspace(t, 'NVDA', { viewport: { width: 375, height: 812 }, mutate: c => {
    // Synthetic ownership operands exercise rendering; these are not NVDA facts.
    c.qualification.inputs[0].operands = ['ParentMember', 'NoncontrollingInterestMember'].map((member, i) => ({
      concept: 'us-gaap:StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
      value: i ? '3' : '100', unit: 'USD', end: '2024-12-31', accession: 'UI_TEST_ONLY',
      dimensions: JSON.stringify({ 'us-gaap:StatementEquityComponentsAxis': 'us-gaap:' + member }),
    }));
  }});
  await page.locator('[data-testid="qualification-gate"] summary').filter({ hasText: 'Filing evidence for' }).click();
  await page.locator('[data-testid="qualification-gate"] summary').filter({ hasText: 'Calculation operands' }).first().click();
  const evidence = page.locator('[data-testid="qualification-gate"]');
  assert.match(await evidence.innerText(), /Source dimensions:.*ParentMember/);
  assert.match(await evidence.innerText(), /Source dimensions:.*NoncontrollingInterestMember/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
});


test('MET exposes parent versus common ownership at the result, controls and distribution', async t => {
  const { page, data } = await workspace(t, 'MET');
  assert.equal(await page.getByRole('heading', { name: 'Parent-equity proxy per share', exact: true }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Estimated value per share', exact: true }).count(), 0);
  assert.match(await page.getByTestId('ownership-scope').innerText(), /Common-share valuation unverified/);
  assert.match(await page.getByTestId('ownership-scope').innerText(), /Preferred capital, preferred dividends and redemption premiums are not deducted/);
  assert.equal(await page.getByRole('heading', { name: 'Parent-equity proxy distribution' }).count(), 1);
  assert.match(await page.locator('body').innerText(), /not simulated common-stock prices/);
  assert.match(await page.locator('body').innerText(), /\$69\.94/);
  assert.equal(data.valuation.value_scope.common_share_valuation_verified, false);
});

test('MET historic basis warnings identify the correct year, exact gap and per-cell source accessions', async t => {
  const { page } = await workspace(t, 'MET');
  const warning = page.getByTestId('historical-balance-warning-2021');
  assert.match(await warning.innerText(), /\$17,736,000,000\.00/);
  assert.equal(await warning.getAttribute('data-gap-usd'), '17736000000');
  assert.match(await warning.innerText(), /not be read as a reconciled same-basis balance sheet/);
  await warning.getByText('Source bases for these rows').click();
  assert.match(await warning.innerText(), /0001099219-22-000014/);
  assert.match(await warning.innerText(), /0001099219-24-000035/);
  const balance = page.getByRole('table').filter({ has: page.getByRole('cell', { name: "Parent shareholders' equity", exact: true }) });
  assert.match(await balance.getByRole('row').filter({ hasText: 'Total assets' }).innerText(), /Unreconciled historical basis.*0001099219-22-000014/s);
  assert.match(await balance.getByRole('row').filter({ hasText: "Parent shareholders' equity" }).innerText(), /0001099219-24-000035/);
  assert.equal(await page.getByRole('link', { name: 'No automated flags', exact: true }).count(), 0);
});

test('MET proxy and historical-warning notes remain readable at 375px', async t => {
  const { page } = await workspace(t, 'MET', { viewport: { width: 375, height: 812 } });
  await page.getByTestId('historical-balance-warning-2021').getByText('Source bases for these rows').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
  await page.getByRole('button', { name: "Parent shareholders' equity, FY2021: Calculated source details", exact: true }).click();
  const dialog = page.getByRole('dialog');await dialog.waitFor();
  assert.match(await dialog.innerText(), /49746000000/);
  assert.match(await dialog.innerText(), /ParentMember/);
  assert.equal(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth), true);
});

test('P/B fallback remains an explicit proxy when old recorded metadata omits ownership scope', async t => {
  const { page } = await workspace(t, 'BRK-B');
  assert.equal(await page.getByRole('heading', { name: 'Parent-equity proxy per share', exact: true }).count(), 1);
  assert.match(await page.getByTestId('ownership-scope').innerText(), /Common-share valuation unverified/);
});
