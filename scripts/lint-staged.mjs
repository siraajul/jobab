import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';

// Each workspace owns its lint version/config; web uses ESLint 9 flat config
// while backend/shared retain their compatible ESLint 8 configurations.
const root = resolve(import.meta.dirname, '..');
const groups = new Map();
for (const file of process.argv.slice(2)) {
  const absolute = resolve(file);
  const path = relative(root, absolute);
  const workspace = ['apps/web', 'apps/backend', 'packages/shared'].find(dir => path.startsWith(`${dir}/`));
  if (!workspace) continue;
  if (!groups.has(workspace)) groups.set(workspace, []);
  groups.get(workspace).push(absolute);
}
for (const [workspace, files] of groups) {
  const result = spawnSync('pnpm', ['exec', 'eslint', '--fix', ...files], {
    cwd: resolve(root, workspace), stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
