import { useEffect, useRef, useState } from 'react'
import './ClassroomHouse.css'

export default function ClassroomHouse() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<Awaited<ReturnType<typeof import('../lib/classroom/houseScene').createHouseScene>> | null>(null)
  const [action,setAction]=useState('')
  const [paused,setPaused]=useState(false)
  const [error,setError]=useState('')
  const [ready,setReady]=useState(false)
  useEffect(()=>{let cancelled=false;void import('../lib/classroom/houseScene').then(({createHouseScene})=>{if(cancelled||!canvas.current)return;scene.current=createHouseScene(canvas.current,setAction);setReady(true)}).catch(()=>setError('The 3D room could not start. Try a browser with WebGL enabled.'));return()=>{cancelled=true;scene.current?.destroy();scene.current=null}},[])
  return <main className="house-preview"><header><a href="#training-admin">← Content</a><strong>Ka Piki <span>· House study</span></strong><a href="#classroom">Original classroom</a></header>
    <div className="house-stage"><canvas ref={canvas} aria-label="3D house with four animated characters: typing, reading, washing dishes and brushing teeth" />{!ready&&!error&&<p className="house-loading">Opening house…</p>}{error&&<p role="alert" className="house-loading">{error}</p>}<div className="house-scene-badge">House 01 <span>Animation preview</span></div></div>
    <footer><div className="house-actions">{['Typing','Reading','Washing dishes','Brushing teeth'].map((label,i)=><button key={label} aria-pressed={action===label} onClick={()=>scene.current?.select(i)}>{label}</button>)}</div><div className="house-controls"><button aria-label="Rotate view left" onClick={()=>scene.current?.rotate(-1)}>↶</button><button onClick={()=>{scene.current?.pause(!paused);setPaused(!paused)}}>{paused?'Play':'Pause'}</button><button aria-label="Rotate view right" onClick={()=>scene.current?.rotate(1)}>↷</button></div></footer>
  </main>
}
