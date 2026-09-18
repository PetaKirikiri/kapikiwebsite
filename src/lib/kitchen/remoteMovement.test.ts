import {describe,it,expect} from 'vitest'
import {RemoteMovement} from './remoteMovement'
import {createKitchen,joinKitchen,commandKitchen} from './engine.mjs'
describe('authoritative movement replay',()=>{
 it('does not resurrect old carried ingredients while playing queued movement',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const replay=new RemoteMovement()
  k.players[0].held='raw:onion';replay.tick(0,k.players[0],.02)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.2}]},1000)
  k.players[0].held='plate'
  for(let i=0;i<10;i++)expect(replay.tick(0,k.players[0],.02).held).toBe('plate')
 })
 it('uses queued direction, not the latest heading or future destination',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const replay=new RemoteMovement(),p={...k.players[0]}
  replay.tick(0,p,.02)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.1},{x:0,y:1,dt:.1}]},1000)
  const shown=replay.tick(0,k.players[0],.02)
  expect(shown.facing).toEqual({x:1,y:0})
  expect(shown.y).toBe(p.y)
  expect(shown.x-p.x).toBeCloseTo(4.8*.02)
 })
 it('plays a delayed batch at its original speed, not catch-up speed',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const replay=new RemoteMovement(),p={...k.players[0]}
  replay.tick(0,p,.02)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.2}]},1000)
  const displayed=replay.tick(0,k.players[0],.02)
  expect(displayed.x-p.x).toBeCloseTo(4.8*.02)
  expect(displayed.x).toBeLessThan(k.players[0].x)
 })
 it('rejects movement time invented by repeated commands',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  const send=()=>commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.2}]},1000)
  send();expect(send).toThrow('Movement exceeds elapsed time')
 })
 it('limits continuous dash requests to one short burst',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const start=k.players[0].x
  for(let i=0;i<4;i++)commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x:1,y:0,dt:.2,dash:true}]},1000+i*200)
  expect(k.players[0].x-start).toBeCloseTo(4.8*(.8+.22*1.4),1)
 })
})
