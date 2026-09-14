/** Track walls constrain propagation, but are not holes in the final artwork.
 * Give each wall/antialias pixel a local paint time without feeding it back
 * into the solver. No new germination origins or paths across walls. */
export function platePaintArrival(alpha:Uint8ClampedArray,width:number,height:number,flow:Float64Array) {
  const distances=flow.slice()
  let maximum=0
  for(let i=0;i<distances.length;i++){
    if(!alpha[i*4+3])continue
    if(!Number.isFinite(flow[i])){
      const x=i%width,y=Math.floor(i/width)
      let nearest=Infinity,arrival=-Infinity
      // Source-derived walls are subpixel-wide at display resolution. Reject
      // larger missing regions rather than hiding a disconnected chamber.
      for(let radius=1;radius<=8;radius++){
        for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue
          const nx=x+dx,ny=y+dy,j=ny*width+nx,d=dx*dx+dy*dy
          if(nx<0||nx>=width||ny<0||ny>=height||!alpha[j*4+3]||!Number.isFinite(flow[j])||d>nearest)continue
          if(d<nearest){nearest=d;arrival=flow[j]}
          else arrival=Math.max(arrival,flow[j])
        }
        if(nearest<=(radius+1)**2)break
      }
      if(!Number.isFinite(arrival))throw new Error('The track leaves an unpaintable material region.')
      distances[i]=arrival+Math.sqrt(nearest)
    }
    maximum=Math.max(maximum,distances[i])
  }
  return {distances,maximum}
}
