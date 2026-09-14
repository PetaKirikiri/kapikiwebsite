/** A single isotropic wave inside the allowed plate. Fast marching solves
 * |grad T|=1 instead of adding eight-direction graph steps. Walls are excluded
 * from every stencil; a second-order upwind stencil reduces grid bias.
 */
export function germinatePlate(alpha: Uint8ClampedArray, width: number, height: number,
  origin = { x: (width - 1) / 2, y: height - 1 }) {
  const distances=new Float64Array(width*height).fill(Infinity)
  const accepted=new Uint8Array(width*height)
  const heap: {i:number;t:number}[]=[]
  const push=(i:number,t:number)=>{
    const item={i,t};let p=heap.length;heap.push(item)
    while(p>0){const parent=(p-1)>>1;if(heap[parent].t<=t)break;heap[p]=heap[parent];p=parent}
    heap[p]=item
  }
  const pop=()=>{
    const item=heap[0],last=heap.pop()!
    if(heap.length){let p=0;while(p*2+1<heap.length){let c=p*2+1
      if(c+1<heap.length&&heap[c+1].t<heap[c].t)c++
      if(heap[c].t>=last.t)break;heap[p]=heap[c];p=c
    }heap[p]=last}return item
  }
  const cell=(x:number,y:number)=>x<0||y<0||x>=width||y>=height ? -1 : y*width+x
  let seed=-1,best=Infinity,maximum=0
  for(let i=0;i<distances.length;i++)if(alpha[i*4+3]){
    const d=(i%width-origin.x)**2+(Math.floor(i/width)-origin.y)**2
    if(d<best){best=d;seed=i}
  }
  if(seed<0)throw new Error('The plate is empty.')
  distances[seed]=0;push(seed,0)
  const update=(i:number)=>{
    const x=i%width,y=Math.floor(i/width)
    const axes:{a:number;weight:number}[]=[]
    for(const [dx,dy] of [[1,0],[0,1]]){
      let near=-1,sign=1
      for(const s of [-1,1]){const j=cell(x+s*dx,y+s*dy)
        if(j>=0&&accepted[j]&&(near<0||distances[j]<distances[near])){near=j;sign=s}}
      if(near<0)continue
      const far=cell(x+2*sign*dx,y+2*sign*dy)
      if(far>=0&&accepted[far]&&distances[far]<=distances[near])
        axes.push({a:(4*distances[near]-distances[far])/3,weight:2.25})
      else axes.push({a:distances[near],weight:1})
    }
    axes.sort((a,b)=>a.a-b.a)
    if(!axes.length)return
    let t=axes[0].a+1/Math.sqrt(axes[0].weight)
    if(axes.length===2&&t>axes[1].a){
      const [a,b]=axes,A=a.weight+b.weight,B=a.weight*a.a+b.weight*b.a
      const C=a.weight*a.a*a.a+b.weight*b.a*b.a-1
      t=(B+Math.sqrt(Math.max(0,B*B-A*C)))/A
    }
    if(t<distances[i]){distances[i]=t;push(i,t)}
  }
  while(heap.length){const {i,t}=pop();if(accepted[i]||t!==distances[i])continue
    accepted[i]=1;maximum=Math.max(maximum,t)
    const x=i%width,y=Math.floor(i/width)
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const j=cell(x+dx,y+dy)
      if(j>=0&&!accepted[j]&&alpha[j*4+3])update(j)
    }
  }
  for(let i=0;i<distances.length;i++)if(alpha[i*4+3]&&!accepted[i])throw new Error('The plate has a detached pocket.')
  return {distances,maximum,seed}
}
