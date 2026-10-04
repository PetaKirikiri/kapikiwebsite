import { useEffect, useState, type CSSProperties } from 'react'
import { nextPuzzleWord, PUZZLE_WORDS } from './sentencePuzzleRules'
import PuzzleFloorGlow from './PuzzleFloorGlow'

export default function ClassroomSentencePuzzle({ players, move, onReset }: {
  players: readonly { x: number; y: number; walking: boolean }[]
  move: (x: number, y: number) => void
  onReset: () => void
}) {
  const [completed, setCompleted] = useState(0)
  const [flying, setFlying] = useState(false)
  const ready = nextPuzzleWord(players, completed)
  useEffect(() => {
    if (!ready || flying) return
    const hold = window.setTimeout(() => setFlying(true), 450)
    return () => clearTimeout(hold)
  }, [ready, completed, flying])
  useEffect(() => {
    if (!flying) return
    const finish = window.setTimeout(() => { setCompleted(n => n + 1); setFlying(false) }, 3000)
    return () => clearTimeout(finish)
  }, [flying])
  return <>
    <section className="classroom-whiteboard puzzle-board" aria-label="Sentence puzzle board">
      <p>Ranginui is the father</p>
      <div className="puzzle-answer" lang="mi" aria-label="Completed words">{PUZZLE_WORDS.map((word, index) => <span key={word.text}>{index < completed ? word.text : <span aria-label={`Position ${index + 1}`}>·</span>}</span>)}</div>
      <button className="puzzle-reset" aria-label="Restart sentence puzzle" onClick={() => { onReset(); setCompleted(0); setFlying(false) }}>↻</button>
      <span className="classroom-sr-only" role="status">{completed === 4 ? 'Sentence complete: Ko Ranginui te matua' : `${completed} of 4 words complete`}</span>
    </section>
    {PUZZLE_WORDS.map((word, index) => <button key={word.text} lang="mi" className="puzzle-floor-word" aria-label={`Walk to ${word.text}`} onClick={() => move(word.x, word.y + 25)} style={{ left: `${word.x / 8}%`, top: `${word.y / 5}%`, '--puzzle-end-x': `${(33 + index * 10) - word.x / 8}cqw`, '--puzzle-end-y': `${(14 - word.y / 5) * .625}cqw` } as CSSProperties}><PuzzleFloorGlow active={flying && index === completed} /><span className="puzzle-word-label">{word.text}</span>{flying && index === completed ? <span className="puzzle-transfer-copy puzzle-word-flying" aria-hidden="true">{word.text}</span> : null}</button>)}
  </>
}
