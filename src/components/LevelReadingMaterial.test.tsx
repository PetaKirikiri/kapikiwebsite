import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { LevelReadingMaterial } from './LevelOnePepeha'
import { LEVEL_READING_MATERIAL } from '../lib/levelReadingMaterial'
import { LEVEL_READING_ANNOTATIONS } from '../lib/levelReadingAnnotations'
import { tagText, unresolvedSentence } from '../lib/connectorPresentation/engine'
import type { BusManifestPosCatalog } from '../lib/busManifestContract'

vi.mock('../lib/connectorPresentation/engine', async original => ({
  ...await original<typeof import('../lib/connectorPresentation/engine')>(), tagText: vi.fn(),
}))
const renderSentence = vi.hoisted(() => vi.fn())
vi.mock('./FamilyConnectorSentenceView', () => ({ default: (props: any) => {
  renderSentence(props)
  return createElement('div', {}, props.presentationStates[0].tokens.map((t: any) => t.surfaceText).join(' '), props.renderPassageSupplement())
} }))
const catalog = { groups: [], posTypes: [], dictionaryPosLabels: [], dictionaryPosMappings: [], wordCategories: [] } as BusManifestPosCatalog
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mounted: (() => Promise<void>)[] = []
afterEach(async () => { for (const cleanup of mounted.splice(0)) await cleanup(); vi.clearAllMocks() })
async function mount(level: keyof typeof LEVEL_READING_MATERIAL, withCatalog = false, sentences?: typeof LEVEL_READING_ANNOTATIONS) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  mounted.push(async () => { await act(async () => root.unmount()); host.remove() })
  await act(async () => root.render(createElement(LevelReadingMaterial, { reading: LEVEL_READING_MATERIAL[level], catalog: withCatalog ? catalog : undefined, sentences })))
  return { host, root }
}

it('shows the complete bilingual reading at every new level before catalogue or grammar requests finish', async () => {
  for (const level of [2, 3, 4, 5, 6] as const) {
    const { host } = await mount(level)
    const reading = LEVEL_READING_MATERIAL[level]
    expect(host.querySelector('h3')?.textContent).toBe(reading.title)
    for (const [mi, en] of reading.sections[0].lines) {
      expect(host.textContent).toContain(mi)
      expect(host.textContent).toContain(en)
    }
    expect(host.querySelectorAll('.level-pepeha-plain')).toHaveLength(reading.sections[0].lines.length)
    expect(host.querySelector('[role="status"]')).toBeNull()
  }
  expect(tagText).not.toHaveBeenCalled()
})
it('renders every authored reading immediately through the shared rail renderer without automatic tagging', async () => {
  vi.mocked(tagText).mockRejectedValue(new Error('Automatic tagging is unavailable'))
  for (const level of [2, 3, 4, 5, 6] as const) {
    const { host } = await mount(level, true, LEVEL_READING_ANNOTATIONS)
    expect(host.querySelectorAll('.level-pepeha-plain')).toHaveLength(0)
    expect(host.querySelectorAll('.level-pepeha-line')).toHaveLength(LEVEL_READING_MATERIAL[level].sections[0].lines.length)
    for (const [, english] of LEVEL_READING_MATERIAL[level].sections[0].lines) expect(host.textContent).toContain(english)
  }
  expect(tagText).not.toHaveBeenCalled()
  for (const [props] of renderSentence.mock.calls) expect(props.readOnly).toBe(true)
})
it('keeps a full reading visible when automatic analysis is unavailable', async () => {
  vi.mocked(tagText).mockRejectedValue(new Error('Offline'))
  const { host } = await mount(6, true)
  expect(host.querySelectorAll('.level-pepeha-plain')).toHaveLength(14)
  expect(host.textContent).toContain('Mā te mahi tahi e pai ai te māra mō te katoa.')
  expect(host.textContent).not.toContain('Offline')
  expect(renderSentence).not.toHaveBeenCalled()
})
it('uses the read-only shared renderer only with the matching service result', async () => {
  const states = new Map<string, ReturnType<typeof unresolvedSentence>>()
  vi.mocked(tagText).mockImplementation(async text => {
    const state = unresolvedSentence(text); state.tokens[0]!.acceptedPosCode = 'nominal_predicate'
    states.set(text, state); return state
  })
  const { host } = await mount(4, true)
  expect(host.querySelectorAll('.level-pepeha-line')).toHaveLength(14)
  for (const [props] of renderSentence.mock.calls) {
    const state = props.presentationStates[0]
    expect(states.get(state.tokens.map((token: any) => token.surfaceText).join(' '))).toBe(state)
    expect(props.readOnly).toBe(true)
    expect(props.savedBusManifests).toEqual([])
    expect(props.passageAddresses).toEqual([])
  }
})
