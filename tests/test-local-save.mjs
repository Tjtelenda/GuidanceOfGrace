import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseSave,playerGameDataOffset} from '../save-parser.js';
import {parseSaveFile} from '../desktop/save-monitor.js';
import {getBstMap,getEventFlagOffset} from '@zebbedaja/er-save-parser';
import {GENERATED_BOSSES} from '../content/generated-bosses.js';
const file=process.argv[2];if(!file)throw Error('Pass a read-only .co2 or .sl2 fixture path.');
const bytes=fs.readFileSync(file),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),before=hash(bytes);
const browser=parseSave(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).slots,desktop=await parseSaveFile(file);
assert.deepEqual(desktop.map(s=>[s.name,s.level,s.scaduLevel,s.spiritBlessingLevel]),browser.map(s=>[s.name,s.level,s.scaduLevel,s.spiritBlessingLevel]));
for(const slot of browser){assert.ok(playerGameDataOffset(bytes,slot.slot)>0);assert.ok(slot.scaduLevel>=0&&slot.scaduLevel<=20);assert.ok(slot.spiritBlessingLevel>=0&&slot.spiritBlessingLevel<=10);}
const dlc=browser.find(s=>s.name==='ScarletThot');if(dlc)assert.deepEqual([dlc.scaduLevel,dlc.spiritBlessingLevel],[10,5]);
for(const boss of GENERATED_BOSSES)assert.ok(getEventFlagOffset(getBstMap(),boss.flagId)!=null,`${boss.flagId}`);
assert.equal(hash(fs.readFileSync(file)),before);
console.log('PASS: both parsers agree; dynamic PlayerGameData and blessings; all 207 event addresses; save SHA-256 unchanged.',before);
console.log(desktop.map(s=>({name:s.name,level:s.level,scadu:s.scaduLevel,spirit:s.spiritBlessingLevel})));
