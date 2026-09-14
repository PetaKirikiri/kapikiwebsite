import { smooth } from './translationJourneyTiming'

type Pixel = { x:number; y:number; alpha:number }

/** One ignition site, with heat travelling through adjacent raster cells.
 * Empty gaps conduct more slowly, so separate letters can catch without being
 * given independent launch timers. Coordinates are local to the source word. */
export function smokeIgnition(pixels:readonly Pixel[], toward:{x:number;y:number}) {
  if(!pixels.length)return []
  const left=Math.min(...pixels.map(p=>p.x))-2,top=Math.min(...pixels.map(p=>p.y))-2
  const width=Math.ceil((Math.max(...pixels.map(p=>p.x))-left)/2)+2
  const height=Math.ceil((Math.max(...pixels.map(p=>p.y))-top)/2)+2
  const indices=pixels.map(p=>Math.round((p.y-top)/2)*width+Math.round((p.x-left)/2))
  const ink=new Uint8Array(width*height),visited=new Uint8Array(width*height)
  const distance=new Float64Array(width*height);distance.fill(Infinity)
  for(const i of indices)ink[i]=1
  let seed=0
  for(let i=1;i<pixels.length;i++)if(Math.hypot(pixels[i].x-toward.x,pixels[i].y-toward.y)<Math.hypot(pixels[seed].x-toward.x,pixels[seed].y-toward.y))seed=i
  distance[indices[seed]]=0
  for(let count=0;count<distance.length;count++){
    let index=-1,best=Infinity
    for(let i=0;i<distance.length;i++)if(!visited[i]&&distance[i]<best){best=distance[i];index=i}
    if(index<0)break
    visited[index]=1
    const x=index%width,y=Math.floor(index/width)
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if((!dx&&!dy)||x+dx<0||x+dx>=width||y+dy<0||y+dy>=height)continue
      const next=(y+dy)*width+x+dx
      const cost=Math.hypot(dx,dy)*2*(ink[index]&&ink[next]?1:1.8)
      distance[next]=Math.min(distance[next],best+cost)
    }
  }
  const furthest=Math.max(...indices.map(i=>distance[i]))
  const speed=Math.min(15,900/Math.max(1,furthest))
  return indices.map(i=>distance[i]*speed)
}

/** Ink first swells into a resting, soft puff. Only matured vapour joins the
 * moving fluid. These fractions partition the same material; no faded copy. */
export function smokeBirth(age:number) {
  const evaporated=smooth(age/180),airborne=smooth((age-240)/300)
  return { ink:1-evaporated, puff:evaporated-airborne, airborne,
    radius: .65+4.2*smooth(age/420) }
}
