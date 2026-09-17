import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import KitchenChef from './KitchenChef'
import KitchenTouchControls from './KitchenTouchControls'
import { CHEF_COLORS } from '../lib/kitchen/presentation'
import Food from './KitchenFood'
import { KitchenMovement } from '../lib/kitchen/movementSync'
import { RemoteMovement } from '../lib/kitchen/remoteMovement'
import { KitchenInteractions } from '../lib/kitchen/interactionSync'
import { kitchenSound } from '../lib/kitchen/audio'
import { KITCHEN_TIMING, returnedPlateCount, moveFreely, nearbyStation, type KitchenPlayer, type Kitchen, type Station, type KitchenInteraction } from '../lib/kitchen/engine.mjs'
import './KitchenGame.css'
import './KitchenTouchControls.css'

type Member={seat:number;name:string;color:string;lastSeen:string}
type Session={room:string;joined:boolean;seat:number;serverNow:number;state:{kitchen?:Kitchen};members:Member[]}
type Reach=KitchenInteraction&{began:number;seat:number}
const KitchenWorld3D=lazy(()=>import('./KitchenWorld3D'))
const REACH_MS=580
const roomFromHash=()=>new URLSearchParams(window.location.hash.split('?')[1]??'').get('room')??''
const itemName=(item:string|null)=>!item?'Empty hands':item==='plate'?'Plate':item==='dirty'?'Dirty plate':item.startsWith('soup:')?'Soup':`${item.startsWith('chopped:')?'Chopped ':''}${item.split(':')[1]}`
async function request(body?:Record<string,unknown>,room?:string):Promise<Session>{
 const response=await fetch(body?'/__classroom':`/__classroom?room=${encodeURIComponent(room??'')}`,{method:body?'POST':'GET',credentials:'same-origin',signal:AbortSignal.timeout(12000),...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
 const data=await response.json();if(!response.ok)throw Error(data.error??'Unable to connect');return data
}
function stationAction(s:Station,k:Kitchen,player:KitchenPlayer,now:number){
 const held=player.held,state=k.stations[s.id]
 if(s.type==='source')return held?'Hands full':`Pick up ${s.ingredient}`
 if(s.type==='plate-return')return held?'Hands full':returnedPlateCount(state,now)>0?'Pick up dirty plate':state?.returnAt?.length?'Plates returning…':'No dirty plates'
 if(s.type==='plates')return held?'Hands full':'Pick up plate'
 if(s.type==='chop'||s.type==='sink'){
  if(state.item&&state.remainingMs&&!state.readyAt)return held?'Hands full':s.type==='chop'?'Resume chopping':'Resume washing'
  if(state.item)return held?'Hands full':now<state.readyAt?(s.type==='chop'?'Chopping…':'Washing…'):'Pick up'
  return s.type==='chop'?(held?.startsWith('raw:')?'Chop':'Bring an ingredient'):(held==='dirty'?'Wash plate':'Bring a dirty plate')
 }
 if(s.type==='pot')return state.readyAt&&now>=state.readyAt+KITCHEN_TIMING.burn?'Clear burnt soup':state.ingredients.length===2?now<state.readyAt?'Cooking…':held==='plate'?'Plate soup':'Bring a plate':held?.startsWith('chopped:')?'Add ingredient':'Bring chopped ingredients'
 if(s.type==='serve')return held?.startsWith('soup:')?'Serve':'Bring a bowl of soup'
 if(s.type==='trash')return held?'Discard':'Bin'
 return held?(state.item?'Counter full':'Put down'):state.item?'Pick up':'Empty counter'
}
function SoundIcon({muted}:{muted:boolean}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z" strokeLinejoin="round"/>{muted?<path d="m17 9 5 6m0-6-5 6"/>:<><path d="M17 8q4 4 0 8m3-11q6 7 0 14"/></>}</svg>}
export default function KitchenGame({classRoom}:{classRoom?:string}){
 const [id,setId]=useState(()=>classRoom??roomFromHash()),[session,setSession]=useState<Session|null>(null)
 const [name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false),[muted,setMuted]=useState(false)
 const [now,setNow]=useState(Date.now),[clock,setClock]=useState(0),[localMotion,setLocalMotion]=useState<KitchenPlayer|null>(null)
 const [displayPlayers,setDisplayPlayers]=useState<Record<number,KitchenPlayer>>({}),[reaches,setReaches]=useState<Record<number,Reach>>({}),[prediction,setPrediction]=useState<Kitchen|null>(null)
 const [toast,setToast]=useState<{text:string;until:number}|null>(null)
 const app=useRef<HTMLElement>(null)
 const serial=useRef<Promise<unknown>>(Promise.resolve()),offset=useRef(0),requestVersion=useRef(0)
 const dash=useRef({until:0,ready:0})
 const touch=useRef({x:0,y:0}),useAction=useRef(()=>{})
 const touchMove=useCallback((x:number,y:number)=>{touch.current={x,y}},[])
 const triggerDash=()=>{const now=performance.now();if(now>=dash.current.ready)dash.current={until:now+220,ready:now+650}}
 const keys=useRef(new Set<string>()),remoteMotion=useRef<Record<number,KitchenPlayer>>({}),seen=useRef<{round:number;ids:Record<number,number>}|null>(null)
 const [interactions]=useState(()=>new KitchenInteractions())
 const live=useRef<{session:Session|null;player:KitchenPlayer|null}>({session:null,player:null}),soundMuted=useRef(false)
 const [movement]=useState(()=>new KitchenMovement())
 const [remotePlayback]=useState(()=>new RemoteMovement())
 const rollback=useCallback(()=>{interactions.reset();setPrediction(null);setLocalMotion(null);setReaches({})},[interactions])
 const apply=useCallback((next:Session)=>{
  offset.current=next.serverNow?next.serverNow-Date.now():0
  const previous=live.current.session,k=next.state.kitchen
  if(k&&previous?.state.kitchen?.startedAt===k.startedAt&&previous.state.kitchen.revision>k.revision)return
  if(k){
   if(seen.current?.round!==k.startedAt){interactions.reset();setReaches({})}
   const rejection=interactions.reconcile(k,next.seat)
   setPrediction(interactions.saving?interactions.view:null)
   if(rejection){setToast({text:rejection,until:performance.now()+2200});setReaches(old=>{const copy={...old};delete copy[next.seat];return copy});kitchenSound('error',soundMuted.current)}
  }
  live.current.session=next;setSession(next)
  if((next.state.kitchen?.served??0)>(previous?.state.kitchen?.served??0))kitchenSound('serve',soundMuted.current)
  if(!k)return
  const ids=Object.fromEntries(Object.entries(k.players).map(([key,p])=>[key,p.interaction?.id??0]))
  if(seen.current?.round!==k.startedAt){seen.current={round:k.startedAt,ids};return}
  const added:Record<number,Reach>={}
  for(const [key,p] of Object.entries(k.players))if(p.interaction&&p.interaction.id>(seen.current.ids[Number(key)]??0)&&!(Number(key)===next.seat&&interactions.wasPredicted(p.interaction.actionId)))added[Number(key)]={...p.interaction,seat:Number(key),began:performance.now()}
  seen.current.ids=ids;if(Object.keys(added).length)setReaches(old=>({...old,...added}))
 },[interactions])
 const action=useCallback((body:Record<string,unknown>)=>{
  requestVersion.current++
  const work=serial.current.catch(()=>{}).then(async()=>{try{const next=await request({room:id,...body});apply(next);setError('');return next}catch(e){setError(e instanceof Error&&e.message!=='Failed to fetch'&&e.name!=='TimeoutError'?e.message:'Connection interrupted. Reconnecting…');return null}})
  serial.current=work;return work
 },[id,apply])
 useEffect(()=>{if(!id)return;let cancelled=false,timer=0
  const poll=async()=>{if(cancelled)return;const version=requestVersion.current
   try{const next=await request(undefined,id);if(!cancelled&&(version===requestVersion.current||(next.state.kitchen&&next.state.kitchen.revision>=(live.current.session?.state.kitchen?.revision??-1)))){apply(next);setError('')}}catch{if(!cancelled)setError('Connection interrupted. Reconnecting…')}
   if(!cancelled)timer=window.setTimeout(poll,50)
  };void poll();return()=>{cancelled=true;clearTimeout(timer)}
 },[id,apply])
 const joined=session?.joined,kitchen=session?.state.kitchen,seat=session?.seat??0
 useEffect(()=>{movement.configure(async command=>{const result=await action({action:'kitchen',op:'input',...command}),player=result?.state.kitchen?.players[result.seat];if(!player)throw Error('Action was not saved');return player},rollback)},[action,movement,rollback])
 useEffect(()=>{movement.reset();remotePlayback.reset();return()=>movement.reset()},[movement,remotePlayback,kitchen?.startedAt])
 useEffect(()=>{
  let frame=0,previous=performance.now()
  const tick=(time:number)=>{const dt=Math.min(.05,Math.max(0,(time-previous)/1000));previous=time;const serverTime=Date.now()+offset.current;setNow(serverTime);setClock(time)
   const player=kitchen?.players[seat]
   if(player){const direction={x:touch.current.x||Number(keys.current.has('d'))-Number(keys.current.has('a')),y:touch.current.y||Number(keys.current.has('s'))-Number(keys.current.has('w')),dash:time<dash.current.until};if((direction.x||direction.y)&&moveFreely(live.current.player??player,direction,dt).walking){const pauseId=interactions.pause(kitchen!,seat,live.current.player??player,serverTime);if(pauseId){setPrediction(interactions.view);movement.pauseWork(serverTime,pauseId)}}const p=movement.tick(player,direction,dt,serverTime);const predicted=interactions.saving?interactions.view?.players[seat]:null;const shown=predicted?{...p,held:predicted.held,notice:predicted.notice}:p;live.current.player=shown;setLocalMotion(shown)}
   const others:Record<number,KitchenPlayer>={};for(const [key,p] of Object.entries(kitchen?.players??{})){const i=Number(key);if(i===seat)continue;others[i]=remotePlayback.tick(i,p,dt)}
   remoteMotion.current=others;setDisplayPlayers(others);frame=requestAnimationFrame(tick)
  };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)
 },[kitchen,seat,movement,interactions,remotePlayback])
 useEffect(()=>{
  if(!joined)return
  const clear=()=>{keys.current.clear();touch.current={x:0,y:0};dash.current={until:0,ready:0}}
  const activate=()=>{
   const current=live.current.session,player=live.current.player,k=current?.state.kitchen;if(!current||!player||!k)return
   const station=nearbyStation(player);if(!station){setToast({text:'Face a nearby counter',until:performance.now()+1300});kitchenSound('error',soundMuted.current);return}
   const at=Date.now()+offset.current,began=performance.now(),{id:actionId,player:result,intent}=interactions.activate(k,current.seat,player,at)
   if(!actionId){if(result.notice){setToast({text:result.notice,until:began+1300});kitchenSound('error',soundMuted.current)}return}
   const work=interactions.view?.stations[station.id]
   if(work?.worker===current.seat&&work.readyAt>at)clear()
   setPrediction(interactions.view);setToast(null)
   live.current.player={...player,held:result.held,notice:result.notice};setLocalMotion(live.current.player)
   if(result.interaction?.actionId===actionId){setReaches(old=>({...old,[current.seat]:{...result.interaction!,seat:current.seat,began}}));kitchenSound(result.interaction.kind,soundMuted.current)}
   movement.activate(at,actionId,intent)
  }
  useAction.current=activate
  const down=(event:KeyboardEvent)=>{
   if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"],dialog'))return
   const key=event.key.toLowerCase();if(['w','a','s','d'].includes(key)){event.preventDefault();if(!event.repeat)keys.current.add(key)}
   if(key==='k'){event.preventDefault();if(!event.repeat)triggerDash();return}
   if(key==='j'&&!event.repeat){event.preventDefault();activate()}
  }
  const up=(event:KeyboardEvent)=>keys.current.delete(event.key.toLowerCase()),visibility=()=>{if(document.hidden)clear()}
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility)
  return()=>{clear();useAction.current=()=>{};window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility)}
 },[joined,movement,interactions])
 const entered=useRef('')
 useEffect(()=>{if(joined&&(!kitchen||!kitchen.players[seat])&&entered.current!==`${id}:${seat}`){entered.current=`${id}:${seat}`;void action({action:'kitchen',op:'enter'}).then(result=>{if(!result)entered.current=''})}},[joined,kitchen,seat,id,action])
 const start=async()=>{setBusy(true);try{const next=await request({action:id?'join':'create',room:id,name:name.trim()||'Chef'}),ready=await request({action:'kitchen',op:'enter',room:next.room});apply(ready);setId(next.room);setError('');if(!classRoom)window.history.replaceState(null,'',`#kitchen?room=${next.room}`)}catch(e){setError(e instanceof Error?e.message:'Unable to join')}finally{setBusy(false)}}
 const share=async()=>{try{await navigator.clipboard.writeText(`${location.origin}${location.pathname}#kitchen?room=${id}`);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{setError('Copy the room link from your address bar')}}
 const me=localMotion??kitchen?.players[seat],activeStation=me?nearbyStation(me):null,activeReaches=Object.values(reaches).filter(r=>clock-r.began<REACH_MS)
 const shownKitchen=prediction??kitchen
 const players=me?{...displayPlayers,[seat]:me}:displayPlayers
 const prompt=toast&&clock<toast.until?toast.text:activeStation&&shownKitchen&&me?stationAction(activeStation,shownKitchen,me,now):null
 return <main ref={app} className={`kitchen-app ${joined?'is-playing':'is-lobby'}${classRoom?' kitchen-embedded':''}`}>
  <header className="kitchen-hud">
   <div className="kitchen-brand"><a className="kitchen-icon-button" href="#live-class" aria-label="Back to class">‹</a><div><span>KA PIKI</span><strong>Kitchen</strong></div></div>
   {shownKitchen&&joined&&<section className="kitchen-orders" aria-label="Orders">{shownKitchen.orders.map(order=><article className="kitchen-ticket" key={order.id} aria-label={`Order ${order.id+1}: ${order.ingredients.join(' and ')} soup`}><span className="ticket-number">{String(order.id+1).padStart(2,'0')}</span><svg className="ticket-dish" viewBox="-29 -25 58 52"><Food item={`soup:${order.ingredients.join('+')}`}/></svg><span className="ticket-divider"/><div className="ticket-ingredients">{order.ingredients.map((ingredient,i)=><svg key={i} viewBox="-25 -25 50 50"><Food item={`raw:${ingredient}`}/></svg>)}</div></article>)}</section>}
   <div className="kitchen-hud-actions"><button className="kitchen-icon-button kitchen-fullscreen" aria-label="Full screen" title="Full screen" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void app.current?.requestFullscreen().catch(()=>setError('Full screen is unavailable in this browser panel'))}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>{joined&&<div className="kitchen-score" aria-label={`${shownKitchen?.served??0} orders served`}><span>★</span><strong>{shownKitchen?.served??0}</strong></div>}<button className="kitchen-icon-button" aria-label={muted?'Turn sound on':'Mute sound'} onClick={()=>{setMuted(!muted);soundMuted.current=!muted}}><SoundIcon muted={muted}/></button>{joined&&<button className="kitchen-invite" onClick={()=>void share()}>{copied?'Copied':'Invite'}<span>＋</span></button>}</div>
  </header>
  {error&&<div className="kitchen-error" role="alert">{error}</div>}
  {id&&!session?<div className="kitchen-loading">Opening kitchen…</div>:!joined?<section className="kitchen-lobby"><svg viewBox="-85 -125 170 165" aria-hidden="true"><ellipse cy="-30" rx="76" ry="76" fill="#faf0d8"/><KitchenChef player={{x:0,y:0,held:'raw:tomato',notice:'',path:[],target:null,startedAt:0,facing:{x:0,y:1}}} seat={0} now={clock}/></svg><h1>Let’s cook.</h1><form onSubmit={event=>{event.preventDefault();void start()}}><input aria-label="Your name" placeholder="Your name" maxLength={60} value={name} onChange={e=>setName(e.target.value)} required/><button disabled={busy}>{busy?'Joining…':id?'Join kitchen':'Start cooking'}</button></form></section>:!shownKitchen||!me?<div className="kitchen-loading">Opening kitchen…</div>:<>
   <div className="kitchen-stage">
    <Suspense fallback={<div className="kitchen-loading">Opening kitchen…</div>}><KitchenWorld3D frame={{kitchen:shownKitchen,players,seat,selected:activeStation?.id??null,now,clock,reaches:activeReaches}}/></Suspense>
   </div>
   <KitchenTouchControls onMove={touchMove} onUse={()=>useAction.current()} onDash={triggerDash}/>
   <footer className="kitchen-controls">
    <div className="kitchen-roster">{session?.members.map(m=><span key={m.seat} title={m.name} style={{'--chef-color':CHEF_COLORS[m.seat]} as React.CSSProperties}><i/>{m.name}</span>)}</div>
    <div className={`kitchen-context${toast&&clock<toast.until?' has-notice':''}`} role="status">{me.held&&<svg className="held-food" viewBox="-28 -28 56 56" aria-label={itemName(me.held)}><Food item={me.held}/></svg>}{prompt?<><kbd>J</kbd><span>{prompt}</span>{prediction&&<i className="kitchen-saving" aria-label="Saving action"/>}</>:<><span className="key-cluster"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Move</span><kbd>J</kbd><span>Use</span></>}</div>
    <div className="kitchen-options">{seat===0&&<button aria-label="Restart kitchen" title="Restart kitchen" onClick={()=>{if(window.confirm('Restart this kitchen for everyone?'))void action({action:'kitchen',op:'reset'})}}>↻</button>}</div>
   </footer>
  </>}
 </main>
}
