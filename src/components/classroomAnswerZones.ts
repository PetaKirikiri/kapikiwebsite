export const ANSWER_ZONES = [
  { id: 'ae', label: 'Āe', left: 45, right: 285, top: 310, bottom: 482 },
  { id: 'middle', label: 'Not sure', left: 300, right: 500, top: 310, bottom: 482 },
  { id: 'kao', label: 'Kāo', left: 515, right: 755, top: 310, bottom: 482 },
] as const

export type AnswerZone = typeof ANSWER_ZONES[number]['id']
export function answerZoneAt(player: { x: number; y: number; walking: boolean }): AnswerZone | null {
  if (player.walking) return null
  return ANSWER_ZONES.find(zone => player.x >= zone.left && player.x <= zone.right && player.y >= zone.top && player.y <= zone.bottom)?.id ?? null
}

export function answerDestination(zone: typeof ANSWER_ZONES[number], playerIndex: number) {
  return { x: (zone.left + zone.right) / 2 + (playerIndex - 2) * 45, y: 385 + (playerIndex % 2) * 45 }
}
