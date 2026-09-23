import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { evaluateWave } from '../src/waves/wave-engine.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('scheduler cannot advance, retreat or schedule outreach', () => {
  const decision = evaluateWave();
  assert.equal(decision.shouldPost, false);
  assert.equal(decision.advanced, false);
  assert.equal(decision.retreated, false);
  assert.equal(decision.waveName, 'Retired');
});

for (const flags of [[], ['--force'], ['--dry-run', '--force']]) {
  test(`entrypoint preserves records and cannot connect to the network: ${flags.join(' ') || 'default'}`, () => {
    const fixture = mkdtempSync(resolve(tmpdir(), 'retired-outreach-'));
    try {
      mkdirSync(resolve(fixture, 'src/waves'), { recursive: true });
      mkdirSync(resolve(fixture, 'data'));
      for (const file of ['src/run-wave.ts', 'src/waves/wave-engine.ts']) {
        copyFileSync(resolve(root, file), resolve(fixture, file));
      }
      writeFileSync(resolve(fixture, 'package.json'), '{"type":"module"}');
      const files = {
        'metrics-cache.json': '{"current":{"activeInstalls":1000000,"installVelocity":0}}',
        'wave-state.json': '{"currentWave":3,"postsThisWeek":0,"lowVelocityStartedAt":"2000-01-01"}',
        'event-log.jsonl': '{"historical":true}\n',
      };
      for (const [name, body] of Object.entries(files)) writeFileSync(resolve(fixture, 'data', name), body);
      writeFileSync(resolve(fixture, 'reject-network.cjs'), `
        const refuse = () => { throw new Error('No network allowed in retired entrypoint'); };
        require('node:net').Socket.prototype.connect = refuse;
        require('node:http').request = refuse;
        require('node:https').request = refuse;
        globalThis.fetch = refuse;
      `);
      const result = spawnSync(process.execPath, [
        '--require', resolve(fixture, 'reject-network.cjs'),
        '--import', resolve(root, 'node_modules/tsx/dist/loader.mjs'),
        resolve(fixture, 'src/run-wave.ts'), ...flags,
      ], { cwd: fixture, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /outreach is retired/);
      for (const [name, body] of Object.entries(files)) assert.equal(readFileSync(resolve(fixture, 'data', name), 'utf8'), body);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
