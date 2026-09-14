import type { ConnectorFacePlan } from './presentation'
import { germinatePlate } from './plateGermination'
import { platePaintArrival } from './platePaintArrival'

/** Retain the concave edge of the saved swept ribbon as an invisible wall.
 * The ordinary circular colony must therefore travel around the authored curl
 * exactly as it does in the approved anchor fronds. */
export function germinateAlongSavedTrack(alpha:Uint8ClampedArray,width:number,height:number,seed:number,
  path:string,scale:number,minX:number,minY:number) {
  const points=[...path.split('Z')[0].matchAll(/[ML]\s*([+-]?[\d.]+)[ ,]+([+-]?[\d.]+)/g)]
    .map(m=>[Number(m[1])*scale-minX,Number(m[2])*scale-minY] as const)
  const half=points.length/2
  if(!Number.isInteger(half)||half<4)throw new Error('The saved marker pipe edges are unavailable.')
  const wallCanvas=document.createElement('canvas');wallCanvas.width=width;wallCanvas.height=height
  const wall=wallCanvas.getContext('2d')!
  wall.strokeStyle='#000';wall.lineWidth=1.8;wall.lineCap='round';wall.lineJoin='round'
  const edge=points.slice(0,half).reverse()
  const filled=([x,y]:readonly[number,number])=>{
    const xx=Math.floor(x),yy=Math.floor(y)
    return xx>=0&&xx<width&&yy>=0&&yy<height&&alpha[(yy*width+xx)*4+3]>=128
  }
  let start=edge.length-1
  while(start>0&&filled(edge[start]))start--
  const retained:(readonly[number,number])[]=[],travel:number[]=[]
  let length=0
  for(let i=start;i<edge.length;i++){
    const p=edge[i],previous=retained.at(-1)
    if(previous){
      const step=Math.hypot(p[0]-previous[0],p[1]-previous[1])
      if(step<.5)continue
      length+=step
      if(retained.some((q,j)=>length-travel[j]>8&&Math.hypot(p[0]-q[0],p[1]-q[1])<2.5))break
    }
    retained.push(p);travel.push(length)
  }
  wall.beginPath();retained.forEach(([x,y],i)=>i?wall.lineTo(x,y):wall.moveTo(x,y));wall.stroke()
  const walls=wall.getImageData(0,0,width,height).data
  const liquid=new Uint8ClampedArray(alpha)
  for(let i=0;i<width*height;i++)liquid[i*4+3]=alpha[i*4+3]>=128&&walls[i*4+3]<64?255:0
  // Do not let antialias dust become a second colony.
  const seen=new Uint8Array(width*height),components:number[][]=[]
  for(let start=0;start<seen.length;start++){
    if(seen[start]||!liquid[start*4+3])continue
    const cells=[start];seen[start]=1
    for(let head=0;head<cells.length;head++){
      const i=cells[head],x=i%width,y=Math.floor(i/width)
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const xx=x+dx,yy=y+dy,j=yy*width+xx
        if(xx<0||xx>=width||yy<0||yy>=height||seen[j]||!liquid[j*4+3])continue
        seen[j]=1;cells.push(j)
      }
    }
    components.push(cells)
  }
  components.sort((a,b)=>b.length-a.length)
  for(const pocket of components.slice(1)){
    if(pocket.length>9)throw new Error('The saved marker wall leaves a detached pocket.')
    for(const i of pocket)liquid[i*4+3]=0
  }
  const origin={x:seed%width,y:Math.floor(seed/width)}
  const growth=germinatePlate(liquid,width,height,origin)
  return {...platePaintArrival(alpha,width,height,growth.distances),seed,track:walls}
}

/** The teal container starts at the arrow's true left-pointing tip, centred
 * between its two fronds. The dark container starts independently at the
 * rightmost shared colour junction between those fronds. */
export function pairedMarkerSeeds(teal:Uint8ClampedArray,width:number,height:number,target:{x:number;y:number}) {
  let darkSeed=-1,junctionTeal=-1,best=Infinity
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x
    if(teal[i*4+3])continue
    for(const next of [i-1,i+1,i-width,i+width]){
      if(!teal[next*4+3])continue
      const d=(x-target.x)**2+(y-target.y)**2
      if(d<best){best=d;darkSeed=i;junctionTeal=next}
    }
  }
  if(darkSeed<0||junctionTeal<0)throw new Error('The two marker colours have no shared junction.')
  let tealSeed=-1,tipX=Infinity,tipY=Infinity
  const middle=(height-1)/2
  for(let i=0;i<width*height;i++)if(teal[i*4+3]){
    const x=i%width,y=Math.floor(i/width),vertical=Math.abs(y-middle)
    if(x<tipX||(x===tipX&&vertical<tipY)){tipX=x;tipY=vertical;tealSeed=i}
  }
  if(tealSeed<0)throw new Error('The teal marker container has no arrow tip.')
  return {darkSeed,tealSeed}
}

/** Preserve the full saved mould before cropping to the fixed marker frame.
 * Its two materials have separate masks, seeds and neighbour propagation. */
