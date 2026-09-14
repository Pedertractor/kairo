import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { stopUnfinishedTimeEntriesForUser } from './stop-user-time-entries.js';

function makeEntry(overrides: {
  id: string;
  taskId?: string | null;
  cardId?: string | null;
  teamId?: string | null;
  via?: 'card' | 'task';
}) {
  const teamId = overrides.teamId ?? 'team-1';
  const via = overrides.via ?? (overrides.taskId ? 'task' : 'card');

  return {
    id: overrides.id,
    userId: 'user-1',
    taskId: overrides.taskId ?? null,
    cardId: overrides.cardId ?? null,
    startedAt: new Date('2026-01-01T10:00:00.000Z'),
    endedAt: null,
    card:
      via === 'card'
        ? { id: overrides.cardId ?? 'card-1', teamId }
        : null,
    task:
      via === 'task'
        ? {
            id: overrides.taskId ?? 'task-1',
            card: { id: 'project-1', teamId },
          }
        : null,
  };
}

describe('stopUnfinishedTimeEntriesForUser', () => {
  it('stops every unfinished entry for the user', async () => {
    const stopped: string[] = [];
    const entries = [
      makeEntry({ id: 'entry-1', cardId: 'activity-1', via: 'card' }),
      makeEntry({ id: 'entry-2', taskId: 'task-1', via: 'task' }),
    ];

    await stopUnfinishedTimeEntriesForUser(
      {
        findUnfinishedByUserId: async () => entries,
        stopEntry: async (entry: { id: string }) => {
          stopped.push(entry.id);
          return entry;
        },
        countActiveByTaskId: async () => 0,
        countActiveByCardId: async () => 0,
      } as never,
      { updateStatusIfOpen: async () => ({ count: 1 }) } as never,
      { updateStatusIfOpen: async () => ({ count: 1 }) } as never,
      'user-1',
    );

    assert.deepEqual(stopped, ['entry-1', 'entry-2']);
  });

  it('only stops entries that belong to the given team', async () => {
    const stopped: string[] = [];
    const entries = [
      makeEntry({
        id: 'same-team',
        cardId: 'activity-1',
        teamId: 'team-1',
        via: 'card',
      }),
      makeEntry({
        id: 'other-team',
        taskId: 'task-1',
        teamId: 'team-2',
        via: 'task',
      }),
    ];

    await stopUnfinishedTimeEntriesForUser(
      {
        findUnfinishedByUserId: async () => entries,
        stopEntry: async (entry: { id: string }) => {
          stopped.push(entry.id);
          return entry;
        },
        countActiveByTaskId: async () => 0,
        countActiveByCardId: async () => 0,
      } as never,
      { updateStatusIfOpen: async () => ({ count: 1 }) } as never,
      { updateStatusIfOpen: async () => ({ count: 1 }) } as never,
      'user-1',
      { teamId: 'team-1' },
    );

    assert.deepEqual(stopped, ['same-team']);
  });
});
