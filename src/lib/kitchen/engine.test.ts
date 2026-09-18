import { describe, expect, it } from 'vitest'
import { KITCHEN_TIMING, carriedPot, cleanPlateCount, counterPlateCount, potAction, moveFreely, returnedPlateCount, STATIONS, STEP_MS, createKitchen, joinKitchen, commandKitchen, advanceKitchen, findPath, isFloor } from './engine.mjs'
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
  expect(k.stations['pot-a'].potPresent).toBe(false)
  expect(carriedPot(k.players[0].held)).toMatchObject({ingredients:['tomato','tomato'],burnt:true})
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
  expect(k.players[0].held).toBe('dirty:3');expect(k.stations['plate-return'].count).toBe(0)
  advanceKitchen(k,90000);expect(k.stations['plate-return'].count).toBe(0)
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

describe('cookware and plate ownership',()=>{
 const setup=()=>{
  const k=createKitchen(0);joinKitchen(k,0);joinKitchen(k,1)
  const use=(id:string,now=1000,seat=0)=>{
   const s=STATIONS.find(s=>s.id===id)!,p=k.players[seat],below=s.y===0||s.y===3&&s.type==='counter'
   Object.assign(p,{x:s.x===11?10:s.x,y:s.x===11?s.y:s.y+(below?1:-1),path:[],target:null,facing:s.x===11?{x:1,y:0}:{x:0,y:below?-1:1}})
   commandKitchen(k,seat,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},now)
  }
  return {k,use,p:k.players[0]}
 }
 it.each(['tomato','onion'])('asks for preparation, not recipe quantities, when carrying raw %s',(ingredient)=>{
  const {k,p,use}=setup();p.held=`raw:${ingredient}`
  for(const ingredients of [[],['tomato'],['tomato','onion']]){
   k.stations['pot-a'].ingredients=ingredients.slice();use('pot-a')
   expect(p.notice).toBe('Chop it first');expect(p.held).toBe(`raw:${ingredient}`)
   expect(k.stations['pot-a'].ingredients).toEqual(ingredients)
   expect(potAction(k.stations['pot-a'],p.held,1000)).toBe(p.notice)
  }
 })
 it('requires carrying the burnt pot to the bin and returning the empty pot',()=>{
  const {k,p,use}=setup();k.stations['pot-a'].ingredients=['tomato','onion'];k.stations['pot-a'].readyAt=1000
  p.held='plate';use('pot-a',20000)
  expect(p.notice).toBe('Take the pot to the bin');expect(k.stations['pot-a'].ingredients).toHaveLength(2)
  p.held=null;use('pot-a',20001)
  expect(carriedPot(p.held)).toMatchObject({ingredients:['tomato','onion'],burnt:true})
  expect(k.stations['pot-a'].potPresent).toBe(false)
  use('pot-a',20002,1);expect(k.players[1].held).toBeNull();expect(k.players[1].notice).toBe('Bring a pot')
  use('counter-4',20003);expect(p.held).toBeNull();expect(carriedPot(k.stations['counter-4'].item)?.burnt).toBe(true)
  use('counter-4',20004);use('trash',20005)
  expect(carriedPot(p.held)).toMatchObject({ingredients:[],burnt:false})
  expect(p.interaction?.item).toBe('waste')
  use('pot-a',20006)
  expect(p.held).toBeNull();expect(k.stations['pot-a']).toMatchObject({potPresent:true,ingredients:[],readyAt:0})
 })
 it('pauses cooking off the hob and preserves it through counter storage and reload',()=>{
  const {k,p,use}=setup();k.stations['pot-a'].ingredients=['onion','onion'];k.stations['pot-a'].readyAt=13000
  use('pot-a',4000);expect(carriedPot(p.held)?.cookLeft).toBe(9000)
  use('counter-4',5000);use('counter-4',99000)
  p.held=JSON.parse(JSON.stringify(p.held))
  use('pot-a',100000);expect(k.stations['pot-a'].readyAt).toBe(109000)
 })
 it('cannot overwrite another pot or discard a plate',()=>{
  const {k,p,use}=setup();use('pot-a');const pot=p.held
  use('pot-b');expect(p.held).toBe(pot);expect(p.notice).toBe('Hob occupied')
  use('pot-a');p.held='soup:tomato+tomato';use('trash');expect(p.held).toBe('plate')
  use('trash');expect(p.held).toBe('plate')
  p.held='dirty:3';use('trash');expect(p.held).toBe('dirty:3')
  expect(k.stations['pot-b'].potPresent).not.toBe(false)
 })
 it('depletes the clean supply and accepts a returned clean plate without creating extras',()=>{
  const {k,p,use}=setup()
  for(let i=0;i<5;i++){use('plates');expect(p.held).toBe('plate');p.held=null}
  use('plates');expect(p.held).toBeNull();expect(cleanPlateCount(k.stations.plates)).toBe(0)
  p.held='plate';use('plates');expect(p.held).toBeNull();expect(k.stations.plates.count).toBe(1)
  use('plates');expect(p.held).toBe('plate');expect(k.stations.plates.count).toBe(0)
  use('counter-4');expect(p.held).toBeNull();expect(k.stations['counter-4'].item).toBe('plate')
 })
 it.each(['dirty','dirty:3','soup:tomato+tomato','raw:tomato'])('rejects %s from the clean stack without changing inventory',(held)=>{
  const {k,p,use}=setup();p.held=held;use('plates')
  expect(p.held).toBe(held);expect(k.stations.plates.count).toBe(5)
  expect(p.notice).toBe('Only clean plates go here')
 })
 it('acknowledges a clean-plate return only once across retried or queued presses',()=>{
  const {k,p,use}=setup();p.held='plate';use('plates');p.held='plate';k.stations.plates.count=4
  const actionId=crypto.randomUUID(),step={activate:true as const,actionId,intent:{station:'plates',held:'plate'}}
  const body={op:'input',commandId:crypto.randomUUID(),steps:[step]}
  commandKitchen(k,0,body,1001);commandKitchen(k,0,body,1002)
  commandKitchen(k,0,{...body,commandId:crypto.randomUUID()},1003)
  expect(p.held).toBeNull();expect(k.stations.plates.count).toBe(5)
  commandKitchen(k,0,{...body,commandId:crypto.randomUUID(),steps:[{...step,actionId:crypto.randomUUID()}]},1004)
  expect(p.held).toBeNull();expect(k.stations.plates.count).toBe(5)
 })
 it('stacks clean plates on a bench and collects them individually without losing plates',()=>{
  const {k,p,use}=setup(),bench=k.stations['counter-4']
  for(let count=1;count<=3;count++){
   use('plates');use('counter-4')
   expect(p.held).toBeNull();expect(p.notice).toBe('')
   expect(counterPlateCount(bench)).toBe(count)
   expect(counterPlateCount(JSON.parse(JSON.stringify(bench)))).toBe(count)
  }
  for(let count=2;count>=0;count--){
   use('counter-4');expect(p.held).toBe('plate');expect(counterPlateCount(bench)).toBe(count)
   use('plates')
  }
  expect(bench.item).toBeNull();expect(cleanPlateCount(k.stations.plates)).toBe(5)
  p.held='raw:tomato';use('counter-4');expect(counterPlateCount(bench)).toBe(0)
 })
 it('accepts a plate on a legacy single-plate bench and shares the stack between chefs',()=>{
  const {k,p,use}=setup(),bench=k.stations['counter-4']
  bench.item='plate';p.held='plate';use('counter-4')
  expect(counterPlateCount(bench)).toBe(2)
  use('counter-4',1001,1);use('counter-4',1002,0)
  expect(k.players[1].held).toBe('plate');expect(p.held).toBe('plate')
  expect(counterPlateCount(bench)).toBe(0);expect(bench.item).toBeNull()
 })
 it.each(['dirty','raw:tomato','soup:tomato+tomato'])('does not mix %s into clean bench plates',(item)=>{
  const {k,p,use}=setup(),bench=k.stations['counter-4']
  bench.item='plate';bench.count=2;p.held=item;use('counter-4')
  expect(p.held).toBe(item);expect(counterPlateCount(bench)).toBe(2)
  bench.item=item;bench.count=0;p.held='plate';use('counter-4')
  expect(p.held).toBe('plate');expect(bench.item).toBe(item)
 })
 it('does not repeat a bench-stack placement on retry or a stale queued press',()=>{
  const {k,p,use}=setup(),bench=k.stations['counter-4']
  p.held='plate';use('counter-4');p.held='plate'
  const step={activate:true as const,actionId:crypto.randomUUID(),intent:{station:'counter-4',held:'plate'}}
  const body={op:'input',commandId:crypto.randomUUID(),steps:[step]}
  commandKitchen(k,0,body,1001);commandKitchen(k,0,body,1002)
  commandKitchen(k,0,{...body,commandId:crypto.randomUUID()},1003)
  commandKitchen(k,0,{...body,commandId:crypto.randomUUID(),steps:[{...step,actionId:crypto.randomUUID()}]},1004)
  expect(p.held).toBeNull();expect(counterPlateCount(bench)).toBe(2)
 })
 it('carries a dirty stack, washes each plate, then picks clean plates up individually',()=>{
  const {k,p,use}=setup();k.stations['plate-return'].count=3
  use('plate-return');expect(p.held).toBe('dirty:3')
  use('sink',2000);expect(p.held).toBeNull();expect(k.stations.sink.dirtyCount).toBe(3)
  advanceKitchen(k,7000);expect(k.stations.sink).toMatchObject({dirtyCount:2,cleanCount:1,readyAt:12000})
  advanceKitchen(k,17000);expect(k.stations.sink).toMatchObject({dirtyCount:0,cleanCount:3,worker:null})
  for(let i=0;i<3;i++){use('sink',17001+i);expect(p.held).toBe('plate');p.held=null}
  expect(k.stations.sink.item).toBeNull();use('sink',17005);expect(p.held).toBeNull()
 })
 it('pauses the remaining stack when a clean plate is collected, without duplicating completions',()=>{
  const {k,p,use}=setup();p.held='dirty:3';use('sink',1000)
  use('sink',7000);expect(p.held).toBe('plate');expect(k.stations.sink).toMatchObject({dirtyCount:2,cleanCount:0,remainingMs:4000,readyAt:0})
  advanceKitchen(k,50000);expect(k.stations.sink.cleanCount).toBe(0)
  p.held=null;use('sink',50001);advanceKitchen(k,59001)
  expect(k.stations.sink).toMatchObject({dirtyCount:0,cleanCount:2})
  advanceKitchen(k,60000);expect(k.stations.sink.cleanCount).toBe(2)
 })
})
