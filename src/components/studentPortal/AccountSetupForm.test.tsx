import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AccountSetupForm, { type AccountSetupDetails } from './AccountSetupForm'

let host: HTMLDivElement, root: Root
const details: AccountSetupDetails = { name: 'Learner', email: 'learner@example.com', selectedLevel: 2, registeredLevels: [2, 3], departmentGroup: 'Policy' }
const onSave = vi.fn().mockResolvedValue(undefined)
beforeEach(() => {
  vi.stubGlobal('React', React)
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  onSave.mockClear()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
async function render(data = details, preview = false) {
  await act(async () => root.render(<AccountSetupForm details={data} onSave={preview ? undefined : onSave} />))
}
async function click(selector: string) { await act(async () => host.querySelector<HTMLElement>(selector)!.click()) }
async function submit() {
  host.querySelector<HTMLInputElement>('[name=password]')!.value = 'test-only-password'
  host.querySelector<HTMLInputElement>('[name=confirmPassword]')!.value = 'test-only-password'
  await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
}

it('requires the learner to choose a level and does not preselect one', async () => {
  await render()
  expect(host.querySelectorAll('[type=radio]:checked')).toHaveLength(0)
  expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true)
  await submit()
  expect(onSave).not.toHaveBeenCalled()
  expect(host.querySelector('[role=alert]')!.textContent).toBe('Please choose your level.')
  await click('[type=radio][value="2"]')
  expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false)
})

it('shows both schedules and saves the chosen level instead of the original level', async () => {
  await render()
  expect(host.querySelector('[type=radio][value="2"]')!.closest('label')!.textContent).toContain('Monday 19 October')
  expect(host.querySelector('[type=radio][value="3"]')!.closest('label')!.textContent).toContain('Tuesday 20 October')
  expect(host.querySelector('[type=radio][value="3"]')!.closest('label')!.textContent).toContain('1pm – 2pm')
  await click('[type=radio][value="3"]')
  await submit()
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ selectedLevel: 3, registeredLevels: [2, 3], name: 'Learner' }))
})

it('keeps the choice exclusive and lets the learner change it without another confirmation control', async () => {
  await render()
  await click('[type=radio][value="2"]')
  await click('[type=radio][value="3"]')
  expect(host.querySelectorAll('[type=radio]:checked')).toHaveLength(1)
  expect(host.querySelector<HTMLInputElement>('[type=radio]:checked')!.value).toBe('3')
  expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false)
  expect(onSave).not.toHaveBeenCalled()
  expect(host.querySelectorAll('button')).toHaveLength(1)
})

it('keeps a single unique valid registration simple and does not treat duplicates as multiple courses', async () => {
  await render({ ...details, registeredLevels: [2, 2, 0, 8] })
  expect(host.querySelector('.account-level-choice')).toBeNull()
  expect(host.querySelector('.account-setup-class')!.textContent).toContain('Level 2')
  await submit()
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ selectedLevel: 2 }))
})

it('lets the preview choose a level without enabling account saving', async () => {
  await render(details, true)
  await click('[type=radio][value="2"]')
  expect(host.querySelector<HTMLInputElement>('[type=radio]:checked')!.value).toBe('2')
  expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true)
  await submit()
  expect(onSave).not.toHaveBeenCalled()
})

it('does not consume a personal link twice on a double submission', async () => {
  let finish!: () => void
  onSave.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  await render({ ...details, registeredLevels: [2] })
  host.querySelector<HTMLInputElement>('[name=password]')!.value = 'test-only-password'
  host.querySelector<HTMLInputElement>('[name=confirmPassword]')!.value = 'test-only-password'
  await act(async () => {
    const form = host.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(onSave).toHaveBeenCalledTimes(1)
  await act(async () => finish())
})
it('does not submit mismatched passwords and preserves the entered details', async () => {
  await render({ ...details, registeredLevels: [2] })
  host.querySelector<HTMLInputElement>('[name=password]')!.value = 'test-only-password'
  host.querySelector<HTMLInputElement>('[name=confirmPassword]')!.value = 'different-test-password'
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(onSave).not.toHaveBeenCalled()
  expect(host.querySelector('[role=alert]')!.textContent).toBe('Your passwords don’t match.')
  expect(host.querySelector('[name=name]')).toBeNull()
})
it('keeps required native validation and the recipient email locked', async () => {
  await render({ ...details, registeredLevels: [2], departmentGroup: '' })
  expect(host.querySelector<HTMLInputElement>('[name=email]')!.readOnly).toBe(true)
  expect(host.querySelector<HTMLInputElement>('[name=department_group]')!.validity.valueMissing).toBe(true)
  expect(host.querySelector<HTMLInputElement>('[name=password]')!.required).toBe(true)
  expect(host.querySelector<HTMLInputElement>('[name=password]')!.minLength).toBe(8)
  expect(host.querySelector('form')!.checkValidity()).toBe(false)
})
it('shows server errors and lets the learner retry without resetting their choice', async () => {
  onSave.mockRejectedValueOnce(new Error('Please try again shortly.'))
  await render()
  await click('[type=radio][value="3"]')
  await submit()
  expect(host.querySelector('[role=alert]')!.textContent).toBe('Please try again shortly.')
  expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false)
  await submit()
  expect(onSave).toHaveBeenCalledTimes(2)
  expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ selectedLevel: 3 }))
})
