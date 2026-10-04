// Curriculum browsing order only; does not assign or alter POS.
const values: Record<string, number> = {
  kore: 0, tahi: 1, kotahi: 1, rua: 2, tokorua: 2, toru: 3, tokotoru: 3,
  'whā': 4, rima: 5, ono: 6, whitu: 7, waru: 8, iwa: 9, tekau: 10, rau: 100, mano: 1000,
}
export function vocabularyNumberValue(text: string): number | undefined {
  return values[text.normalize('NFC').toLowerCase()]
}
