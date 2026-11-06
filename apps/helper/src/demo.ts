import {MANDATES,DEMO_TODAY,HOLIDAYS} from '../../../packages/core/src/fixtures.ts';
import {DEFAULT_CONFIG} from '../../../packages/core/src/types.ts';
import {applyAction,effectiveState,simulateDebit} from '../../../packages/core/src/actions.ts';
import {diffDays} from '../../../packages/core/src/dates.ts';
import {nextExpected,usualAmountCents} from '../../../packages/core/src/predict.ts';
import {evaluate} from '../../../packages/core/src/rules.ts';
import type {Action} from '../../../packages/core/src/actions.ts';

type Entry={date:string;name:string;action:string;source:string};
let mandates=structuredClone(MANDATES); let audit:Entry[]=[];
export const snapshot=(today:string)=>({mandates,audit,overview:mandates.map(m=>({id:m.id,nextExpected:nextExpected(m,HOLIDAYS),usualAmountCents:usualAmountCents(m),flags:evaluate(m,today,DEFAULT_CONFIG)}))});
export const reset=()=>{mandates=structuredClone(MANDATES);audit=[];};
const calendarDate=(date:unknown):date is string => typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date;
export function validDate(date:unknown):date is string {return calendarDate(date) && Math.abs(diffDays(date,DEMO_TODAY))<=120;}
const exact=(o:any,keys:string[])=>o && typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
export function validAction(a:any):a is Action {return exact(a,['type'])&&['STOP','RESUME'].includes(a.type) || exact(a,['type','until'])&&a.type==='PAUSE'&&calendarDate(a.until) || exact(a,['type','limitCents'])&&a.type==='LIMIT'&&Number.isSafeInteger(a.limitCents);}
export function act(id:string,action:Action,today:string,source:'BUTTON'|'TEXT') {const m=mandates.find(x=>x.id===id);if(!m)return {ok:false,reason:'NOT_FOUND'} as const;const result=applyAction({...m,state:effectiveState(m.state,today)},action,today,DEFAULT_CONFIG);if(!result.ok)return result;m.state=result.state;audit.unshift({date:today,name:m.creditorName,action:action.type,source});return {ok:true} as const;}
export function simulate(id:string,amount:number,onDate:string){const m=mandates.find(x=>x.id===id);return m?simulateDebit(m.state,amount,onDate):null;}

