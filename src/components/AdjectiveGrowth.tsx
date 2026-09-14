import { useEffect, useMemo, useRef } from 'react'
import { compileAdjectiveGrowth, type AdjectiveGrowthInput } from '../lib/connectorPresentation/adjectiveGermination'

export default function AdjectiveGrowth({input,progress,text,left,showPlate=false}:{input:AdjectiveGrowthInput;progress:number;text:string;left:number;showPlate?:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const compiled=useMemo(()=>{
    try{return {plan:compileAdjectiveGrowth(input),error:''}}
    catch(error){return {plan:null,error:error instanceof Error?error.message:'Adjective unavailable'}}
  },[input])
  useEffect(()=>{
    const plan=compiled.plan,element=canvas.current
    if(!plan||!element)return
    const ctx=element.getContext('2d')!
    const original=plan.frame(progress)
    if(!showPlate){ctx.putImageData(original,0,0);return}
    // Inspect the actual solver plate, not a second illustrative track.
    const display=new ImageData(new Uint8ClampedArray(original.data),plan.width,plan.height)
    const {material,pipeWalls,width,height}=plan.plate
    for(let i=0;i<material.length;i++){
      if(!material[i])continue
      const x=i%width,y=Math.floor(i/width)
      if(x<2||y<2||x>=width-2||y>=height-2||!material[i-2]||!material[i+2]||!material[i-2*width]||!material[i+2*width])
        display.data.set([28,35,48,255],i*4)
    }
    for(let i=0;i<material.length;i++){
      const alpha=pipeWalls.data[i*4+3]/255
      if(!alpha)continue
      const oldAlpha=display.data[i*4+3]/255,resultAlpha=alpha+oldAlpha*(1-alpha)
      for(let channel=0;channel<3;channel++)display.data[i*4+channel]=
        (display.data[i*4+channel]*oldAlpha*(1-alpha)+pipeWalls.data[i*4+channel]*alpha)/resultAlpha
      display.data[i*4+3]=resultAlpha*255
    }
    ctx.putImageData(display,0,0)
    ctx.beginPath();ctx.arc(plan.seed%width+.5,Math.floor(plan.seed/width)+.5,5,0,Math.PI*2)
    ctx.fillStyle='#e39721';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke()
  },[compiled,progress,showPlate])
  if(!compiled.plan)return <span role="alert">{compiled.error}</span>
  const width=compiled.plan.width/3
  return <div style={{position:'absolute',left,top:0,width,pointerEvents:'none'}}>
    <canvas ref={canvas} width={compiled.plan.width} height={120} role="img" aria-label={`${text} growing from its noun connection`} style={{display:'block',width,height:40}} />
    <div style={{marginTop:10,paddingLeft:40,fontSize:28,color:'#344c46',clipPath:`inset(0 ${width-compiled.plan.textRight(progress)}px 0 0)`}}>{text}</div>
  </div>
}
