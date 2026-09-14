import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UserRole, type User } from '../generated/client.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { zonedDateTimeToUtc, formatDateKey, shiftDateKey } from '../utils/app-timezone.js';
import { AbsenceService } from './absence.service.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    employeeId: 'emp-1',
    name: 'Ana',
    unit: 'TRACTOR',
    cardNumber: '100',
    passwordHash: 'hash',
    role: UserRole.USER,
    active: true,
    firstLogin: false,
    absent: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function isoAt(dateKey: string, hour: number, minute: number): string {
  return zonedDateTimeToUtc(dateKey, hour, minute).toISOString();
}

function createService(options?: {
  hasTimeEntry?: boolean;
  covering?: { id: string; startedAt: Date; endedAt: Date | null } | null;
  open?: unknown;
  overlapping?: unknown;
  actor?: User;
  canLeaderManageUser?: boolean;
  managedUsers?: User[];
  users?: User[];
}) {
  const user = options?.actor ?? makeUser();
  const knownUsers = new Map(
    [user, ...(options?.managedUsers ?? []), ...(options?.users ?? [])].map(
      (known) => [known.id, known],
    ),
  );
  let covering = options?.covering ?? null;
  const created: Array<{
    userId: string;
    startedAt: Date;
    endedAt: Date | null;
    createdById: string;
  }> = [];
  const closed: Array<{ id: string; endedAt: Date }> = [];
  const deleted: string[] = [];
  const findAllCalls: number[] = [];
  let absentFlag: boolean | null = null;

  const userRepository = {
    findById: async (id: string) => knownUsers.get(id) ?? null,
    setAbsent: async (id: string, absent: boolean) => {
      absentFlag = absent;
      const target = knownUsers.get(id) ?? user;
      return { ...target, absent };
    },
    canLeaderManageUser: async () => options?.canLeaderManageUser ?? false,
    findAll: async () => {
      findAllCalls.push(1);
      return [...knownUsers.values()];
    },
    findManagedByTeamAdmin: async () => options?.managedUsers ?? [],
  };

  const absenceRepository = {
    findCoveringOn: async (_userId: string, on = new Date()) => {
      if (!covering) {
        return null;
      }

      if (covering.startedAt.getTime() > on.getTime()) {
        return null;
      }

      if (covering.endedAt !== null && covering.endedAt.getTime() <= on.getTime()) {
        return null;
      }

      return covering;
    },
    findOpenByUserId: async () => options?.open ?? null,
    findOverlapping: async () => options?.overlapping ?? null,
    create: async (data: (typeof created)[number]) => {
      created.push(data);
      covering = {
        id: 'absence-created',
        startedAt: data.startedAt,
        endedAt: data.endedAt,
      };
      return { id: 'absence-created', ...data };
    },
    close: async (id: string, endedAt: Date) => {
      closed.push({ id, endedAt });
      covering = null;
      return { id, endedAt };
    },
    delete: async (id: string) => {
      deleted.push(id);
      covering = null;
    },
    findById: async (id: string) =>
      covering && covering.id === id
        ? {
            ...covering,
            userId: user.id,
            createdById: user.id,
          }
        : null,
    findVisible: async () => [],
  };

  const timeEntryRepository = {
    hasAnyOnDay: async () => options?.hasTimeEntry ?? false,
    findActiveByUserId: async () => null,
    stopEntry: async () => ({}),
  };

  const service = new AbsenceService(
    userRepository as never,
    absenceRepository as never,
    timeEntryRepository as never,
    {} as never,
    {} as never,
  );

  return {
    service,
    user,
    created,
    closed,
    deleted,
    getAbsentFlag: () => absentFlag,
    setCovering: (
      next: { id: string; startedAt: Date; endedAt: Date | null } | null,
    ) => {
      covering = next;
    },
    findAllCalls,
  };
}

