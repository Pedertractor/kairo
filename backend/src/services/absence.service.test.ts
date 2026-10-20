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
    absencesSeenAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function isoAt(dateKey: string, hour: number, minute: number): string {
  return zonedDateTimeToUtc(dateKey, hour, minute).toISOString();
}

type PeriodRecord = {
  id: string;
  userId: string;
  createdById: string;
  startedAt: Date;
  endedAt: Date | null;
  createdAt?: Date;
  user?: { id: string; name: string };
  createdBy?: { id: string; name: string };
};

function createService(options?: {
  hasTimeEntry?: boolean;
  covering?: { id: string; startedAt: Date; endedAt: Date | null } | null;
  open?: unknown;
  overlapping?: unknown;
  actor?: User;
  canLeaderManageUser?: boolean;
  managedUsers?: User[];
  users?: User[];
  unseenCount?: number;
  periods?: PeriodRecord[];
}) {
  const user = options?.actor ?? makeUser();
  const knownUsers = new Map(
    [user, ...(options?.managedUsers ?? []), ...(options?.users ?? [])].map(
      (known) => [known.id, known],
    ),
  );
  let covering = options?.covering ?? null;
  const periods = new Map(
    (options?.periods ?? []).map((period) => [period.id, period]),
  );
  const created: Array<{
    userId: string;
    startedAt: Date;
    endedAt: Date | null;
    createdById: string;
  }> = [];
  const closed: Array<{ id: string; endedAt: Date }> = [];
  const deleted: string[] = [];
  const updated: Array<{
    id: string;
    userId: string;
    startedAt: Date;
    endedAt: Date | null;
  }> = [];
  const findAllCalls: number[] = [];
  const findAllFilteredCalls: Array<Record<string, unknown>> = [];
  let absentFlag: boolean | null = null;
  const absentFlags = new Map<string, boolean>();
  let markedSeenAt: Date | null = null;
  const countCalls: Array<{
    userIds: string[];
    excludeCreatedById: string;
    since: Date | null;
  }> = [];

  const userRepository = {
    findById: async (id: string) => knownUsers.get(id) ?? null,
    setAbsent: async (id: string, absent: boolean) => {
      absentFlag = absent;
      absentFlags.set(id, absent);
      const target = knownUsers.get(id) ?? user;
      return { ...target, absent };
    },
    canLeaderManageUser: async () => options?.canLeaderManageUser ?? false,
    findAll: async () => {
      findAllCalls.push(1);
      return [...knownUsers.values()].filter((known) => known.active);
    },
    findManagedByTeamAdmin: async () => options?.managedUsers ?? [],
    markAbsencesSeen: async (id: string, at: Date) => {
      markedSeenAt = at;
      const target = knownUsers.get(id) ?? user;
      const updatedUser = { ...target, absencesSeenAt: at };
      knownUsers.set(id, updatedUser);
      return updatedUser;
    },
  };

  const absenceRepository = {
    findCoveringOn: async (userId: string, on = new Date()) => {
      for (const period of periods.values()) {
        if (period.userId !== userId) {
          continue;
        }

        if (period.startedAt.getTime() > on.getTime()) {
          continue;
        }

        if (
          period.endedAt !== null &&
          period.endedAt.getTime() <= on.getTime()
        ) {
          continue;
        }

        return period;
      }

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
    findOverlapping: async (
      _userId: string,
      _startedAt: Date,
      _endedAt: Date | null,
      _excludeId?: string,
    ) => options?.overlapping ?? null,
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
      periods.delete(id);
      covering = null;
    },
    update: async (
      id: string,
      data: { userId: string; startedAt: Date; endedAt: Date | null },
    ) => {
      updated.push({ id, ...data });
      const existing = periods.get(id);
      if (existing) {
        periods.set(id, { ...existing, ...data });
      }
      covering = { id, startedAt: data.startedAt, endedAt: data.endedAt };
      return { id, ...data };
    },
    findById: async (id: string) => {
      const fromPeriods = periods.get(id);
      if (fromPeriods) {
        const periodUser = knownUsers.get(fromPeriods.userId);
        const creator = knownUsers.get(fromPeriods.createdById);
        return {
          ...fromPeriods,
          user: periodUser
            ? { id: periodUser.id, name: periodUser.name }
            : { id: fromPeriods.userId, name: 'Unknown' },
          createdBy: creator
            ? { id: creator.id, name: creator.name }
            : { id: fromPeriods.createdById, name: 'Unknown' },
        };
      }

      return covering && covering.id === id
        ? {
            ...covering,
            userId: user.id,
            createdById: user.id,
          }
        : null;
    },
    findVisible: async () => [],
    findAllFiltered: async (filters: Record<string, unknown>) => {
      findAllFilteredCalls.push(filters);
      return [...periods.values()].map((period) => {
        const periodUser = knownUsers.get(period.userId);
        const creator = knownUsers.get(period.createdById);
        return {
          ...period,
          createdAt: period.createdAt ?? period.startedAt,
          user: periodUser
            ? { id: periodUser.id, name: periodUser.name }
            : { id: period.userId, name: 'Unknown' },
          createdBy: creator
            ? { id: creator.id, name: creator.name }
            : { id: period.createdById, name: 'Unknown' },
        };
      });
    },
    countCreatedByOthersSince: async (
      userIds: string[],
      excludeCreatedById: string,
      since: Date | null,
    ) => {
      countCalls.push({ userIds, excludeCreatedById, since });
      return options?.unseenCount ?? 0;
    },
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
    updated,
    getAbsentFlag: () => absentFlag,
    getAbsentFlags: () => absentFlags,
    getMarkedSeenAt: () => markedSeenAt,
    countCalls,
    setCovering: (
      next: { id: string; startedAt: Date; endedAt: Date | null } | null,
    ) => {
      covering = next;
    },
    findAllCalls,
    findAllFilteredCalls,
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

describe('AbsenceService admin operations', () => {
  it('lists every absence for an application admin', async () => {
    const today = formatDateKey(new Date());
    const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN, name: 'Admin' });
    const member = makeUser({ id: 'member-1', name: 'Bruno' });
    const other = makeUser({ id: 'other-1', name: 'Carlos' });
    const { service, findAllCalls, findAllFilteredCalls } = createService({
      actor: admin,
      users: [member, other],
      periods: [
        {
          id: 'absence-1',
          userId: 'other-1',
          createdById: 'member-1',
          startedAt: zonedDateTimeToUtc(today, 6, 15),
          endedAt: zonedDateTimeToUtc(today, 10, 0),
          createdAt: zonedDateTimeToUtc(today, 5, 0),
        },
      ],
    });

    const result = await service.listForAdmin(admin.id);

    assert.equal(findAllCalls.length, 1);
    assert.equal(findAllFilteredCalls.length, 1);
    assert.equal(result.absences.length, 1);
    assert.equal(result.absences[0]?.userId, 'other-1');
    assert.deepEqual(
      result.users.map((item) => item.id).sort(),
      ['admin-1', 'member-1', 'other-1'],
    );
  });

  it('rejects a non-admin listing all absences', async () => {
    const actor = makeUser({ id: 'user-1', role: UserRole.USER });
    const { service, findAllFilteredCalls } = createService({ actor });

    await assert.rejects(
      () => service.listForAdmin(actor.id),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 403);
        return true;
      },
    );
    assert.equal(findAllFilteredCalls.length, 0);
  });

  it('lets an application admin edit any absence including past ones', async () => {
    const today = formatDateKey(new Date());
    const yesterday = shiftDateKey(today, -1);
    const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN });
    const member = makeUser({ id: 'member-1', name: 'Bruno' });
    const { service, updated, getAbsentFlags } = createService({
      actor: admin,
      users: [member],
      periods: [
        {
          id: 'absence-past',
          userId: 'member-1',
          createdById: 'member-1',
          startedAt: zonedDateTimeToUtc(yesterday, 6, 15),
          endedAt: zonedDateTimeToUtc(yesterday, 10, 0),
        },
      ],
    });

    await service.updateForAdmin(
      admin.id,
      'absence-past',
      'member-1',
      isoAt(yesterday, 7, 0),
      isoAt(yesterday, 11, 0),
    );

    assert.equal(updated.length, 1);
    assert.equal(updated[0]?.id, 'absence-past');
    assert.equal(
      updated[0]?.startedAt.toISOString(),
      zonedDateTimeToUtc(yesterday, 7, 0).toISOString(),
    );
    assert.equal(getAbsentFlags().get('member-1'), false);
  });

  it('lets an application admin delete any absence', async () => {
    const today = formatDateKey(new Date());
    const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN });
    const member = makeUser({ id: 'member-1', name: 'Bruno' });
    const { service, deleted, getAbsentFlags } = createService({
      actor: admin,
      users: [member],
      periods: [
        {
          id: 'absence-ongoing',
          userId: 'member-1',
          createdById: 'admin-1',
          startedAt: zonedDateTimeToUtc(today, 6, 15),
          endedAt: null,
        },
      ],
    });

    await service.deleteForAdmin(admin.id, 'absence-ongoing');

    assert.deepEqual(deleted, ['absence-ongoing']);
    assert.equal(getAbsentFlags().get('member-1'), false);
  });

  it('rejects a non-admin deleting an absence', async () => {
    const actor = makeUser({ id: 'leader-1', role: UserRole.LEADER });
    const { service, deleted } = createService({
      actor,
      periods: [
        {
          id: 'absence-1',
          userId: 'leader-1',
          createdById: 'leader-1',
          startedAt: new Date('2026-01-01T10:00:00.000Z'),
          endedAt: new Date('2026-01-01T12:00:00.000Z'),
        },
      ],
    });

    await assert.rejects(
      () => service.deleteForAdmin(actor.id, 'absence-1'),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 403);
        return true;
      },
    );
    assert.deepEqual(deleted, []);
  });
});

