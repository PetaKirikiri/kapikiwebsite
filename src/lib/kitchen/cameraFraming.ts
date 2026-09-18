type Bounds = { left:number; right:number; top:number; bottom:number }
type Insets = { left:number; right:number; top:number; bottom:number }

/** Fit the whole set inside the unobstructed viewport, without stretching it. */
export function fitKitchenCamera(bounds:Bounds,width:number,height:number,insets:Insets):Bounds {
 const availableWidth=Math.max(1,width-insets.left-insets.right)
 const availableHeight=Math.max(1,height-insets.top-insets.bottom)
 const scale=Math.max((bounds.right-bounds.left)/availableWidth,(bounds.top-bounds.bottom)/availableHeight)
 const spareX=(availableWidth*scale-(bounds.right-bounds.left))/2
 const spareY=(availableHeight*scale-(bounds.top-bounds.bottom))/2
 const left=bounds.left-spareX-insets.left*scale
 const top=bounds.top+spareY+insets.top*scale
 return {left,right:left+width*scale,top,bottom:top-height*scale}
}