describe('AbsenceService creation rules', () => {
  it('allows a future absence without a time entry on that day', async () => {
    const today = formatDateKey(new Date());
    const tomorrow = shiftDateKey(today, 1);
    const { service, created, getAbsentFlag } = createService({
      hasTimeEntry: false,
    });

    await service.createForActor(
      'user-1',
      'user-1',
      isoAt(tomorrow, 6, 15),
      isoAt(tomorrow, 10, 0),
    );

    assert.equal(created.length, 1);
    assert.equal(created[0]?.endedAt?.toISOString(), isoAt(tomorrow, 10, 0));
    assert.equal(getAbsentFlag(), false);
  });

  it('rejects a past absence when that day has no time entry', async () => {
    const today = formatDateKey(new Date());
    const yesterday = shiftDateKey(today, -1);
    const { service } = createService({ hasTimeEntry: false });

    await assert.rejects(
      () =>
        service.createForActor(
          'user-1',
          'user-1',
          isoAt(yesterday, 6, 15),
          isoAt(yesterday, 10, 0),
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, MENSAGENS.AUSENCIA_PASSADA_SEM_APONTAMENTO);
        return true;
      },
    );
  });

  it('allows a past absence when that day already has a time entry', async () => {
    const today = formatDateKey(new Date());
    const yesterday = shiftDateKey(today, -1);
    const { service, created } = createService({ hasTimeEntry: true });

    await service.createForActor(
      'user-1',
      'user-1',
      isoAt(yesterday, 6, 15),
      isoAt(yesterday, 10, 0),
    );

    assert.equal(created.length, 1);
  });

  it('allows an absence for today after the user already started a time entry', async () => {
    const today = formatDateKey(new Date());
    const { service, created } = createService({ hasTimeEntry: true });

    await service.createForActor(
      'user-1',
      'user-1',
      isoAt(today, 13, 0),
      isoAt(today, 17, 0),
    );

    assert.equal(created.length, 1);
    assert.equal(created[0]?.startedAt.toISOString(), isoAt(today, 13, 0));
    assert.equal(created[0]?.endedAt?.toISOString(), isoAt(today, 17, 0));
  });

  it('allows an absence for today when the user has not started a time entry yet', async () => {
    const today = formatDateKey(new Date());
    const { service, created } = createService({ hasTimeEntry: false });

    await service.createForActor(
      'user-1',
      'user-1',
      isoAt(today, 6, 15),
      isoAt(today, 10, 0),
    );

    assert.equal(created.length, 1);
  });
});

