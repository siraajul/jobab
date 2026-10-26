import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const result = spawnSync('pnpm', ['audit', '--prod', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
let report;
try { report = JSON.parse(result.stdout); } catch { throw new Error('Dependency audit did not return a valid report'); }
if (!report.advisories || report.error) throw new Error('Dependency audit unavailable; refusing to report a pass');
mkdirSync(resolve(root, '.jobab/readiness'), { recursive: true });
writeFileSync(resolve(root, '.jobab/readiness/dependency-audit.json'), JSON.stringify(report, null, 2));
const affected = Object.values(report.advisories).filter(advisory => advisory.findings.some(finding => finding.paths.some(path => /apps(?:__|\/)(?:web|backend)>/.test(path))));
const blockers = affected.filter(advisory => ['moderate', 'high', 'critical'].includes(advisory.severity));
for (const advisory of blockers) console.error(`${advisory.severity}: ${advisory.module_name}: ${advisory.title} (patched: ${advisory.patched_versions})`);
console.log(`Backend/dashboard runtime audit: ${blockers.length} moderate-or-higher findings. Mobile scaffold is excluded from the VPS release.`);
process.exitCode = blockers.length ? 1 : 0;
