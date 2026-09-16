import assert from 'node:assert/strict';
import { QUESTS, BRANCHES, REGIONS, FLAG_LABELS, MAP_IMAGE, TRANSITION_RISKS, questAvailable } from '../data.js';
import { TRACKED_FLAGS } from '../save-parser.js';

assert.ok(QUESTS.length >= 26, 'Expected a broad NPC tracker.');
assert.equal(new Set(QUESTS.map(q=>q.id)).size, QUESTS.length, 'Quest IDs must be unique.');
assert.equal(new Set(BRANCHES.map(b=>b.id)).size, BRANCHES.length, 'Branch IDs must be unique.');
assert.equal(new Set(REGIONS.map(r=>r.id)).size, REGIONS.length, 'Region IDs must be unique.');
assert.equal(new Set(TRANSITION_RISKS.map(r=>r.id)).size, TRANSITION_RISKS.length, 'Transition-risk IDs must be unique.');
const regionIds = new Set(REGIONS.map(r=>r.id));
const tracked = new Set(TRACKED_FLAGS.map(([,key])=>key));
for (const q of QUESTS) {
  assert.ok(q.name && q.hint && q.steps.length, `${q.id} needs name, hint and steps.`);
  q.regions.forEach(id=>assert.ok(regionIds.has(id), `${q.id} references unknown region ${id}.`));
  q.steps.forEach(step=>assert.ok(step.label && step.area && step.clue && step.detail, `${q.id} has an incomplete step.`));
  for (const [flag] of q.saveEvidence ?? []) {
    assert.ok(tracked.has(flag) || Object.hasOwn(FLAG_LABELS,flag), `${q.id} references unknown evidence flag ${flag}.`);
  }
  if (q.image) assert.match(q.image.src,/^https:\/\//);
}
for (const risk of TRANSITION_RISKS) {
  assert.ok(risk.title && risk.text && typeof risk.when==='function', `${risk.id} needs title, text and a predicate.`);
  for (const key of risk.triggerFlags ?? []) assert.ok(tracked.has(key)||Object.hasOwn(FLAG_LABELS,key), `${risk.id} references unknown trigger flag ${key}.`);
  for (const id of risk.questIds ?? []) assert.ok(QUESTS.some(q=>q.id===id), `${risk.id} references unknown quest ${id}.`);
}
for (const region of REGIONS) {
  assert.ok(region.x>=0&&region.x<=100&&region.y>=0&&region.y<=100, `${region.id} map coordinates are invalid.`);
  assert.equal(typeof region.when,'function');
}
const early={limgrave:true,roundtable:true,stormhillGrace:true};
assert.equal(questAvailable(QUESTS.find(q=>q.id==='roderika'),early),true);
assert.equal(questAvailable(QUESTS.find(q=>q.id==='corhyn'),early),true);
assert.equal(questAvailable(QUESTS.find(q=>q.id==='ranni'),early),false);
assert.equal(questAvailable(QUESTS.find(q=>q.id==='dung'),early),false);
assert.equal(questAvailable(QUESTS.find(q=>q.id==='seluvis'),{...early,ranniRiseGrace:true}),true);
assert.equal(TRANSITION_RISKS.find(r=>r.id==='stormveil-main-boss').when({...early,secludedCellGrace:true,godrick:false}),true);
assert.equal(TRANSITION_RISKS.find(r=>r.id==='rykard-lockout').when({audiencePathwayGrace:true,rykard:false}),true);
const seluvisRisk=TRANSITION_RISKS.find(r=>r.id==='seluvis-nokron');
assert.equal(seluvisRisk.when({nightsSacredGroundGrace:true,ainselMainGrace:false}),true);
assert.equal(seluvisRisk.when({nightsSacredGroundGrace:true,ainselMainGrace:true}),false);
assert.equal(TRANSITION_RISKS.find(r=>r.id==='frenzied-door').when({frenziedProscriptionGrace:true,frenziedFlame:false}),true);
assert.match(MAP_IMAGE.url,/^https:\/\//);
console.log(`PASS: ${QUESTS.length} NPC threads, ${TRANSITION_RISKS.length} progression warnings, current-thread gating, spoiler data, evidence keys, and map metadata are internally consistent.`);
