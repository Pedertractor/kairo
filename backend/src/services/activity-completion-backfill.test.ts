import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseBackfillArguments } from './activity-completion-backfill.js';

it('defaults to preview and requires an exact explicit apply argument', () => {
  assert.equal(parseBackfillArguments([]), false);
  assert.equal(parseBackfillArguments(['--dry-run']), false);
  assert.equal(parseBackfillArguments(['--apply']), true);
  for (const args of [['--apply', '--dry-run'], ['--aply'], ['--apply=true'], ['--apply', '--apply']]) {
    assert.throws(() => parseBackfillArguments(args), /Use --dry-run/);
  }
});
