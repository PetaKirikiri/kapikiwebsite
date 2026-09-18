import {describe,expect,it} from 'vitest'
import {KitchenInteractions} from './interactionSync'
import {STATIONS,KITCHEN_TIMING,createKitchen,joinKitchen,commandKitchen,advanceKitchen,carriedPot,dirtyPlateCount,counterPlateCount,cleanPlateCount,type Kitchen} from './engine.mjs'

function pose(k:Kitchen,id:string,seat=0){
 const s=STATIONS.find(s=>s.id===id)!,below=s.y===0||s.type==='counter'
 return {...k.players[seat],x:s.x===11?10:s.x,y:s.x===11?s.y:s.y+(below?1:-1),facing:s.x===11?{x:1,y:0}:{x:0,y:below?-1:1},path:[],target:null}
}
function stock(k:Kitchen){
 let plates=0,pots=0
 const item=(value:string|null)=>{if(value==='plate'||value?.startsWith('soup:'))plates++;else plates+=dirtyPlateCount(value);if(carriedPot(value))pots++}
 for(const p of Object.values(k.players))item(p.held)
 for(const s of STATIONS){const state=k.stations[s.id]
  if(s.type==='plates')plates+=cleanPlateCount(state)
  else if(s.type==='plate-return')plates+=(state.count??0)+(state.returnAt?.length??0)
  else if(s.type==='sink')plates+=(state.dirtyCount??0)+(state.cleanCount??0)
  else if(s.type==='counter'&&state.item==='plate')plates+=counterPlateCount(state)
  else item(state.item)
  if(s.type==='pot'&&state.potPresent!==false)pots++
 }
 return {plates,pots}
}

describe('kitchen logistics audit',()=>{
 it('gives timer completions a new revision so an older poll cannot restore dirty plates',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  Object.assign(k.players[0],pose(k,'sink'),{held:'dirty'})
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},1000)
  const before=k.revision
  advanceKitchen(k,1000+KITCHEN_TIMING.wash)
  expect(k.stations.sink.cleanCount).toBe(1);expect(k.revision).toBeGreaterThan(before)
  const completed=k.revision;advanceKitchen(k,1001+KITCHEN_TIMING.wash)
  expect(k.revision).toBe(completed)
 })
 it.each([0,300,2500])('completes every recipe and plate-return/wash/restack cycle with %ims replies',lag=>{
  let k=createKitchen(0),at=1000;joinKitchen(k,0);const q=new KitchenInteractions();q.reconcile(k,0)
  const use=(id:string,held:string|null)=>{
   at+=lag+100
   const p=pose(k,id),action=q.activate(k,0,p,at)
   expect(action.id,`${id}: ${action.player.notice}`).toBeTruthy()
   expect(action.player.held,id).toBe(held)
   q.reconcile(k,0) // An in-flight older poll must not undo the transfer.
   expect(q.view!.players[0].held,id).toBe(held)
   Object.assign(k.players[0],p)
   const command={op:'input',commandId:crypto.randomUUID(),steps:[{activate:true as const,actionId:action.id!,at,intent:action.intent}]}
   commandKitchen(k,0,command,at+lag)
   commandKitchen(k,0,{...command,commandId:crypto.randomUUID()},at+lag+1) // Retried action.
   expect(q.reconcile(k,0),id).toBeNull()
   expect(k.players[0].held,id).toBe(held)
   expect(stock(k),id).toEqual({plates:5,pots:2})
   k=JSON.parse(JSON.stringify(k));q.reconcile(k,0) // Saved room/reload representation.
  }
  for(const ingredients of [['tomato','tomato'],['onion','onion'],['onion','tomato']]){
   for(const ingredient of ingredients){
    use(ingredient,`raw:${ingredient}`);use('chop-a',null)
    at+=KITCHEN_TIMING.chop;use('chop-a',`chopped:${ingredient}`);use('pot-a',null)
   }
   use('plates','plate');at+=KITCHEN_TIMING.cook
   use('pot-a',`soup:${ingredients.slice().sort().join('+')}`);use('serve',null)
   at+=KITCHEN_TIMING.plateReturn;advanceKitchen(k,at);q.reconcile(k,0)
   use('plate-return','dirty');use('sink',null);at+=KITCHEN_TIMING.wash
   use('sink','plate');use('counter-4',null)
   use('plates','plate');use('counter-4',null)
   expect(counterPlateCount(k.stations['counter-4'])).toBe(2)
   for(let i=0;i<2;i++){use('counter-4','plate');use('plates',null)}
  }
  expect(k.served).toBe(3);expect(k.stations.plates.count).toBe(5)
 })
 it('conserves all plates and pots across 4 chefs and 4000 mixed legal/invalid interactions',()=>{
  let k=createKitchen(0),seed=1731,at=1000
  for(let seat=0;seat<4;seat++)joinKitchen(k,seat)
  const rand=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n}
  for(let i=0;i<4000;i++){
   const seat=rand(4),id=STATIONS[rand(STATIONS.length)].id;at+=rand(5000)
   Object.assign(k.players[seat],pose(k,id,seat))
   commandKitchen(k,seat,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true,actionId:crypto.randomUUID()}]},at)
   expect(stock(k),`interaction ${i} at ${id}`).toEqual({plates:5,pots:2})
   if(i%31===0)k=JSON.parse(JSON.stringify(k))
  }
 })
})
