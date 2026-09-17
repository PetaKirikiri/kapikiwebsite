import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import {thumbstick} from '../lib/kitchen/thumbstick'

export default function KitchenTouchControls({onMove,onUse,onDash}:{onMove:(x:number,y:number)=>void;onUse:()=>void;onDash:()=>void}){
 const pointer=useRef<number|null>(null)
 const [knob,setKnob]=useState({x:0,y:0})
 const reset=useCallback(()=>{pointer.current=null;setKnob({x:0,y:0});onMove(0,0)},[onMove])
 useEffect(()=>{
  const clear=()=>reset(),hide=()=>{if(document.hidden)reset()}
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hide)
  return()=>{onMove(0,0);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hide)}
 },[onMove,reset])
 const update=(event:PointerEvent<HTMLDivElement>)=>{
  const box=event.currentTarget.getBoundingClientRect(),x=event.clientX-box.left-box.width/2,y=event.clientY-box.top-box.height/2
  const knobRadius=event.currentTarget.firstElementChild!.getBoundingClientRect().width/2
  const stick=thumbstick(x,y,Math.max(1,box.width/2-knobRadius-2))
  setKnob({x:stick.knobX,y:stick.knobY})
  onMove(stick.x,stick.y)
 }
 return <div className="kitchen-touch-controls">
  <div className="kitchen-thumbstick" aria-label="Movement thumbstick" onPointerDown={event=>{if(pointer.current!==null)return;event.preventDefault();pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);update(event)}} onPointerMove={event=>{if(pointer.current===event.pointerId)update(event)}} onPointerUp={event=>{if(pointer.current===event.pointerId)reset()}} onPointerCancel={event=>{if(pointer.current===event.pointerId)reset()}} onLostPointerCapture={event=>{if(pointer.current===event.pointerId)reset()}}>
   <span style={{transform:`translate(${knob.x}px,${knob.y}px)`}}/>
  </div>
  <div className="kitchen-touch-actions">
   <button aria-label="Dash" onPointerDown={event=>{event.preventDefault();onDash()}} onClick={event=>{if(event.detail===0)onDash()}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 3-8 11h6l-1 7 9-12h-6z"/></svg></button>
   <button aria-label="Use counter" onPointerDown={event=>{event.preventDefault();onUse()}} onClick={event=>{if(event.detail===0)onUse()}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12V5a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v3a2 2 0 0 1 4 0v5c0 4-3 6-6 6-3 0-4-1-6-3l-4-5a2 2 0 0 1 3-2l1 1"/></svg></button>
  </div>
 </div>
}
