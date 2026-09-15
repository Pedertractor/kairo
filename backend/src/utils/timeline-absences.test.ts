import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseDayBounds } from './app-timezone.js';
import { clipAbsenceToDay, mapAbsencesToTeamDayBlocks } from './timeline-absences.js';

const { dayStart, dayEnd } = parseDayBounds('2026-09-15');

describe('clipAbsenceToDay', () => {
  it('clips a closed absence to the selected day', () => {
    const block = clipAbsenceToDay(
      {
        id: 'abs-1',
        startedAt: new Date(dayStart.getTime() + 6 * 60 * 60 * 1000),
        endedAt: new Date(dayStart.getTime() + 9 * 60 * 60 * 1000 + 14 * 60 * 1000),
      },
      dayStart,
      dayEnd,
      new Date(dayStart.getTime() + 12 * 60 * 60 * 1000),
    );

    assert.ok(block);
    assert.equal(block.id, 'abs-1');
    assert.equal(block.startedAt, new Date(dayStart.getTime() + 6 * 60 * 60 * 1000).toISOString());
    assert.equal(
      block.endedAt,
      new Date(dayStart.getTime() + 9 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(),
    );
  });

  it('keeps an in-progress absence live so the band can grow with now', () => {
    const now = new Date(dayStart.getTime() + 10 * 60 * 60 * 1000);
    const block = clipAbsenceToDay(
      {
        id: 'abs-open',
        startedAt: new Date(dayStart.getTime() + 6 * 60 * 60 * 1000),
        endedAt: null,
      },
      dayStart,
      dayEnd,
      now,
    );

    assert.ok(block);
    assert.equal(block.endedAt, null);
  });

  it('draws a scheduled open-ended absence until the end of that day', () => {
    const now = new Date(dayStart.getTime() + 8 * 60 * 60 * 1000);
    const tomorrow = parseDayBounds('2026-09-16');
    const block = clipAbsenceToDay(
      {
        id: 'abs-future',
        startedAt: new Date(tomorrow.dayStart.getTime() + 6 * 60 * 60 * 1000),
        endedAt: null,
      },
      tomorrow.dayStart,
      tomorrow.dayEnd,
      now,
    );

    assert.ok(block);
    assert.equal(block.endedAt, tomorrow.dayEnd.toISOString());
  });

  it('returns null when the absence does not overlap the day', () => {
    const yesterday = parseDayBounds('2026-09-14');
    const block = clipAbsenceToDay(
      {
        id: 'abs-other-day',
        startedAt: yesterday.dayStart,
        endedAt: yesterday.dayEnd,
      },
      dayStart,
      dayEnd,
      new Date(dayStart.getTime() + 12 * 60 * 60 * 1000),
    );

    assert.equal(block, null);
  });
});

describe('mapAbsencesToTeamDayBlocks', () => {
  it('keeps the member identity on clipped blocks', () => {
    const blocks = mapAbsencesToTeamDayBlocks(
      [
        {
          id: 'abs-1',
          userId: 'user-2',
          userName: 'Bia',
          startedAt: new Date(dayStart.getTime() + 7 * 60 * 60 * 1000),
          endedAt: new Date(dayStart.getTime() + 8 * 60 * 60 * 1000),
        },
      ],
      dayStart,
      dayEnd,
      new Date(dayStart.getTime() + 12 * 60 * 60 * 1000),
    );

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.userId, 'user-2');
    assert.equal(blocks[0]?.userName, 'Bia');
  });
});
