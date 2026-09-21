import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LevelCourseOverview from './LevelCourseOverview'
let host: HTMLDivElement, root: Root
const select = vi.fn()
beforeEach(async () => {
  vi.stubGlobal('React', React); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host); select.mockClear()
  await act(async () => root.render(<LevelCourseOverview onSelect={select} sentences={[
    { structureId: 1, sortOrder: 1, textMi: 'Ko Charlie te manu', curriculumLevel: 1, state: null },
    { structureId: 9, sortOrder: 9, textMi: 'Kei runga te manu', curriculumLevel: 2, state: null },
  ]} />))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
it('shows six level cards with one action each and counts only their assigned structures', () => {
  const cards = host.querySelectorAll('.level-course-card')
  expect(cards).toHaveLength(6)
  expect([...cards].every(card => card.querySelectorAll('button').length === 1)).toBe(true)
  expect(cards[0].textContent).toContain('Pepeha')
  expect(cards[1].textContent).not.toContain('Pepeha')
  expect(cards[0].textContent).toContain('1 sentence structure')
  expect(cards[2].textContent).toContain('0 sentence structures')
})
it('opens the level belonging to the chosen Learn more action', async () => {
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Learn more about Level 2"]')!.click())
  expect(select).toHaveBeenCalledWith(2)
})
