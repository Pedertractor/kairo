import { updateUserShiftSchema } from '../schemas/user.schema.js';
import { updateMemberShiftSchema } from '../schemas/team.schema.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseExternalShiftBounds,
  parseExternalTimeToMinutes,
  parseShiftBounds,
} from './shift.js';

describe('shift parsing from the HR API', () => {
  it('reads firstEntry / secondExit timestamps as São Paulo wall-clock minutes', () => {
    assert.equal(
      parseExternalTimeToMinutes('1970-01-01T09:15:00.000Z'),
      6 * 60 + 15,
    );
    assert.equal(
      parseExternalTimeToMinutes('1970-01-01T18:03:00.000Z'),
      15 * 60 + 3,
    );
  });

  it('uses only the shift limits and ignores lunch punches', () => {
    const bounds = parseExternalShiftBounds(
      '1970-01-01T09:15:00.000Z',
      '1970-01-01T18:03:00.000Z',
    );

    assert.deepEqual(bounds, {
      startMinutes: 6 * 60 + 15,
      endMinutes: 15 * 60 + 3,
    });
    assert.equal(
      parseExternalTimeToMinutes('1970-01-01T12:00:00.000Z'),
      9 * 60,
      'firstExit / secondEntry exist on the payload but are not used as bounds',
    );
  });

  it('accepts plain HH:mm as well as HR timestamps', () => {
    assert.deepEqual(parseShiftBounds('06:15', '15:03'), {
      startMinutes: 6 * 60 + 15,
      endMinutes: 15 * 60 + 3,
    });
    assert.deepEqual(parseExternalShiftBounds('06:15', '15:03'), {
      startMinutes: 6 * 60 + 15,
      endMinutes: 15 * 60 + 3,
    });
  });

  it('rejects midnight-to-midnight placeholders', () => {
    assert.equal(
      parseExternalShiftBounds(
        '1970-01-01T03:00:00.000Z',
        '1970-01-01T03:00:00.000Z',
      ),
      null,
    );
    assert.deepEqual(parseShiftBounds('22:00', '06:00'), { startMinutes: 1320, endMinutes: 360 });
  });
});


describe('overnight shift input validation', () => {
  it('accepts manual and HR overnight shifts, including an end at midnight', () => {
    for (const parse of [parseShiftBounds, parseExternalShiftBounds]) {
      assert.deepEqual(parse('20:00', '02:00'), { startMinutes: 1200, endMinutes: 120 });
      assert.deepEqual(parse('20:00', '00:00'), { startMinutes: 1200, endMinutes: 0 });
      assert.equal(parse('08:00', '08:00'), null);
      assert.equal(parse('25:00', '02:00'), null);
      assert.equal(parse('20:00', '02:99'), null);
    }
    assert.deepEqual(parseExternalShiftBounds('1970-01-01T23:00:00Z', '1970-01-01T05:00:00Z'),
      { startMinutes: 1200, endMinutes: 120 });
  });
});

describe('shift endpoint schemas', () => {
  it('accepts overnight ranges on both routes and rejects equal or invalid times', () => {
    for (const schema of [updateUserShiftSchema, updateMemberShiftSchema]) {
      assert.equal(schema.safeParse({ start: '20:00', end: '02:00' }).success, true);
      for (const [start, end] of [['08:00', '08:00'], ['25:00', '02:00'], ['20:00', '02:99']]) {
        assert.equal(schema.safeParse({ start, end }).success, false);
      }
    }
  });
});


describe('overnight history loading', () => {
  it('loads the previous local day even when a shift ended before the report start', async () => {
    const { ShiftRepository } = await import('../repositories/shift.repository.js');
    const { zonedDateTimeToUtc } = await import('./app-timezone.js');
    let query: any;
    const repository = new ShiftRepository({
      userShiftPeriod: { findMany: async (value: any) => { query = value; return []; } },
    } as any);
    const start = zonedDateTimeToUtc('2026-07-07');
    const end = zonedDateTimeToUtc('2026-07-08');
    await repository.findOverlappingRange(['user'], start, end);
    assert.deepEqual(query.where.OR[1].endedAt.gt, zonedDateTimeToUtc('2026-07-06'));
    assert.deepEqual(query.where.startedAt.lt, end);
    assert.deepEqual(query.where.userId.in, ['user']);
  });
});
