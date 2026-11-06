import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TaskService } from './task.service.js';

function setup(options: { completedAt?: Date | null; member?: boolean; cardId?: string } = {}) {
  const task = {
    id: 'task-1', cardId: options.cardId ?? 'project-1', title: 'Inspeção',
    description: 'Inspecionar equipamento', status: 'DONE', complexityLevel: null,
    estimatedHours: null, assignedToId: null, assignedTo: null,
    createdById: 'user-1', sortOrder: 0,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-11-06T12:00:00Z'),
    completedAt: options.completedAt ?? null,
    card: { teamId: 'team-1' },
  };
  return new TaskService(
    { findById: async () => task } as never,
    { findProjectById: async () => ({ id: 'project-1', title: 'Revisão da linha', teamId: 'team-1', type: 'PROJECT' }) } as never,
    { findMembershipByTeamAndUser: async () => options.member === false ? null : { role: 'ADMIN', team: { active: true } } } as never,
    { getLoggedSecondsByTaskId: async () => 3600 } as never,
    { findTaskFavorite: async () => null } as never,
    {} as never, {} as never,
  );
}

describe('Task details for analytics', () => {
  it('returns the parent project and recorded completion, independently of later updates', async () => {
    const completedAt = new Date('2026-10-20T15:30:00Z');
    const result = await setup({ completedAt }).getTask('project-1', 'task-1', 'user-1');
    assert.equal(result.projectTitle, 'Revisão da linha');
    assert.equal(result.cardId, 'project-1');
    assert.equal(result.completedAt, completedAt.toISOString());
    assert.notEqual(result.completedAt, result.updatedAt);
    assert.equal(result.loggedSeconds, 3600);
  });

  it('does not invent a completion date when none was recorded', async () => {
    const result = await setup().getTask('project-1', 'task-1', 'user-1');
    assert.equal(result.completedAt, null);
  });

  it('rejects access by a user outside the team', async () => {
    await assert.rejects(setup({ member: false }).getTask('project-1', 'task-1', 'outsider'), { statusCode: 404 });
  });

  it('rejects a task belonging to another project', async () => {
    await assert.rejects(setup({ cardId: 'project-2' }).getTask('project-1', 'task-1', 'user-1'), { statusCode: 404 });
  });
});
