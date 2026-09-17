import { describe, expect, it } from 'vitest'
import { KITCHEN_TIMING, moveFreely, returnedPlateCount, STATIONS, STEP_MS, createKitchen, joinKitchen, commandKitchen, advanceKitchen, findPath, isFloor } from './engine.mjs'
describe('shared kitchen',()=>{
 it('routes around the island and rejects occupied or invalid destinations',()=>{
  const path=findPath({x:5,y:2},{x:5,y:4})!
  expect(path.length).toBeGreaterThan(3)
  expect(path.every(p=>isFloor(p.x,p.y))).toBe(true)
  expect(findPath({x:1,y:1},{x:4,y:3})).toBeNull()
  expect(findPath({x:1,y:1},{x:NaN,y:1})).toBeNull()
 })
 it('completes preparation, cooking, serving and washing without losing or duplicating food',()=>{
  const k=createKitchen(0);joinKitchen(k,0);let now=100
  const use=(station:string)=>{commandKitchen(k,0,{op:'move',station},now);now+=k.players[0].path.length*STEP_MS;advanceKitchen(k,now)}
  for(let i=0;i<2;i++){
   use('tomato');expect(k.players[0].held).toBe('raw:tomato')
   use('chop-a');expect(k.players[0].held).toBeNull()
   use('chop-a');expect(k.players[0].held).toBeNull()
   now+=KITCHEN_TIMING.chop+100;use('chop-a');expect(k.players[0].held).toBe('chopped:tomato')
   use('pot-a');expect(k.players[0].held).toBeNull()
  }
  use('plates');use('pot-a');expect(k.players[0].held).toBe('plate')
  now+=KITCHEN_TIMING.cook+100;use('pot-a');expect(k.players[0].held).toBe('soup:tomato+tomato')
  use('serve');expect(k.served).toBe(1);expect(k.players[0].held).toBeNull();expect(k.stations['plate-return'].count??0).toBe(0);expect(k.orders).toHaveLength(3)
  now+=KITCHEN_TIMING.plateReturn;use('plate-return');expect(k.players[0].held).toBe('dirty');expect(k.stations['plate-return'].count).toBe(0)
  use('sink');now+=KITCHEN_TIMING.wash+100;use('sink');expect(k.players[0].held).toBe('plate')
 })
 it('adds the return counter to existing rooms without resetting their progress',()=>{
  const k=createKitchen(0);joinKitchen(k,0);k.served=7;k.players[0].held='dirty';delete k.stations['plate-return']
  advanceKitchen(k,100)
  expect(k.stations['plate-return']).toEqual({ingredients:[],item:null,readyAt:0})
  expect(k.served).toBe(7);expect(k.players[0].held).toBe('dirty')
 })
 it('allows four players to use every station, with one owner of each counter item',()=>{
  const k=createKitchen(0)
  for(let seat=0;seat<4;seat++)joinKitchen(k,seat)
  k.stations['counter-4'].item='chopped:onion'
  for(const seat of [0,1])commandKitchen(k,seat,{op:'move',station:'counter-4'},100)
  advanceKitchen(k,10000)
  expect(Object.values(k.players).filter(p=>p.held==='chopped:onion')).toHaveLength(1)
  expect(k.stations['counter-4'].item).toBeNull()
  for(let seat=0;seat<4;seat++)for(const station of STATIONS)expect(()=>commandKitchen(k,seat,{op:'move',station:station.id},10001)).not.toThrow()
 })
 it('replaces a queued action and burns unattended soup',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  commandKitchen(k,0,{op:'move',station:'tomato'},100)
  commandKitchen(k,0,{op:'move',destination:{x:2,y:6}},110)
  advanceKitchen(k,10000);expect(k.players[0].held).toBeNull()
  k.stations['pot-a']={item:null,ingredients:['tomato','tomato'],readyAt:10}
  commandKitchen(k,0,{op:'move',station:'pot-a'},30000);advanceKitchen(k,40000)
  expect(k.stations['pot-a'].ingredients).toEqual([])
  expect(k.players[0].notice).toBe('Burnt soup cleared')
 })
 it.each([['chop-a','raw:tomato','chopped:tomato',3000],['sink','dirty','plate',5000]] as const)('pauses %s on movement and lets another chef resume the remaining work',(id,input,output,duration)=>{
  const k=createKitchen(0);joinKitchen(k,0);joinKitchen(k,1)
  const definition=STATIONS.find(s=>s.id===id)!,p=k.players[0],y=definition.y===0?1:6
  Object.assign(p,{x:definition.x,y,facing:{x:0,y:definition.y-y},held:input})
  const use=(seat:number,now:number)=>commandKitchen(k,seat,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},now)
  use(0,1000);expect(k.stations[id].worker).toBe(0)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.1}]},2000)
  expect(k.stations[id].readyAt).toBe(0);expect(k.stations[id].remainingMs).toBe(duration-1000)
  advanceKitchen(k,20000);expect(k.stations[id].remainingMs).toBe(duration-1000)
  Object.assign(k.players[1],{x:definition.x,y,facing:{x:0,y:definition.y-y}})
  use(1,20000);expect(k.players[1].held).toBeNull();expect(k.stations[id].readyAt).toBe(20000+duration-1000)
  use(1,20001);expect(k.players[1].held).toBeNull()
  use(1,20000+duration-1000);expect(k.players[1].held).toBe(output)
 })
 it('keeps cooking unattended while a chef moves away',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const p=k.players[0]
  Object.assign(p,{x:7,y:1,facing:{x:0,y:-1},held:'chopped:tomato'})
  k.stations['pot-a'].ingredients=['tomato']
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},1000)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.1}]},2000)
  expect(k.stations['pot-a'].readyAt).toBe(13000);expect(k.stations['pot-a'].worker).toBeUndefined()
 })

 it('returns each served plate after ten seconds, preserves pending returns across reload and stacks without duplicates',()=>{
  let k=createKitchen(0);joinKitchen(k,0)
  const serve=(at:number)=>{
   Object.assign(k.players[0],{x:10,y:2,facing:{x:1,y:0},held:`soup:${k.orders[0].ingredients.slice().sort().join('+')}`})
   const body={op:'input',commandId:crypto.randomUUID(),steps:[{activate:true as const,at}]}
   commandKitchen(k,0,body,at);commandKitchen(k,0,body,at)
   expect(k.players[0].held).toBeNull()
  }
  serve(1000);serve(2000);serve(3000)
  expect(k.served).toBe(3);expect(k.stations['plate-return'].returnAt).toEqual([11000,12000,13000])
  k=JSON.parse(JSON.stringify(k))
  expect(returnedPlateCount(k.stations['plate-return'],10999)).toBe(0)
  expect(returnedPlateCount(k.stations['plate-return'],11000)).toBe(1)
  advanceKitchen(k,11000);expect(k.stations['plate-return'].count).toBe(1)
  advanceKitchen(k,11000);expect(k.stations['plate-return'].count).toBe(1)
  advanceKitchen(k,13000);expect(k.stations['plate-return'].count).toBe(3)
  expect(k.stations['plate-return'].returnAt).toEqual([])
  Object.assign(k.players[0],{x:10,y:3,facing:{x:1,y:0}})
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},13001)
  expect(k.players[0].held).toBe('dirty');expect(k.stations['plate-return'].count).toBe(2)
  advanceKitchen(k,90000);expect(k.stations['plate-return'].count).toBe(2)
 })
 it('cannot collect a plate before it has returned',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  k.stations['plate-return'].returnAt=[11000]
  Object.assign(k.players[0],{x:10,y:3,facing:{x:1,y:0}})
  const use=(at:number)=>commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},at)
  use(10999);expect(k.players[0].held).toBeNull()
  use(11000);expect(k.players[0].held).toBe('dirty');expect(k.stations['plate-return'].count).toBe(0)
 })

 it('starts chopping on placement and keeps cutting when movement is blocked by the board',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  Object.assign(k.players[0],moveFreely({...k.players[0],x:4,y:1},{x:0,y:-1},1),{held:'raw:tomato'})
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true},{x:0,y:-1,dt:.1}]},1000)
  expect(k.players[0].held).toBeNull();expect(k.stations['chop-a'].worker).toBe(0)
  expect(k.stations['chop-a'].readyAt).toBe(1000+KITCHEN_TIMING.chop)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},1000+KITCHEN_TIMING.chop)
  expect(k.players[0].held).toBe('chopped:tomato')
 })

 it.each([['chop-a','raw:tomato','chopped:tomato',KITCHEN_TIMING.chop],['sink','dirty','plate',KITCHEN_TIMING.wash]] as const)('leaves completed %s items at the original station through movement and reload',(id,input,output,duration)=>{
  let k=createKitchen(0);joinKitchen(k,0)
  const station=STATIONS.find(s=>s.id===id)!,y=station.y===0?1:6
  Object.assign(k.players[0],{x:station.x,y,facing:{x:0,y:station.y-y},held:input})
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},1000)
  advanceKitchen(k,1000+duration)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.2}]},1100+duration)
  k=JSON.parse(JSON.stringify(k));advanceKitchen(k,60000)
  expect(k.players[0].held).toBeNull();expect(k.stations[id].item).toBe(output)
  expect(Object.entries(k.stations).filter(([,s])=>s.item!==null).map(([key])=>key)).toEqual([id])
  Object.assign(k.players[0],{x:station.x,y,facing:{x:0,y:station.y-y}})
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true,intent:{station:id,held:null}}]},60001)
  expect(k.players[0].held).toBe(output);expect(k.stations[id].item).toBeNull()
 })
 it('keeps cooked food in its own pot even when a chef waits with a clean plate',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  Object.assign(k.players[0],{x:7,y:1,facing:{x:0,y:-1},held:'plate'})
  k.stations['pot-a']={item:null,ingredients:['tomato','onion'],readyAt:13000}
  advanceKitchen(k,14000)
  expect(k.players[0].held).toBe('plate');expect(k.stations['pot-a'].ingredients).toEqual(['tomato','onion'])
  expect(k.stations['pot-b'].ingredients).toEqual([])
 })
 it('does not redirect a delayed press to another board or reverse a duplicate pickup into placement',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const p=k.players[0]
  Object.assign(p,{x:5,y:1,facing:{x:0,y:-1}})
  k.stations['chop-a'].item='chopped:tomato';k.stations['chop-b'].item='chopped:onion'
  const actionId=crypto.randomUUID(),step={activate:true as const,actionId,intent:{station:'chop-a',held:null}}
  const use=()=>commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[step]},1000)
  use();expect(p.held).toBeNull();expect(k.stations['chop-b'].item).toBe('chopped:onion')
  p.x=4;step.actionId=crypto.randomUUID();use();expect(p.held).toBe('chopped:tomato')
  use();expect(p.held).toBe('chopped:tomato');expect(k.stations['chop-a'].item).toBeNull()
  // Even a new queued press expecting empty hands cannot put that food down.
  p.y=4;step.actionId=crypto.randomUUID();step.intent.station='counter-4';use()
  expect(p.held).toBe('chopped:tomato');expect(k.stations['counter-4'].item).toBeNull()
 })

})
