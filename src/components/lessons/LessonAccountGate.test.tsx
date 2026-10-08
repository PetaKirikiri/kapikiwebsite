import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import LessonAccountGate from './LessonAccountGate'
const state=vi.hoisted(()=>({user:null as null|{id:string;user_metadata:Record<string,boolean>}, name:'Maia',listener:undefined as undefined|((event:string,session:unknown)=>void)}))
vi.mock('../../lib/studentPortal/client',()=>({studentClient:{auth:{getUser:async()=>({data:{user:state.user},error:null}),onAuthStateChange:(fn:typeof state.listener)=>{state.listener=fn;return {data:{subscription:{unsubscribe:()=>{}}}}}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{name:state.name}})})})})},errorMessage:String}))
for (const scenario of ['signed out','missing name','known learner'] as const) it(`classroom gate: ${scenario}`,async()=>{
 vi.stubGlobal('React',React);Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 state.user=scenario==='signed out'?null:{id:'maia',user_metadata:{password_setup_complete:true}}
 state.name=scenario==='missing name'?'':'Maia'
 const host=document.createElement('div'),root=createRoot(host)
 try {
  await act(async()=>root.render(<LessonAccountGate><span id="classroom">Classroom</span></LessonAccountGate>))
  expect(Boolean(host.querySelector('#classroom'))).toBe(scenario==='known learner')
  if(scenario==='signed out')expect(host.querySelector('input[type=email]')).not.toBeNull()
  if(scenario==='missing name')expect(host.textContent).toContain('Add your name')
  if(scenario==='known learner') {
   await act(async()=>state.listener?.('INITIAL_SESSION',{user:{...state.user,user_metadata:{password_setup_complete:false}}}))
   expect(host.querySelector('#classroom')).not.toBeNull()
   await act(async()=>state.listener?.('SIGNED_OUT',null))
   expect(host.querySelector('#classroom')).toBeNull()
  }
 } finally {await act(async()=>root.unmount());vi.unstubAllGlobals()}
})
