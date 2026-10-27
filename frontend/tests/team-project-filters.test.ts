import assert from 'node:assert/strict'
import { it } from 'node:test'
import {
  ALL_PROJECT_STATUSES,
  filterAndSortTeamProjects,
  type ProjectOrder,
} from '../src/lib/team-project-filters.ts'
import type { CardStatus } from '../src/types/card.ts'

function project(id: string, status: CardStatus, title = id, day = 1) {
  return { id, status, title, createdAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z` }
}

const ids = (projects: { id: string }[]) => projects.map(({ id }) => id)
const orders: ProjectOrder[] = ['newest', 'oldest', 'name-asc', 'name-desc']

it('always groups all five statuses in workflow order for every ordering option', () => {
  const projects = [
    project('canceled', 'CANCELED', 'A', 5),
    project('done', 'DONE', 'B', 4),
    project('paused', 'PAUSED', 'C', 3),
    project('progress', 'IN_PROGRESS', 'D', 2),
    project('todo', 'TODO', 'E', 1),
  ]
  for (const order of orders) {
    assert.deepEqual(ids(filterAndSortTeamProjects(projects, ALL_PROJECT_STATUSES, order)),
      ['todo', 'progress', 'paused', 'done', 'canceled'])
  }
})

it('defaults to newest creation date and supports oldest within each status', () => {
  const projects = [
    project('done-old', 'DONE', 'Z', 1),
    project('todo-old', 'TODO', 'Z', 1),
    project('done-new', 'DONE', 'A', 3),
    project('todo-new', 'TODO', 'A', 3),
  ]
  assert.deepEqual(ids(filterAndSortTeamProjects(projects)),
    ['todo-new', 'todo-old', 'done-new', 'done-old'])
  assert.deepEqual(ids(filterAndSortTeamProjects(projects, ALL_PROJECT_STATUSES, 'oldest')),
    ['todo-old', 'todo-new', 'done-old', 'done-new'])
})

it('orders names with Portuguese collation in both directions', () => {
  const projects = [
    project('z', 'TODO', 'Zebra'),
    project('e', 'TODO', 'Équipe'),
    project('a', 'TODO', 'Árvore'),
    project('b', 'TODO', 'Bola'),
  ]
  assert.deepEqual(ids(filterAndSortTeamProjects(projects, ALL_PROJECT_STATUSES, 'name-asc')), ['a', 'b', 'e', 'z'])
  assert.deepEqual(ids(filterAndSortTeamProjects(projects, ALL_PROJECT_STATUSES, 'name-desc')), ['z', 'e', 'b', 'a'])
})

it('filters every status and combines filtering with every ordering option', () => {
  const statuses: CardStatus[] = ['TODO', 'IN_PROGRESS', 'PAUSED', 'DONE', 'CANCELED']
  const projects = statuses.flatMap((status) => [
    project(`${status}-old`, status, 'Bola', 1),
    project(`${status}-new`, status, 'Árvore', 2),
  ])
  for (const status of statuses) {
    for (const order of orders) {
      const expected = order === 'oldest' || order === 'name-desc'
        ? [`${status}-old`, `${status}-new`]
        : [`${status}-new`, `${status}-old`]
      assert.deepEqual(ids(filterAndSortTeamProjects(projects, status, order)), expected)
    }
  }
})

it('breaks date ties by title and identical title ties by ID deterministically', () => {
  const projects = [project('b', 'TODO', 'Bola'), project('z', 'TODO', 'Árvore'), project('a', 'TODO', 'Árvore')]
  for (const order of ['newest', 'oldest', 'name-asc'] as const) {
    assert.deepEqual(ids(filterAndSortTeamProjects(projects, ALL_PROJECT_STATUSES, order)), ['a', 'z', 'b'])
  }
  assert.deepEqual(ids(filterAndSortTeamProjects(projects, ALL_PROJECT_STATUSES, 'name-desc')), ['b', 'a', 'z'])
})

it('returns empty results for empty lists or an unmatched status', () => {
  assert.deepEqual(filterAndSortTeamProjects([]), [])
  assert.deepEqual(filterAndSortTeamProjects([project('todo', 'TODO')], 'DONE'), [])
})

it('does not mutate the fetched list or its projects, including when all statuses are shown', () => {
  const projects = Object.freeze([
    Object.freeze(project('done', 'DONE')),
    Object.freeze(project('todo', 'TODO')),
  ])
  assert.deepEqual(ids(filterAndSortTeamProjects(projects)), ['todo', 'done'])
  assert.deepEqual(ids([...projects]), ['done', 'todo'])
})

it('reapplies grouping and filtering to refreshed project statuses', () => {
  const projects = [project('a', 'TODO'), project('b', 'IN_PROGRESS')]
  const refreshed = projects.map((item) => item.id === 'a' ? { ...item, status: 'CANCELED' as const } : item)
  assert.deepEqual(ids(filterAndSortTeamProjects(refreshed)), ['b', 'a'])
  assert.deepEqual(filterAndSortTeamProjects(refreshed, 'TODO'), [])
})
