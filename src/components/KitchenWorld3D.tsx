import { useEffect, useRef, useState } from 'react'
import { createKitchenScene, type KitchenFrame } from '../lib/kitchen/kitchenScene'
import { STATIONS, returnedPlateCount } from '../lib/kitchen/engine.mjs'
export default function KitchenWorld3D({frame}:{frame:KitchenFrame}){
 const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null),scene=useRef<ReturnType<typeof createKitchenScene>|null>(null),[failure,setFailure]=useState('')
 useEffect(()=>{
  let disposed=false
  void Promise.resolve().then(()=>{if(disposed||!canvas.current||!host.current)return;try{scene.current=createKitchenScene(canvas.current,host.current)}catch{setFailure('The kitchen needs WebGL. Please enable hardware acceleration in your browser.')}})
  return()=>{disposed=true;scene.current?.dispose();scene.current=null}
 },[])
 useEffect(()=>{scene.current?.update(frame)},[frame])
 return <div className="kitchen-world" ref={host} role="application" aria-label="Kitchen. WASD to move. J to use the highlighted counter." tabIndex={0} onPointerDown={()=>host.current?.focus()}>
  <canvas ref={canvas} aria-hidden="true"/>{failure&&<p className="kitchen-render-error" role="alert">{failure}</p>}
  <div className="kitchen-accessible-state">{STATIONS.map(s=><span key={s.id} data-station={s.id} data-plate-count={s.type==='plate-return'?returnedPlateCount(frame.kitchen.stations[s.id],frame.now):undefined} className={frame.selected===s.id?'is-selected':''}>{s.label}{frame.selected===s.id?' selected':''}</span>)}{Object.entries(frame.players).map(([key,p])=><span key={key} data-kitchen-player={key} data-x={p.x} data-y={p.y} data-held={p.held??''} data-facing={JSON.stringify(p.facing)} aria-label={`Chef ${Number(key)+1}: ${p.held??'empty hands'}`}/>)}{frame.reaches.map(r=><span key={r.seat} data-transfer={r.kind}/>)}</div>
 </div>
}
