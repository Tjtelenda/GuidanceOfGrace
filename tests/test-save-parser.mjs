import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSave, formatPlaytime } from '../save-parser.js';
import { QUESTS, TRANSITION_RISKS, questAvailable } from '../data.js';

function load(path) {
  const raw = fs.readFileSync(path);
  return parseSave(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}

const path = process.argv[2] ?? '/mnt/data/ER0000.co2';
const save = load(path);
assert.deepEqual(save.slots.map(({name,level})=>({name,level})), [
  { name: 'ScarletThot', level: 433 },
  { name: 'Bonk-naza', level: 11 },
  { name: 'A Mohg Us', level: 23 },
]);
assert.equal(formatPlaytime(save.slots[1].secondsPlayed), '2h 29m');
assert.equal(save.slots[1].flags.margit, true);
assert.equal(save.slots[1].flags.godrick, false);
assert.equal(save.slots[2].flags.godrick, false);
assert.equal(save.slots[1].flags.secludedCellGrace, false);
assert.equal(save.slots[2].flags.secludedCellGrace, true);
assert.equal(save.slots[0].flags.greatBridgeGrace, true);
assert.equal(save.slots[0].flags.maliketh, true);
assert.equal(save.slots[0].scaduLevel,10);
assert.equal(save.slots[0].spiritBlessingLevel,5);
assert.equal(save.slots[1].scaduLevel,0);
assert.equal(save.slots[2].scaduLevel,0);

const bonkCurrent=QUESTS.filter(q=>questAvailable(q,save.slots[1].flags)).map(q=>q.id);
const mohgCurrent=QUESTS.filter(q=>questAvailable(q,save.slots[2].flags)).map(q=>q.id);
for (const hidden of ['ranni','seluvis','dung']) {
  assert.equal(bonkCurrent.includes(hidden),false,`${hidden} should not be surfaced for Bonk-naza yet.`);
  assert.equal(mohgCurrent.includes(hidden),false,`${hidden} should not be surfaced for A Mohg Us yet.`);
}
assert.equal(mohgCurrent.includes('nepheli'),true);
assert.equal(mohgCurrent.includes('rogier'),true);
const stormveilRisk=TRANSITION_RISKS.find(r=>r.id==='stormveil-main-boss');
assert.equal(stormveilRisk.when(save.slots[1].flags),false);
assert.equal(stormveilRisk.when(save.slots[2].flags),true);
assert.throws(() => parseSave(new Uint8Array([1,2,3,4]).buffer));

if (fs.existsSync('/mnt/data/ER0000.co2.bak')) {
  const backup = load('/mnt/data/ER0000.co2.bak');
  assert.deepEqual(backup.slots, save.slots);
}
console.log('PASS: parsed supplied Seamless save, blessing levels, boss-approach/world-state flags, conservative progression, malformed-file guard, and backup parity.');
