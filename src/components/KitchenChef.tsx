import KitchenFood from './KitchenFood'
import type { KitchenPlayer } from '../lib/kitchen/engine.mjs'
import { CHEF_COLORS } from '../lib/kitchen/presentation'
function carryPoint(player:KitchenPlayer){
 const f=player.facing??{x:0,y:-1}
 if(f.y<-.45&&Math.abs(f.y)>=Math.abs(f.x))return {x:0,y:-44}
 if(Math.abs(f.x)>.45&&Math.abs(f.x)>Math.abs(f.y))return {x:Math.sign(f.x)*24,y:-24}
 return {x:0,y:-14}
}
type Props={player:KitchenPlayer;seat:number;mine?:boolean;now:number;reach?:{x:number;y:number;extension:number};hideItem?:boolean}
export default function KitchenChef({player,seat,mine,now,reach,hideItem}:Props){
 const color=CHEF_COLORS[seat%4],f=player.facing??{x:0,y:-1}
 const back=f.y<-.45&&Math.abs(f.y)>=Math.abs(f.x),side=Math.abs(f.x)>.45&&Math.abs(f.x)>Math.abs(f.y),flip=side&&f.x<0?-1:1
 const phase=now/95,step=player.walking?Math.sin(phase):0,bob=player.walking?-Math.abs(Math.cos(phase))*1.7:Math.sin(now/530+seat)*.55
 const carry=carryPoint(player),hands=reach??(player.held?{...carry,extension:1}:null)
 const blink=(now+seat*739)%4300>4140
 const food=player.held&&!hideItem?<g transform={`translate(${carry.x} ${carry.y})`}><KitchenFood item={player.held} scale={.66}/></g>:null
 return <g className="kitchen-chef" data-facing={back?'back':side?(flip<0?'left':'right'):'front'}>
  <defs><radialGradient id={`chef-cream-${seat}`} cx=".3" cy=".2" r=".9"><stop stopColor="#fffdf1"/><stop offset=".65" stopColor="#f5e4c6"/><stop offset="1" stopColor="#ceb998"/></radialGradient><linearGradient id={`chef-coat-${seat}`} x2="0" y2="1"><stop stopColor="#fffdf2"/><stop offset="1" stopColor="#d9d8c9"/></linearGradient></defs>
  <ellipse cy="6" rx="24" ry="8" fill="#435c65" opacity=".12"/><ellipse cy="5" rx="16" ry="4.5" fill="#354b57" opacity=".16"/>
  <g transform={`translate(0 ${bob})`}>
   {back&&food}
   <g transform={`translate(${-11+(side?step*3:0)} ${step*2}) rotate(${-step*9} -1 1)`}><ellipse cy="1" rx="9" ry="6" fill="#304756"/><path d="M-7 2q7 4 14 0" fill="none" stroke="#819093" strokeWidth="2"/></g>
   <g transform={`translate(${11-(side?step*3:0)} ${-step*2}) rotate(${step*9} 1 1)`}><ellipse cy="1" rx="9" ry="6" fill="#304756"/><path d="M-7 2q7 4 14 0" fill="none" stroke="#819093" strokeWidth="2"/></g>
   {!hands&&[-1,1].map(d=><g key={d} transform={`translate(${d*24} ${-20+d*step*4}) rotate(${d*step*12})`}><ellipse ry="13" rx="7" fill={`url(#chef-coat-${seat})`} stroke="#b8b7a5" strokeWidth="1"/><circle cy="9" r="6" fill={`url(#chef-cream-${seat})`}/></g>)}
   <path d="M-17-32Q0-39 17-32L23-6Q23 3 12 4h-24Q-23 3-23-6Z" fill={`url(#chef-coat-${seat})`} stroke="#acb5ae" strokeWidth="1.2"/>
   {back?<><path d="M-17-26q17 12 34 0M-19-10h38" fill="none" stroke={color} strokeWidth="4"/><path d="m-3-12-7 10 10-3 8 5-3-13" fill={color}/></>:<><path d="M-13-28h26l5 29q-18 7-36 0Z" fill={color}/><path d="M-9-9h18v6q-9 7-18 0Z" fill="#fff4dc" opacity=".5"/><path d="M-9-25q9 5 18 0" fill="none" stroke="#fff" strokeWidth="2" opacity=".4"/></>}
   <g transform={`scale(${flip} 1)`}>
    <ellipse cy="-40" rx={side?20:23} ry="23" fill={`url(#chef-cream-${seat})`} stroke="#c9bea5" strokeWidth="1.1"/>
    {!back&&<g className="chef-face">
     {side?<><ellipse cx="19" cy="-36" rx="5" ry="5.5" fill="#eed6b2"/><ellipse cx="5" cy="-30" rx="5" ry="3" fill="#eaa896" opacity=".45"/></>:<><ellipse cx="-15" cy="-31" rx="5" ry="3" fill="#eaa896" opacity=".45"/><ellipse cx="15" cy="-31" rx="5" ry="3" fill="#eaa896" opacity=".45"/></>}
     {(side?[9]:[-8,8]).map(x=><g key={x} transform={`translate(${x} -41) scale(1 ${blink?.12:1})`}><ellipse rx="3.7" ry="5.6" fill="#2a3b4b"/><circle cx="-1" cy="-2" r="1.5" fill="#fff"/></g>)}
     <path d={side?'M6-50q4-3 8-1':'M-13-50q4-2 8 0M5-50q4-2 8 0'} fill="none" stroke="#968775" strokeWidth="1.8" strokeLinecap="round"/>
     <path d={side?'M8-29q4 3 7-1':'M-5-28q5 5 10 0'} fill="none" stroke="#8b5d50" strokeWidth="2" strokeLinecap="round"/>
    </g>}
    {back&&<path d="M-15-43q15 8 30 0" fill="none" stroke="#deceb1" strokeWidth="2"/>}
    <path d="M-21-59v-8C-35-71-28-91-15-87c3-15 27-15 30 0 13-4 20 16 6 20v8Z" fill={`url(#chef-coat-${seat})`} stroke="#c3cbbb" strokeWidth="1.4"/>
    <path d="M-13-84q-5 6-3 12M1-89v16m12-10q5 5 3 11" fill="none" stroke="#e3e5d8" strokeWidth="2" strokeLinecap="round"/>
    <rect x="-21" y="-65" width="42" height="9" rx="3" fill={color}/><path d="M-17-63h34" stroke="#fff" strokeWidth="1.7" opacity=".35"/>
   </g>
   {hands&&[-1,1].map(d=>{const x=hands.x+d*11,y=hands.y;return <g key={d}><path d={`M${d*20} -24Q${d*27} ${y-9} ${x} ${y}`} stroke={`url(#chef-coat-${seat})`} strokeWidth="10" fill="none" strokeLinecap="round"/><circle cx={x} cy={y} r="6" fill={`url(#chef-cream-${seat})`} stroke="#b6b7a3" strokeWidth="1"/></g>})}
   {!back&&food}
  </g>
  {mine&&<g transform="translate(0 -108)"><path d="M-6-3H6L0 4Z" fill={color} stroke="#fff8e4" strokeWidth="1.5" strokeLinejoin="round"/></g>}
 </g>
}
