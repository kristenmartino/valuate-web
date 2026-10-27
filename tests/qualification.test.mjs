import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const loadTs=createRequire(import.meta.url);
loadTs.extensions['.ts']=(module,filename)=>{
 const {outputText}=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 module._compile(outputText,filename);
};
const {canUseValuation,inputName}=loadTs('../lib/qualification.ts');
const {parseFetchError}=loadTs('../lib/friendlyError.ts');

test('only explicit qualified status allows a valuation workspace',()=>{
 for(const c of [null,undefined,{}, {qualification:null},{qualification:{status:'review_required'}},{qualification:{status:'unsupported'}}])assert.equal(canUseValuation(c),false);
 assert.equal(canUseValuation({qualification:{status:'qualified'}}),true);
});
test('confidence, cleared flags and saved overrides never imply publication permission',()=>{
 assert.equal(canUseValuation({extraction_flags:[],confidence:1,source:'user_override'}),false);
});
test('unqualified API responses explain withholding and do not suggest assumption edits as a bypass',()=>{
 const r=parseFetchError('422 /value/TEST: {"detail":{"code":"valuation_not_qualified","qualification":{"status":"review_required"}}}');
 assert.match(r.title,/Valuation withheld/);assert.match(r.hint,/cannot bypass qualification/);
 assert.equal(inputName('cash_flow_statement.depreciation_amortization'),'Cash-flow add-back');
});
