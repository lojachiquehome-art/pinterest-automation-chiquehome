import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCheckpoint } from './publish_checkpoint.mjs';
import vm from 'node:vm';

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'pinterest-checkpoint-'));
  mkdirSync(path.join(root, 'output'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
test('restart after ambiguous POST blocks retries', t => {
  const root = fixture(t);
  createCheckpoint(root).begin(19001);
  assert.throws(() => createCheckpoint(root).assertClear([]), /19001/);
});
test('completed pin survives restart and clears intent', t => {
  const root = fixture(t), cp = createCheckpoint(root);
  cp.begin(19001);
  cp.complete(19001, [{row_id:19001,pinterest_id:'real-id'}]);
  const history = JSON.parse(readFileSync(path.join(root,'output','published_pins.json')));
  assert.equal(history[0].pinterest_id,'real-id');
  createCheckpoint(root).assertClear(history);
});
test('definite rejection releases intent for retry', t => {
  const root = fixture(t), cp = createCheckpoint(root);
  cp.begin(19001); cp.reject(19001);
  createCheckpoint(root).assertClear([]);
});
test('failed durable synchronization fails closed', t => {
  const root = fixture(t);
  const cp = createCheckpoint(root, true, () => { throw new Error('push failed'); });
  assert.throws(() => cp.begin(19001), /push failed/);
  assert.throws(() => createCheckpoint(root).assertClear([]), /19001/);
});
test('known published pin resolves stale intent', t => {
  const root = fixture(t); createCheckpoint(root).begin(19001);
  createCheckpoint(root).assertClear([{row_id:19001,pin:{id:'remote-id'}}]);
});
test('five publication slots remain 12:30 through 12:34 UTC', () => {
  const source = readFileSync(new URL('./publish_pins.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('function scheduledPublishTime(');
  const end = source.indexOf('async function waitForScheduledPublishTime', start);
  const schedule = vm.runInNewContext(source.slice(start, end) + '\nscheduledPublishTime');
  assert.deepEqual(Array.from({length:5}, (_, i) => schedule('2026-11-16','09:30',i,60).toISOString()),
    ['2026-11-16T12:30:00.000Z','2026-11-16T12:31:00.000Z','2026-11-16T12:32:00.000Z','2026-11-16T12:33:00.000Z','2026-11-16T12:34:00.000Z']);
  assert.equal((Date.parse('2026-11-16T12:34:00Z') - Date.parse('2026-11-16T06:47:00Z')) / 60000, 347);
});
