import type { ConnectorFacePlan } from './presentation'
import { germinatePlate } from './plateGermination'

/** Locate the deepest reachable part of the mating surface, using distance
 * through the receiver from its open body. Never use a screen coordinate or
 * seed an arbitrary extremity of the rectangular frame. */
export function connectionSeed(mask: Uint8ClampedArray, width: number, height: number,
  contact: Uint8Array) {
  const fromBody=germinatePlate(mask,width,height,{x:0,y:(height-1)/2})
  let seed=-1,best=-1
  contact.forEach((touches,i)=>{
    if(touches&&mask[i*4+3]&&fromBody.distances[i]>best){best=fromBody.distances[i];seed=i}
  })
  if(seed<0)throw new Error('The left piece has no reachable mating surface.')
  return seed
}

export type LeftWordGrowthInput = {
  anchorLeft: ConnectorFacePlan; anchorColor: string; color: string;
  bodyWidth: number; marker?: ConnectorFacePlan | null;
}

/** The receiver is the exact complement of the approved anchor face. The
 * animation consumes only the resulting single filled area and one seed. */
export function compileLeftWordGrowth(input: LeftWordGrowthInput) {
  const {anchorLeft,anchorColor,color,marker}=input
  if(anchorLeft.status!=='ready'||(marker&&marker.status!=='ready'))throw new Error('Approved left-word geometry is unavailable.')
  const scale=3, face=40*scale, body=Math.ceil(input.bodyWidth*scale), markerWidth=marker?face:0
  const join=markerWidth+body,width=join+face,height=face
  const faceCanvas=document.createElement('canvas');faceCanvas.width=face;faceCanvas.height=height
  const fc=faceCanvas.getContext('2d')!
  if(anchorLeft.background===anchorColor){fc.fillStyle=anchorColor;fc.fillRect(0,0,face,height)}
  fc.scale(face/96,face/96)
  fc.globalCompositeOperation=anchorLeft.drawing.drawing.fill===anchorColor?'source-over':'destination-out'
  fc.fillStyle=anchorColor;fc.fill(new Path2D(anchorLeft.drawing.path))
  const anchor=fc.getImageData(0,0,face,height)
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const ctx=canvas.getContext('2d')!
  ctx.fillStyle=color;ctx.fillRect(0,0,width,height)
  const source=ctx.getImageData(0,0,width,height)
  for(let y=0;y<height;y++)for(let x=0;x<face;x++)source.data[(y*width+join+x)*4+3]=255-anchor.data[(y*face+x)*4+3]
  ctx.putImageData(source,0,0)
  if(marker&&marker.status==='ready'){
    ctx.save();ctx.beginPath();ctx.rect(0,0,face,height);ctx.clip()
    ctx.scale(face/96,face/96);ctx.fillStyle=marker.drawing.drawing.fill
    ctx.fill(new Path2D(marker.drawing.path));ctx.restore()
  }
  const artwork=ctx.getImageData(0,0,width,height)
  const mask=new Uint8ClampedArray(artwork.data),contact=new Uint8Array(width*height)
  for(let i=0;i<width*height;i++)mask[i*4+3]=artwork.data[i*4+3]>=128?255:0
  // Raster edge slivers are not separate chambers or germination origins.
  const visited=new Uint8Array(width*height),queue:number[]=[]
  const islands:number[][]=[]
  for(let start=0;start<visited.length;start++){
    if(visited[start]||!mask[start*4+3])continue
    queue.length=0;queue.push(start);visited[start]=1
    for(let head=0;head<queue.length;head++){
      const cell=queue[head],x=cell%width,y=Math.floor(cell/width)
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,next=ny*width+nx
        if(nx<0||nx>=width||ny<0||ny>=height||visited[next]||!mask[next*4+3])continue
        visited[next]=1;queue.push(next)
      }
    }
    islands.push([...queue])
  }
  islands.sort((a,b)=>b.length-a.length)
  for(const island of islands.slice(1)){
    if(island.length>9)throw new Error(`The receiver has a detached area of ${island.length} pixels.`)
    for(const cell of island)mask[cell*4+3]=0
  }
  for(let y=1;y<height-1;y++)for(let x=1;x<face-1;x++){
    const i=y*width+join+x
    if(!mask[i*4+3])continue
    contact[i]=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>anchor.data[((y+dy)*face+x+dx)*4+3]>=128)?1:0
  }
  const seed=connectionSeed(mask,width,height,contact)
  const growth=germinatePlate(mask,width,height,{x:seed%width,y:Math.floor(seed/width)})
  const output=new ImageData(new Uint8ClampedArray(artwork.data),width,height)
  return {width,height,join,seed,artwork,
    frame(progress:number){
      if(progress>=1)return artwork
      const reached=Math.max(0,progress)*(growth.maximum+2)
      for(let i=0;i<width*height;i++)output.data[i*4+3]=artwork.data[i*4+3]*Math.max(0,Math.min(1,(reached-growth.distances[i])/2))
      return output
    },
    textLeft(progress:number){
      if(progress>=1)return 0
      const reached=Math.max(0,progress)*(growth.maximum+2)
      for(let x=0;x<join;x++)if(growth.distances[(height-1)*width+x]+2<=reached)return x/scale
      return width/scale
    },
  }
}
