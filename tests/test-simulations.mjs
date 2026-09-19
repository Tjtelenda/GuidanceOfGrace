import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { atomicJson, readJson } from '../desktop/atomic-store.js';
import { GameLifecycle } from '../desktop/game-lifecycle.js';
import { GameMonitor } from '../desktop/game-monitor.js';
import { JourneyStore } from '../desktop/journey-store.js';
import { KnowledgeUpdater, normalizeImportedMarkers } from '../desktop/knowledge-updater.js';
import { GENERATED_BOSSES } from '../content/generated-bosses.js';
import { SaveMonitor, discoverSaveFiles } from '../desktop/save-monitor.js';
import { localPlayerState, migrateJourneyState } from '../content/journey-state.js';
import { listLocalMovies, playableMovie } from '../desktop/local-media.js';

// All filesystem operations are confined to this disposable directory.
// No Electron launch, real process scan, network request or user save read.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grace-simulation-'));
let passed = 0;
async function scenario(name, run) {
  await run();
  passed++;
  console.log(`  PASS: ${name}`);
}

function lifecycleHarness(readFinal = async () => {}) {
  const pending = new Map();
  let id = 0;
  let closes = 0;
  const lifecycle = new GameLifecycle({
    readFinal,
    onClose: () => closes++,
    schedule: callback => { pending.set(++id, callback); return id; },
    cancel: handle => pending.delete(handle),
  });
  return {
    lifecycle,
    pending,
    closes: () => closes,
    async fire() {
      const entry = pending.entries().next().value;
      assert.ok(entry, 'A final read must be scheduled');
      pending.delete(entry[0]);
      await entry[1]();
    },
  };
}

