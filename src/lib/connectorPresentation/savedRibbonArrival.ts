import { connectedDistances, rememberTrack } from './wholeAnchorGrowth'
import { platePaintArrival } from './platePaintArrival'

/** Reuse the anchor's saved-edge traversal gates and connected solver.
 * Gates delay later turns, but every pixel still needs a reached neighbour. */
export function followSavedRibbon(alpha:Uint8ClampedArray,width:number,height:number,
 flow:{distances:Float64Array;maximum:number;seed:number},track:{path:string;scale:number;minX:number;minY:number;left:number;right:number}) {
 const gates=new Float64Array(width*height).fill(Infinity)
 rememberTrack(track.path,track.left,track.right-track.left,width,gates,flow.distances)
 for(let i=0;i<gates.length;i++)gates[i]=Number.isFinite(gates[i])?Math.max(gates[i],flow.distances[i]):flow.distances[i]
 const mask=new Uint8ClampedArray(alpha)
 // Traverse opaque material, then restore antialias coverage without
 // feeding those edge pixels back into the path solver.
 for(let i=0;i<width*height;i++)mask[i*4+3]=alpha[i*4+3]>=128?255:0
 const connected=connectedDistances(mask,width,height,undefined,gates,{x:flow.seed%width,y:Math.floor(flow.seed/width)})
 const paint=platePaintArrival(alpha,width,height,connected.distances)
 flow.distances=paint.distances;flow.maximum=paint.maximum
}
