import { KITCHEN_TIMING, type Kitchen } from './engine.mjs'
export function stationProgress(type:string,state:Kitchen['stations'][string],now:number){
 if(!['chop','sink','pot'].includes(type))return null
 const duration=type==='pot'?KITCHEN_TIMING.cook:type==='sink'?KITCHEN_TIMING.wash:KITCHEN_TIMING.chop
 if(type!=='pot'&&state.remainingMs&&!state.readyAt)return {phase:'paused',value:Math.max(0,1-state.remainingMs/duration),label:'Ⅱ'}
 if(!state.readyAt)return null
 if(now<state.readyAt)return {phase:'working',value:Math.max(0,1-(state.readyAt-now)/duration),label:`${Math.ceil((state.readyAt-now)/1000)}s`}
 if(type!=='pot')return {phase:'ready',value:1,label:'✓'}
 const remaining=state.readyAt+KITCHEN_TIMING.burn-now
 if(remaining<=0)return {phase:'burnt',value:1,label:'×'}
 if(remaining<=KITCHEN_TIMING.warning)return {phase:'warning',value:remaining/KITCHEN_TIMING.burn,label:`! ${Math.ceil(remaining/1000)}s`}
 return {phase:'ready',value:remaining/KITCHEN_TIMING.burn,label:`✓ ${Math.ceil(remaining/1000)}s`}
}
