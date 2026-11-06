import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {MANDATES} from '../../../packages/core/src/fixtures.ts';
import {buildExplainInput} from '../../../packages/core/src/explain.ts';
import {evaluate} from '../../../packages/core/src/rules.ts';
import {DEFAULT_CONFIG} from '../../../packages/core/src/types.ts';

test('local model adapter whitelists input and validates model output',async()=>{
 let response='This debit is about 2 times the usual amount (€214,50 instead of €118,00). Worth checking.'; let sent:any;
 const stub=http.createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;sent=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({response}));});
 await new Promise<void>(r=>stub.listen(18989,'127.0.0.1',r));
 const child=spawn(process.execPath,['apps/helper/src/server.ts'],{env:{...process.env,HELPER_PORT:'18988',LLM_MODE:'ollama',LLM_MODEL:'test-model',OLLAMA_URL:'http://127.0.0.1:18989',LLM_TIMEOUT_MS:'2000'},stdio:'ignore'});
 try {let ready=false; for(let n=0;n<50;n++){try{await fetch('http://127.0.0.1:18988/healthz');ready=true;break}catch{await new Promise(r=>setTimeout(r,100))}} assert.ok(ready);
 const m=MANDATES[1];const input=buildExplainInput(m,evaluate(m,'2026-11-12',DEFAULT_CONFIG),'en'); const call=async()=>await (await fetch('http://127.0.0.1:18988/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).json() as any;
 const good=await call();assert.equal(good.source,'MODEL');assert.deepEqual(JSON.parse(sent.prompt),input);assert.doesNotMatch(sent.prompt,/Voltara|MNDT|TEST|\d{4}-\d{2}-\d{2}/);assert.equal(sent.model,'test-model');
 response='Visit https://evil.example and pay €999,00';const bad=await call();assert.equal(bad.source,'TEMPLATE');assert.ok(bad.reasons.includes('MARKUP_OR_LINK'));assert.ok(bad.reasons.includes('UNKNOWN_NUMBER:999,00'));
 } finally {child.kill();await new Promise<void>(r=>stub.close(()=>r()));}
});