describe('AbsenceService cancel and early return', () => {
  it('cancels a future absence', async () => {
    const tomorrow = shiftDateKey(formatDateKey(new Date()), 1);
    const user = makeUser();
    const deleted: string[] = [];
    const service = new AbsenceService(
      {
        findById: async () => user,
        canLeaderManageUser: async () => false,
      } as never,
      {
        findById: async () => ({
          id: 'absence-future',
          userId: user.id,
          createdById: user.id,
          startedAt: zonedDateTimeToUtc(tomorrow, 6, 15),
          endedAt: zonedDateTimeToUtc(tomorrow, 10, 0),
        }),
        delete: async (id: string) => {
          deleted.push(id);
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.cancelFuture(user.id, 'absence-future');
    assert.deepEqual(deleted, ['absence-future']);
  });

  it('refuses to cancel an absence that already started', async () => {
    const yesterday = shiftDateKey(formatDateKey(new Date()), -1);
    const user = makeUser();
    const service = new AbsenceService(
      {
        findById: async () => user,
        canLeaderManageUser: async () => false,
      } as never,
      {
        findById: async () => ({
          id: 'absence-past',
          userId: user.id,
          createdById: user.id,
          startedAt: zonedDateTimeToUtc(yesterday, 6, 15),
          endedAt: zonedDateTimeToUtc(yesterday, 10, 0),
        }),
        delete: async () => {
          throw new Error('must not delete a past absence');
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await assert.rejects(
      () => service.cancelFuture(user.id, 'absence-past'),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.message, MENSAGENS.AUSENCIA_PASSADA_IMUTAVEL);
        return true;
      },
    );
  });

  it('clips a covering absence end to the time-entry start on early return', async () => {
    const startedAt = zonedDateTimeToUtc('2026-07-10', 9, 0);
    const covering = {
      id: 'absence-morning',
      startedAt: zonedDateTimeToUtc('2026-07-10', 6, 15),
      endedAt: zonedDateTimeToUtc('2026-07-10', 10, 0),
    };
    const { service, closed, getAbsentFlag } = createService({ covering });

    await service.endCoveringAbsenceAt('user-1', startedAt);

    assert.equal(closed.length, 1);
    assert.equal(closed[0]?.id, covering.id);
    assert.equal(closed[0]?.endedAt.toISOString(), startedAt.toISOString());
    assert.equal(getAbsentFlag(), false);
  });

  it('does nothing when the person starts a time entry outside an absence', async () => {
    const { service, closed } = createService({ covering: null });

    await service.endCoveringAbsenceAt(
      'user-1',
      zonedDateTimeToUtc('2026-07-10', 9, 0),
    );

    assert.equal(closed.length, 0);
  });
});

describe('AbsenceService team-scoped access', () => {
  it('lets a team admin create an absence for a managed member', async () => {
    const today = formatDateKey(new Date());
    const tomorrow = shiftDateKey(today, 1);
    const member = makeUser({ id: 'member-1', name: 'Bruno' });
    const { service, created } = createService({
      actor: makeUser({ id: 'leader-1', role: UserRole.LEADER }),
      canLeaderManageUser: true,
      users: [member],
    });

    await service.createForActor(
      'leader-1',
      member.id,
      isoAt(tomorrow, 6, 15),
      isoAt(tomorrow, 10, 0),
    );

    assert.equal(created.length, 1);
    assert.equal(created[0]?.userId, member.id);
    assert.equal(created[0]?.createdById, 'leader-1');
  });

  it('rejects a member creating an absence for someone else', async () => {
    const today = formatDateKey(new Date());
    const tomorrow = shiftDateKey(today, 1);
    const { service } = createService({
      users: [makeUser({ id: 'other-user', name: 'Carlos' })],
    });

    await assert.rejects(
      () =>
        service.createForActor(
          'user-1',
          'other-user',
          isoAt(tomorrow, 6, 15),
          isoAt(tomorrow, 10, 0),
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 403);
        assert.equal(error.message, MENSAGENS.PROIBIDO);
        return true;
      },
    );
  });

  it('does not let an application admin create an absence for unmanaged users', async () => {
    const today = formatDateKey(new Date());
    const tomorrow = shiftDateKey(today, 1);
    const { service } = createService({
      actor: makeUser({ id: 'admin-1', role: UserRole.ADMIN }),
      canLeaderManageUser: false,
      users: [makeUser({ id: 'other-user', name: 'Carlos' })],
    });

    await assert.rejects(
      () =>
        service.createForActor(
          'admin-1',
          'other-user',
          isoAt(tomorrow, 6, 15),
          isoAt(tomorrow, 10, 0),
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 403);
        return true;
      },
    );
  });

  it('lists only the actor and members of teams they administer', async () => {
    const actor = makeUser({ id: 'leader-1', role: UserRole.ADMIN });
    const member = makeUser({ id: 'member-1', name: 'Bruno' });
    const { service, findAllCalls } = createService({
      actor,
      managedUsers: [member],
    });

    const result = await service.listForActor(actor.id);

    assert.equal(findAllCalls.length, 0);
    assert.deepEqual(
      result.users.map((item) => item.id).sort(),
      ['leader-1', 'member-1'],
    );
  });

  it('refuses an application admin cancelling an unmanaged absence', async () => {
    const tomorrow = shiftDateKey(formatDateKey(new Date()), 1);
    const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN });
    const service = new AbsenceService(
      {
        findById: async () => admin,
        canLeaderManageUser: async () => false,
      } as never,
      {
        findById: async () => ({
          id: 'absence-other',
          userId: 'other-user',
          createdById: 'other-user',
          startedAt: zonedDateTimeToUtc(tomorrow, 6, 15),
          endedAt: zonedDateTimeToUtc(tomorrow, 10, 0),
        }),
        delete: async () => {
          throw new Error('must not cancel an unmanaged absence');
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await assert.rejects(
      () => service.cancelFuture(admin.id, 'absence-other'),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 403);
        return true;
      },
    );
  });
});
