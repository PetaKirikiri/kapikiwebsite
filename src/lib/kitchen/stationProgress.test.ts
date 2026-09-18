import { describe, expect, it } from 'vitest'
import { KITCHEN_TIMING, carriedPot, createKitchen, joinKitchen, commandKitchen } from './engine.mjs'
import { stationProgress } from './stationProgress'
const state={readyAt:20000,item:null,ingredients:['tomato','tomato']}
describe('station timers',()=>{
 it('matches the server durations for chopping, cooking and washing',()=>{
  for(const [type,duration] of [['chop',KITCHEN_TIMING.chop],['pot',KITCHEN_TIMING.cook],['sink',KITCHEN_TIMING.wash]] as const){
   expect(stationProgress(type,state,state.readyAt-duration)?.value).toBe(0)
   expect(stationProgress(type,state,state.readyAt-duration/2)?.value).toBe(.5)
   expect(stationProgress(type,state,state.readyAt)?.phase).toBe('ready')
  }
 })
 it('counts down the serving window, warns for the last four seconds, then marks burnt',()=>{
  expect(stationProgress('pot',state,20000)).toEqual({phase:'ready',value:1,label:'✓ 12s'})
  expect(stationProgress('pot',state,28000)).toEqual({phase:'warning',value:1/3,label:'! 4s'})
  expect(stationProgress('pot',state,32000)?.phase).toBe('burnt')
  expect(stationProgress('chop',state,99000)).toEqual({phase:'ready',value:1,label:'✓'})
 })
 it('hides empty and instant-action stations',()=>{
  expect(stationProgress('pot',{...state,readyAt:0},0)).toBeNull()
  expect(stationProgress('trash',state,15000)).toBeNull()
  expect(stationProgress('counter',state,15000)).toBeNull()
 })
 it('uses the same ready and burnt boundaries for actual interactions',()=>{
  const k=createKitchen(0);joinKitchen(k,0);const p=k.players[0]
  Object.assign(p,{x:7,y:1,facing:{x:0,y:-1},held:'plate'});k.stations['pot-a']={...state}
  const use=(now:number)=>commandKitchen(k,0,{op:'input',commandId:crypto.randomUUID(),steps:[{activate:true}]},now)
  use(19999);expect(p.held).toBe('plate')
  use(20000);expect(p.held).toBe('soup:tomato+tomato')
  k.stations['pot-a']={...state};p.held=null
  use(32000);expect(k.stations['pot-a'].potPresent).toBe(false);expect(carriedPot(p.held)?.burnt).toBe(true)
 })
 it('freezes paused progress instead of letting the wall clock complete it',()=>{
  const paused={item:'chopped:tomato',ingredients:[],readyAt:0,remainingMs:KITCHEN_TIMING.chop/2,worker:null}
  expect(stationProgress('chop',paused,1000)).toEqual({phase:'paused',value:.5,label:'Ⅱ'})
  expect(stationProgress('chop',paused,90000)).toEqual(stationProgress('chop',paused,1000))
 })

})
