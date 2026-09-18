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
  // Another tab can submit a newer action for this seat; receipts still prove
  // which of this tab's pending actions have already been handled.
  let index=-1
  this.actions.forEach((a,i)=>{if(a.id===player?.lastActionId||player?.actionResults?.some(result=>result.id===a.id))index=i})
  const ack=index>=0?this.actions[index]:null
  // A response may acknowledge several actions. Check each result, not just
  // the final pair of empty hands, which can conceal an earlier failed pickup.
  const failed=this.actions.map(action=>({action,result:player?.actionResults?.find(result=>result.id===action.id)})).find(({action,result})=>result&&(result.accepted===false||result.held!==action.held))
  const legacyMismatch=ack&&ack.id===player.lastActionId&&!player.actionResults?.some(result=>result.id===ack.id)&&player.held!==ack.held
  const rejection=failed?.result?.notice||(failed||legacyMismatch?player.notice||'The counter changed. Try again.':null)
  if(index>=0)this.actions.splice(0,index+1)
  this.view=structuredClone(authoritative)
  if(rejection){this.actions=[];return rejection}
  if(player)for(const action of this.actions)this.replay(this.view,seat,action)
  return null
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
  const intent:InteractionIntent|undefined=target?{station:target.id,held:preview.players[seat].held}:undefined
  const action:PendingAction={intent,id:crypto.randomUUID(),at,pose:{x:player.x,y:player.y,facing:player.facing},held:null}
  this.replay(preview,seat,action)
  const result=preview.players[seat]
  // Invalid presses stay local; they must not queue a delayed accidental action.
  const before=(this.view??authoritative).stations
  const changed=target&&JSON.stringify(before[target.id])!==JSON.stringify(preview.stations[target.id])
  if(result.notice&&!changed&&result.interaction?.actionId!==action.id)return {id:null,player:result,intent}
  if(intent){intent.result=result.held;intent.after=this.actions.slice().reverse().find(action=>!!action.intent)?.id}
  action.held=result.held;this.actions.push(action);this.view=preview;this.predictedIds.add(action.id)
  if(this.predictedIds.size>512)this.predictedIds.delete(this.predictedIds.values().next().value!)
  return {id:action.id,player:result,intent}
 }
}
