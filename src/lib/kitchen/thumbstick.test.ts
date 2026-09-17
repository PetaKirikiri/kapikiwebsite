import {describe,it,expect} from 'vitest'
import {thumbstick} from './thumbstick'
import {createKitchen,joinKitchen,moveFreely,commandKitchen,canStand,WALK_SPEED} from './engine.mjs'
describe('analogue thumbstick',()=>{
 it('uses a circular deadzone rather than independent axis thresholds',()=>{
  expect(thumbstick(2,2,30).x).toBe(0)
  const v=thumbstick(12,2,30)
  expect(v.y).toBeGreaterThan(0);expect(v.y/v.x).toBeCloseTo(1/6)
 })
 it('preserves angles through a full circle and clamps outer travel',()=>{
  for(let angle=0;angle<Math.PI*2;angle+=.07){
   const x=Math.cos(angle),y=Math.sin(angle),v=thumbstick(x*60,y*60,30)
   expect(v.x).toBeCloseTo(x);expect(v.y).toBeCloseTo(y)
   expect(Math.hypot(v.knobX,v.knobY)).toBeCloseTo(30)
  }
 })
 it('remaps half of usable travel to half speed',()=>{
  const v=thumbstick(30*(.14+.86/2),0,30)
  expect(v.x).toBeCloseTo(.5)
  const k=createKitchen(0);joinKitchen(k,0);const p=k.players[0]
  expect(moveFreely(p,v,.05).x-p.x).toBeCloseTo(WALK_SPEED*.05*.5)
 })
 it('retains identical fractional input on the server without a diagonal speed advantage',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const p={...k.players[0]},v=thumbstick(17,-8,30)
  const expected=moveFreely(p,v,.04)
  commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{...v,dt:.04}]},1000)
  expect(k.players[0].x).toBeCloseTo(expected.x);expect(k.players[0].y).toBeCloseTo(expected.y)
  const diagonal=moveFreely(p,{x:1,y:1},.05)
  expect(Math.hypot(diagonal.x-p.x,diagonal.y-p.y)).toBeCloseTo(WALK_SPEED*.05)
 })
 it('keeps angled dashes outside counters and rejects oversized input',()=>{
  const k=createKitchen(0);joinKitchen(k,0)
  const p=moveFreely({...k.players[0],x:5,y:5},{x:.22,y:-.93,dash:true},.25)
  expect(canStand(p.x,p.y)).toBe(true)
  for(const x of [NaN,Infinity,1.1])expect(()=>commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{x,y:0,dt:.01}]},1000)).toThrow('Invalid movement input')
 })
})
