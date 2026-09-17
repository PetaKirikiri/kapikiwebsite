import { commandKitchen, nearbyStation, type InteractionIntent, type Kitchen, type KitchenPlayer } from './engine.mjs'
type PendingAction={intent?:InteractionIntent;pauseWork?:boolean;id:string;at:number;pose:Pick<KitchenPlayer,'x'|'y'|'facing'>;held:string|null}
/** Replay unconfirmed actions over each authoritative snapshot, in input order. */
export class KitchenInteractions {
 private actions:PendingAction[]=[]
 private predictedIds=new Set<string>()
 view:Kitchen|null=null
 get saving(){return this.actions.length>0}
 reset(){this.actions=[];this.predictedIds.clear();this.view=null}
 wasPredicted(id?:string){return !!id&&this.predictedIds.has(id)}
 private replay(kitchen:Kitchen,seat:number,action:PendingAction){
  Object.assign(kitchen.players[seat],action.pose,{walking:false})
  commandKitchen(kitchen,seat,{op:'input',commandId:action.id,steps:[action.pauseWork?{pauseWork:true,actionId:action.id,at:action.at}:{activate:true,actionId:action.id,at:action.at,intent:action.intent}]},action.at)
 }
 reconcile(authoritative:Kitchen,seat:number){
  const player=authoritative.players[seat]
  const index=this.actions.findIndex(a=>a.id===player?.lastActionId)
  const ack=index>=0?this.actions[index]:null
  if(index>=0)this.actions.splice(0,index+1)
  this.view=structuredClone(authoritative)
  if(player)for(const action of this.actions)this.replay(this.view,seat,action)
  return ack&&player.held!==ack.held?player.notice||'The counter changed. Try again.':null
 }
 pause(authoritative:Kitchen,seat:number,player:KitchenPlayer,at:number){
  const preview=structuredClone(this.view??authoritative)
  if(!Object.values(preview.stations).some(s=>s.worker===seat&&s.readyAt>at))return null
  const action:PendingAction={pauseWork:true,id:crypto.randomUUID(),at,pose:{x:player.x,y:player.y,facing:player.facing},held:player.held}
  this.replay(preview,seat,action);this.actions.push(action);this.view=preview
  return action.id
 }
 activate(authoritative:Kitchen,seat:number,player:KitchenPlayer,at:number){
  const preview=structuredClone(this.view??authoritative)
  const target=nearbyStation(player)
  const intent=target?{station:target.id,held:preview.players[seat].held}:undefined
  const action:PendingAction={intent,id:crypto.randomUUID(),at,pose:{x:player.x,y:player.y,facing:player.facing},held:null}
  this.replay(preview,seat,action)
  const result=preview.players[seat]
  // Invalid presses stay local; they must not queue a delayed accidental action.
  const before=(this.view??authoritative).stations
  const changed=target&&JSON.stringify(before[target.id])!==JSON.stringify(preview.stations[target.id])
  if(result.notice&&!changed&&result.interaction?.actionId!==action.id)return {id:null,player:result,intent}
  action.held=result.held;this.actions.push(action);this.view=preview;this.predictedIds.add(action.id)
  if(this.predictedIds.size>512)this.predictedIds.delete(this.predictedIds.values().next().value!)
  return {id:action.id,player:result,intent}
 }
}
