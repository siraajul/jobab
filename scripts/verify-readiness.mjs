import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const database = process.env.JOBAB_TEST_DATABASE_URL;
if (!database || !new URL(database).pathname.endsWith('_test')) throw new Error('Set JOBAB_TEST_DATABASE_URL to a disposable database ending in _test');
const logDir = resolve(root, '.jobab/readiness'); mkdirSync(logDir, { recursive: true });
const children = [];
const shared = { ...process.env, DATABASE_URL: database, NODE_ENV: 'test', LLM_PROVIDER: 'stub', MESSENGER_DRY_RUN: 'true', EMAIL_MODE: 'outbox',
  ENCRYPTION_KEY: 'readiness-test-only-key-32-characters-long', META_APP_SECRET: 'readiness-test-only', META_VERIFY_TOKEN: 'readiness-test-only',
  WEB_ORIGIN: 'http://127.0.0.1:3101', PUBLIC_URL: 'http://127.0.0.1:3100', REDIS_URL: process.env.JOBAB_TEST_REDIS_URL ?? 'redis://127.0.0.1:6379/14',
  PAYMENT_MODE: 'cod', AI_DAILY_TOKEN_LIMIT: '1000000',
};
function start(label, command, args, cwd, env) {
  const log = createWriteStream(resolve(logDir, `${label}.log`));
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child); return child;
}
async function ready(url) {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* compiling */ }
    if (children.some(child => child.exitCode !== null)) throw new Error('A readiness service exited; inspect .jobab/readiness logs');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Service not ready: ${url}; inspect .jobab/readiness logs`);
}
function run(command, args, cwd = root, env = shared) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
try {
  await run('pnpm', ['--filter', '@jobab/shared', 'build']);
  await run('pnpm', ['--filter', '@jobab/backend', 'prisma:deploy']);
  await run('pnpm', ['--filter', '@jobab/backend', 'build']);
  start('api', 'node', ['dist/main.js'], resolve(root, 'apps/backend'), { ...shared, PORT: '3100' });
  start('worker', 'node', ['dist/agent/worker.js'], resolve(root, 'apps/backend'), shared);
  start('web', 'pnpm', ['exec', 'next', 'dev', '-p', '3101', '-H', '127.0.0.1'], resolve(root, 'apps/web'), { ...shared, NODE_ENV: 'development', JOBAB_NEXT_DIST_DIR: '.next-readiness', BACKEND_URL: 'http://127.0.0.1:3100' });
  await Promise.all([ready('http://127.0.0.1:3100/readyz'), ready('http://127.0.0.1:3101/login')]);
  await run('pnpm', ['--filter', '@jobab/web', 'test:e2e'], root, { ...shared, E2E_BASE_URL: 'http://127.0.0.1:3101' });
  console.log('Critical browser journeys passed against the disposable database and stub provider.');
} finally {
  for (const child of children) { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* exited */ } }
}
