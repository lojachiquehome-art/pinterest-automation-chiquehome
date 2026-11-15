import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// A persisted intent makes an interrupted POST explicitly ambiguous, never silently retried.
export function createCheckpoint(root, enabled = false, sync = null) {
  const file = path.join(root, 'output', 'publish_pending.json');
  const persist = sync || (() => {
    if (!enabled) return;
    const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    git('config', 'user.name', 'github-actions[bot]');
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    git('add', 'output/publish_pending.json', 'output/published_pins.json');
    if (git('diff', '--cached', '--name-only').toString().trim()) {
      git('commit', '-m', 'chore: checkpoint pinterest publication');
    }
    // Fail closed on divergence or a network error. Do not post without durable intent.
    git('push', 'origin', 'HEAD:main');
  });
  const read = () => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const save = items => writeFileSync(file, JSON.stringify(items, null, 2));
  return {
    assertClear(history) {
      const unresolved = read().filter(p => !history.some(h => String(h.row_id) === String(p.row_id) && (h.pinterest_id || h.pin?.id)));
      if (unresolved.length) throw new Error(`Unresolved Pinterest POST intent for rows ${unresolved.map(p => p.row_id).join(',')}. Reconcile with Pinterest before retrying.`);
    },
    begin(rowId) {
      save([...read().filter(p => String(p.row_id) !== String(rowId)), { row_id: rowId, started_at: new Date().toISOString() }]);
      persist();
    },
    complete(rowId, history) {
      writeFileSync(path.join(root, 'output', 'published_pins.json'), JSON.stringify(history, null, 2));
      save(read().filter(p => String(p.row_id) !== String(rowId)));
      persist();
    },
    reject(rowId) {
      save(read().filter(p => String(p.row_id) !== String(rowId)));
      persist();
    },
  };
}
