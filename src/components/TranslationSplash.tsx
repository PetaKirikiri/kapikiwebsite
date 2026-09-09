import { useEffect, useRef, useState, type ReactNode } from 'react'
import './TranslationSplash.css'

export const SPLASH_EXAMPLES = [
  { text: 'I whai te manu whero i te manu kākāriki', action: 'chased', label: 'Past' },
  { text: 'Kei te whai te manu whero i te manu kākāriki', action: 'is chasing', label: 'Now' },
  { text: 'Me whai te manu whero i te manu kākāriki', action: 'should chase', label: 'Should' },
  { text: 'Kāore te manu whero i whai i te manu kākāriki', action: 'didn’t chase', label: 'Didn’t' },
] as const

export default function TranslationSplash({ renderSentence, ready }: { renderSentence: (text: string) => ReactNode; ready: boolean }) {
  const step = 4
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
      setExample(value => (value + 1) % SPLASH_EXAMPLES.length)
    }, [2000, 1200, 1400, 2000, 3600][step])
    return () => window.clearTimeout(timer)
  }, [step, example, playing, ready, visible])
  return <section ref={section} id="website-top" className="translation-splash" aria-label="From English to Māori">
    <img className="splash-birds" src="/ka-piki-birds-v1.png" alt="A red bird and a green bird facing each other" />
    <div className="splash-stage" data-step={step}>
      <p className="splash-language">{step < 2 ? 'Start with what you know' : step === 2 ? 'Follow the pattern' : 'Same words. Different meaning.'}</p>
      <div className="splash-reel">
        <div className="splash-english" aria-hidden={step === 4}>
          <span className="splash-subject"><span className="splash-original" aria-hidden={step >= 3}>The red bird</span><span className="splash-translated" aria-hidden={step < 3}>te manu whero</span></span>
          <span className="splash-verb"><span className="splash-original" aria-hidden={step >= 3}>chased</span><span className="splash-translated" aria-hidden={step < 3}>I whai</span></span>
          <span className="splash-object"><span className="splash-original" aria-hidden={step >= 3}>the green bird</span><span className="splash-translated" aria-hidden={step < 3}>i te manu kākāriki</span></span>
        </div>
        {step === 4 && <div className="splash-comparison">
          <p className="splash-meaning"><span className="splash-det">The</span> <span className="splash-adj">red</span> <span className="splash-noun">bird</span> <strong key={example}>{SPLASH_EXAMPLES[example].action}</strong> <span className="splash-det">the</span> <span className="splash-adj">green</span> <span className="splash-noun">bird</span></p>
          <div className="splash-maori">{renderSentence(SPLASH_EXAMPLES[example].text)}</div>
        </div>}
      </div>
      <div className="splash-controls">
        {SPLASH_EXAMPLES.map((item, index) => <button key={item.label} aria-pressed={example === index} disabled={!ready} onClick={() => { setExample(index); setPlaying(false) }} className="splash-choice">{item.label}</button>)}
        <button className="splash-play" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        <button className="splash-play" aria-label="Replay translation from English" onClick={() => { setExample(0); setPlaying(true) }}>Replay ↺</button>
      </div>
    </div>
    <a className="splash-explore" href="#level-finder">Explore the patterns <span aria-hidden="true">↓</span></a>
  </section>
}
