import { useEffect, useState, type ReactNode } from 'react'
import './TranslationSplash.css'

export default function TranslationSplash({ children, ready }: { children: ReactNode; ready: boolean }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!playing || !ready || step === 3) return
    const timer = window.setTimeout(() => setStep(value => value + 1), step === 0 ? 2400 : 1800)
    return () => window.clearTimeout(timer)
  }, [step, playing, ready])
  return <section id="website-top" className="translation-splash" aria-label="From English to Māori">
    <img className="splash-birds" src="/ka-piki-birds-v1.png" alt="A red bird and a green bird facing each other" />
    <div className="splash-stage" data-step={step}>
      <p className="splash-language">{step < 2 ? 'English' : step === 2 ? 'A different order' : 'Te reo Māori'}</p>
      <div className="splash-reel">
        <div className="splash-english" aria-hidden={step === 3}>
          <span className="splash-subject">The red bird</span>
          <span className="splash-verb">chas<span className="splash-tense">ed</span></span>
          <span className="splash-object">the green bird</span>
        </div>
        <div className="splash-maori" aria-hidden={step !== 3}>{children}</div>
      </div>
      <div className="splash-controls">
        {[0, 1, 2, 3].map(index => <button key={index} aria-label={['English sentence', 'Show colour groups', 'Show Māori word order', 'Show Māori sentence'][index]} aria-pressed={step === index} disabled={index === 3 && !ready} onClick={() => { setStep(index); setPlaying(false) }} className="splash-dot" />)}
        <button className="splash-play" onClick={() => { if (step === 3) setStep(0); setPlaying(step === 3 || !playing) }}>{step === 3 ? 'Replay ↺' : playing ? 'Pause' : 'Play'}</button>
      </div>
    </div>
    <a className="splash-explore" href="#level-finder">Explore the patterns <span aria-hidden="true">↓</span></a>
  </section>
}
