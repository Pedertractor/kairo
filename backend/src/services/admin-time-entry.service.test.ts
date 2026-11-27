import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { UserRole } from '../generated/client.js';
import type {
  AdminTimeEntryRecord,
  TimeEntryAuditWrite,
  TimeEntryWriteData,
} from '../repositories/admin-time-entry.repository.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import {
  AdminTimeEntryService,
  type AdminTimeEntryStore,
} from './admin-time-entry.service.js';

const NOW = new Date('2026-11-26T15:00:00.000Z');
const at = (iso: string) => new Date(iso);

type Actor = { role: UserRole; active: boolean };

let actors: Record<string, Actor>;
let lockedActors: Record<string, Actor>;
let entries: Map<string, AdminTimeEntryRecord>;
let audits: TimeEntryAuditWrite[];
let released: { cardId: string | null; taskId: string | null }[];
let transactions: number;
let failAudit: boolean;
let service: AdminTimeEntryService;
let searchedFor: string[];

const canLog = (itemId: string, userId: string) =>
  Boolean(userId) && !itemId.includes('Foreign');

function record(
  id: string,
  userId: string,
  startedAt: string,
  endedAt: string | null,
  extra: Partial<AdminTimeEntryRecord> = {},
): AdminTimeEntryRecord {
  const start = at(startedAt);
  const end = endedAt ? at(endedAt) : null;
  return {
    id,
    userId,
    cardId: 'card1',
    taskId: null,
    type: 'TIMER',
    startedAt: start,
    endedAt: end,
    durationSeconds: end ? Math.floor((end.getTime() - start.getTime()) / 1000) : null,
    note: null,
    createdAt: start,
    updatedAt: start,
    user: { id: userId, name: userId },
    card: { id: 'card1', title: 'Atividade', type: 'ACTIVITY', teamId: 'team1', team: { name: 'Equipe' } },
    task: null,
    ...extra,
  } as AdminTimeEntryRecord;
}

function apply(entry: AdminTimeEntryRecord, data: TimeEntryWriteData): AdminTimeEntryRecord {
  return {
    ...entry,
    ...data,
    durationSeconds: data.endedAt
      ? Math.floor((data.endedAt.getTime() - data.startedAt.getTime()) / 1000)
      : null,
  };
}

function makeStore(): AdminTimeEntryStore {
  const store = {
    // Mimics a rollback: writes are staged and only kept if the work succeeds.
    inUserTransaction: async (_userId: string, fn: (repo: any) => Promise<unknown>) => {
      transactions++;
      const snapshot = new Map(entries);
      const auditCount = audits.length;
      try {
        return await fn(store);
      } catch (error) {
        entries = snapshot;
        audits.length = auditCount;
        throw error;
      }
    },
    lockActor: async (id: string) => lockedActors[id] ?? actors[id] ?? null,
    findUserById: async (id: string) =>
      ['target', 'other'].includes(id) ? { id, name: id, active: true } : null,
    listUserOptions: async () => [],
    findEntryById: async (id: string) => entries.get(id) ?? null,
    list: async () => [...entries.values()],
    count: async () => entries.size,
    // Items whose id contains "Foreign" belong to a team the collaborator is not in.
    findActivity: async (id: string, userId: string) =>
      id.startsWith('card') ? { id, userCanLog: canLog(id, userId) } : null,
    findTask: async (id: string, userId: string) =>
      id.startsWith('task') ? { id, userCanLog: canLog(id, userId) } : null,
    searchActivities: async (userId: string) => {
      searchedFor.push(userId);
      return [];
    },
    searchTasks: async (userId: string) => {
      searchedFor.push(userId);
      return [];
    },
    findOverlapping: async (userId: string, start: Date, end: Date | null, excludeId?: string) =>
      [...entries.values()].find(
        (e) =>
          e.userId === userId &&
          e.id !== excludeId &&
          (!end || e.startedAt < end) &&
          (e.endedAt === null || e.endedAt > start),
      ) ?? null,
    createManual: async (userId: string, data: TimeEntryWriteData) => {
      const created = apply(record(`new${entries.size}`, userId, data.startedAt.toISOString(), null), data);
      const entry = { ...created, type: 'MANUAL' } as AdminTimeEntryRecord;
      entries.set(entry.id, entry);
      return entry;
    },
    update: async (id: string, data: TimeEntryWriteData) => {
      const updated = apply(entries.get(id)!, data);
      entries.set(id, updated);
      return updated;
    },
    delete: async (id: string) => {
      const existing = entries.get(id)!;
      entries.delete(id);
      return existing;
    },
    writeAudit: async (log: TimeEntryAuditWrite) => {
      if (failAudit) throw new Error('audit unavailable');
      audits.push(log);
      return {};
    },
    findAuditByEntryId: async () => [],
  };
  return store as unknown as AdminTimeEntryStore;
}

