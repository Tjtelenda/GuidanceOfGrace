import fs from 'node:fs';
import crypto from 'node:crypto';
import { parse, getBstMap, getEventFlagOffset } from '@zebbedaja/er-save-parser';
import { parseSave } from '../save-parser.js';
import { GENERATED_BOSSES } from '../content/generated-bosses.js';
const file=process.argv[2], b=fs.readFileSync(file), ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const parsed=parse(ab,{logLevel:'none',includeEventFlagUInt8Array:true});
console.log('SHA256',crypto.createHash('sha256').update(b).digest('hex'));
console.log('Browser',parseSave(ab).slots.map(({slot,name,level,scaduLevel,spiritBlessingLevel})=>({slot,name,level,scaduLevel,spiritBlessingLevel})));
console.log('Desktop',parsed.slots.map((s,i)=>({slot:i,name:s.character.characterName,level:s.character.level,map:s.mapName,events:s.eventFlags.filter(f=>f.state).length})).filter(s=>s.name));
console.log('Catalog',GENERATED_BOSSES.length,GENERATED_BOSSES.filter(b=>b.dlc).length,'missing BST',GENERATED_BOSSES.filter(b=>{try{getEventFlagOffset(getBstMap(),b.flagId);return false}catch{return true}}));
for(let i=0;i<3;i++){
 const base=0x310+i*0x280010;let off=base+32;
 for(let j=0;j<0x1400;j++){const h=b.readUInt32LE(off);off+=8;if(h&&(h&0xf0000000)>>>0!==0xc0000000){off+=8;if((h&0xf0000000)>>>0===0x80000000)off+=5}}
 const magic=Buffer.from([0,255,255,255,255,...Array(12).fill(0),...[0,1,2].flatMap(()=>[255,255,255,255,...Array(12).fill(0)])]);
 const at=b.indexOf(magic,base);console.log('Locator',{slot:i,playerOffset:off-base,magicOffset:at-base,delta:at-off,scadu:b[at-187],spirit:b[at-186],level:b.readUInt32LE(off+0x60)});
}
