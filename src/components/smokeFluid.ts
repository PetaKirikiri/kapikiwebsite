import { smooth } from './translationJourneyTiming'
import { smokeBirth, smokeIgnition } from './smokeIgnition'

export type SmokeSourceCell = { x:number; y:number; alpha:number }
type Point = { x:number; y:number }
const STEP = 1000 / 60
const CELL = 2

/** A small, shared density/velocity grid in word-local coordinates. This is a
 * stylised buoyant-flow solver, not a collection of animated particle paths.
 * Source pixels evaporate into neighbouring cells; all density is transported
 * by the same evolving flow. A seed is a sink, never another smoke emitter. */
export class SmokeFluid {
  readonly left:number
  readonly top:number
  readonly width:number
  readonly height:number
  readonly cellSize=CELL
  density:Float32Array
  readonly newborn:Float32Array
  private next:Float32Array
  private vx:Float32Array
  private vy:Float32Array
  private ux:Float32Array
  private uy:Float32Array
  private curl:Float32Array
  private pressure:Float32Array
  private pressureNext:Float32Array
  private divergence:Float32Array
  private frame=0
  private sourceMass=0
  private sinkX:number
  private sinkY:number
  private centreX:number
  private centreY:number
  private source:readonly (SmokeSourceCell & {launch:number})[]
  absorbed=0
  arrivalTime=Infinity

  constructor(source:readonly SmokeSourceCell[], wordWidth:number, seed:Point) {
    const ignition=smokeIgnition(source,seed)
    this.source=source.map((p,i)=>({...p,launch:ignition[i]}))
    this.left=Math.floor(Math.min(-48,seed.x-48)/CELL)*CELL
    this.top=Math.floor(Math.min(-110,seed.y-64)/CELL)*CELL
    this.width=Math.ceil((Math.max(wordWidth+48,seed.x+48)-this.left)/CELL)
    this.height=Math.ceil((Math.max(40,seed.y+48)-this.top)/CELL)
    const n=this.width*this.height
    this.density=new Float32Array(n);this.next=new Float32Array(n)
    this.newborn=new Float32Array(n)
    this.vx=new Float32Array(n);this.vy=new Float32Array(n)
    this.ux=new Float32Array(n);this.uy=new Float32Array(n);this.curl=new Float32Array(n)
    this.pressure=new Float32Array(n);this.pressureNext=new Float32Array(n);this.divergence=new Float32Array(n)
    this.sinkX=(seed.x-this.left)/CELL;this.sinkY=(seed.y-this.top)/CELL
    this.centreX=(wordWidth/2-this.left)/CELL;this.centreY=(-10-this.top)/CELL
    this.sourceMass=source.reduce((sum,p)=>sum+p.alpha,0)
  }

  /** Fixed steps make a seek produce exactly the same field as playback. */
  seek(milliseconds:number) {
    const goal=Math.max(0,Math.min(300,Math.floor(milliseconds/STEP)))
    if(goal<this.frame){
      for(const field of [this.density,this.next,this.vx,this.vy,this.ux,this.uy,this.curl,this.pressure,this.pressureNext,this.divergence])field.fill(0)
      this.frame=0;this.absorbed=0;this.arrivalTime=Infinity
    }
    while(this.frame<goal){this.step();this.frame++}
    this.newborn.fill(0)
    for(const p of this.source){
      const birth=smokeBirth(goal*STEP-p.launch)
      if(birth.puff>0)this.deposit(this.newborn,p.x,p.y,p.alpha*birth.puff*5,birth.radius)
    }
    return this.density
  }

  inkRemaining(index:number,milliseconds:number){return smokeBirth(milliseconds-this.source[index].launch).ink}

  /** An expanding, mass-normalised soft footprint replaces the 2px stamp. */
  private deposit(field:Float32Array,x:number,y:number,mass:number,radius:number){
    const cx=(x-this.left)/CELL,cy=(y-this.top)/CELL,reach=Math.ceil(radius*2)
    const weights=new Float64Array(reach*2+1)
    let sum=0
    for(let offset=-reach;offset<=reach;offset++){
      const weight=Math.exp(-offset*offset/(2*radius*radius))
      weights[offset+reach]=weight;sum+=weight
    }
    const normalisedMass=mass/(sum*sum)
    for(let dy=-reach;dy<=reach;dy++)for(let dx=-reach;dx<=reach;dx++){
      const ix=Math.round(cx)+dx,iy=Math.round(cy)+dy
      if(ix<1||iy<1||ix>=this.width-1||iy>=this.height-1)continue
      field[iy*this.width+ix]+=normalisedMass*weights[dx+reach]*weights[dy+reach]
    }
  }

  private sample(field:Float32Array,x:number,y:number) {
    x=Math.max(0,Math.min(this.width-1.001,x));y=Math.max(0,Math.min(this.height-1.001,y))
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=iy*this.width+ix
    return (field[i]*(1-fx)+field[i+1]*fx)*(1-fy)
      +(field[i+this.width]*(1-fx)+field[i+this.width+1]*fx)*fy
  }