describe('AbsenceService unseen count', () => {
  it('counts all absences created by others when absencesSeenAt is null', async () => {
    const actor = makeUser({ id: 'leader-1', role: UserRole.LEADER });
    const member = makeUser({ id: 'member-1', name: 'Bruno' });
    const { service, countCalls } = createService({
      actor,
      managedUsers: [member],
      unseenCount: 3,
    });

    const result = await service.countUnseenForActor(actor.id);

    assert.equal(result.count, 3);
    assert.equal(result.absencesSeenAt, null);
    assert.equal(countCalls.length, 1);
    assert.deepEqual(countCalls[0]?.userIds, ['member-1']);
    assert.equal(countCalls[0]?.excludeCreatedById, 'leader-1');
    assert.equal(countCalls[0]?.since, null);
  });

  it('passes absencesSeenAt so only newer absences by others are counted', async () => {
    const seenAt = new Date('2026-10-01T12:00:00.000Z');
    const actor = makeUser({
      id: 'leader-1',
      role: UserRole.LEADER,
      absencesSeenAt: seenAt,
    });
    const member = makeUser({ id: 'member-1', name: 'Bruno' });
    const { service, countCalls } = createService({
      actor,
      managedUsers: [member],
      unseenCount: 1,
    });

    const result = await service.countUnseenForActor(actor.id);

    assert.equal(result.count, 1);
    assert.equal(result.absencesSeenAt, seenAt.toISOString());
    assert.equal(countCalls[0]?.excludeCreatedById, 'leader-1');
    assert.equal(countCalls[0]?.since?.toISOString(), seenAt.toISOString());
  });

  it('marks absences as seen and returns count zero', async () => {
    const actor = makeUser({ id: 'leader-1', role: UserRole.LEADER });
    const { service, getMarkedSeenAt } = createService({ actor });

    const before = Date.now();
    const result = await service.markSeenForActor(actor.id);
    const after = Date.now();

    assert.equal(result.count, 0);
    assert.ok(result.absencesSeenAt);
    const marked = getMarkedSeenAt();
    assert.ok(marked);
    assert.ok(marked.getTime() >= before);
    assert.ok(marked.getTime() <= after);
    assert.equal(result.absencesSeenAt, marked.toISOString());
  });
});