beforeEach(() => {
  actors = {
    admin: { role: 'ADMIN', active: true },
    leader: { role: 'LEADER', active: true },
    supervisor: { role: 'SUPERVISOR', active: true },
    user: { role: 'USER', active: true },
    inactiveAdmin: { role: 'ADMIN', active: false },
  };
  lockedActors = {};
  entries = new Map([
    ['closed', record('closed', 'target', '2026-11-25T11:00:00.000Z', '2026-11-25T13:00:00.000Z')],
    ['running', record('running', 'target', '2026-11-26T12:00:00.000Z', null)],
    ['otherUser', record('otherUser', 'other', '2026-11-25T11:00:00.000Z', '2026-11-25T13:00:00.000Z')],
  ]);
  audits = [];
  released = [];
  transactions = 0;
  failAudit = false;
  searchedFor = [];
  service = new AdminTimeEntryService(
    { findById: async (id) => actors[id] ?? null },
    makeStore(),
    async (item) => {
      released.push({ cardId: item.cardId, taskId: item.taskId });
    },
    () => NOW,
  );
});

async function rejectsWith(promise: Promise<unknown>, status: number, message?: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AppError, String(error));
    assert.equal(error.statusCode, status);
    if (message) assert.equal(error.message, message);
    return true;
  });
}

const createInput = {
  userId: 'target',
  cardId: 'card1',
  startedAt: '2026-11-25T14:00:00.000Z',
  endedAt: '2026-11-25T15:00:00.000Z',
};

describe('AdminTimeEntryService authorization (service layer)', () => {
  for (const actor of ['leader', 'supervisor', 'user', 'inactiveAdmin', 'ghost']) {
    it(`blocks ${actor} on every operation without touching data`, async () => {
      const before = new Map(entries);
      await rejectsWith(service.list(actor, { page: 1, pageSize: 20, activeOnly: false }), 403);
      await rejectsWith(service.listUsers(actor), 403);
      await rejectsWith(service.searchWorkItems(actor, { userId: 'target' }), 403);
      await rejectsWith(service.getAudit(actor, 'closed'), 403);
      await rejectsWith(service.create(actor, createInput), 403);
      await rejectsWith(service.update(actor, 'closed', { note: 'x' }), 403);
      await rejectsWith(service.remove(actor, 'closed'), 403);
      assert.deepEqual(entries, before);
      assert.equal(audits.length, 0);
      assert.equal(transactions, 0);
    });
  }

  it('blocks a write when the admin is demoted mid-request (re-check inside the transaction)', async () => {
    lockedActors.admin = { role: 'LEADER', active: true };
    await rejectsWith(service.create('admin', createInput), 403);
    await rejectsWith(service.update('admin', 'closed', { note: 'x' }), 403);
    await rejectsWith(service.remove('admin', 'closed'), 403);
    assert.equal(entries.size, 3);
    assert.equal(entries.get('closed')!.note, null);
    assert.equal(audits.length, 0);
  });
});

