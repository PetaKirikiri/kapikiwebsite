import { useEffect, useRef, type RefObject } from 'react'
import { JOURNEY, smooth, unit } from './translationJourneyTiming'
import { SmokeFluid, type SmokeSourceCell } from './smokeFluid'
import { wordArrivalMotion } from './wordArrivalMotion'

type WordSmoke = { width:number; grains:SmokeSourceCell[] }

function sampleWord(word:string,family:string):WordSmoke {
  const stamp=document.createElement('canvas')
  stamp.width=140;stamp.height=48
  const c=stamp.getContext('2d')!
  c.font=`28px ${family}`;c.textBaseline='alphabetic';c.fillText(word,0,32)
  const width=c.measureText(word).width,pixels=c.getImageData(0,0,140,48).data
  const grains:SmokeSourceCell[]=[]
  for(let y=0;y<48;y+=2)for(let x=0;x<Math.ceil(width);x+=2){
    const alpha=pixels[(y*140+x)*4+3]/255
    if(alpha<.1)continue
    grains.push({x,y:y-32,alpha})
  }
  return {width,grains}
}

/** Typography becomes wind-carried colour; saved geometry still owns every seed. */
export default function TenseJourney({root,time,color,onTenseProgress,onAnchorProgress}:{
  root:RefObject<HTMLDivElement|null>;time:number;color:string;
  onTenseProgress:(progress:number)=>void;onAnchorProgress:(progress:readonly number[])=>void
}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const words=useRef<WordSmoke[]>([])
  const fluids=useRef(new Map<WordSmoke,{key:string;flow:SmokeFluid;image:ImageData;surface:HTMLCanvasElement}>())
  useEffect(()=>{
    const family=getComputedStyle(root.current??document.body).fontFamily
    words.current=[sampleWord('chase',family),sampleWord('bird',family),sampleWord('bird',family),sampleWord('ed',family)]
    fluids.current.clear()
  },[root])

  useEffect(()=>{
    const host=root.current,el=canvas.current
    if(!host||!el||words.current.length!==4)return
    const roots=words.current.slice(0,3),ending=words.current[3]
    const bounds=host.getBoundingClientRect(),dpr=devicePixelRatio||1
    const width=Math.ceil(bounds.width*dpr),height=Math.ceil(bounds.height*dpr)
    if(el.width!==width||el.height!==height){el.width=width;el.height=height}
    const c=el.getContext('2d')!
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,bounds.width,bounds.height)
    if(time<0){onAnchorProgress([0,0,0]);onTenseProgress(0);return}
    const targets=[...host.querySelectorAll<HTMLElement>('[data-journey-anchor]')]
    const sources=[...host.querySelectorAll<HTMLElement>('[data-english-anchor]')]
    const seedElements=[...host.querySelectorAll<HTMLCanvasElement>('[data-anchor-seed-x]')]
    if(targets.length!==3||sources.length!==3||seedElements.length!==3)return
    const family=getComputedStyle(host).fontFamily
    const scale=targets[0].getBoundingClientRect().width/130
    const targetSize=28*scale
    const point=(element:HTMLElement,size:number)=>{
      const range=document.createRange();range.selectNodeContents(element)
      const r=range.getBoundingClientRect()
      c.font=`${size}px ${family}`
      const metrics=c.measureText(element.textContent||'bird')
      return {x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+(metrics.fontBoundingBoxAscent||size*.8)}
    }
    const dest=targets.map(e=>point(e,targetSize))
    const sourceSizes=sources.map(e=>parseFloat(getComputedStyle(e).fontSize))
    const orig=sources.map((e,i)=>point(e,sourceSizes[i]))
    c.textBaseline='alphabetic'

    const smoke=(word:WordSmoke,start:number,origin:{x:number;y:number},end:{x:number;y:number},tint:string)=>{
      const seed={x:(end.x-origin.x)/scale,y:(end.y-origin.y)/scale}
      const key=`${seed.x.toFixed(1)},${seed.y.toFixed(1)}`
      let cached=fluids.current.get(word)
      if(!cached||cached.key!==key||!(cached.flow instanceof SmokeFluid)){
        const flow=new SmokeFluid(word.grains,word.width,seed)
        const surface=document.createElement('canvas');surface.width=flow.width;surface.height=flow.height
        cached={key,flow,surface,image:surface.getContext('2d')!.createImageData(flow.width,flow.height)}
        fluids.current.set(word,cached)
      }
      const {flow,surface,image}=cached,density=flow.seek(time-start)
      // Resolve any CSS colour using the canvas rather than assuming hex.
      const sc=surface.getContext('2d')!
      sc.clearRect(0,0,1,1);sc.fillStyle=tint;sc.fillRect(0,0,1,1)
      const rgb=sc.getImageData(0,0,1,1).data
      for(let i=0;i<density.length;i++){
        const d=density[i]+flow.newborn[i],edge=((density[i-flow.width]??0)+(flow.newborn[i-flow.width]??0))-d
        const light=Math.max(-.12,Math.min(.18,edge*.2))
        for(let channel=0;channel<3;channel++)image.data[i*4+channel]=rgb[channel]+(light>0?255-rgb[channel]:rgb[channel])*light
        image.data[i*4+3]=Math.round((1-Math.exp(-d*.9))*185)
      }
      sc.putImageData(image,0,0);c.globalAlpha=1;c.imageSmoothingEnabled=true
      c.drawImage(surface,origin.x+flow.left*scale,origin.y+flow.top*scale,flow.width*flow.cellSize*scale,flow.height*flow.cellSize*scale)
      // Follow the same neighbour ignition and birth phase as the smoke field.
      c.fillStyle=tint
      for(const [index,grain] of word.grains.entries()){
        c.globalAlpha=grain.alpha*flow.inkRemaining(index,time-start)
        if(c.globalAlpha>0)c.fillRect(origin.x+grain.x*scale,origin.y+grain.y*scale,2*scale,2*scale)
      }
      c.globalAlpha=1
      return start+flow.arrivalTime
    }

    const mapping=[1,0,2]
    const arrivals=[Infinity,Infinity,Infinity]
    mapping.forEach((source,i)=>{
      const start=orig[source],end=dest[i],smokeStart=JOURNEY.rootSmokeStart+i*260
      const tint=i===0?color:'#568f72'
      if(time<smokeStart){
        const motion=wordArrivalMotion(start,end,time,i,scale)
        const size=sourceSizes[source]+(targetSize-sourceSizes[source])*motion.sizeProgress
        c.save();c.translate(motion.x,motion.y);c.rotate(motion.rotation)
        c.font=`${size}px ${family}`;c.fillStyle=tint;c.textAlign='center'
        c.globalAlpha=motion.opacity;c.shadowColor=tint;c.shadowBlur=motion.glow
        c.fillText(i===0?'chased':'bird',0,0)
        c.restore()
      }else{
        const r=seedElements[i].getBoundingClientRect()
        const seed={x:r.left-bounds.left+Number(seedElements[i].dataset.anchorSeedX)*scale,
          y:r.top-bounds.top+Number(seedElements[i].dataset.anchorSeedY)*scale}
        arrivals[i]=smoke(roots[i],smokeStart,{x:end.x-roots[i].width*scale/2,y:end.y},seed,tint)
      }
    })
    onAnchorProgress(arrivals.map(arrival=>unit((time-arrival)/JOURNEY.anchorDuration)))
    const release=Math.max(...arrivals)+JOURNEY.anchorDuration+JOURNEY.readyHold

    if(time<JOURNEY.rootSmokeStart){onTenseProgress(0);return}
    c.font=`${targetSize}px ${family}`;c.textAlign='left';c.globalAlpha=1;c.fillStyle=color
    const verb=dest[0]
    // Hold the tense on the same text baseline, visibly separate from whai.
    // It does not rise intact or disappear while the anchors are germinating.
    const originalX=verb.x-c.measureText('chased').width/2+c.measureText('chas').width
    const parkedX=verb.x+roots[0].width*scale/2+18*scale
    const edX=originalX+(parkedX-originalX)*smooth((time-JOURNEY.rootSmokeStart)/650)
    const origin={x:edX,y:verb.y}
    if(time<release){onTenseProgress(0);c.fillText('ed',origin.x,origin.y);return}
    const seed=host.querySelector<HTMLElement>('[data-journey-verb] [data-growth-seed-x]')
    if(!seed)return
    const r=seed.getBoundingClientRect()
    const tenseArrival=smoke(ending,release,origin,{x:r.left-bounds.left+Number(seed.dataset.growthSeedX)*scale,
      y:r.top-bounds.top+Number(seed.dataset.growthSeedY)*scale},color)
    onTenseProgress(unit((time-tenseArrival)/JOURNEY.leftDuration))
  },[time,color,root,onTenseProgress,onAnchorProgress])
  return <canvas ref={canvas} aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:3}} />
}
