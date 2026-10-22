import assert from 'node:assert/strict'
import { it } from 'node:test'
import { filterProductionActivities, remainingIdleSeconds, sortProductionActivities } from '../src/lib/production-idle.ts'
import { clearStoredToken, getStoredRefreshToken, getStoredToken, isStoredProductionSession, setStoredSession } from '../src/lib/auth-storage.ts'

it('counts down to the 15-second boundary and stays expired after suspension', () => {
  assert.equal(remainingIdleSeconds(15_000, 0), 15)
  assert.equal(remainingIdleSeconds(15_000, 14_001), 1)
  assert.equal(remainingIdleSeconds(15_000, 15_000), 0)
  assert.equal(remainingIdleSeconds(15_000, 60_000), 0)
})
it('filters activity names ignoring case, accents and surrounding whitespace', () => {
  const activities = [{ title: 'Produção de Peças' }, { title: 'Montagem' }]
  assert.deepEqual(filterProductionActivities(activities, ' PRODUCAO '), [activities[0]])
  assert.deepEqual(filterProductionActivities(activities, ''), activities)
  assert.deepEqual(filterProductionActivities(activities, 'inexistente'), [])
})
it('puts the active activity first, then personal recent entries, untouched activities and closed activities last', () => {
  const activities = [
    { id: 'done', title: 'A', status: 'DONE', lastWorkedAt: '2026-10-22T15:00:00Z' },
    { id: 'untouched-z', title: 'Z', status: 'TODO', lastWorkedAt: null },
    { id: 'old', title: 'B', status: 'PAUSED', lastWorkedAt: '2026-10-21T12:00:00Z' },
    { id: 'recent', title: 'C', status: 'TODO', lastWorkedAt: '2026-10-22T12:00:00Z' },
    { id: 'active', title: 'D', status: 'IN_PROGRESS', lastWorkedAt: null },
    { id: 'canceled', title: 'E', status: 'CANCELED', lastWorkedAt: null },
    { id: 'untouched-a', title: 'A', status: 'TODO', lastWorkedAt: null },
  ]
  assert.deepEqual(sortProductionActivities(activities, 'active').map(a => a.id), [
    'active', 'recent', 'old', 'untouched-a', 'untouched-z', 'done', 'canceled',
  ])
  assert.equal(activities[0].id, 'done', 'sorting must not mutate the fetched list')
})
it('updates recent ordering immediately after starting or resuming and keeps it after pausing', () => {
  const activities = [
    { id: 'a', title: 'A', status: 'TODO', lastWorkedAt: '2026-10-22T12:00:00Z' },
    { id: 'b', title: 'B', status: 'PAUSED', lastWorkedAt: null },
  ]
  const starts = { b: '2026-10-22T13:00:00Z' }
  assert.deepEqual(sortProductionActivities(activities, 'b', starts).map(a => a.id), ['b', 'a'])
  assert.deepEqual(sortProductionActivities(activities, null, starts).map(a => a.id), ['b', 'a'])
  assert.deepEqual(sortProductionActivities(activities, null).map(a => a.id), ['a', 'b'])
})
it('stores kiosk tokens only for the tab, without refresh, and removes prior user data', () => {
  function storage() {
    const data = new Map<string, string>()
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } }
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage(), configurable: true })
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage(), configurable: true })
  setStoredSession('admin-token', 'admin-refresh')
  assert.equal(getStoredToken(), 'admin-token')
  assert.equal(getStoredRefreshToken(), 'admin-refresh')
  localStorage.setItem('kairo:paused-timer-target', 'private-old-target')
  setStoredSession('kiosk-token', '', true)
  assert.equal(isStoredProductionSession(), true)
  assert.equal(getStoredToken(), 'kiosk-token')
  assert.equal(getStoredRefreshToken(), null)
  assert.equal(localStorage.getItem('kairo:token'), null)
  assert.equal(localStorage.getItem('kairo:paused-timer-target'), null)
  clearStoredToken()
  assert.equal(getStoredToken(), null)
  assert.equal(isStoredProductionSession(), false)
  setStoredSession('normal-token', 'normal-refresh')
  assert.equal(getStoredToken(), 'normal-token')
  assert.equal(getStoredRefreshToken(), 'normal-refresh')
})