  private step() {
    const {width:w,height:h}=this,dt=1/60,time=this.frame*STEP
    // Newborn smoke expands at the word before it becomes light enough to
    // enter the moving field. Ink and puff use these same birth fractions.
    for(const p of this.source){
      const birth=smokeBirth(time+STEP-p.launch)
      const released=birth.airborne-smokeBirth(time-p.launch).airborne
      if(released<=0)continue
      this.deposit(this.density,p.x,p.y,p.alpha*released*5,birth.radius)
    }
    const suction=smooth((time-700)/1000)
    const bloom=1-smooth((time-950)/900)
    // Advect velocity itself: the next flow retains the previous flow's motion.
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,bx=x-this.vx[i]*dt,by=y-this.vy[i]*dt
      this.ux[i]=this.sample(this.vx,bx,by)*.965
      this.uy[i]=this.sample(this.vy,bx,by)*.965
      this.curl[i]=(this.vy[i+1]-this.vy[i-1]-this.vx[i+w]+this.vx[i-w])*.5
    }
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,d=this.density[i]
      let dx=this.sinkX-x,dy=this.sinkY-y
      const distance=Math.hypot(dx,dy),length=Math.max(1,distance)
      dx/=length;dy/=length
      // Buoyancy and a pair of entraining eddies roll the shoulders of the
      // rising plume. Their influence is continuous across the whole field.
      let fx=0,fy=-Math.min(1.8,d)*30*bloom
      for(const side of [-1,1]){
        const rx=x-(this.centreX+side*9),ry=y-(this.centreY-7-time*.006)
        const influence=Math.exp(-(rx*rx+ry*ry)/240)*side*9*bloom
        fx-=ry*influence;fy+=rx*influence
      }
      // Neighbouring curl gradients retain small rolled wisps after advection.
      const nx=Math.abs(this.curl[i+1])-Math.abs(this.curl[i-1])
      const ny=Math.abs(this.curl[i+w])-Math.abs(this.curl[i-w])
      const norm=Math.hypot(nx,ny)+.0001
      fx+=ny/norm*this.curl[i]*.9;fy-=nx/norm*this.curl[i]*.9
      const speed=Math.min(100,distance*4)*suction
      this.vx[i]=Math.max(-100,Math.min(100,this.ux[i]+fx*dt+(dx*speed-this.ux[i])*.075*suction))
      this.vy[i]=Math.max(-100,Math.min(100,this.uy[i]+fy*dt+(dy*speed-this.uy[i])*.075*suction))
    }
    // Pressure redistributes a rising column sideways instead of crushing it
    // into a dense needle. Keep suction as a small, deliberate compressible
    // exception after this shared incompressible-flow solve.
    this.pressure.fill(0);this.pressureNext.fill(0)
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x
      this.divergence[i]=(this.vx[i+1]-this.vx[i-1]+this.vy[i+w]-this.vy[i-w])*.5
    }
    for(let iteration=0;iteration<10;iteration++){
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x
        this.pressureNext[i]=(this.pressure[i-1]+this.pressure[i+1]+this.pressure[i-w]+this.pressure[i+w]-this.divergence[i])*.25
      }
      const old=this.pressure;this.pressure=this.pressureNext;this.pressureNext=old
    }
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,dx=this.sinkX-x,dy=this.sinkY-y,distance=Math.hypot(dx,dy)
      const pull=suction*Math.min(4,100/Math.max(1,distance))*.035
      this.vx[i]-=(this.pressure[i+1]-this.pressure[i-1])*.5
      this.vy[i]-=(this.pressure[i+w]-this.pressure[i-w])*.5
      this.vx[i]+=dx*pull;this.vy[i]+=dy*pull
    }
    // Density advection plus local diffusion: no particle can jump to a new
    // cloud location and no separate caps or arms are independently spawned.
    const decay=time>2400?.97:.997
    this.next.fill(0)
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x
      const nearby=(this.density[i-1]+this.density[i+1]+this.density[i-w]+this.density[i+w])*.25
      const density=(this.density[i]*.92+nearby*.08)*decay
      if(density<.000001)continue
      const bx=Math.max(1,Math.min(w-2.001,x+this.vx[i]*dt))
      const by=Math.max(1,Math.min(h-2.001,y+this.vy[i]*dt))
      const ix=Math.floor(bx),iy=Math.floor(by),fx=bx-ix,fy=by-iy,j=iy*w+ix
      // Forward, conservative transfer keeps suction from numerically deleting
      // the cloud before it reaches the sink.
      this.next[j]+=density*(1-fx)*(1-fy);this.next[j+1]+=density*fx*(1-fy)
      this.next[j+w]+=density*(1-fx)*fy;this.next[j+w+1]+=density*fx*fy
    }
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,density=this.next[i]
      const sink=smooth((4-Math.hypot(x-this.sinkX,y-this.sinkY))/3)*suction
      this.absorbed+=density*sink
      this.next[i]=Math.max(0,density*(1-sink))
    }
    const old=this.density;this.density=this.next;this.next=old
    if(this.receivedSmoke&&!Number.isFinite(this.arrivalTime))this.arrivalTime=time+STEP
  }

  get receivedSmoke(){return this.absorbed>this.sourceMass*.02}
}
