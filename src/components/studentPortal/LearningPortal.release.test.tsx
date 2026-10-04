import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { LearningDashboard } from './LearningPortal'
vi.mock('./StudentWorkspace', () => ({ default: () => null }))
it('opens the registered level with lesson resources and keeps account controls in navigation', async () => {
  vi.stubGlobal('React', React)
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  window.location.hash = '#moe/my-learning'
  const host = document.createElement('div'); const root = createRoot(host)
  const renderContent = vi.fn(() => <p>Selected content</p>)
  try {
    await act(async () => root.render(<LearningDashboard account={<details><summary>Account</summary></details>} renderContent={renderContent} data={{ records: [], interests: [{ id:'i',selected_level:2,created_at:'2026-10-04' }], training:[],assessments:[],lessons:[{id:'l',level:2,lessonNumber:1,title:'First lesson',startsAt:'2026-10-12T14:00:00+13:00',endsAt:'2026-10-12T15:00:00+13:00',timezone:'Pacific/Auckland',videoUrl:'https://example.com/lesson',notes:[{title:'Review',body:'Lesson notes'}]}] }} />))
    expect(host.querySelector('nav details')).not.toBeNull()
    expect(host.querySelectorAll('.learning-lesson-row')).toHaveLength(10)
    expect(host.querySelector('.learning-lesson-open')?.getAttribute('href')).toBe('#moe/lessons?level=2&lesson=1')
    expect(host.querySelector('a[aria-label="Watch Lesson 1 video"]')?.getAttribute('href')).toBe('https://example.com/lesson')
    const notes = [...host.querySelectorAll('button')].find(b=>b.textContent==='Notes')!
    await act(async () => notes.click())
    expect(host.textContent).toContain('Lesson notes')
    await act(async () => [...host.querySelectorAll('nav button')].find(b=>b.textContent==='Words')!.click())
    expect(renderContent).toHaveBeenLastCalledWith(2,'vocabulary')
    expect(host.textContent).not.toContain('Your next course')
  } finally { await act(async () => root.unmount()); vi.unstubAllGlobals() }
})