try {
  await scenario('legacy profiles migrate to one local player without losing recovery data', () => {
    const old={active:1,profiles:[{name:'Other',showAll:true},{name:'Local',quest:{ranni:[0]},showAll:false}]};
    const migrated=migrateJourneyState(old,value=>structuredClone(value),{});
    assert.equal(migrated.version,4);
    assert.deepEqual(migrated.player,old.profiles[1]);
    assert.deepEqual(migrated.legacyProfiles,[old.profiles[0]]);
    assert.equal(localPlayerState(migrated).showAll,false);
    assert.deepEqual(migrateJourneyState(migrated,value=>structuredClone(value),{}),migrated);
    assert.deepEqual(old.profiles[1].quest,{ranni:[0]});
  });
  await scenario('local movie inventory distinguishes playable files from Bink without opening Explorer', () => {
    const folder=path.join(root,'game','movie');fs.mkdirSync(folder,{recursive:true});
    for(const name of ['intro.bk2','fixture.webm','unrelated.txt'])fs.writeFileSync(path.join(folder,name),'synthetic');
    const movies=listLocalMovies(path.join(root,'game'));
    assert.equal(movies.length,2);
    assert.equal(movies.find(m=>m.name==='intro.bk2').supported,false);
    assert.match(movies.find(m=>m.name==='fixture.webm').url,/^file:/);
    assert.throws(()=>playableMovie(path.join(folder,'intro.bk2')));
    assert.deepEqual(listLocalMovies(''),[]);
  });
  await scenario('duplicate stopped notifications preserve the final read', async () => {
    let reads = 0;
    const h = lifecycleHarness(async () => reads++);
    h.lifecycle.change(true);
    h.lifecycle.change(false);
    h.lifecycle.change(false);
    assert.equal(h.pending.size, 1);
    await h.fire();
    assert.equal(reads, 1);
    assert.equal(h.closes(), 1);
  });

  await scenario('restarting before the delay cancels the old final read', async () => {
    const h = lifecycleHarness();
    h.lifecycle.change(true);
    h.lifecycle.change(false);
    h.lifecycle.change(true);
    assert.equal(h.pending.size, 0);
    assert.equal(h.closes(), 0);
  });

  await scenario('restarting during a final read prevents closing the new session', async () => {
    let finish;
    const h = lifecycleHarness(() => new Promise(resolve => { finish = resolve; }));
    h.lifecycle.change(true);
    h.lifecycle.change(false);
    const reading = h.fire();
    h.lifecycle.change(true);
    finish();
    await reading;
    assert.equal(h.closes(), 0);
    h.lifecycle.change(false);
    assert.equal(h.pending.size, 1);
    h.lifecycle.stop();
    assert.equal(h.pending.size, 0);
  });

  await scenario('simulated game detection emits transitions only', async () => {
    let names = [];
    const events = [];
    const monitor = new GameMonitor(running => events.push(running), 2000, async () => names);
    await monitor.poll();
    names = ['ELDENRING.EXE'];
    await monitor.poll();
    await monitor.poll();
    names = ['not-eldenring.exe'];
    await monitor.poll();
    assert.deepEqual(events, [true, false]);
  });

  await scenario('damaged active data preserves the previous valid backup', () => {
    const file = path.join(root, 'atomic.json');
    const validate = value => assert.equal(typeof value.revision, 'number');
    atomicJson(file, { revision: 1 }, validate);
    atomicJson(file, { revision: 2 }, validate);
    fs.writeFileSync(file, 'interrupted');
    assert.deepEqual(readJson(file, validate), { revision: 1 });
    atomicJson(file, { revision: 3 }, validate);
    assert.deepEqual(readJson(`${file}.previous`, validate), { revision: 1 });
    assert.throws(() => atomicJson(file, { revision: 'bad' }, validate));
    assert.deepEqual(readJson(file, validate), { revision: 3 });
    assert.ok(!fs.readdirSync(root).some(name => name.endsWith('.tmp')));
  });

  await scenario('all game-save extensions are rejected as write targets', () => {
    for (const extension of ['sl2', 'co2', 'bak', 'SL2', 'CO2']) {
      const target = path.join(root, `forbidden.${extension}`);
      assert.throws(() => atomicJson(target, {}), /read-only/);
      assert.equal(fs.existsSync(target), false);
    }
  });

  await scenario('journey path traversal and malformed imports are rejected', () => {
    const store = new JourneyStore(root);
    assert.throws(() => store.load('../outside'), /Invalid journey id/);
    const file = path.join(root, 'invalid.grace');
    fs.writeFileSync(file, JSON.stringify({ format: 'guidance-of-grace-journey', version: 99 }));
    assert.throws(() => store.import(file), /Not a valid/);
    assert.equal(store.list().length, 0);
  });

  await scenario('discovery distinguishes synthetic solo and co-op saves', () => {
    const folder = path.join(root, 'EldenRing', 'fixture-account');
    fs.mkdirSync(folder, { recursive: true });
    for (const name of ['ER0000.sl2', 'ER0000.co2', 'ER0000.co2.bak', 'journey.grace']) {
      fs.writeFileSync(path.join(folder, name), 'synthetic');
    }
    assert.deepEqual(discoverSaveFiles(root).map(save => save.type).sort(), ['co2', 'sl2']);
  });

  await scenario('switching away during parsing discards a stale snapshot', async () => {
    const file = path.join(root, 'EldenRing', 'fixture-account', 'ER0000.co2');
    let finish;
    let began;
    const started = new Promise(resolve => { began = resolve; });
    const snapshots = [];
    const monitor = new SaveMonitor(value => snapshots.push(value), {
      stableMs: 0,
      parseFile: () => { began(); return new Promise(resolve => { finish = resolve; }); },
    });
    monitor.filePath = file;
    const reading = monitor.readNow();
    await started;
    monitor.stop();
    finish([{ name: 'Old journey character' }]);
    assert.deepEqual(await reading, []);
    assert.deepEqual(snapshots, []);
  });

  await scenario('malformed marker catalogs fail before import', () => {
    const valid = {
      schemaVersion: 1, source: 'synthetic', gameVersion: 'fixture',
      generatedAt: '2026-09-15T00:00:00Z',
      records: [{ id: 'one', title: 'Fixture', type: 'pickup' }],
    };
    for (const patch of [
      { schemaVersion: 2 }, { source: '' }, { generatedAt: 'invalid' },
      { records: [valid.records[0], valid.records[0]] },
      { records: [{ ...valid.records[0], x: Infinity }] },
      { records: [{ ...valid.records[0], tags: 'not-an-array' }] },
    ]) assert.throws(() => normalizeImportedMarkers({ ...valid, ...patch }));
    assert.equal(normalizeImportedMarkers(valid).records.length, 1);
  });

  await scenario('concurrent update checks share a request and reject redirected data', async () => {
    let calls = 0;
    let release;
    const updater = new KnowledgeUpdater(path.join(root, 'updates'), {
      fetcher: () => { calls++; return new Promise(resolve => { release = resolve; }); },
    });
    const first = updater.check();
    assert.equal(updater.check(), first);
    release({ ok: true, url: 'https://untrusted.invalid/catalog', text: async () => '[]' });
    const result = await first;
    assert.equal(calls, 1);
    assert.equal(result.sources[0].state, 'error');
    assert.deepEqual(updater.encounters(), GENERATED_BOSSES);
    assert.equal(fs.existsSync(path.join(root, 'updates', 'knowledge', 'encounters.json')), false);
  });

  console.log(`PASS: ${passed} background-only failure and lifecycle simulations.`);
} finally {
  const tempRoot = path.resolve(os.tmpdir()) + path.sep;
  assert.ok(path.resolve(root).startsWith(tempRoot));
  assert.ok(path.basename(root).startsWith('grace-simulation-'));
  fs.rmSync(root, { recursive: true, force: true });
}
