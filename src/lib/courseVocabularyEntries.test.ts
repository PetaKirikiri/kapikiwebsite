import { describe, expect, it } from 'vitest'
import { courseVocabularyEntries, optionalPersonalisationEntries } from './courseVocabularyEntries'

describe('curriculum vocabulary browsing', () => {
  it('keeps job titles in vocabulary and conversational expressions in kīwaha', () => {
    const entries = courseVocabularyEntries(1)
    const titles = entries.filter(entry => entry.functionType === 'Job title')
    expect(titles).toHaveLength(0)
    const optional=optionalPersonalisationEntries(1)
    expect(optional.length).toBeGreaterThan(0)
    expect(optional.every(entry=>entry.category==='Optional personalisation')).toBe(true)
    expect(entries.some(entry=>entry.text==='kaitātari')).toBe(false)
    expect(optional.some(entry=>entry.text==='kaitātari')).toBe(true)
    expect(titles.every(entry => entry.kind === 'word' && entry.key === entry.text)).toBe(true)
    expect(entries.find(entry => entry.text === 'Kia ora')).toMatchObject({ kind: 'kiwaha', functionType: 'Greeting' })
    expect(entries.find(entry => entry.text === 'Mā te wā')).toMatchObject({ kind: 'kiwaha', functionType: 'Farewell' })
    expect(entries.some(entry => entry.functionType === 'Sentence starter')).toBe(false)
    expect(entries.some(entry => entry.text === 'He … ahau.' || entry.text === 'Nō … ahau.')).toBe(false)
    expect(entries.filter(entry => entry.id.startsWith('kiwaha:')).every(entry => entry.kind === 'kiwaha')).toBe(true)
  })
})
