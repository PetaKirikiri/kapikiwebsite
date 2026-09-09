import { useEffect, useRef, useState, type ReactNode } from 'react'
import './TranslationSplash.css'

export const SPLASH_EXAMPLES = [
  { text: 'I whai te manu whero i te manu kākāriki', action: 'chased', label: 'Past' },
  { text: 'Kei te whai te manu whero i te manu kākāriki', action: 'is chasing', label: 'Now' },
  { text: 'Me whai te manu whero i te manu kākāriki', action: 'should chase', label: 'Should' },
  { text: 'Kāore te manu whero i whai i te manu kākāriki', action: 'didn’t chase', label: 'Didn’t' },
] as const

export default function TranslationSplash({ renderSentence, ready }: { renderSentence: (text: string) => ReactNode; ready: boolean }) {
  const [step, setStep] = useState(0)
  const [example, setExample] = useState(0)
  const section = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .3 })
    if (section.current) observer.observe(section.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!playing || !visible || !ready) return
    const timer = window.setTimeout(() => {
      if (step < 3) setStep(value => value + 1)
      else setExample(value => (value + 1) % SPLASH_EXAMPLES.length)
    }, [2000, 1400, 1400, 3600][step])
    return () => window.clearTimeout(timer)
  }, [step, example, playing, ready, visible])
  return <section ref={section} id="website-top" className="translation-splash" aria-label="From English to Māori">
    <img className="splash-birds" src="/ka-piki-birds-v1.png" alt="A red bird and a green bird facing each other" />
    <div className="splash-stage" data-step={step}>
      <p className="splash-language">{step < 2 ? 'Start with what you know' : step === 2 ? 'Follow the pattern' : 'Same words. Different meaning.'}</p>
      <div className="splash-reel">
        <div className="splash-english" aria-hidden={step === 3}>
          <span className="splash-subject">The red bird</span>
          <span className="splash-verb">chased</span>
          <span className="splash-object">the green bird</span>
        </div>
        {step === 3 && <div className="splash-comparison">
          <p className="splash-meaning">The red bird <strong key={example}>{SPLASH_EXAMPLES[example].action}</strong> the green bird</p>
          <div className="splash-maori" key={SPLASH_EXAMPLES[example].text}>{renderSentence(SPLASH_EXAMPLES[example].text)}</div>
        </div>}
      </div>
      <div className="splash-controls">
        {SPLASH_EXAMPLES.map((item, index) => <button key={item.label} aria-pressed={step === 3 && example === index} disabled={!ready} onClick={() => { setStep(3); setExample(index); setPlaying(false) }} className="splash-choice">{item.label}</button>)}
        <button className="splash-play" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        <button className="splash-play" aria-label="Replay translation from English" onClick={() => { setStep(0); setExample(0); setPlaying(true) }}>Replay ↺</button>
      </div>
    </div>
    <a className="splash-explore" href="#level-finder">Explore the patterns <span aria-hidden="true">↓</span></a>
  </section>
}
