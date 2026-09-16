import { useCallback, useEffect, useId, useRef, useState } from 'react'
import './GuessWhoGame.css'

type Person = { seat:number; name:string; eliminated:number[]; guess:number|null; correct:boolean|null; lastSeen:string }
type Game = { room:string; joined:boolean; seat:number; state:{round:number;chosen:boolean;revealed:boolean;target?:number|null};members:Person[];ended?:boolean }
const names=['Charlie','Hana','Hemi','Ana','Wiremu','Moana','Jack','Emma','Leo','Mia','Ben','Rose']
const crops=['28 5 309 333','352 5 405 333','776 5 288 333','1091 5 354 333','30 349 293 350','376 349 334 350','760 349 298 350','1134 348 313 351','40 707 280 361','340 707 410 363','778 707 284 361','1104 707 324 361']
const description=[
 'Short black curls, brown eyes and round black glasses',
 'Long red hair, green eyes and a yellow sunhat',
 'Bald head, blue eyes, blue glasses and a dark moustache',
 'Short black hair, brown eyes and a red beret',
 'White hair, blue eyes and a white beard',
 'Curly grey hair, green eyes and round red glasses',
 'Brown hair, green eyes and a blue cap',
 'Blonde ponytail, blue eyes and black glasses',
 'Brown eyes, black beard and a green beanie',
 'Brown hair, brown eyes, glasses and a yellow sunhat',
 'Red hair, green eyes and a red moustache',
 'White hair, blue eyes and a red beret',
]
function Portrait({index}:{index:number}){
 const clipId=useId()
 const [x,y,width,height]=crops[index].split(' ').map(Number)
 return <svg className="guess-portrait" role="img" aria-label={`${names[index]}: ${description[index]}`} viewBox={crops[index]}>
  <defs><clipPath id={clipId}><rect x={x} y={y} width={width} height={height}/></clipPath></defs>
  <image href="/guess-who-portraits-v1.png" width="1448" height="1086" clipPath={`url(#${clipId})`}/>
 </svg>
}
function StudentBoard({person,chosen,revealed}:{person:Person;chosen:boolean;revealed:boolean}){
 const online=Date.now()-Date.parse(person.lastSeen)<20000
 return <section className="guess-student" aria-label={`${person.name}'s board`}>
  <header className="guess-student-heading"><div><h2>{person.name}</h2><span className={`guess-presence${online?' is-online':''}`}>{online?'Connected':'Away'}</span></div><strong>{names.length-person.eliminated.length}<small> remaining</small></strong></header>
  <p className={`guess-student-status${person.guess!=null?(person.correct?' is-correct':' is-incorrect'):''}`} role="status">{person.guess!=null?`Guessed ${names[person.guess]} · ${person.correct?'Correct':'Incorrect'}`:revealed?'Round finished':chosen?'Playing':'Waiting for a person'}</p>
  <div className="guess-board guess-student-board">{names.map((name,index)=><article key={name} aria-label={`${name}${person.eliminated.includes(index)?', crossed out':''}${person.guess===index?', guessed':''}`} className={`guess-card${person.eliminated.includes(index)?' is-down':''}${person.guess===index?' is-guessed':''}`}>
   <div className="guess-observed-face"><Portrait index={index}/><span className="guess-name">{name}</span><span className="guess-cross" aria-hidden="true">×</span>{person.guess===index&&<span className={`guess-result${person.correct?' is-correct':''}`} aria-hidden="true">{person.correct?'✓':'×'}</span>}</div>
  </article>)}</div>
 </section>
}
async function api(body?:Record<string,unknown>,id=''):Promise<Game>{
 const response=await fetch(body?'/__classroom':`/__classroom?room=${encodeURIComponent(id)}`,{method:body?'POST':'GET',credentials:'same-origin',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error??'Could not connect.'),{status:response.status});return data
}
export default function GuessWhoGame(){
 const id=new URLSearchParams(window.location.hash.split('?')[1]??'').get('game')??''
 const [game,setGame]=useState<Game|null>(null),[name,setName]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false),[copied,setCopied]=useState(false),[ended,setEnded]=useState(false)
 const queue=useRef<Promise<unknown>>(Promise.resolve()),revision=useRef(0),gameRef=useRef(game)
 gameRef.current=game
 const act=useCallback((action:string,values:Record<string,unknown>={})=>{
  revision.current++
  const result=queue.current.catch(()=>{}).then(async()=>{
   setPending(true)
   try{
    const next=await api({action,room:id,round:gameRef.current?.state.round,...values})
    if(next.ended){setEnded(true);return}
    setGame(next);setError('')
    if(action==='create')window.location.hash=`#guess-who?game=${next.room}`
   }catch(e){setError(e instanceof Error?e.message:'Connection failed.')}
   finally{setPending(false)}
  });queue.current=result;return result
 },[id])
 useEffect(()=>{
  if(!id||ended)return
  let active=true,timer=0
  const poll=async()=>{
   await queue.current.catch(()=>{});if(!active)return
   const at=revision.current
   try{const next=await api(undefined,id);if(active&&revision.current===at){setGame(next);setError('')}}
   catch(e){if(active){setError(e instanceof Error?e.message:'Reconnecting…');if((e as {status?:number}).status===410)setEnded(true)}}
   if(active)timer=window.setTimeout(poll,1200)
  };void poll();return()=>{active=false;clearTimeout(timer)}
 },[id,ended])
 const joined=game?.joined&&!ended,host=joined&&game.seat===0,me=game?.members?.find(p=>p.seat===game.seat)
 const chosen=game?.state.chosen,revealed=game?.state.revealed
 const copy=async()=>{try{await navigator.clipboard.writeText(window.location.href);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{setError('Copy the game link from your address bar.')}}
 return <main className={`guess-game${host?' guess-teacher':''}`}>
  <header className="guess-top"><a href="#website-top">Ka Piki</a><h1>Guess who?</h1>{host&&<span className="guess-teacher-label">Teacher view</span>}<div>{joined&&<button onClick={()=>void copy()}>{copied?'Copied':'Invite players'}</button>}{host&&<button disabled={pending} onClick={()=>void act('new-round')}>New round</button>}</div></header>
  {error&&!ended&&<p className="guess-error" role="alert">{error}</p>}
  {!joined?<form className="guess-join" onSubmit={e=>{e.preventDefault();void act(id?'join':'create',{name})}}>
    {ended?<><strong>Game ended</strong><a href="#guess-who">Start a new game</a></>:<><input aria-label="Your name" autoComplete="given-name" placeholder="Your name" value={name} maxLength={60} required onChange={e=>setName(e.target.value)}/><button disabled={pending||!name.trim()}>{pending?'Joining…':id?'Join game':'Start game'}</button></>}
   </form>:<div className="guess-round"><div className="guess-players">{game.members.map(p=><span key={p.seat} className={p.seat===game.seat?'is-you':''}>{p.name}{p.guess!=null&&(host||p.seat===game.seat||revealed)?(p.correct?' ✓':' ×'):''}</span>)}</div><p role="status">{revealed&&game.state.target!=null?`${names[game.state.target]}!`:host?(chosen?'':'Choose your secret person.'):me?.guess!=null?(me.correct?'You got it!':'Not this time.'):chosen?'Ask a question. Cross out faces.':'Waiting for the host…'}</p>{host&&chosen&&<button className="guess-reveal" disabled={pending||revealed} onClick={()=>void act('reveal')}>Reveal</button>}</div>}
  {host&&chosen&&game.state.target!=null&&<div className="guess-secret-summary"><Portrait index={game.state.target}/><div><span>{revealed?'Answer':'Your secret'}</span><strong>{names[game.state.target]}</strong></div></div>}
  {(!host||!chosen)&&<section className="guess-board" aria-label="Guess Who character board">{names.map((person,index)=>{
   const eliminated=me?.eliminated.includes(index)??false,target=game?.state.target===index
   return <article className={`guess-card${eliminated?' is-down':''}${target?' is-secret':''}`} key={person}>
    <button className="guess-face-button" aria-label={host?`Choose ${person}`:`${eliminated?'Restore':'Cross out'} ${person}`} aria-pressed={host?target:eliminated} disabled={!joined||pending||Boolean(host?chosen:!chosen||revealed||me?.guess!=null)} onClick={()=>void act(host?'target':'eliminate',host?{index}:{indices:eliminated?me!.eliminated.filter(i=>i!==index):[...(me?.eliminated??[]),index]})}>
     <Portrait index={index}/><span className="guess-name">{person}{target&&<small>{revealed?'Answer':'Your secret'}</small>}</span><span className="guess-cross" aria-hidden="true">×</span>
    </button>
    {joined&&!host&&<button className="guess-submit" aria-label={`Guess ${person}`} disabled={pending||!chosen||revealed||me?.guess!=null||eliminated} onClick={()=>void act('guess',{index})}>{me?.guess===index?(me.correct?'Correct':'Not this one'):'Guess'}</button>}
   </article>
  })}</section>}
  {host&&<div className="guess-teacher-boards">{game.members.filter(p=>p.seat!==0).map(person=><StudentBoard key={person.seat} person={person} chosen={Boolean(chosen)} revealed={Boolean(revealed)}/>)}{game.members.length===1&&<div className="guess-student-empty">Waiting for players…</div>}</div>}
  {host&&<footer><button className="guess-end" disabled={pending} onClick={()=>void act('close')}>End game</button></footer>}
 </main>
}
