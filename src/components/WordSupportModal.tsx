import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { loadWordSupport, type WordSupportData, type WordSupportTarget } from '../lib/connectorPresentation/wordSupport'
import WordSupportSentence from './WordSupportSentence'
import './WordSupportModal.css'

const teAkaLink = (url: string | null) => url != null && /^https:\/\/(www\.)?maoridictionary\.co\.nz\//.test(url)
const teAkaAudio = (url: string) => /^https:\/\/storage\.googleapis\.com\/maori-dictionary-prod2-web-assets\//.test(url)

function Pronunciation({ url, word }: { url: string; word: string }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  return <div className="word-support-pronunciation">
    <button type="button" aria-label={`${playing ? 'Pause' : 'Play'} pronunciation of ${word}`} onClick={() => {
      if (!audio.current) return
      setFailed(false)
      if (playing) audio.current.pause()
      else void audio.current.play().catch(() => setFailed(true))
    }}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span> Pronunciation</button>
    <span>Te Aka</span>
    <audio ref={audio} src={url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setFailed(true) }} />
    {failed && <small role="alert">Recording unavailable. Try again.</small>}
  </div>
}

export default function WordSupportModal({ target, onClose, onNavigate }: { target: WordSupportTarget; onClose: () => void; onNavigate: (target: WordSupportTarget) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [data, setData] = useState<WordSupportData | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [senseFilter, setSenseFilter] = useState<string | null>(null)
  useEffect(() => {
    const trigger = document.activeElement
    dialog.current?.showModal()
    return () => { if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void loadWordSupport(target, controller.signal).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [target, retry])
  const context = data?.examples.find(example => example.mi === target.sentence)
  const examples = data?.examples.filter(example => example.mi !== target.sentence) ?? []
  const displayedExamples: WordSupportData['examples'] = examples.length ? examples : data?.entry?.examples ?? []
  const audio = data?.pronunciations.find(item => teAkaAudio(item.url))
  const labels = [...new Map(data?.teAka.senses.map(sense => [sense.labelCode, sense.label]) ?? []).entries()]
  const senses = data?.teAka.senses.filter(sense => senseFilter == null || sense.labelCode === senseFilter) ?? []
  const otherTypes = [...new Map(data?.types.filter(type => type.code !== target.posCode).map(type => [type.code, type]) ?? []).values()]
  return createPortal(<dialog ref={dialog} className="word-support" aria-labelledby="word-support-title" style={{ '--support-color': target.color ?? '#295f5c' } as CSSProperties}
    onCancel={onClose} onClose={onClose} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose() } }}
    onKeyDown={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}>
    <header className="word-support-header"><div><h2 id="word-support-title" lang="mi">{target.word}</h2>
      {data?.role && <span className="word-support-role">{data.role.label}{data.role.family && data.role.family.toLowerCase() !== data.role.label.toLowerCase() ? ` · ${data.role.family.toLowerCase()}` : ''}</span>}
      {audio && <Pronunciation key={audio.url} url={audio.url} word={target.word} />}
    </div><button type="button" className="word-support-close" aria-label="Close word explanation" onClick={onClose}>×</button></header>
    <div className="word-support-content">
      {error ? <div role="alert">{error} <button onClick={() => { setError(''); setRetry(n => n + 1) }}>Try again</button></div> : !data ? <p role="status">Loading…</p> : <>
        {data.teAka.entries.length > 0 && <section className="word-support-dictionary"><div className="word-support-section-title"><h3>Te Aka entry</h3>
          {data.teAka.entries.filter(entry => teAkaLink(entry.url)).map(entry => <a key={`${entry.headword}:${entry.sourceId}`} href={entry.url!} target="_blank" rel="noreferrer">{entry.headword} ↗</a>)}
        </div>
          <div className="word-support-tabs" aria-label="Te Aka parts of speech">
            <button type="button" aria-pressed={senseFilter == null} onClick={() => setSenseFilter(null)}>All</button>
            {labels.map(([code, label]) => <button key={code} type="button" aria-pressed={senseFilter === code} onClick={() => setSenseFilter(code)}>{label}</button>)}
          </div>
          <ol className="word-support-senses">{senses.map(sense => <li key={`${sense.labelCode}:${sense.definition}`}>
            <div className="word-support-sense-label">{sense.label}{sense.qualifier ? ` · ${sense.qualifier}` : ''}</div><p>{sense.definition}</p>
            {sense.passiveForms.length > 0 && <p className="word-support-note"><strong>Passive forms</strong> <span lang="mi">{sense.passiveForms.join(', ')}</span></p>}
            {sense.synonyms.length > 0 && <p className="word-support-note"><strong>Related</strong> <span lang="mi">{sense.synonyms.join(', ')}</span></p>}
          </li>)}</ol>
        </section>}
        {data.teAka.senses.length === 0 && <section className="word-support-meaning"><h3>Meaning</h3><p>{data.entry?.meaning || data.definitions[0]?.definition || data.vocabulary[0] || 'No meaning has been added yet.'}</p></section>}
        {data.role && <section><h3>{target.sentence ? 'POS in this sentence' : 'Part of speech'}</h3>
          <p className="word-support-pos-name">{data.role.label}</p>
          <p>{data.role.description}</p>
        </section>}
        {otherTypes.length > 0 && <section><h3>Other POS possibilities</h3><div className="word-support-related">{otherTypes.map(type => <button key={type.code} type="button" title={`${type.description} Te Aka: ${type.sourceLabel}.`} onClick={() => onNavigate({ word: target.word, posCode: type.code })}>{type.label}<span aria-hidden="true">↗</span></button>)}</div></section>}
        {target.sentence && <section><h3>In this sentence</h3>
          <WordSupportSentence key={target.sentence} mi={target.sentence} en={context?.en} state={target.state ?? context?.state} structureId={context?.structureId} catalog={data.catalog} target={target} onNavigate={onNavigate} />
        </section>}
        {displayedExamples.length > 0 && <section><h3>Examples</h3>{displayedExamples.slice(0, 3).map(example => <WordSupportSentence key={example.mi}
          mi={example.mi} en={example.en} state={example.state} structureId={example.structureId}
          catalog={data.catalog} target={target} onNavigate={onNavigate} />)}</section>}
        {(data.entry?.explanation || data.role?.visual) && <details className="word-support-teaching"><summary>Teaching notes</summary>
          {data.entry?.explanation && <p>{data.entry.explanation}</p>}
          {data.entry?.note && <p className="word-support-note">{data.entry.note}</p>}
          {data.role?.visual && <p className="word-support-note">{data.role.visual}</p>}
        </details>}
        {!!data.entry?.related.length && <section><h3>Compare words</h3><div className="word-support-related">{data.entry.related.map(item => <button type="button" key={`${item.word}:${item.posCode}`} onClick={() => onNavigate({ word: item.word, posCode: item.posCode })}>{item.label}<span aria-hidden="true">↗</span></button>)}</div></section>}
      </>}
    </div>
  </dialog>, document.body)
}
