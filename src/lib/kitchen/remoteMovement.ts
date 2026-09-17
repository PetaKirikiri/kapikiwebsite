import type { KitchenPlayer } from './engine.mjs'
type Sample={id:number;x:number;y:number;dt:number}
/** Replay authoritative small collision-tested steps, never ease toward a distant position. */
export class RemoteMovement {
 private players=new Map<number,{shown:KitchenPlayer;queue:Sample[];id:number;elapsed:number;from:{x:number;y:number}}>()
 tick(seat:number,player:KitchenPlayer,dt:number):KitchenPlayer {
  let track=this.players.get(seat)
  if(!track){track={shown:{...player},queue:[],id:player.motionId??0,elapsed:0,from:player};this.players.set(seat,track)}
  const fresh=(player.motion??[]).filter(s=>s.id>track!.id)
  if(fresh.length){
   // Missing history: hold rather than draw an unverified shortcut through furniture.
   if(fresh[0].id!==track.id+1)return track.shown
   track.queue.push(...fresh);track.id=fresh.at(-1)!.id
  }
  let time=Math.min(dt,.05)
  while(track.queue.length&&time>0){const target=track.queue[0],used=Math.min(time,target.dt-track.elapsed);track.elapsed+=used;time-=used
   const fraction=Math.min(1,track.elapsed/target.dt)
   track.shown={...player,x:track.from.x+(target.x-track.from.x)*fraction,y:track.from.y+(target.y-track.from.y)*fraction,path:[],walking:true}
   if(fraction>=1){track.queue.shift();track.elapsed=0;track.from={x:target.x,y:target.y}}
  }
  if(!track.queue.length)track.shown={...player,x:track.shown.x,y:track.shown.y,path:[],walking:false}
  return track.shown
 }
 reset(){this.players.clear()}
}
