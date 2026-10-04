export type WalkDirection = 'front' | 'back' | 'side'
export type WalkPoint = { x: number; y: number }
export type WalkLimb = { root: WalkPoint; joint: WalkPoint; end: WalkPoint }

// One phase controls both sides. The near hand and near foot must oppose one
// another; 'near' identifies a limb, never whichever limb is currently forward.
export function classroomWalkPose(phase: number, amount: number, side: boolean) {
  const limb = (near: boolean) => {
    const p = phase + (near ? 0 : Math.PI)
    const cycle = ((p / (Math.PI * 2)) % 1 + 1) % 1
    const support = cycle < .5
    const t = support ? cycle * 2 : (cycle - .5) * 2
    const travel = (support ? 1 - 2 * t : -Math.cos(t * Math.PI)) * amount
    const lift = support ? 0 : Math.sin(t * Math.PI) * 6 * amount
    const hip = { x: side ? (near ? 99 : 90) : (near ? 110 : 79), y: 211 }
    const foot = { x: hip.x + (side ? 30 : 3) * travel, y: 277 - lift + (side ? 0 : travel * 5) }
    const knee = { x: (hip.x + foot.x) / 2 + (side && !support ? 5 * Math.sin(t * Math.PI) * amount : 0), y: 245 - lift * .4 }
    const shoulder = { x: side ? (near ? 101 : 90) : (near ? 121 : 68), y: 157 }
    const hand = { x: shoulder.x + (side ? -travel * 35 : (near ? 5 : -5)), y: side ? 211 - Math.abs(travel) * 9 : 211 + travel * 14 }
    const elbow = { x: shoulder.x * .45 + hand.x * .55 + (side ? 4 : near ? 3 : -3), y: 184 }
    return { leg: { root: hip, joint: knee, end: foot }, arm: { root: shoulder, joint: elbow, end: hand }, support }
  }
  return { far: limb(false), near: limb(true) }
}
