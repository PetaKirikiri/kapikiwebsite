import { useEffect, useMemo, useRef } from 'react'
import type { ConnectorFacePlan } from '../lib/connectorPresentation/presentation'
import { compileMarkerGrowth } from '../lib/connectorPresentation/markerGermination'

export default function MarkerGrowth({face,progress,text,inspection=false}:{face:ConnectorFacePlan;progress:number;text:string;inspection?:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const compiled=useMemo(()=>{
    try{return {plan:compileMarkerGrowth(face),error:''}}
    catch(error){return {plan:null,error:error instanceof Error?error.message:'Marker unavailable'}}
  },[face])
  useEffect(()=>{
    if(compiled.plan&&canvas.current)canvas.current.getContext('2d')!.putImageData(
      inspection?compiled.plan.trackInspection:compiled.plan.frame(progress),0,0)
  },[compiled,progress,inspection])
  if(!compiled.plan)return <span role="alert">{compiled.error}</span>
  if(inspection)return <figure style={{margin:'18px auto 10px',width:180,textAlign:'center'}}>
    <canvas ref={canvas} width={120} height={120} role="img" aria-label="Enlarged object-marker frond track" style={{display:'block',width:180,height:180,background:'#fff',border:'1px solid #d8e0dd'}} />
    <figcaption style={{fontSize:12,letterSpacing:'.12em',textTransform:'uppercase',color:'#657a74'}}>Object marker track</figcaption>
  </figure>
  return <div style={{position:'absolute',left:-40,top:0,width:40,pointerEvents:'none'}}>
    <canvas ref={canvas} width={120} height={120} role="img" aria-label="Object marker with its frond track visible" style={{display:'block',width:40,height:40}} />
    <div style={{marginTop:10,fontSize:28,color:'#344c46',maskImage:compiled.plan.textMask(progress)}}>{text}</div>
  </div>
}
