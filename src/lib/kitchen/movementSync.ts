import { moveFreely, positionAt, type InteractionIntent, type InputStep, type KitchenPlayer, type Point } from './engine.mjs'
export type InputCommand = {commandId:string;steps:InputStep[]}
/** Simulate held keys immediately; submit compact input batches, never client inventory. */
export class KitchenMovement {
 private local:KitchenPlayer|null=null
 private confirmed:KitchenPlayer|null=null
 private pending:InputStep[]=[]
 private running=false
 private lastSent=0
 private generation=0
 private send:(command:InputCommand)=>Promise<KitchenPlayer>
 private reject:()=>void
 constructor(send:(command:InputCommand)=>Promise<KitchenPlayer>=async()=>{throw Error('Not connected')},reject:()=>void=()=>{}){this.send=send;this.reject=reject}
 configure(send:(command:InputCommand)=>Promise<KitchenPlayer>,reject:()=>void){this.send=send;this.reject=reject}
 private append(step:InputStep){
  const last=this.pending.at(-1)
  if(!step.activate&&!step.pauseWork&&last&&!last.activate&&!last.pauseWork&&last.x===step.x&&last.y===step.y&&last.dash===step.dash&&last.dt+step.dt<=.25)last.dt+=step.dt
  else this.pending.push(step)
 }
 tick(authoritative:KitchenPlayer,direction:Point & {dash?:boolean},dt:number,now:number){
  if(!this.local){this.local={...authoritative,...positionAt(authoritative,now),path:[],target:null};this.confirmed={...this.local}}
  const wasWalking=this.local.walking
  this.local={...this.local,held:authoritative.held,notice:authoritative.notice}
  if(direction.x||direction.y){this.local=moveFreely(this.local,direction,dt);this.append({...direction,dt})}
  else if(wasWalking){this.local=moveFreely(this.local,direction,0);this.append({x:0,y:0,dt:0})}
  if(this.pending.length&&(now-this.lastSent>=100||!direction.x&&!direction.y))void this.flush(now)
  return this.local
 }
 activate(now:number,actionId?:string,intent?:InteractionIntent){this.append({activate:true,actionId,at:now,intent});void this.flush(now)}
 pauseWork(now:number,actionId:string){this.append({pauseWork:true,actionId,at:now});void this.flush(now)}
 cancelInteractions(){this.pending=this.pending.filter(step=>!step.activate&&!step.pauseWork)}
 reset(){this.generation++;this.local=null;this.confirmed=null;this.pending=[]}
 private async flush(now:number){
  if(this.running||!this.pending.length)return
  this.running=true;this.lastSent=now
  const generation=this.generation,steps:InputStep[]=[];let duration=0
  while(this.pending.length&&steps.length<64){
   const step=this.pending[0],dt=step.activate||step.pauseWork?0:step.dt
   if(duration+dt>1)break
   steps.push(this.pending.shift()!);duration+=dt
  }
  // This is the predicted end of the batch being submitted, not the position
  // after inputs that will arrive while the request is in flight.
  let expected=this.confirmed?{...this.confirmed}:null
  for(const step of steps)if(expected&&!step.activate&&!step.pauseWork)expected=moveFreely(expected,step,step.dt)
  try{
   const result=await this.send({commandId:crypto.randomUUID(),steps})
   if(generation===this.generation){
    this.confirmed={...result}
    // Reapply inputs collected while this request was in flight to its confirmed position.
    const correction=expected?Math.hypot(result.x-expected.x,result.y-expected.y):Infinity
    // A valid acknowledgement must not rewind the locally controlled chef.
    // Rebase only when authority actually disagrees with the submitted result.
    if(correction>.002){
     this.local={...result,path:[],target:null}
     for(const step of this.pending)if(!step.activate&&!step.pauseWork)this.local=moveFreely(this.local,step,step.dt)
    }
   }
  }catch{if(generation===this.generation){this.local=null;this.pending=[];this.reject()}}
  finally{this.running=false;if(this.pending.length)void this.flush(Date.now())}
 }
}
