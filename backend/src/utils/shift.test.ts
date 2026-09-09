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

  it('rejects midnight-to-midnight placeholders and overnight ranges', () => {
    assert.equal(
      parseExternalShiftBounds(
        '1970-01-01T03:00:00.000Z',
        '1970-01-01T03:00:00.000Z',
      ),
      null,
    );
    assert.equal(parseShiftBounds('22:00', '06:00'), null);
  });
});
