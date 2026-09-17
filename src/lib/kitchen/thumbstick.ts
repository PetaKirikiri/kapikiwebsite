/** Radial deadzone: retain the angle and remap the remaining travel to 0…1. */
export function thumbstick(x:number,y:number,radius:number,deadzone=.14){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(radius)||radius<=0)return {x:0,y:0,knobX:0,knobY:0}
 const distance=Math.hypot(x,y),travel=Math.min(distance/radius,1)
 const strength=travel<=deadzone?0:(travel-deadzone)/(1-deadzone)
 const unitX=distance?x/distance:0,unitY=distance?y/distance:0
 return {x:unitX*strength,y:unitY*strength,knobX:unitX*travel*radius,knobY:unitY*travel*radius}
}
