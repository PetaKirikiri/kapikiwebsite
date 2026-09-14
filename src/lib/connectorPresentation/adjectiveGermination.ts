import type { ConnectorFacePlan } from './presentation'
import { composeWholeAnchor } from './wholeAnchorGrowth'
import { germinatePlate } from './plateGermination'
import { platePaintArrival } from './platePaintArrival'

export type AdjectiveGrowthInput={left:ConnectorFacePlan;right:ConnectorFacePlan;color:string;bodyWidth:number}

/** The same fused approved plate as the anchors, seeded inside its incoming
 * connection instead of at bottom-centre. No replacement connector artwork. */
export function compileAdjectiveGrowth({left,right,color,bodyWidth}:AdjectiveGrowthInput) {
  const composed=composeWholeAnchor(left,right,color,true,bodyWidth)
  if(!('plate' in composed)||!composed.plate)throw new Error('Adjective plate unavailable.')
  const {width,height,plate}=composed,artwork=composed.frame(1)
  const mask=new Uint8ClampedArray(artwork.data)
  for(let i=0;i<width*height;i++)mask[i*4+3]=plate.fillable[i]?255:0
  // Measure depth from the open body into the incoming, left-hand curl.
  const body=germinatePlate(mask,width,height,{x:width/2,y:height/2})
  let seed=-1,deepest=-1
  for(let y=1;y<height-1;y++)for(let x=1;x<120-1;x++){
    const i=y*width+x
    if(!plate.fillable[i])continue
    const boundary=!plate.material[i-1]||!plate.material[i+1]||!plate.material[i-width]||!plate.material[i+width]
    if(boundary&&body.distances[i]>deepest){seed=i;deepest=body.distances[i]}
  }
  if(seed<0)throw new Error('Adjective connection tip unavailable.')
  const growth=germinatePlate(mask,width,height,{x:seed%width,y:Math.floor(seed/width)})
  const paint=platePaintArrival(artwork.data,width,height,growth.distances)
  const output=new ImageData(new Uint8ClampedArray(artwork.data),width,height)
  return {width,height,seed,plate,
    frame(progress:number){
      const reached=Math.max(0,Math.min(1,progress))*(paint.maximum+2)
      for(let i=0;i<width*height;i++)output.data[i*4+3]=artwork.data[i*4+3]*Math.max(0,Math.min(1,(reached-paint.distances[i])/2))
      return output
    },
    textRight(progress:number){
      if(progress>=1)return width/3
      const reached=Math.max(0,progress)*(paint.maximum+2)
      let right=0
      for(let x=0;x<width;x++)if(paint.distances[(height-1)*width+x]+2<=reached)right=x+1
      return right/3
    },
  }
}