describe('AdminTimeEntryService rules', () => {
  it('creates a MANUAL entry and audits it', async () => {
    const result = await service.create('admin', { ...createInput, note: 'ajuste' });
    assert.equal(result.timeEntry.type, 'MANUAL');
    assert.equal(result.timeEntry.durationSeconds, 3600);
    assert.equal(audits.length, 1);
    assert.equal(audits[0].action, 'CREATE');
    assert.equal(audits[0].actorId, 'admin');
    assert.equal(audits[0].targetUserId, 'target');
    assert.equal(audits[0].before, null);
    assert.equal((audits[0].after as any).note, 'ajuste');
  });

  it('rejects overlapping intervals with 409', async () => {
    await rejectsWith(
      service.create('admin', { ...createInput, startedAt: '2026-11-25T12:30:00.000Z', endedAt: '2026-11-25T13:30:00.000Z' }),
      409,
      MENSAGENS.APONTAMENTO_SOBREPOSTO,
    );
    // Overlaps the running timer (open-ended).
    await rejectsWith(
      service.create('admin', { ...createInput, startedAt: '2026-11-26T13:00:00.000Z', endedAt: '2026-11-26T14:00:00.000Z' }),
      409,
    );
    await rejectsWith(
      service.update('admin', 'closed', { endedAt: '2026-11-26T12:30:00.000Z', startedAt: '2026-11-26T11:00:00.000Z' }),
      409,
    );
    assert.equal(audits.length, 0);
  });

  it('allows touching intervals and other users at the same time', async () => {
    await service.create('admin', { ...createInput, startedAt: '2026-11-25T13:00:00.000Z', endedAt: '2026-11-25T14:00:00.000Z' });
    await service.create('admin', { ...createInput, userId: 'other', startedAt: '2026-11-25T13:00:00.000Z', endedAt: '2026-11-25T14:00:00.000Z' });
    assert.equal(audits.length, 2);
  });

  it('validates dates: future, inverted, over 24h', async () => {
    await rejectsWith(
      service.create('admin', { ...createInput, startedAt: '2026-11-26T15:30:00.000Z', endedAt: '2026-11-26T16:00:00.000Z' }),
      400,
      MENSAGENS.APONTAMENTO_DATA_FUTURA,
    );
    await rejectsWith(
      service.create('admin', { ...createInput, endedAt: createInput.startedAt }),
      400,
      MENSAGENS.APONTAMENTO_INTERVALO_INVALIDO,
    );
    await rejectsWith(
      service.create('admin', { ...createInput, startedAt: '2026-11-20T10:00:00.000Z', endedAt: '2026-11-21T10:00:01.000Z' }),
      400,
      MENSAGENS.APONTAMENTO_DURACAO_EXCEDIDA,
    );
  });

  it('rejects unknown users and work items', async () => {
    await rejectsWith(service.create('admin', { ...createInput, userId: 'ghost' }), 404);
    await rejectsWith(service.create('admin', { ...createInput, cardId: 'nope' }), 404);
    await rejectsWith(service.update('admin', 'closed', { taskId: 'nope' }), 404);
    await rejectsWith(service.update('admin', 'missing', { note: 'x' }), 404);
  });

  it("only offers and accepts work items from the collaborator's teams", async () => {
    await service.searchWorkItems('admin', { userId: 'target' });
    assert.deepEqual(searchedFor, ['target', 'target']);

    const before = new Map(entries);
    const outside = MENSAGENS.APONTAMENTO_ITEM_FORA_DA_EQUIPE;
    await rejectsWith(
      service.create('admin', { ...createInput, cardId: 'cardForeign' }),
      400,
      outside,
    );
    await rejectsWith(
      service.update('admin', 'closed', { taskId: 'taskForeign' }),
      400,
      outside,
    );
    assert.deepEqual(entries, before);
    assert.equal(audits.length, 0);

    // Item left unchanged: other fields can still be edited without a team check.
    await service.update('admin', 'closed', { note: 'ajuste' });
    assert.equal(entries.get('closed')!.note, 'ajuste');
  });

  it('does not reopen a closed entry', async () => {
    await rejectsWith(
      service.update('admin', 'closed', { endedAt: null }),
      400,
      MENSAGENS.APONTAMENTO_REABERTURA_PROIBIDA,
    );
  });

  it('updates with a before/after audit, and skips no-op updates', async () => {
    await service.update('admin', 'closed', { note: null });
    assert.equal(audits.length, 0);

    const result = await service.update('admin', 'closed', {
      startedAt: '2026-11-25T10:00:00.000Z',
      note: 'corrigido',
    });
    assert.equal(result.timeEntry.durationSeconds, 3 * 3600);
    assert.equal(audits.length, 1);
    assert.equal(audits[0].action, 'UPDATE');
    assert.equal((audits[0].before as any).startedAt, '2026-11-25T11:00:00.000Z');
    assert.equal((audits[0].after as any).startedAt, '2026-11-25T10:00:00.000Z');
    assert.equal((audits[0].after as any).note, 'corrigido');
    assert.deepEqual(released, []);
  });

  it('releases the work item when a running entry is closed, moved or deleted', async () => {
    await service.update('admin', 'running', { endedAt: '2026-11-26T14:00:00.000Z' });
    assert.deepEqual(released, [{ cardId: 'card1', taskId: null }]);

    entries.set('running2', record('running2', 'other', '2026-11-26T14:00:00.000Z', null));
    await service.update('admin', 'running2', { taskId: 'task1' });
    assert.equal(entries.get('running2')!.taskId, 'task1');
    assert.equal(entries.get('running2')!.cardId, null);
    assert.equal(released.length, 2);

    entries.set('running3', record('running3', 'target', '2026-11-26T14:30:00.000Z', null));
    await service.remove('admin', 'running3');
    assert.equal(released.length, 3);

    await service.remove('admin', 'closed');
    assert.equal(released.length, 3);
    assert.equal(audits.at(-1)!.action, 'DELETE');
    assert.equal(audits.at(-1)!.after, null);
    assert.equal(entries.has('closed'), false);
  });

  it('rolls the change back when the audit cannot be written', async () => {
    failAudit = true;
    await assert.rejects(service.update('admin', 'closed', { note: 'x' }));
    await assert.rejects(service.remove('admin', 'closed'));
    assert.equal(entries.get('closed')!.note, null);
  });
});
