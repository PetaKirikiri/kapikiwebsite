import { useEffect, useMemo, useRef } from 'react'
import { compileLeftWordGrowth, type LeftWordGrowthInput } from '../lib/connectorPresentation/leftWordGermination'

export default function LeftWordGrowth({input,progress,words}:{input:LeftWordGrowthInput;progress:number;
  words:readonly {text:string;left:number;width:number}[]}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const compiled=useMemo(()=>{
    try{return {plan:compileLeftWordGrowth(input),error:''}}
    catch(error){return {plan:null,error:error instanceof Error?error.message:'Left words unavailable'}}
  },[input])
  useEffect(()=>{
    const plan=compiled.plan,element=canvas.current
    if(!plan||!element)return
    if(element.width!==plan.width)element.width=plan.width
    if(element.height!==plan.height)element.height=plan.height
    element.getContext('2d')!.putImageData(plan.frame(progress),0,0)
  },[compiled,progress])
  const plan=compiled.plan
  if(!plan)return <span role="alert">{compiled.error}</span>
  const textLeft=plan.textLeft(progress)
  return <div data-growth-seed-x={(plan.seed%plan.width)/3} data-growth-seed-y={Math.floor(plan.seed/plan.width)/3} style={{position:'absolute',left:0,top:0,width:plan.width/3,pointerEvents:'none'}}>
    <canvas ref={canvas} role="img" aria-label="Left words growing from the connector tip" style={{display:'block',width:plan.width/3,height:40}} />
    <div aria-label={words.map(word=>word.text).join(' ')} style={{position:'relative',height:38,marginTop:10,
      clipPath:`inset(0 0 0 ${Math.min(plan.width/3,textLeft)}px)`}}>
      {words.map((word,i)=><span key={i} style={{position:'absolute',left:word.left,width:word.width,textAlign:'center',fontSize:28,color:'#344c46'}}>{word.text}</span>)}
    </div>
  </div>
}
