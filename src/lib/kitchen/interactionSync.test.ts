import { describe, expect, it } from 'vitest'
import { KitchenInteractions } from './interactionSync'
import { KITCHEN_TIMING, advanceKitchen, createKitchen, joinKitchen, commandKitchen, type Kitchen } from './engine.mjs'
const setup=()=>{const k=createKitchen(0);joinKitchen(k,0);Object.assign(k.players[0],{x:1,y:1,facing:{x:0,y:-1}});return k}
const activate=(q:KitchenInteractions,k:Kitchen,x:number,y:number,at:number)=>q.activate(k,0,{...k.players[0],x,y,facing:{x:0,y:-1}},at)
const confirm=(k:Kitchen,id:string,x:number,y:number,at:number,received:number)=>{
 Object.assign(k.players[0],{x,y,facing:{x:0,y:-1}})
 commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true,actionId:id,at}]},received)
}
describe('local-first kitchen interactions',()=>{
 it('picks up, chops, collects and places before the first database reply',()=>{
  const server=setup(),q=new KitchenInteractions();q.reconcile(server,0)
  const pickup=activate(q,server,1,1,1000)
  expect(q.view!.players[0].held).toBe('raw:tomato')
  const chop=activate(q,server,4,1,1700)
  expect(q.view!.players[0].held).toBeNull()
  expect(q.view!.stations['chop-a'].readyAt).toBe(1700+KITCHEN_TIMING.chop)
  const collectAt=1800+KITCHEN_TIMING.chop,placeAt=collectAt+700,replyAt=placeAt+500
  const collect=activate(q,server,4,1,collectAt)
  expect(q.view!.players[0].held).toBe('chopped:tomato')
  const place=activate(q,server,4,4,placeAt)
  expect(q.view!.stations['counter-4'].item).toBe('chopped:tomato')
  // An older poll cannot erase any of those pending actions.
  q.reconcile(server,0)
  expect(q.view!.stations['counter-4'].item).toBe('chopped:tomato')
  confirm(server,pickup.id!,1,1,1000,replyAt);q.reconcile(server,0)
  expect(q.saving).toBe(true);expect(q.view!.players[0].held).toBeNull()
  confirm(server,chop.id!,4,1,1700,replyAt+100);q.reconcile(server,0)
  expect(server.stations['chop-a'].readyAt).toBe(1700+KITCHEN_TIMING.chop)
  confirm(server,collect.id!,4,1,collectAt,replyAt+200)
  confirm(server,place.id!,4,4,placeAt,replyAt+300);q.reconcile(server,0)
  expect(q.saving).toBe(false);expect(q.view).toEqual(server)
  expect(server.stations['counter-4'].item).toBe('chopped:tomato')
 })
 it('reconciles a competing player taking the same item without keeping phantom inventory',()=>{
  const server=setup(),q=new KitchenInteractions();server.stations['counter-4'].item='raw:onion';q.reconcile(server,0)
  const take=activate(q,server,4,4,1000)
  expect(q.view!.players[0].held).toBe('raw:onion')
  server.stations['counter-4'].item=null
  confirm(server,take.id!,4,4,1000,1300)
  expect(q.reconcile(server,0)).toContain('counter changed')
  expect(q.view!.players[0].held).toBeNull();expect(q.saving).toBe(false)
 })
 it('does not enqueue an early chop pickup or repeat its animation after acknowledgement',()=>{
  const server=setup(),q=new KitchenInteractions();q.reconcile(server,0)
  const take=activate(q,server,1,1,1000);activate(q,server,4,1,1700)
  expect(activate(q,server,4,1,1800).id).toBeNull()
  expect(q.view!.stations['chop-a'].readyAt).toBe(1700+KITCHEN_TIMING.chop)
  expect(q.wasPredicted(take.id!)).toBe(true)
  q.reset();expect(q.saving).toBe(false);expect(q.view).toBeNull()
 })
 it('clears served food immediately and keeps it cleared across old polls and acknowledgement',()=>{
  const server=setup(),q=new KitchenInteractions();server.players[0].held='soup:tomato+tomato'
  const pose={...server.players[0],x:10,y:2,facing:{x:1,y:0}}
  q.reconcile(server,0);const serve=q.activate(server,0,pose,1000)
  expect(serve.id).toBeTruthy();expect(q.view!.players[0].held).toBeNull()
  q.reconcile(server,0);expect(q.view!.players[0].held).toBeNull();expect(q.view!.served).toBe(1)
  Object.assign(server.players[0],pose)
  const body={op:'input',commandId:crypto.randomUUID(),steps:[{activate:true as const,actionId:serve.id!,at:1000}]}
  commandKitchen(server,0,body,4000);commandKitchen(server,0,body,4100);q.reconcile(server,0)
  expect(q.saving).toBe(false);expect(q.view!.players[0].held).toBeNull()
  expect(server.served).toBe(1);expect(server.stations['plate-return'].count??0).toBe(0)
  expect(server.stations['plate-return'].returnAt).toEqual([1000+KITCHEN_TIMING.plateReturn])
  advanceKitchen(server,1000+KITCHEN_TIMING.plateReturn)
  for(const seat of [0,1]){
   joinKitchen(server,seat);Object.assign(server.players[seat],{x:10,y:3,facing:{x:1,y:0}})
   commandKitchen(server,seat,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},1000+KITCHEN_TIMING.plateReturn)
  }
  expect(Object.values(server.players).filter(p=>p.held==='dirty')).toHaveLength(1)
  expect(server.stations['plate-return'].count).toBe(0)
 })
 it('bounds client action timestamps and rejects malformed times',()=>{
  const server=setup();server.players[0].held='raw:tomato'
  confirm(server,crypto.randomUUID(),4,1,1,20000)
  expect(server.stations['chop-a'].readyAt).toBe(8000+KITCHEN_TIMING.chop)
  expect(()=>confirm(server,crypto.randomUUID(),4,1,NaN,21000)).toThrow('Invalid action time')
 })
 it('pauses work locally and replays the pause before a delayed server reply',()=>{
  const server=setup(),q=new KitchenInteractions();server.players[0].held='raw:tomato';q.reconcile(server,0)
  const chop=activate(q,server,4,1,1000)
  const pauseId=q.pause(server,0,q.view!.players[0],2000)!
  expect(pauseId).toBeTruthy();expect(q.view!.stations['chop-a'].remainingMs).toBe(KITCHEN_TIMING.chop-1000)
  expect(q.view!.stations['chop-a'].readyAt).toBe(0)
  confirm(server,chop.id!,4,1,1000,7000);q.reconcile(server,0)
  expect(q.view!.stations['chop-a'].readyAt).toBe(0)
  commandKitchen(server,0,{op:'input',commandId:crypto.randomUUID(),steps:[{pauseWork:true,at:2000,actionId:pauseId}]},7100)
  q.reconcile(server,0);expect(q.saving).toBe(false)
  expect(server.stations['chop-a'].remainingMs).toBe(KITCHEN_TIMING.chop-1000)
  const resume=activate(q,server,4,1,8000)
  expect(resume.id).toBeTruthy();expect(q.view!.stations['chop-a'].readyAt).toBe(8000+KITCHEN_TIMING.chop-1000)
 })

})
