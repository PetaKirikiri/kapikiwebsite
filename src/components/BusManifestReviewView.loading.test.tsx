// @vitest-environment happy-dom
import React, { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import BusManifestReviewView, { type BusManifestReviewViewProps } from './BusManifestReviewView'

const shapes = vi.hoisted(() => ({ collection: [] as { id: number }[] }))
vi.mock('./useDesignSpaceCollection', () => ({ useDesignSpaceCollection: () => ({ collection: shapes.collection, loading: shapes.collection.length === 0 }) }))
vi.mock('../hooks/useConnectorPatterns', () => ({ useConnectorPatterns: () => ({ rules: [], error: null }) }))

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); shapes.collection = [] })

it('measures words and observes paragraphs when asynchronously loaded shapes mount the sentence', async () => {
  vi.stubGlobal('React', React)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const observe = vi.fn()
  vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-word-text')) return new DOMRect(0, 0, 60, 16)
    if (this.dataset.testid === 'token-0-0') return new DOMRect(0, 0, 80, 48)
    if (this.dataset.testid === 'token-0-1') return new DOMRect(80, 0, 80, 48)
    return new DOMRect(0, 0, 300, 48)
  })
  const props: BusManifestReviewViewProps = {
    loading: false, paragraphs: [[{ text: 'Ko' }, { text: 'Charlie' }]],
    savedBusManifests: [], passageAddresses: [{ structureId: 1 }],
    posCatalog: { groups: [], posTypes: [], dictionaryPosLabels: [], dictionaryPosMappings: [], wordCategories: [] },
    showPassageSearch: false, readOnly: true, onBusManifestWrite: vi.fn(),
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => root.render(createElement(BusManifestReviewView, props)))
    expect(host.textContent).toContain('Loading connector shapes')
    expect(observe).not.toHaveBeenCalled()
    // Unrelated snapshot opens the load gate; no connector design is substituted.
    shapes.collection = [{ id: -1 }]
    await act(async () => root.render(createElement(BusManifestReviewView, props)))
    expect(host.querySelector('[data-word-text]')?.textContent).toBe('Ko')
    expect(observe).toHaveBeenCalledWith(host.querySelector('p'))
    expect(Number.parseFloat(host.querySelector<HTMLElement>('[data-testid="rail-control-0-0"]')!.style.width)).toBeGreaterThan(16)
    expect(Number.parseFloat(host.querySelector<HTMLElement>('[data-testid="checkpoint-0-1"]')!.style.left)).toBeGreaterThanOrEqual(60)
    expect(props.onBusManifestWrite).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})
