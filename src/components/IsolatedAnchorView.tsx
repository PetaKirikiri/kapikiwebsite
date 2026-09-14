import { useEffect, useMemo, useRef, useState } from 'react'
import TenseJourney from './TenseJourney'
import { JOURNEY, smooth, unit } from './translationJourneyTiming'
import { anchorJourneyLayout } from './anchorJourneyLayout'
import WholeAnchorCanvas from './WholeAnchorCanvas'
import LeftWordGrowth from './LeftWordGrowth'
import AdjectiveGrowth from './AdjectiveGrowth'
import MarkerGrowth from './MarkerGrowth'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'
import { projectSentenceConnectors, planPatternPiece } from '../lib/connectorPresentation/presentation'
import { effectivePatternFor } from '../lib/connectorPresentation/patterns'
import { planWordLayout } from '../lib/connectorPresentation/layout'
import type { BusManifestSheet } from '../lib/busManifestContract'
import type { ReviewDeskPosCatalog } from '../lib/busManifestTeam/reviewDeskGateway'

export default function IsolatedAnchorView({ state, catalog, presentation = false, germinationOnly = false, example, displayWords, prefixStage, growAnchor = false }: { state: BusManifestSheet; catalog: ReviewDeskPosCatalog; presentation?: boolean; germinationOnly?: boolean; example?: 'noun' | 'verb' | 'who'; displayWords?: { left: string; anchor: string }; prefixStage?: 'hidden' | 'complete'; growAnchor?: boolean }) {
  const root=useRef<HTMLDivElement>(null)
  const [availableWidth,setAvailableWidth]=useState(900)
  useEffect(()=>{
    const element=root.current
    if(!element)return
    const observer=new ResizeObserver(([entry])=>setAvailableWidth(entry.contentRect.width))
    observer.observe(element)
    return ()=>observer.disconnect()
  },[])
  const [journeyTime,setJourneyTime]=useState(-1)
  const [tenseProgress,setTenseProgress]=useState(0)
  const [anchorProgress,setAnchorProgress]=useState<readonly number[]>([0,0,0])
  const [progress, setProgress] = useState(growAnchor ? 0 : 1)
  const [leftProgress, setLeftProgress] = useState(0)
  const [adjectiveProgress, setAdjectiveProgress] = useState(0)
  const [markerProgress, setMarkerProgress] = useState(0)
  const [stage, setStage] = useState(1)
  const animation = useRef(0)
  useEffect(() => () => cancelAnimationFrame(animation.current), [])
  const visibleProgress=journeyTime>=0?unit(journeyTime/JOURNEY.end):stage===1?progress:stage===2?leftProgress:stage===3?adjectiveProgress:markerProgress
  const applyTime=(elapsed:number)=>{
    setProgress(unit((elapsed-JOURNEY.anchorStart)/JOURNEY.anchorDuration))
    setLeftProgress(unit((elapsed-JOURNEY.leftStart)/JOURNEY.leftDuration))
    setAdjectiveProgress(unit((elapsed-JOURNEY.adjectiveStart)/JOURNEY.adjectiveDuration))
    setMarkerProgress(unit((elapsed-JOURNEY.markerStart)/JOURNEY.markerDuration))
    setStage(elapsed>=JOURNEY.markerStart?4:elapsed>=JOURNEY.adjectiveStart?3:elapsed>=JOURNEY.leftStart?2:1)
  }
  const seek = (value: number) => {
    cancelAnimationFrame(animation.current)
    if(journeyTime>=0){const elapsed=value*JOURNEY.end;setJourneyTime(elapsed);applyTime(elapsed);return}
    if(stage===1)setProgress(value);else if(stage===2)setLeftProgress(value);else if(stage===3)setAdjectiveProgress(value);else setMarkerProgress(value)
  }
  const replay = (fromStage = 1) => {
    cancelAnimationFrame(animation.current)
    if (germinationOnly) {
      setJourneyTime(-1)
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      const start = performance.now()
      const tick = (now: number) => {
        const elapsed = reduced ? 11000 : now - start
        setProgress(growAnchor ? unit((elapsed - 3000) / 2600) : example ? 1 : unit(elapsed / 2600))
        setLeftProgress(example === 'who' ? 1 : unit((elapsed - (example ? 500 : 3000)) / 2900))
        setAdjectiveProgress(example ? 0 : unit((elapsed - 6100) / 2000))
        setMarkerProgress(unit((elapsed - (example ? 500 : 8300)) / 2500))
        setStage(elapsed < 3000 ? 1 : elapsed < 6100 ? 2 : elapsed < 8300 ? 3 : 4)
        if (elapsed < (growAnchor ? 5600 : example ? 3400 : 10800)) animation.current = requestAnimationFrame(tick)
      }
      tick(start)
      return
    }
    setJourneyTime(fromStage===1?0:-1)
    setProgress(fromStage>1?1:0);setLeftProgress(fromStage>2?1:0);setAdjectiveProgress(fromStage>3?1:0);setMarkerProgress(0);setStage(fromStage)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setJourneyTime(-1);setProgress(1);setLeftProgress(1);setAdjectiveProgress(1);setMarkerProgress(1);setStage(4); return }
    const start = performance.now()
    const offset=fromStage===4?JOURNEY.markerStart:fromStage===3?JOURNEY.adjectiveStart:fromStage===2?JOURNEY.leftStart:0
    const tick = (now: number) => {
      const elapsed=now-start+offset
      if(fromStage===1)setJourneyTime(elapsed)
      applyTime(elapsed)
      if (elapsed < JOURNEY.end) animation.current = requestAnimationFrame(tick)
    }
    tick(start)
  }
  const { collection } = useDesignSpaceCollection({ production: true })
  const { rules } = useConnectorPatterns()
  const library = useMemo(() => compileConnectorLibrary(collection), [collection])
  const anchors = useMemo(() => {
    const families = new Map(catalog.posTypes.map(p => [p.posCode, p.groupCode]))
    const plans = projectSentenceConnectors(state.tokens, families, library, rules)
    const measure=document.createElement('canvas').getContext('2d')!
    measure.font=`28px ${getComputedStyle(document.body).fontFamily}`
    return state.tokens.flatMap((token,index) => {
      if (!['whai','manu'].includes(token.surfaceText.toLowerCase())) return []
      const pattern=effectivePatternFor(token.acceptedPosCode,families.get(token.acceptedPosCode??''),rules)
      const color=plans[index]?.materialColor
      if(!pattern||!color)return []
      const left=planPatternPiece(library,pattern.left,'left',color)
      const lead=state.tokens[index-1],leadPlan=plans[index-1]
      const hasPrefix=lead&&families.get(lead.acceptedPosCode??'')==='particle'&&leadPlan?.materialColor
      const bodyWidth=hasPrefix?Math.ceil(Math.max(20,planWordLayout(measure.measureText(displayWords?.left ?? lead.surfaceText).width).slotWidth)):0
      const prefix=hasPrefix?{input:{anchorLeft:left,anchorColor:color,color:leadPlan.materialColor!,bodyWidth},
        words:[{text:displayWords?.left ?? lead.surfaceText,left:0,width:bodyWidth}],width:bodyWidth}:null
      const next=state.tokens[index+1],nextPlan=plans[index+1]
      const adjective=next&&families.get(next.acceptedPosCode??'')==='adjective'&&nextPlan?.incomingJoin&&nextPlan.rightFace&&nextPlan.materialColor
        ?{text:next.surfaceText,input:{left:nextPlan.incomingJoin,right:nextPlan.rightFace,color:nextPlan.materialColor,
          bodyWidth:Math.max(50,Math.ceil(measure.measureText(next.surfaceText).width+8-40))}}:null
      const markerToken=state.tokens[index-2],markerPlan=plans[index-2]
      const marker=prefix&&markerToken?.acceptedPosCode==='object_marker'&&markerPlan?.standalone&&markerPlan.face
        ?{face:markerPlan.face,text:markerToken.surfaceText}:null
      if (example === 'verb' && token.surfaceText.toLowerCase() !== 'whai') return []
      if (example === 'noun' && (token.surfaceText.toLowerCase() !== 'manu' || marker)) return []
      if (example === 'who' && !marker) return []
      return [{index,token,color,left,prefix,adjective:example?null:adjective,marker:example && example !== 'who'?null:marker,
        right:planPatternPiece(library,pattern.right,'right',color)}]
    })
  },[state.tokens,catalog.posTypes,library,rules,example,displayWords?.left])
  const tenseColor=anchors[0]?.prefix?.input.color??'#398aa6'
  const replayRef = useRef(replay)
  useEffect(() => { replayRef.current = replay })
  const ready = anchors.length === (example ? 1 : 3) && anchors.every(anchor => anchor.left.status === 'ready' && anchor.right.status === 'ready')
  useEffect(() => {
    if (!germinationOnly || !ready || !root.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        replayRef.current()
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [germinationOnly, ready])
  const expansion=germinationOnly?1:journeyTime>=0?smooth((journeyTime-JOURNEY.dustStart)/1200):stage>1?1:0
  const {width:sentenceWidth,offsets:anchorOffsets}=anchorJourneyLayout(anchors.map(a=>({
    prefixWidth:a.prefix?.width??0,
    adjectiveWidth:a.adjective?40+a.adjective.input.bodyWidth:0,
    markerWidth:a.marker?40:0,
  })),expansion)
  const sentenceScale=Math.min(1,Math.max(0,availableWidth-16)/(example ? 260 : Math.max(1,sentenceWidth)))
  return <div ref={root} className={presentation ? 'site-journey' : undefined} style={{position:'relative'}}>
    {!example && <p style={{fontSize:'clamp(18px,3vw,28px)',textAlign:'center',margin: presentation ? '0 0 52px' : '0 0 80px',lineHeight:1.6,color:'#568f72'}}>
      The red <span data-english-anchor>bird</span>{' '}
      <span data-english-anchor style={{color:tenseColor}}>chased</span>{' '}
      the green <span data-english-anchor>bird</span>
    </p>}
    {!germinationOnly && <TenseJourney root={root} time={journeyTime} color={tenseColor} onTenseProgress={setTenseProgress} onAnchorProgress={setAnchorProgress} />}
    <div style={{position:'relative',height:94*sentenceScale}}>
    <div data-journey-row style={{ position:'absolute',left:'50%',top:0,transform:`translateX(-50%) scale(${sentenceScale})`,transformOrigin:'top center',display: 'flex', alignItems:'flex-start', width:sentenceWidth, gap: 28, flexWrap: 'nowrap', '--connector-cap-background': '#fff' } as React.CSSProperties}>
    {anchors.map(({token,index,color,left,right,prefix,adjective,marker},slot) => {
      return <div key={index} data-journey-verb={token.surfaceText.toLowerCase()==='whai'?'':undefined} style={{ transform:`translateX(${anchorOffsets[slot]}px)`,flexShrink:0,marginLeft:marker?40:0,textAlign: 'center',position:'relative',width:130+(prefix?.width??0)+(adjective?40+adjective.input.bodyWidth:0) }}>
        <div data-anchor-artwork data-growth-anchor={token.surfaceText.toLowerCase()} style={{ display: 'flex', height: 40,marginLeft:prefix?.width??0 }}>
          <WholeAnchorCanvas left={left} right={right} color={color} progress={journeyTime>=0?(anchorProgress[slot]??0):progress} />
        </div>
        <div data-journey-anchor style={{ opacity:journeyTime>=0?unit((anchorProgress[slot]??0)*8):1, marginTop: 10, fontSize: 28, color: token.surfaceText.toLowerCase()==='whai'?tenseColor:'#568f72',marginLeft:prefix?.width??0,width:130 }}>{displayWords?.anchor ?? token.surfaceText}</div>
        {prefix&&<LeftWordGrowth input={prefix.input} words={prefix.words} progress={prefixStage === 'hidden' ? 0 : prefixStage === 'complete' ? 1 : journeyTime>=0&&token.surfaceText.toLowerCase()==='whai'?tenseProgress:leftProgress} />}
        {adjective&&<AdjectiveGrowth input={adjective.input} text={adjective.text} progress={adjectiveProgress} left={(prefix?.width??0)+90} />}
        {marker&&<MarkerGrowth face={marker.face} text={marker.text} progress={markerProgress} />}
      </div>
    })}
  </div></div><div hidden={!!example} className={presentation ? 'site-journey-controls' : undefined} style={{ textAlign:'center',marginTop:24 }}>
    {presentation ? <button className="site-replay" type="button" onClick={()=>replay()} disabled={!anchors.length}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10a9 9 0 1 1 1.8 8M3 4v6h6" /></svg>
      {germinationOnly ? 'Replay' : journeyTime < 0 ? 'Play translation' : 'Replay translation'}
    </button> : <>
    <button type="button" onClick={()=>replay()} disabled={!anchors.length} style={{border:'1px solid #c7d7ce',borderRadius:24,padding:'10px 22px',background:'#fff',color:'#244b39',cursor:'pointer'}}>Play translation ↺</button>
    <button type="button" onClick={()=>replay(2)} disabled={!anchors.length} style={{border:'1px solid #c7d7ce',borderRadius:24,padding:'10px 22px',marginLeft:8,background:'#fff',color:'#244b39',cursor:'pointer'}}>Stage 2 ↺</button>
    <button type="button" onClick={()=>replay(3)} disabled={!anchors.length} style={{border:'1px solid #c7d7ce',borderRadius:24,padding:'10px 22px',marginLeft:8,background:'#fff',color:'#244b39',cursor:'pointer'}}>Stage 3 ↺</button>
    <button type="button" onClick={()=>replay(4)} disabled={!anchors.length} style={{border:'1px solid #c7d7ce',borderRadius:24,padding:'10px 22px',marginLeft:8,background:'#fff',color:'#244b39',cursor:'pointer'}}>Stage 4 ↺</button>
    <label style={{display:'flex',justifyContent:'center',alignItems:'center',gap:12,marginTop:12,fontSize:13}}>
      {journeyTime>=0?'Translation':`Stage ${stage}`} <input aria-label="Germination progress" type="range" min="0" max="100" value={Math.round(visibleProgress*100)} onChange={event=>seek(Number(event.target.value)/100)} />
      <output style={{minWidth:36}}>{Math.round(visibleProgress*100)}%</output>
    </label>
    </>}
  </div></div>
}
