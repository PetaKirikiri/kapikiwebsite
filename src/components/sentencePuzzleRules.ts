export const PUZZLE_WORDS = [
  { text: 'Ko', x: 590, y: 400 },
  { text: 'Ranginui', x: 210, y: 315 },
  { text: 'te', x: 600, y: 295 },
  { text: 'matua', x: 220, y: 425 },
] as const

export function nextPuzzleWord(players: readonly { x: number; y: number; walking: boolean }[], completed: number) {
  const word = PUZZLE_WORDS[completed], player = players[completed]
  return !!word && !!player && !player.walking && Math.hypot(player.x - word.x, player.y - (word.y + 25)) < 24
}
