// Shared deterministic kitchen simulation. The server owns inventory and interactions.
// Stovetop reference: https://steamcommunity.com/sharedfiles/filedetails/?id=2456165919
// Chop, wash and burn-window values are our multiplayer tuning, not verified OC2 constants.
// Plate return measured in OC2 Switch Kevin 1: serve ~21:07.1, return ~21:17.1 (video uncertainty ~0.1s).
// https://www.youtube.com/watch?v=jTrenjjZDtA&t=1267s — observed timing, not an extracted engine constant.
export const KITCHEN_TIMING = Object.freeze({chop:3000,cook:12000,wash:5000,burn:12000,warning:4000,plateReturn:10000})
export const WIDTH = 12, HEIGHT = 8, STEP_MS = 130
export const STATIONS = [
 { id:'tomato', type:'source', label:'Tomatoes', x:1,y:0, ingredient:'tomato' },
 { id:'onion', type:'source', label:'Onions', x:2,y:0, ingredient:'onion' },
 { id:'chop-a', type:'chop', label:'Chop', x:4,y:0 },
 { id:'chop-b', type:'chop', label:'Chop', x:5,y:0 },
 { id:'pot-a', type:'pot', label:'Cook', x:7,y:0 },
 { id:'pot-b', type:'pot', label:'Cook', x:8,y:0 },
 { id:'serve', type:'serve', label:'Serve', x:11,y:2 },
 { id:'plate-return', type:'plate-return', label:'Dirty plates', x:11,y:3 },
 { id:'plates', type:'plates', label:'Plates', x:11,y:4 },
 { id:'sink', type:'sink', label:'Wash', x:8,y:7 },
 { id:'trash', type:'trash', label:'Bin', x:1,y:7 },
 ...[4,5,6,7].map(x=>({id:`counter-${x}`,type:'counter',label:'Counter',x,y:3})),
]
const key = (p) => `${p.x},${p.y}`
export const isFloor = (x,y) => Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<WIDTH&&y>=0&&y<HEIGHT&&!STATIONS.some(s=>s.x===x&&s.y===y)
export function findPath(start, end) {
 if(!isFloor(end.x,end.y)) return null
 const queue=[[start]], visited=new Set([key(start)])
 for(let i=0;i<queue.length;i++) {
  const path=queue[i], p=path[path.length-1]
  if(key(p)===key(end))return path
  for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
   const next={x:p.x+dx,y:p.y+dy}
   if(isFloor(next.x,next.y)&&!visited.has(key(next))){visited.add(key(next));queue.push([...path,next])}
  }
 }
 return null
}
export const recipes = [['tomato','tomato'],['onion','onion'],['onion','tomato']]
export function createKitchen(now=Date.now()) {
 return { revision:0, startedAt:now, served:0, players:{}, stations:Object.fromEntries(STATIONS.map(s=>[s.id,{ingredients:[],item:null,readyAt:0}])), orders:[0,1,2].map(id=>({id,ingredients:recipes[id]})) }
}
export function joinKitchen(state,seat) {
 state.players[seat]??={x:2+seat*2,y:5,path:[],startedAt:0,target:null,held:null,notice:''}
}
export function movementDuration(player) {
 return (player.path??[]).reduce((sum,p,i,path)=>i?sum+Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y)*STEP_MS:sum,0)
}
export function positionAt(player,now) {
 const path=player.path
 if(!path?.length)return {x:player.x,y:player.y}
 let distance=Math.max(0,(now-player.startedAt)/STEP_MS)
 for(let i=1;i<path.length;i++) {
  const a=path[i-1],b=path[i],length=Math.hypot(b.x-a.x,b.y-a.y)
  if(distance<length){const f=distance/length;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}}
  distance-=length
 }
 return path[path.length-1]
}
// Visual prediction and authoritative movement share routing, never inventory effects.
export function planMovement(player,body,now) {
 const current=positionAt(player,now),start={x:Math.round(current.x),y:Math.round(current.y)}
 let path=null,target=null
 if(body.station) {
  const station=STATIONS.find(s=>s.id===body.station)
  if(!station)throw new Error('Unknown station')
  if(body.destination) {
   if(Math.abs(body.destination.x-station.x)+Math.abs(body.destination.y-station.y)!==1)throw new Error('Choose a tile beside the station')
   path=findPath(start,body.destination)
  } else {
   const candidates=[[0,1],[0,-1],[1,0],[-1,0]].map(([dx,dy])=>findPath(start,{x:station.x+dx,y:station.y+dy})).filter(Boolean).sort((a,b)=>a.length-b.length)
   path=candidates[0]
  }
  target=station.id
 } else if(body.destination)path=findPath(start,body.destination)
 if(!path)throw new Error('Choose an open floor tile')
 if(current.x!==start.x||current.y!==start.y) {
  const next=path[1]
  // Continue forward along the current edge when repeating a direction.
  if(next&&Math.abs(Math.hypot(current.x-start.x,current.y-start.y)+Math.hypot(next.x-current.x,next.y-current.y)-1)<1e-6)path=path.slice(1)
  path=[current,...path]
 }
 return {...player,x:current.x,y:current.y,path,startedAt:now,target,notice:''}
}
export function returnedPlateCount(station,now=Date.now()) {
 return (station?.count??0)+(station?.returnAt??[]).filter(at=>at<=now).length
}
export function advanceKitchen(state,now=Date.now()) {
 for(const definition of STATIONS){
  const station=state.stations[definition.id]??={ingredients:[],item:null,readyAt:0}
  // Older rooms have unattended timers. Keep their progress, but require a chef to resume.
  if(['chop','sink'].includes(definition.type)&&station.item&&station.readyAt>now&&station.worker===undefined){station.remainingMs=station.readyAt-now;station.readyAt=0;station.worker=null}
 }
 const returns=state.stations['plate-return'],due=(returns.returnAt??[]).filter(at=>at<=now)
 if(due.length){returns.count=(returns.count??0)+due.length;returns.lastReturnAt=Math.max(...due);returns.returnAt=returns.returnAt.filter(at=>at>now)}
 for(const p of Object.values(state.players)) {
  if(p.path.length&&now>=p.startedAt+movementDuration(p)) {
   const destination=p.path[p.path.length-1];p.x=destination.x;p.y=destination.y;p.path=[]
   const target=p.target;p.target=null
   if(target)interact(state,p,target,now)
  }
 }
}
// A work timer belongs to one stationary chef; pots never acquire a worker.
function stopWork(state,p,now) {
 const seat=Number(Object.keys(state.players).find(seat=>state.players[seat]===p))
 for(const station of Object.values(state.stations))if(station.worker===seat){
  const remaining=Math.max(0,station.readyAt-Math.max(station.workStartedAt??0,now))
  station.remainingMs=remaining;station.worker=null
  if(remaining>0)station.readyAt=0
 }
}
function beginWork(state,p,station,duration,now) {
 const seat=Number(Object.keys(state.players).find(seat=>state.players[seat]===p))
 if(station.worker!=null&&station.worker!==seat){p.notice='Station in use';return}
 stopWork(state,p,now)
 p.walking=false
 station.worker=seat;station.workStartedAt=now;station.remainingMs=duration;station.readyAt=now+duration
}
function resumeWork(state,p,station,now) {
 if(station.remainingMs>0&&!station.readyAt){beginWork(state,p,station,station.remainingMs,now);return true}
 return false
}
function interact(state,p,id,now) {
 const before=p.held
 performInteraction(state,p,id,now)
 if(before!==p.held){
  p.interaction={id:(p.interaction?.id??0)+1,station:id,item:before??p.held,kind:before?'place':'pickup',at:now}
 }
}
function performInteraction(state,p,id,now) {
 const definition=STATIONS.find(s=>s.id===id),station=state.stations[id]
 if(!definition||!station)return
 p.notice=''
 const fail=(text)=>{p.notice=text}
 if(definition.type==='source') {if(p.held)return fail('Your hands are full');p.held=`raw:${definition.ingredient}`}
 if(definition.type==='plates') {if(p.held)return fail('Your hands are full');p.held='plate'}
 if(definition.type==='plate-return') {
  if(p.held)return fail('Your hands are full')
  if(!(station.count>0))return fail('No dirty plates')
  station.count--;p.held='dirty'
 }
 if(definition.type==='trash'){p.held=null}
 if(definition.type==='counter') {
  if(p.held&&station.item)return fail('This counter is full')
  ;[p.held,station.item]=[station.item,p.held]
 }
 if(definition.type==='chop') {
  if(station.item) {
   if(p.held)return fail('Put down what you are carrying')
   if(resumeWork(state,p,station,now))return
   if(now<station.readyAt)return fail('Still chopping')
   p.held=station.item;station.item=null;station.readyAt=0;station.remainingMs=0;station.worker=null
  } else if(p.held?.startsWith('raw:')) {station.item=p.held.replace('raw:','chopped:');p.held=null;beginWork(state,p,station,KITCHEN_TIMING.chop,now)}
  else fail('Bring a whole ingredient')
 }
 if(definition.type==='pot') {
  if(station.readyAt&&now>=station.readyAt+KITCHEN_TIMING.burn){station.ingredients=[];station.readyAt=0;return fail('Burnt soup cleared')}
  if(station.ingredients.length===2) {
   if(now<station.readyAt)return fail('Still cooking')
   if(p.held!=='plate')return fail('Bring a clean plate')
   p.held=`soup:${station.ingredients.slice().sort().join('+')}`;station.ingredients=[];station.readyAt=0
  } else if(p.held?.startsWith('chopped:')) {
   station.ingredients.push(p.held.split(':')[1]);p.held=null
   if(station.ingredients.length===2)station.readyAt=now+KITCHEN_TIMING.cook
  } else fail('Add two chopped ingredients')
 }
 if(definition.type==='serve') {
  if(!p.held?.startsWith('soup:'))return fail('Bring a plated soup')
  const index=state.orders.findIndex(order=>order.ingredients.slice().sort().join('+')===p.held.slice(5))
  if(index<0)return fail('No order for this soup')
  state.served++;state.orders.splice(index,1);const next=state.served+2
  state.orders.push({id:next,ingredients:recipes[next%3]});p.held=null;p.notice='Served!'
  const returns=state.stations['plate-return'];
  (returns.returnAt??=[]).push(now+KITCHEN_TIMING.plateReturn)
 }
 if(definition.type==='sink') {
  if(station.item) {
   if(p.held)return fail('Your hands are full')
   if(resumeWork(state,p,station,now))return
   if(now<station.readyAt)return fail('Still washing')
   p.held='plate';station.item=null;station.readyAt=0;station.remainingMs=0;station.worker=null
  }else if(p.held==='dirty'){station.item='plate';beginWork(state,p,station,KITCHEN_TIMING.wash,now);p.held=null}
  else fail('Bring a dirty plate')
 }
}
export function commandKitchen(state,seat,body,now=Date.now()) {
 advanceKitchen(state,now);joinKitchen(state,seat)
 const p=state.players[seat]
 if(body.op==='enter')return
 if(body.op==='input'){applyInputs(state,p,body,now);return}
 if(body.op!=='move')throw new Error('Unknown kitchen action')
 const planned=planMovement(p,body,now)
 if(movementDuration(planned)>0)stopWork(state,p,now)
 Object.assign(p,planned)
 if(typeof body.commandId==='string'&&/^[a-f0-9-]{36}$/.test(body.commandId))p.commandId=body.commandId
 advanceKitchen(state,now);state.revision++
}

