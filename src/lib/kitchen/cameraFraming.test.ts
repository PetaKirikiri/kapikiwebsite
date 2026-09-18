import {describe,it,expect} from 'vitest'
import {fitKitchenCamera} from './cameraFraming'

describe('landscape kitchen framing',()=>{
 const room={left:-6.55,right:6.55,top:4.4,bottom:-4.4}
 it.each([[844,280],[844,390],[667,260],[1024,768]])('fits the whole room at %i × %i with HUD and thumb clearance',(width,height)=>{
  const inset={left:108,right:144,top:52,bottom:6}
  const frame=fitKitchenCamera(room,width,height,inset)
  const scale=width/(frame.right-frame.left)
  expect((frame.top-frame.bottom)*scale).toBeCloseTo(height)
  expect((room.left-frame.left)*scale).toBeGreaterThanOrEqual(inset.left-1e-6)
  expect((frame.right-room.right)*scale).toBeGreaterThanOrEqual(inset.right-1e-6)
  expect((frame.top-room.top)*scale).toBeGreaterThanOrEqual(inset.top-1e-6)
  expect((room.bottom-frame.bottom)*scale).toBeGreaterThanOrEqual(inset.bottom-1e-6)
  expect(Math.min((room.left-frame.left)*scale-inset.left,(frame.top-room.top)*scale-inset.top)).toBeCloseTo(0)
 })
})
