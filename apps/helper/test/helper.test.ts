import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { MANDATES } from '../../../packages/core/src/fixtures.ts';
import { buildExplainInput } from '../../../packages/core/src/explain.ts';
const port=18987; let child:ReturnType<typeof spawn>;
before(async()=>{child=spawn(process.execPath,['apps/helper/src/server.ts'],{env:{...process.env,HELPER_PORT:String(port),LLM_MODE:'template'},stdio:'ignore'}); for(let i=0;i<50;i++){try{await fetch(`http://127.0.0.1:${port}/healthz`);return}catch{await new Promise(r=>setTimeout(r,100))}} throw Error('Helper did not start');});
after(()=>child?.kill());
const url=`http://127.0.0.1:${port}`;
test('health and strict explanation input',async()=>{assert.equal((await (await fetch(url+'/healthz')).json() as any).llmMode,'template');const input=buildExplainInput(MANDATES[0],[],'en');const r=await fetch(url+'/api/explain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});assert.equal(r.status,200);assert.equal((await r.json() as any).source,'TEMPLATE');const bad=await fetch(url+'/api/explain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...input,name:'secret'})});assert.equal(bad.status,400);});
test('command and request boundaries',async()=>{const r=await fetch(url+'/api/parse-command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'stop the streaming debit for 30 days',lang:'en'})});assert.equal((await r.json() as any).intent,'PAUSE');assert.equal((await fetch(url+'/api/explain',{method:'POST',headers:{'content-type':'application/json'},body:' '.repeat(2049)})).status,413);assert.equal(await new Promise<number>((resolve,reject)=>{http.get(url+'/healthz',{headers:{host:'evil.example'}},r=>{r.resume();resolve(r.statusCode!)}).on('error',reject)}),421);assert.equal((await fetch(url+'/healthz',{headers:{origin:'http://evil.example'}})).status,403);});


test('demo actions are validated, audited and reset',async()=>{
 const post=(path:string,data:unknown)=>fetch(url+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
 await post('/api/demo/reset',{}); const initial:any=await (await fetch(url+'/api/demo')).json(); assert.equal(initial.mandates.length,12);assert.equal(initial.audit.length,0);assert.equal(initial.overview.length,12);
 const bad=await post('/api/demo/action',{id:'MNDT-0002',action:{type:'LIMIT',limitCents:0},today:'2026-11-12',source:'BUTTON'});assert.equal(bad.status,400);
 const r=await post('/api/demo/action',{id:'MNDT-0002',action:{type:'LIMIT',limitCents:13000},today:'2026-11-12',source:'BUTTON'});const saved:any=await r.json();assert.equal(saved.audit.length,1);assert.equal(saved.mandates[1].state.status,'LIMITED');
 const sim:any=await (await post('/api/demo/simulate',{id:'MNDT-0002',amountCents:21450,onDate:'2026-12-07'})).json();assert.equal(sim.outcome,'REFUSED_OVER_LIMIT');
 const reset:any=await (await post('/api/demo/reset',{})).json();assert.equal(reset.audit.length,0);assert.equal(reset.mandates[1].state.status,'ACTIVE');
});