export function compileMarkerGrowth(face:ConnectorFacePlan) {
  if(face.status!=='ready')throw new Error('Approved object marker unavailable.')
  const width=120,height=120,scale=width/96
  const vertices=[...face.drawing.path.matchAll(/[ML](-?[\d.]+)[ ,]+(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]])
  if(!vertices.length||/[CQASTHV]/i.test(face.drawing.path))throw new Error('Marker container requires its approved polygon source.')
  const minX=Math.floor(Math.min(0,...vertices.map(p=>p[0]))*scale)-2
  const minY=Math.floor(Math.min(0,...vertices.map(p=>p[1]))*scale)-2
  const fullWidth=Math.ceil(Math.max(96,...vertices.map(p=>p[0]))*scale)+2-minX
  const fullHeight=Math.ceil(Math.max(96,...vertices.map(p=>p[1]))*scale)+2-minY
  const canvas=document.createElement('canvas');canvas.width=fullWidth;canvas.height=fullHeight
  const ctx=canvas.getContext('2d')!
  ctx.save();ctx.translate(-minX,-minY);ctx.scale(scale,scale)
  ctx.fillStyle=face.drawing.drawing.fill;ctx.fill(new Path2D(face.drawing.path));ctx.restore()
  const arrow=ctx.getImageData(0,0,fullWidth,fullHeight)
  const teal=new Uint8ClampedArray(arrow.data),dark=new Uint8ClampedArray(arrow.data.length)
  for(let i=0;i<fullWidth*fullHeight;i++){
    teal[i*4+3]=arrow.data[i*4+3]>=128?255:0
    dark[i*4+3]=teal[i*4+3]?0:255
  }
  const seeds=pairedMarkerSeeds(teal,fullWidth,fullHeight,{x:-minX+width-1,y:-minY+(height-1)/2})
  for(const [name,mask,seed] of [['teal',teal,seeds.tealSeed],['dark',dark,seeds.darkSeed]] as const){
    const seen=new Uint8Array(fullWidth*fullHeight),sizes:number[]=[]
    for(let start=0;start<seen.length;start++){
      if(seen[start]||!mask[start*4+3])continue
      const queue=[start];seen[start]=1
      for(let head=0;head<queue.length;head++){
        const i=queue[head],x=i%fullWidth,y=Math.floor(i/fullWidth)
        for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const nx=x+dx,ny=y+dy,j=ny*fullWidth+nx
          if(nx<0||nx>=fullWidth||ny<0||ny>=fullHeight||seen[j]||!mask[j*4+3])continue
          seen[j]=1;queue.push(j)
        }
      }
      if(queue.includes(seed))continue
      if(queue.length<=9)for(const i of queue)mask[i*4+3]=0
      else sizes.push(queue.length)
    }
    if(sizes.length)throw new Error(`${name} container has detached regions: ${sizes.join(', ')}`)
  }
  const tealGrowth=germinateAlongSavedTrack(teal,fullWidth,fullHeight,seeds.tealSeed,
    face.drawing.path,scale,minX,minY)
  const darkGrowth=germinatePlate(dark,fullWidth,fullHeight,{x:seeds.darkSeed%fullWidth,y:Math.floor(seeds.darkSeed/fullWidth)})
  ctx.globalCompositeOperation='destination-over'
  ctx.fillStyle=face.background;ctx.fillRect(0,0,fullWidth,fullHeight)
  const artwork=ctx.getImageData(-minX,-minY,width,height)
  const output=new ImageData(new Uint8ClampedArray(artwork.data),width,height)
  const trackInspection=new ImageData(new Uint8ClampedArray(artwork.data),width,height)
  const inspectionCanvas=document.createElement('canvas');inspectionCanvas.width=fullWidth;inspectionCanvas.height=fullHeight
  const inspectionContext=inspectionCanvas.getContext('2d')!
  const sourcePoints=[...face.drawing.path.split('Z')[0].matchAll(/[ML]\s*([+-]?[\d.]+)[ ,]+([+-]?[\d.]+)/g)]
    .map(match=>[Number(match[1])*scale-minX,Number(match[2])*scale-minY] as const)
  const sourceHalf=sourcePoints.length/2
  inspectionContext.strokeStyle='#be1870';inspectionContext.lineWidth=1.8
  for(const edge of [sourcePoints.slice(0,sourceHalf),sourcePoints.slice(sourceHalf)]){
    inspectionContext.beginPath();edge.forEach(([x,y],index)=>index?inspectionContext.lineTo(x,y):inspectionContext.moveTo(x,y));inspectionContext.stroke()
  }
  const inspectionLines=inspectionContext.getImageData(0,0,fullWidth,fullHeight).data
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,j=(y-minY)*fullWidth+x-minX
    if(!inspectionLines[j*4+3])continue
    trackInspection.data.set([190,24,112,255],i*4)
  }
  const coverage=(i:number,progress:number)=>{
    const growth=teal[i*4+3]?tealGrowth:darkGrowth
    return Math.max(0,Math.min(1,(Math.max(0,progress)*(growth.maximum+2)-growth.distances[i])/2))
  }
  return {width,height,seeds,trackInspection,
    frame(progress:number){
      if(progress>=1)return artwork
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=y*width+x,j=(y-minY)*fullWidth+x-minX
        output.data[i*4+3]=artwork.data[i*4+3]*coverage(j,progress)
      }
      return output
    },
    textMask(progress:number){
      if(progress>=1)return 'none'
      const stops=Array.from({length:width},(_,x)=>{
        const alpha=coverage((height-1-minY)*fullWidth+x-minX,progress)
        return `rgba(0,0,0,${alpha.toFixed(3)}) ${(x/(width-1)*100).toFixed(3)}%`
      })
      return `linear-gradient(to right,${stops.join(',')})`
    },
  }
}
