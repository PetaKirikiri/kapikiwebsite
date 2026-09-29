import { expect, it } from 'vitest'
import { LEVEL_READING_MATERIAL } from './levelReadingMaterial'
import { LEVEL_READING_ANNOTATIONS } from './levelReadingAnnotations'
import { translatedSegments } from './connectorPresentation/translation'

it('covers every reading with exact sentence seats, matching rail boundaries, and its original translation', () => {
  const lines = Object.values(LEVEL_READING_MATERIAL).flatMap(reading => reading.sections.flatMap(section => section.lines))
  expect(LEVEL_READING_ANNOTATIONS).toHaveLength(lines.length)
  for (const [text, english] of lines) {
    const annotation = LEVEL_READING_ANNOTATIONS.find(item => item.textMi === text)!
    expect(annotation).toBeDefined()
    const tokens = annotation.state.tokens
    expect(tokens.map(token => token.surfaceText).join(' ')).toBe(text)
    expect(tokens.every(token => token.acceptedPosCode && token.checkpointState && token.rightConnectorEnd)).toBe(true)
    expect(tokens[0].leftRail).toBeNull()
    expect(tokens.at(-1)!.rightRail).toBeNull()
    for (let i = 1; i < tokens.length; i++) expect(tokens[i].leftRail).toBe(tokens[i - 1].rightRail)
    const translation = translatedSegments(text, tokens.map(() => '#123456'))!
    expect(translation.map(segment => segment.text).join(' ')).toBe(english)
    for (const segment of translation) if (segment.sourceIndex != null) {
      expect(segment.sourceIndex).toBeLessThan(tokens.length)
      expect(segment.sourceText).toBe(tokens[segment.sourceIndex].surfaceText)
      expect(segment.color).toBe('#123456')
    }
  }
})
