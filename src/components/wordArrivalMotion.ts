import { unit } from './translationJourneyTiming'

type Point = { x: number; y: number }
const departures = [140, 520, 300] as const
const arrivals = [2440, 2660, 2540] as const
const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)

/** A little wind catches each clone, then lets it settle on the exact baseline.
 * Pure clock-based motion keeps replay and backwards scrubbing identical. */
export function wordArrivalMotion(start: Point, end: Point, time: number, slot: number, scale: number) {
  const index = Math.max(0, Math.min(2, slot))
  const progress = unit((time - departures[index]) / (arrivals[index] - departures[index]))
  if(progress === 0 || progress === 1) return {
    ...(progress === 0 ? start : end), rotation:0, sizeProgress:progress, opacity:progress, glow:0,
  }
  const t = ease(progress), u = 1 - t
  const direction = Math.sign(end.x - start.x) || (index === 2 ? -1 : 1)
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const drift = Math.min(24 * scale, distance * .12)
  const c1 = { x: start.x - direction * drift, y: start.y + (end.y - start.y) * .12 }
  const c2 = { x: end.x + direction * drift * .75, y: end.y - (end.y - start.y) * .3 }
  const breath = Math.sin(Math.PI * t) ** 2
  return {
    x: u ** 3 * start.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * end.x,
    y: u ** 3 * start.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * end.y
      - Math.sin(t * Math.PI * 2) * breath * 7 * scale,
    rotation: direction * Math.sin(t * Math.PI * 2) * breath * .1,
    sizeProgress: t,
    opacity: ease(unit(progress / .16)),
    glow: breath * 5 * scale,
  }
}
