import { describe, expect, it } from 'vitest'
import { KitchenMovement, type InputCommand } from './movementSync'
import { createKitchen, joinKitchen, commandKitchen, moveFreely, nearbyStation, canStand, WALK_SPEED, type KitchenPlayer } from './engine.mjs'
const player=()=>{const k=createKitchen(0);joinKitchen(k,0);return k.players[0]}
const deferred=()=>{let resolve!:(p:KitchenPlayer)=>void;let reject!:()=>void;const promise=new Promise<KitchenPlayer>((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
describe('free kitchen controls',()=>{
 it('does not rewind local movement when a stale poll arrives after acknowledgement',async()=>{
  const p=player(),network=deferred(),sync=new KitchenMovement(()=>network.promise,()=>{})
  const local=sync.tick(p,{x:1,y:0},.02,1000)
  network.resolve({...local});await Promise.resolve();await Promise.resolve()
  const next=sync.tick(p,{x:1,y:0},.02,1020)
  expect(next.x).toBeCloseTo(local.x+WALK_SPEED*.02)
 })
 it('keeps analogue movement local through a one-second delayed acknowledgement',async()=>{
  const p=player(),network=deferred(),sync=new KitchenMovement(()=>network.promise,()=>{})
  const first=sync.tick(p,{x:.5,y:0},.02,1000)
  let last=first
  for(let i=1;i<50;i++)last=sync.tick(p,{x:.5,y:0},.02,1000+i*20)
  expect(last.x-p.x).toBeCloseTo(WALK_SPEED*.5)
  network.resolve({...first});await Promise.resolve()
  expect(sync.tick(p,{x:0,y:0},.02,2000).x).toBeCloseTo(last.x)
  sync.reset()
 })
 it('dashes faster with identical server movement and preserves counter collisions',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const p={...k.players[0]}
  const input={x:1,y:0,dt:.05,dash:true}
  const fast=moveFreely(p,input,input.dt)
  expect(fast.x-p.x).toBeCloseTo(WALK_SPEED*.05*2.4)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[input]},100)
  expect(k.players[0].x).toBeCloseTo(fast.x)
  const stopped=moveFreely({...p,x:5,y:5},{x:0,y:-1,dash:true},.25)
  expect(canStand(stopped.x,stopped.y)).toBe(true)
  expect(stopped.y).toBeGreaterThan(3.7)
 })
 it('moves by frame time in fractional coordinates, with equal diagonal speed',()=>{
  const p=player(),straight=moveFreely(p,{x:1,y:0},.017),diagonal=moveFreely(p,{x:1,y:1},.017)
  expect(straight.x).toBeCloseTo(p.x+WALK_SPEED*.017)
  expect(Number.isInteger(straight.x)).toBe(false)
  expect(Math.hypot(diagonal.x-p.x,diagonal.y-p.y)).toBeCloseTo(WALK_SPEED*.017)
 })
 it('collides with counters and walls, and slides along their edges',()=>{
  const p={...player(),x:5,y:5}
  const stopped=moveFreely(p,{x:0,y:-1},1)
  expect(stopped.y).toBeGreaterThan(3.7);expect(stopped.y).toBeLessThan(3.9);expect(canStand(stopped.x,stopped.y)).toBe(true)
  const sliding=moveFreely(stopped,{x:1,y:-1},.2)
  expect(sliding.x).toBeGreaterThan(stopped.x);expect(sliding.y).toBeCloseTo(stopped.y)
  expect(moveFreely(p,{x:-1,y:0},5).x).toBeGreaterThan(-.5)
 })
 it('moves while a network response is pending and replays unacknowledged inputs',async()=>{
  const first=deferred(),second=deferred(),requests:InputCommand[]=[],p=player()
  const sync=new KitchenMovement(command=>{requests.push(command);return requests.length===1?first.promise:second.promise},()=>{})
  const firstFrame=sync.tick(p,{x:1,y:0},.02,1000)
  expect(firstFrame.x).toBeCloseTo(2.096)
  const next=sync.tick(p,{x:1,y:0},.02,1020)
  expect(next.x).toBeCloseTo(2.192);expect(requests).toHaveLength(1)
  first.resolve({...firstFrame,commandId:requests[0].commandId});await Promise.resolve();await Promise.resolve()
  expect(requests).toHaveLength(2)
  expect(requests[1].steps).toEqual([{x:1,y:0,dt:.02}])
  second.resolve({...next,commandId:requests[1].commandId});await Promise.resolve();await Promise.resolve()
 })
 it('sends a stop when keys are released and rolls back on connection failure',async()=>{
  const network=deferred(),requests:InputCommand[]=[],p=player();let rejected=0
  const sync=new KitchenMovement(command=>{requests.push(command);return network.promise},()=>rejected++)
  const moving=sync.tick(p,{x:1,y:0},.03,1000)
  const stopped=sync.tick(p,{x:0,y:0},.03,1030)
  expect(stopped.x).toBe(moving.x);expect(stopped.walking).toBe(false)
  network.reject();await Promise.resolve();await Promise.resolve()
  expect(rejected).toBe(1)
  expect(sync.tick(p,{x:0,y:0},.01,1050).x).toBe(p.x)
 })
 it('activates only a nearby station in front, and does not repeat an acknowledged activation',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  const p=k.players[0];Object.assign(p,{x:1,y:1,facing:{x:0,y:-1}})
  expect(nearbyStation(p)?.id).toBe('tomato')
  const command={op:'input',commandId:crypto.randomUUID(),steps:[{activate:true as const}]}
  commandKitchen(k,0,command,100);expect(p.held).toBe('raw:tomato')
  p.held=null;commandKitchen(k,0,command,101);expect(p.held).toBeNull()
  p.facing={x:0,y:1};commandKitchen(k,0,{...command,commandId:crypto.randomUUID()},200);expect(p.held).toBeNull()
  expect(p.notice).toContain('Face a nearby counter')
 })
 it('targets the first counter face and rejects diagonal reach through an island',()=>{
  const p={...player(),x:4,y:2.27,facing:{x:1,y:0}}
  expect(nearbyStation(p)).toBeNull()
  expect(nearbyStation({...p,facing:{x:0,y:1}})?.id).toBe('counter-4')
  expect(nearbyStation({...p,x:4.1,y:4,facing:{x:0,y:-1}})?.id).toBe('counter-4')
 })
 it('acknowledges predicted actions, including rejected actions, without giving food twice',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const p=k.players[0]
  Object.assign(p,{x:1,y:1,facing:{x:0,y:-1}})
  const actionId=crypto.randomUUID()
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true,actionId}]},100)
  expect(p.lastActionId).toBe(actionId);expect(p.interaction?.actionId).toBe(actionId)
  const denied=crypto.randomUUID()
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true,actionId:denied}]},101)
  expect(p.lastActionId).toBe(denied);expect(p.interaction?.actionId).toBe(actionId)
  expect(p.notice).toBe('Your hands are full');expect(p.held).toBe('raw:tomato')
 })
 it('validates input on the server and preserves continuous coordinates',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:1,dt:.017}]},100)
  expect(k.players[0].x).not.toBe(Math.round(k.players[0].x))
  expect(()=>commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:100}]},101)).toThrow('Invalid movement input')
 })
 it('records distinct pickup and placement events only for successful transfers',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const p=k.players[0]
  const activate=(time:number)=>commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},time)
  Object.assign(p,{x:1,y:1,facing:{x:0,y:-1}});activate(100)
  expect(p.interaction).toEqual({id:1,station:'tomato',item:'raw:tomato',kind:'pickup',at:100})
  activate(200);expect(p.interaction?.id).toBe(1)
  Object.assign(p,{x:4,y:4});activate(300)
  expect(p.held).toBeNull();expect(k.stations['counter-4'].item).toBe('raw:tomato')
  expect(p.interaction).toEqual({id:2,station:'counter-4',item:'raw:tomato',kind:'place',at:300})
  activate(400);expect(p.interaction?.kind).toBe('pickup');expect(p.interaction?.id).toBe(3)
 })
})
