export default function KitchenFood({item,scale=1}:{item:string;scale?:number}) {
 const onion=item.includes('onion'),chopped=item.startsWith('chopped:'),plate=['plate','dirty'].includes(item)||item.startsWith('soup:')
 return <g transform={`scale(${scale})`} pointerEvents="none">{plate?<><ellipse rx="22" ry="15" fill="#fffdf5" stroke="#d8d9c9" strokeWidth="3"/><ellipse rx="16" ry="10" fill={item.startsWith('soup:')?onion?'#e8c76c':'#d55f42':'#f2f0e6'}/>{item==='dirty'&&<path d="M-10 2l7 3m3-8l8 5m-5 4l7-2" stroke="#b8864d" strokeWidth="3" strokeLinecap="round"/>}</>:chopped?<>{[[-9,-5,-18],[9,-1,16],[-3,8,-8]].map(([x,y,angle],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>
   <ellipse cy="2" rx="12" ry="9" fill={onion?'#946399':'#ba3e2c'}/>
   <ellipse rx="12" ry="8" fill={onion?'#f8eddf':'#ef6749'} stroke={onion?'#a779ac':'#d64a32'} strokeWidth="2"/>
   {onion?<><ellipse rx="8" ry="5" fill="none" stroke="#b78eb8" strokeWidth="1.4"/><ellipse rx="4" ry="2.5" fill="none" stroke="#d0adc9" strokeWidth="1.2"/></>:<>
    <path d="M-2-1Q-10-7-9 0Q-8 5-2 2M2-1Q10-7 9 0Q8 5 2 2M0-2Q-5-8 2-6Q5-5 0-2" fill="#be3e2c"/>
    <path d="m-6 0 1 1m10-1-1 1M0-5v1" stroke="#ffe5a3" strokeWidth="1.8" strokeLinecap="round"/>
   </>}
  </g>)}</>:onion?<><path d="M0-18C-3-8-18-10-18 3C-18 23 18 23 18 3C18-10 3-8 0-18Z" fill="#c29ac9" stroke="#9d648e" strokeWidth="2"/><path d="M0-12C-10 4-9 12 0 17M1-12C10 4 9 12 1 17" fill="none" stroke="#f5dceb" strokeWidth="2"/></>:<><circle cy="3" r="18" fill="#ef6b4e" stroke="#b84d39" strokeWidth="2"/><path d="M0-19l3 9 10-5-6 9 7 3-12 1-6 5 1-10-8-5 10 1Z" fill="#52824f"/><ellipse cx="-7" cy="0" rx="4" ry="6" fill="#f69874"/></>}</g>
}
