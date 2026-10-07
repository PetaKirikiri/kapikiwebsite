import { useEffect, useRef } from 'react'
import { requestRails } from '../lib/connectorPresentation/engine'

// A floor-light material, not a grammatical connector or a new rākau shape.
export default function PuzzleFloorGlow({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const { width, height, plate, growth } = requestRails({ kind: 'floor-light' })
    const start = performance.now()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    const pixels = context.createImageData(width,height)
    const arrivals = new Float32Array(width*height)
    const baseAlpha = new Float32Array(width*height)
    const material: number[] = []
    for(let i=0;i<growth.distances.length;i++) {
      if(!plate[i*4+3]) continue
      material.push(i)
      const radius=Math.sqrt(((i%width-120)/95)**2+((Math.floor(i/width)-133)/28)**2)
      arrivals[i]=growth.distances[i]/growth.maximum
      baseAlpha[i]=30*(1-radius)+Math.exp(-(((radius-.83)/.055)**2))*70
      pixels.data.set([182,86,255,baseAlpha[i]],i*4)
    }
    const base=document.createElement('canvas');base.width=width;base.height=height
    const baseContext=base.getContext('2d')!
    baseContext.putImageData(pixels,0,0)
    const textures=['180,90,240','255,226,149','205,255,222'].map(color=>{
      const texture=document.createElement('canvas');texture.width=64;texture.height=64
      const ctx=texture.getContext('2d')!, gradient=ctx.createRadialGradient(32,32,0,32,32,32)
      gradient.addColorStop(0,`rgba(${color},1)`);gradient.addColorStop(1,`rgba(${color},0)`)
      ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return texture
    })
    const puff = (x:number,y:number,r:number,texture:number,alpha:number) => {
      context.globalAlpha=alpha;context.drawImage(textures[texture],x-r,y-r,r*2,r*2);context.globalAlpha=1
    }
    let previousProgress=-1
    const draw = (now:number) => {
      const time=reduced ? 1 : now/1000
      const progress = active ? reduced ? 1 : Math.min(1,(now-start)/1400) : 0
      if(active && progress!==previousProgress) {
        for(const i of material) pixels.data[i*4+3]=Math.min(255,baseAlpha[i]+Math.max(0,Math.min(1,(progress-arrivals[i])*20))*150)
        baseContext.putImageData(pixels,0,0)
        previousProgress=progress
      }
      context.clearRect(0,0,width,height)
      context.drawImage(base,0,0)
      // Dark mist gives luminous material contrast against the sunlit floor.
      context.globalCompositeOperation='destination-over'
      context.fillStyle='rgba(22,7,41,.86)'
      context.beginPath();context.ellipse(120,133,92,24,0,0,Math.PI*2);context.fill()
      context.globalCompositeOperation='screen'
      context.save()
      context.translate(120,133); context.scale(1,.32)
      // Soft light comes from cached textures; per-stroke blur stalls canvas rendering.
      context.shadowBlur=0
      for(let ring=0;ring<5;ring++) {
        const radius=[99,91,78,65,43][ring]
        context.strokeStyle=ring%2 ? '#d89aff' : '#a644ed'
        context.lineWidth=ring===0 ? 1.8 : 1
        context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.stroke()
      }
      // Geometric fantasy markings, not borrowed writing or cultural motifs.
      for(let band=0;band<2;band++) {
        context.save();context.rotate(time*(band ? -.12 : .08))
        const radius=band ? 57 : 84
        context.beginPath()
        for(let i=0;i<32;i++) {
          context.save();context.rotate(i*Math.PI/16);context.translate(radius,0)
          context.strokeStyle='#e3b4ff';context.lineWidth=.75
          context.moveTo(-2,-2);context.lineTo(2,0);context.lineTo(-2,2)
          if(i%3===0){context.moveTo(0,-3);context.lineTo(0,3)}
          context.restore()
        }
        context.stroke()
        context.restore()
      }
      context.rotate(-time*.15)
      for(let i=0;i<6;i++) {
        context.rotate(Math.PI/3);context.beginPath()
        context.ellipse(17,0,20,8,0,0,Math.PI*2)
        context.strokeStyle='#f0caff';context.lineWidth=1.2;context.stroke()
      }
      context.restore()
      for(let i=0;i<18;i++) {
        const phase=(time*.24+i*.137)%1
        const angle=i*2.399+time*.6
        const x=120+Math.cos(angle)*(68-30*phase)+Math.sin(phase*7+i)*12
        const y=132-phase*80+Math.sin(angle)*10
        puff(x,y,20+phase*17,0,Math.sin(phase*Math.PI)*.12*(active?1.7:1))
      }
      for(let i=0;i<32;i++) {
        const life=(time*(.22+(i%5)*.027)+i*.618)%1
        const x=120+Math.sin(i*7.13+life*4)*(75*(1-life*.55))
        const y=140-life*105
        const alpha=Math.sin(life*Math.PI)
        puff(x,y,4,1,alpha*.65)
        context.fillStyle=`rgba(255,248,211,${alpha})`
        context.fillRect(x,y,1.5,2.5)
      }
      if(active) puff(120,133,25+progress*65,2,.45*(1-progress*.6))
      context.globalCompositeOperation='source-over'
      if(!reduced) frame=requestAnimationFrame(draw)
    }
    draw(start)
    return () => cancelAnimationFrame(frame)
  },[active])
  return <canvas ref={canvas} width={240} height={180} className="puzzle-floor-glow" aria-hidden="true" />
}
