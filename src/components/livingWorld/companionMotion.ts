import type { CompanionAction } from './companionContext'

export type CompanionPose = 'rest' | 'half-blink' | 'blink' | 'look-left' | 'look-right' | 'unfurl'
export type CompanionBeat = { pose: CompanionPose; duration: number }
export const companionFrames: Record<CompanionPose, number> = { rest: 0, 'half-blink': 1, blink: 2, 'look-left': 3, 'look-right': 4, unfurl: 5 }
// Atlas registration: align the rock and feet in each 512px cell, not the changing head silhouette.
export const companionOffsets = [{ x: -4.1, y: 0 }, { x: 0, y: 0 }, { x: 4.1, y: 0 }, { x: -4.1, y: 3.7 }, { x: 0, y: 3.7 }, { x: 0, y: 3.7 }]
export const blink: readonly CompanionBeat[] = [
  { pose: 'half-blink', duration: 55 }, { pose: 'blink', duration: 95 }, { pose: 'half-blink', duration: 55 }, { pose: 'rest', duration: 150 },
]

export function companionGesture(action: CompanionAction): readonly CompanionBeat[] {
  if (action === 'look-left' || action === 'look-right') return [{ pose: action, duration: 1500 }, { pose: 'rest', duration: 180 }]
  return [...blink, { pose: 'unfurl', duration: 1600 }, { pose: 'rest', duration: 250 }]
}

/** A new gesture can cancel every pending frame from the previous one. */
export function playCompanionSequence(beats: readonly CompanionBeat[], paint: (pose: CompanionPose) => void, complete: () => void) {
  let elapsed = 0
  const timers = beats.map(beat => {
    const timer = setTimeout(() => paint(beat.pose), elapsed)
    elapsed += beat.duration
    return timer
  })
  timers.push(setTimeout(complete, elapsed))
  return () => timers.forEach(clearTimeout)
}
