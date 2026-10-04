import { useState } from 'react'
import { LEVEL_ONE_CONTENT } from '../lib/levelOneContent'
import PuzzleFloorGlow from './PuzzleFloorGlow'

const words = LEVEL_ONE_CONTENT.vocabulary[0].words.filter(word => ['maunga', 'awa', 'waka', 'kāinga'].includes(word.label))
const spots = [{ x: 210, y: 315 }, { x: 590, y: 315 }, { x: 210, y: 425 }, { x: 590, y: 425 }]

export default function ClassroomVocabulary({ players, move, onReset }: {
  players: readonly { x: number; y: number; walking: boolean }[]
  move: (x: number, y: number) => void
  onReset: () => void
}) {
  const [round, setRound] = useState(0)
  const answer = words[round % words.length]
  const choices = spots.map((spot, index) => ({ ...spot, word: words[(index + Math.floor(round / words.length)) % words.length] }))
  const selections = players.map(player => player.walking ? -1 : choices.findIndex(spot => Math.hypot(player.x - spot.x, player.y - spot.y - 25) < 24))
  return <>
    <section className="classroom-whiteboard puzzle-board" aria-label="Vocabulary board">
      <p>{answer.meaning}</p>
      <div className="puzzle-answer" aria-label="Player answers">{selections.map((choice, index) => <span key={index} aria-label={`Player ${index + 1}: ${choice < 0 ? 'waiting' : choices[choice].word === answer ? 'correct' : 'try again'}`}>
        {index + 1} {choice < 0 ? '·' : choices[choice].word === answer ? '✓' : '↻'}
      </span>)}</div>
      <button className="puzzle-reset" aria-label="Next word" onClick={() => { onReset(); setRound(value => value + 1) }}>→</button>
    </section>
    {choices.map((spot, index) => <button key={index} lang="mi" className="puzzle-floor-word" aria-label={`Walk to ${spot.word.label}`} onClick={() => move(spot.x, spot.y + 25)} style={{ left: `${spot.x / 8}%`, top: `${spot.y / 5}%` }}>
      <PuzzleFloorGlow active={spot.word === answer && selections.includes(index)} />
      <span className="puzzle-word-label">{spot.word.label}</span>
    </button>)}
  </>
}