export const WALK_SPEED = 4.8, PLAYER_RADIUS = .23
export function canStand(x,y) {
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<-.5+PLAYER_RADIUS||x>WIDTH-.5-PLAYER_RADIUS||y<.5+PLAYER_RADIUS||y>HEIGHT-.5-PLAYER_RADIUS)return false
 return !STATIONS.some(s=>{
  const dx=Math.max(Math.abs(x-s.x)-.49,0),dy=Math.max(Math.abs(y-s.y)-.49,0)
  return dx*dx+dy*dy<PLAYER_RADIUS*PLAYER_RADIUS
 })
}
export function moveFreely(player,input,dt) {
 const length=Math.hypot(input.x,input.y),direction=length?{x:input.x/length,y:input.y/length}:{x:0,y:0}
 const next={...player,path:[],target:null,walking:false}
 if(!length)return next
 next.facing=direction
 // Small sweeps prevent tunnelling; separate axes allow sliding along counters.
 const speed=WALK_SPEED*(input.dash===true?2.4:1)
 const steps=Math.max(1,Math.ceil(dt*speed/(WALK_SPEED*.02))),distance=speed*dt/steps
 for(let i=0;i<steps;i++) {
  const x=next.x+direction.x*distance,y=next.y+direction.y*distance
  if(canStand(x,next.y))next.x=x
  if(canStand(next.x,y))next.y=y
 }
 next.walking=Math.hypot(next.x-player.x,next.y-player.y)>.00001
 return next
}
export function nearbyStation(player) {
 const facing=player.facing??{x:0,y:-1},length=Math.hypot(facing.x,facing.y)
 if(!length)return null
 const direction={x:facing.x/length,y:facing.y/length}
 let selected=null,closest=.9
 // A ray from the chef hits the first counter face, never a diagonal neighbour through it.
 for(const station of STATIONS){
  let near=0,far=Infinity
  for(const axis of ['x','y']){
   const delta=direction[axis],origin=player[axis],lo=station[axis]-.5,hi=station[axis]+.5
   if(Math.abs(delta)<1e-8){if(origin<lo||origin>hi){near=Infinity;break}}
   else {const a=(lo-origin)/delta,b=(hi-origin)/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b))}
  }
  if(near<=far&&far>=0&&near<closest){closest=near;selected=station}
 }
 return selected
}
function applyInputs(state,player,body,now) {
 if(typeof body.commandId!=='string'||!/^[a-f0-9-]{36}$/.test(body.commandId))throw new Error('Invalid movement command')
 if(player.commandId===body.commandId)return
 if(!Array.isArray(body.steps)||!body.steps.length||body.steps.length>64)throw new Error('Invalid movement batch')
 let duration=0
 for(const step of body.steps) {
  if(step.activate===true||step.pauseWork===true){if(step.at!==undefined&&(!Number.isFinite(step.at)||step.at<0))throw new Error('Invalid action time');if(step.actionId!==undefined&&(typeof step.actionId!=='string'||!/^[a-f0-9-]{36}$/.test(step.actionId)))throw new Error('Invalid action');if(step.intent!==undefined&&(!step.intent||!STATIONS.some(s=>s.id===step.intent.station)||(step.intent.held!==null&&typeof step.intent.held!=='string')))throw new Error('Invalid interaction intent');continue}
  if(!Number.isFinite(step.dt)||step.dt<0||step.dt>.25||![-1,0,1].includes(step.x)||![-1,0,1].includes(step.y))throw new Error('Invalid movement input')
  if(step.dash!==undefined&&typeof step.dash!=='boolean')throw new Error('Invalid movement input')
  duration+=step.dt
 }
 if(duration>4)throw new Error('Movement batch is too long')
 const position=positionAt(player,now);Object.assign(player,position,{path:[],target:null})
 for(const step of body.steps) {
  if(step.pauseWork===true){stopWork(state,player,step.at===undefined?now:Math.min(now,Math.max(now-12000,step.at)));if(step.actionId)player.lastActionId=step.actionId}
  else if(step.activate===true){
   if(step.actionId&&step.actionId===player.lastActionId)continue
   const station=nearbyStation(player),previous=player.interaction?.id
   // A delayed press must never become a transfer at another counter, or the
   // opposite action after inventory changes (placing instead of picking up).
   if(step.intent&&(station?.id!==step.intent.station||player.held!==step.intent.held))player.notice='The counter changed. Try again.'
   else if(station)interact(state,player,station.id,step.at===undefined?now:Math.min(now,Math.max(now-12000,step.at)))
   else player.notice='Face a nearby counter'
   if(step.actionId){player.lastActionId=step.actionId;if(player.interaction?.id!==previous)player.interaction.actionId=step.actionId}
  }
  else {const next=moveFreely(player,step,step.dt);if(next.walking)stopWork(state,player,now);Object.assign(player,next)}
 }
 player.commandId=body.commandId
 state.revision++
}
