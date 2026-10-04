import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LEVEL_READING_MATERIAL } from '../src/lib/levelReadingMaterial'
import './story-review.css'

const levels = [2, 3, 4, 5, 6] as const
type StoryLevel = typeof levels[number]

function levelFromHash(): StoryLevel {
  const level = Number(window.location.hash.replace('#level-', ''))
  return levels.includes(level as StoryLevel) ? level as StoryLevel : 2
}

export function StoryReview() {
  const [level, setLevel] = useState(levelFromHash)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const story = LEVEL_READING_MATERIAL[level]

  useEffect(() => {
    const sync = () => setLevel(levelFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    document.title = `${story.title} · Story review · KA PIKI`
  }, [story.title])

  function select(next: StoryLevel) {
    setLevel(next)
    window.location.hash = `level-${next}`
    window.scrollTo({ top: 0 })
  }

  return <main className="story-review">
    <header className="story-review-header">
      <strong>KA PIKI</strong>
      <h1>Story review</h1>
    </header>
    <div className="story-tabs" role="tablist" aria-label="Stories by level">
      {levels.map((item, index) => <button
        key={item}
        ref={element => { tabs.current[index] = element }}
        type="button"
        role="tab"
        id={`story-tab-${item}`}
        aria-controls={`story-panel-${item}`}
        aria-selected={level === item}
        tabIndex={level === item ? 0 : -1}
        onClick={() => select(item)}
        onKeyDown={event => {
          let next = index
          if (event.key === 'ArrowRight') next = (index + 1) % levels.length
          else if (event.key === 'ArrowLeft') next = (index + levels.length - 1) % levels.length
          else if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = levels.length - 1
          else return
          event.preventDefault()
          select(levels[next])
          tabs.current[next]?.focus()
        }}
      >
        <span>Level {item}</span>
        <strong lang="mi">{LEVEL_READING_MATERIAL[item].title}</strong>
      </button>)}
    </div>
    <article className="story-panel" role="tabpanel" id={`story-panel-${level}`} aria-labelledby={`story-tab-${level}`} tabIndex={0}>
      {story.sections.map((section, sectionIndex) => <section key={sectionIndex}>
        <header className="story-title">
          <h2 lang="mi">{section.title}</h2>
          <p>{section.meaning}</p>
        </header>
        <div className="story-column-labels" aria-hidden="true"><span>Māori</span><span>English</span></div>
        <div className="story-paragraphs">
          {section.paragraphStarts.map((start, index, starts) => {
            const lines = section.lines.slice(start, starts[index + 1] ?? section.lines.length)
            return <div className="story-paragraph" key={start}>
              <p lang="mi">{lines.map(line => line[0]).join(' ')}</p>
              <p lang="en">{lines.map(line => line[1]).join(' ')}</p>
            </div>
          })}
        </div>
      </section>)}
    </article>
  </main>
}

const host = document.getElementById('root')
if (host) {
  const root = createRoot(host)
  root.render(<StoryReview />)
  import.meta.hot?.dispose(() => root.unmount())
}
