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
const { normalizeTicker, isValidTicker } = loadTs('../lib/tickers.ts');
const { parseFetchError } = loadTs('../lib/friendlyError.ts');

test('dot and hyphen share classes have one canonical workspace ticker', () => {
  for (const input of ['BRK.B', 'BRK-B', ' brk.b ', 'brk-b']) {
    assert.equal(normalizeTicker(input), 'BRK-B');
    assert.equal(isValidTicker(input), true);
  }
  assert.equal(normalizeTicker(' bf.b '), 'BF-B');
  assert.equal(normalizeTicker(' aapl '), 'AAPL');
});

test('malformed ticker syntax stays rejected', () => {
  for (const input of ['', '!!!', '.BRK', 'BRK.', 'BRK..B', 'BRK-B-C', 'ABCDEF', 'BRK BB', '123', 'BRK/B']) {
    assert.equal(isValidTicker(input), false, input);
  }
  assert.equal(isValidTicker('ABCDE'), true);
  assert.equal(isValidTicker('ABCDE.A'), true);
});

test('recognized but incomplete filings are distinct from unknown tickers', () => {
  const incomplete = parseFetchError('422 /extract: {"detail":"Required fields still missing after Track A + Track B for BRK-B: shares"}');
  assert.equal(incomplete.title, 'Ticker recognized; valuation unavailable');
  assert.match(incomplete.hint, /SEC lookup succeeded/);
  assert.match(incomplete.hint, /cannot calculate a valuation/);
  assert.equal(parseFetchError('400 /extract: {"detail":"Ticker ZZZZ not found in SEC database"}').title, 'Ticker not found on SEC EDGAR');
});

test('recent visits deduplicate old dot aliases under the canonical symbol', () => {
  const stored = new Map([['valuate.recently_viewed', JSON.stringify(['BRK.B', 'BRK-B', 'AAPL'])]]);
  global.window = {localStorage:{getItem:key=>stored.get(key) ?? null,setItem:(key,value)=>stored.set(key,value)}};
  try {
    const {getRecentTickers, recordTickerVisit} = loadTs('../lib/recentlyViewed.ts');
    assert.deepEqual(getRecentTickers(), ['BRK-B', 'AAPL']);
    recordTickerVisit(' brk.b ');
    assert.deepEqual(JSON.parse(stored.get('valuate.recently_viewed')), ['BRK-B', 'AAPL']);
  } finally {
    delete global.window;
  }
});
