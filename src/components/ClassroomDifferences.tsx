import { useState } from 'react'
import './ClassroomDifferences.css'
// Positions are mapped to the actual lounge artwork, not vocabulary cards.
const areas = [{ x: 205, y: 110 }, { x: 407, y: 140 }, { x: 615, y: 145 }]
export default function ClassroomDifferences({ selected, players, move }: {
  selected: number; players: readonly { x: number; y: number; walking: boolean }[]; move: (x: number, y: number) => void
}) {
  const room = selected < 2 ? 0 : 1
  const [marks, setMarks] = useState<number[][]>([[], []])
  const found = areas.map((_, index) => marks[0].includes(index) && marks[1].includes(index))
  return <>
    <section className="difference-status" aria-label="Spot the difference board">
      <span>Room {room === 0 ? 'A' : 'B'}</span><span aria-label="Differences found">{found.filter(Boolean).length} / 3</span>
      <button className="puzzle-reset" aria-label="Restart differences" onClick={() => setMarks([[], []])}>↻</button>
    </section>
    {areas.map((area, index) => {
      const player = players[selected]
      const near = !player.walking && Math.hypot(player.x - area.x, player.y - 255) < 35
      const marked = marks[room].includes(index)
      return <div className="difference-object" key={index} style={{ left: `${area.x / 8}%`, top: `${area.y / 5}%` }}>
        <button className={`difference-hotspot${found[index] ? ' is-found' : ''}`} aria-label={`Inspect area ${index + 1}`} onClick={() => move(area.x, 255)} />
        {near ? <button className="difference-mark" aria-label={`Mark area ${index + 1} as different`} aria-pressed={marked} onClick={() => setMarks(current => current.map((list, side) => side !== room ? list : list.includes(index) ? list.filter(value => value !== index) : [...list, index]))}>{marked ? '✓' : '◇'}</button> : null}
      </div>
    })}
  </>
}
