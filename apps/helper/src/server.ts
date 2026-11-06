import http from 'node:http';
import {snapshot,reset,act,simulate,validDate,validAction} from './demo.ts';
import {DEMO_TODAY} from '../../../packages/core/src/fixtures.ts';
import { templateExplanation, safeExplanation } from '../../../packages/core/src/explain.ts';
import { parseCommandRules } from '../../../packages/core/src/command.ts';
import type { ExplainInput } from '../../../packages/core/src/explain.ts';

const port = Number(process.env.HELPER_PORT || 8787);
const mode = process.env.LLM_MODE || 'template';
const hosts = new Set((process.env.ALLOWED_HOSTS || `localhost:5173,127.0.0.1:5173,localhost:4173,127.0.0.1:4173,localhost:${port},127.0.0.1:${port}`).split(','));
const categories = ['SPORTS','ENERGY','STREAMING','HEALTH','WATER','RENT','LOAN','TELECOM','CHARITY','CLOUD','INSURANCE'];
const fields: Record<string,string> = {AMOUNT_HIGHER:'ratioBand',NEW_CREDITOR:'daysAgo',DUPLICATE_IN_PERIOD:'count',DORMANT_REACTIVATED:'monthsGap'};
const exact = (o: any, keys: string[]) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(k => keys.includes(k)) && keys.every(k => k in o);
function validExplain(x: any): x is ExplainInput {
 return exact(x,['lang','category','frequency','usualAmount','latestAmount','flags']) && ['en','nl'].includes(x.lang) && categories.includes(x.category) && ['MONTHLY','QUARTERLY','YEARLY'].includes(x.frequency) && [x.usualAmount,x.latestAmount].every((s: unknown) => typeof s === 'string' && /^€\d{1,3}(\.\d{3})*,\d{2}$/.test(s)) && Array.isArray(x.flags) && x.flags.length <= 4 && x.flags.every((f: any) => f && typeof f.code === 'string' && fields[f.code] && exact(f,['code',fields[f.code]]) && typeof f[fields[f.code]] === 'number' && Number.isFinite(f[fields[f.code]]) && f[fields[f.code]] >= 0);
}
const server = http.createServer(async (req,res) => {
 res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Content-Type','application/json; charset=utf-8');
 const send = (status:number, data:unknown) => { res.writeHead(status); res.end(JSON.stringify(data)); };
 const error = (status:number,code:string,message:string) => send(status,{error:{code,message}});
 if (!hosts.has(req.headers.host || '')) return error(421,'BAD_HOST','Host not allowed');
 const origin = req.headers.origin; if (origin) { try { const parsed = new URL(origin); if (!['http:','https:'].includes(parsed.protocol) || !hosts.has(parsed.host)) return error(403,'BAD_ORIGIN','Origin not allowed'); } catch { return error(403,'BAD_ORIGIN','Origin not allowed'); } }
 const path = (req.url || '').split('?')[0];
 if (!['/healthz','/api/explain','/api/parse-command','/api/demo','/api/demo/action','/api/demo/reset','/api/demo/simulate'].includes(path)) return error(404,'NOT_FOUND','Not found');
 if ((['/healthz','/api/demo'].includes(path) && req.method !== 'GET') || (!['/healthz','/api/demo'].includes(path) && req.method !== 'POST')) return error(405,'METHOD_NOT_ALLOWED','Method not allowed');
 if (path === '/healthz') return send(200,{status:'ok',llmMode:mode});
 if (path === '/api/demo') { const today=new URL(req.url!, 'http://localhost').searchParams.get('today') || DEMO_TODAY; if(!validDate(today)) return error(400,'INVALID_INPUT','Invalid demo date'); return send(200,snapshot(today)); }
 if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return error(400,'INVALID_INPUT','Expected JSON');
 let body = ''; let size = 0;
 for await (const chunk of req) { size += chunk.length; if (size > 2048) return error(413,'PAYLOAD_TOO_LARGE','Body too large'); body += chunk; }
 let input: any; try { input = JSON.parse(body); } catch { return error(400,'INVALID_INPUT','Invalid JSON'); }
 if(path==='/api/demo/reset'){if(!exact(input,[]))return error(400,'INVALID_INPUT','Invalid reset request');reset();return send(200,snapshot(DEMO_TODAY));}
 if(path==='/api/demo/action'){if(!exact(input,['id','action','today','source']) || typeof input.id!=='string' || !validDate(input.today) || !validAction(input.action) || !['BUTTON','TEXT'].includes(input.source))return error(400,'INVALID_INPUT','Invalid action'); const result=act(input.id,input.action,input.today,input.source);if(!result.ok)return error(result.reason==='NOT_FOUND'?404:400,result.reason,'Action rejected');return send(200,snapshot(input.today));}
 if(path==='/api/demo/simulate'){if(!exact(input,['id','amountCents','onDate'])||typeof input.id!=='string'||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||!validDate(input.onDate))return error(400,'INVALID_INPUT','Invalid simulation'); const outcome=simulate(input.id,input.amountCents,input.onDate);if(!outcome)return error(404,'NOT_FOUND','Agreement not found');return send(200,{outcome});}
 if (path === '/api/parse-command') {
  if (!exact(input,['text','lang']) || typeof input.text !== 'string' || input.text.length < 1 || input.text.length > 200 || !['en','nl'].includes(input.lang)) return error(400,'INVALID_INPUT','Invalid command');
  return send(200,{...parseCommandRules(input.text),source:'RULES',reasons:[]});
 }
 if (!validExplain(input)) return error(400,'INVALID_INPUT','Invalid explanation input');
 if (mode !== 'ollama') return send(200,{text:templateExplanation(input),source:'TEMPLATE',reasons: mode === 'template' ? [] : ['UNSUPPORTED_MODE']});
 try {
  const url = new URL(process.env.OLLAMA_URL || 'http://127.0.0.1:11434');
  if (url.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(url.hostname) || !process.env.LLM_MODEL) throw new Error('Invalid local model configuration');
  const response = await fetch(new URL('/api/generate',url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:process.env.LLM_MODEL,stream:false,options:{temperature:0,num_predict:120},system:'Rewrite the supplied JSON as a short calm customer note. Use only facts and numbers in the JSON. No names, dates, links, markup, advice or instructions. At most two sentences per flag, 60 words total. Use the requested language.',prompt:JSON.stringify(input)}),signal:AbortSignal.timeout(Number(process.env.LLM_TIMEOUT_MS || 8000))});
  if (!response.ok) throw new Error('Model error'); const data:any = await response.json(); if (typeof data.response !== 'string') throw new Error('Invalid model response');
  return send(200,safeExplanation(data.response,input));
 } catch (e) { return send(200,{text:templateExplanation(input),source:'TEMPLATE',reasons:[e instanceof Error && e.name === 'TimeoutError' ? 'LLM_TIMEOUT' : 'LLM_ERROR']}); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Helper listening on http://127.0.0.1:${port} (${mode})`));

