// One clock for typography, tense transfer, and the existing growth solvers.
export const JOURNEY = {
  settle: 2700,
  translate: 3000,
  translated: 5000,
  anchorStart: 3850,
  anchorDuration: 2600,
  rootSmokeStart: 3000,
  readyHold: 700,
  dustStart: 8000,
  lastArrival: 12000,
  leftStart: 10400,
  leftDuration: 2900,
  adjectiveStart: 13500,
  adjectiveDuration: 2700,
  markerStart: 16500,
  markerDuration: 2500,
  end: 19000,
} as const

export const unit = (value: number) => Math.max(0, Math.min(1, value))
export const smooth = (value: number) => { const t = unit(value); return t * t * (3 - 2 * t) }

export type ParticleFlight = { launch: number; duration: number }

// The renderer and the growth handoff use the same flight endpoint, including
// when scrubbing backwards. No independent tense-start timer is involved.
export function particleTravel(time:number, flight:ParticleFlight, start:number=JOURNEY.dustStart) {
  return unit((time-start-flight.launch)/flight.duration)
}

export function firstParticleArrival(flights:readonly ParticleFlight[],start:number) {
  return flights.length?start+Math.min(...flights.map(flight=>flight.launch+flight.duration)):Infinity
}

export function arrivedTenseGrowth(time:number, flights:readonly ParticleFlight[],start:number=JOURNEY.dustStart,duration:number=JOURNEY.leftDuration) {
  const arrived=flights.filter(flight=>particleTravel(time,flight,start)===1)
  if(!arrived.length)return 0
  const firstArrival=firstParticleArrival(arrived,start)
  return unit((time-firstArrival)/duration)
}

export function tenseReleaseTime(roots:readonly (readonly ParticleFlight[])[]) {
  return Math.max(...roots.map((flights,i)=>firstParticleArrival(flights,JOURNEY.rootSmokeStart+i*260)+JOURNEY.anchorDuration))+JOURNEY.readyHold
}
