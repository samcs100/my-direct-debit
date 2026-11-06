import {MANDATES,DEMO_TODAY} from '../packages/core/src/fixtures.ts';
import {evaluate} from '../packages/core/src/rules.ts';
import {DEFAULT_CONFIG} from '../packages/core/src/types.ts';
import {buildExplainInput} from '../packages/core/src/explain.ts';
const port=process.env.HELPER_PORT || '8787';
const health=await (await fetch(`http://127.0.0.1:${port}/healthz`)).json() as {llmMode:string};
if(health.llmMode!=='ollama') throw Error('Start the helper with LLM_MODE=ollama and LLM_MODEL set before running this evaluation.');
let rejected=0;
for(const n of [2,3,7,8]) for(const lang of ['en','nl'] as const){
 const m=MANDATES[n-1]; const input=buildExplainInput(m,evaluate(m,DEMO_TODAY,DEFAULT_CONFIG),lang);
 const r=await fetch(`http://127.0.0.1:${port}/api/explain`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});if(!r.ok)throw Error(`Helper returned ${r.status}`);
 const result=await r.json() as {source:string;text:string;reasons:string[]};if(result.source!=='MODEL')rejected++;
 console.log(JSON.stringify({flag:input.flags[0].code,lang,...result}));
}
console.log(`Model outputs accepted: ${8-rejected}/8. Review every answer for accuracy, language and tone; automatic validation is only heuristic.`);
if(rejected) process.exitCode=1;
