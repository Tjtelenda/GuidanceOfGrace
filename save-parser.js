const SLOT_BASE = 0x300;
const SLOT_STRIDE = 0x280010;
const SLOT_DATA_OFFSET = 0x10;
const USER10_DATA = 0x19003b0;
const ACTIVE_PROFILES = USER10_DATA + 0x1954;
const PROFILE_SUMMARIES = USER10_DATA + 0x195e;
const PROFILE_STRIDE = 0x24c;
const EVENT_FLAGS_SIZE = 0x1bf99f;

const SLOT_DATA_SIZE = 0x280000;
const BLESSING_MAGIC = new Uint8Array([
  0x00,0xff,0xff,0xff,0xff, ...new Array(12).fill(0),
  ...[0,1,2].flatMap(()=>[0xff,0xff,0xff,0xff,...new Array(12).fill(0)]),
]);
const SCADUTREE_FROM_MAGIC = -187;
const REVERED_SPIRIT_FROM_MAGIC = -186;

export function playerGameDataOffset(bytes, slotIndex){
  if(!(bytes instanceof Uint8Array)||!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=10)return null;
  const base=SLOT_BASE+slotIndex*SLOT_STRIDE+SLOT_DATA_OFFSET,end=base+SLOT_DATA_SIZE;
  if(end>bytes.length)return null;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let offset=base+32;
  for(let i=0;i<0x1400;i++){
    if(offset+8>end)return null;
    const handle=view.getUint32(offset,true),type=(handle&0xf0000000)>>>0;
    offset+=8;
    if(handle&&type!==0xc0000000){offset+=8;if(type===0x80000000)offset+=5;}
  }
  return offset+432<=end?offset:null;
}

export function readBlessingLevels(bytes, slotIndex){
  const unknown={scaduLevel:null,spiritBlessingLevel:null},player=playerGameDataOffset(bytes,slotIndex);
  if(player===null)return unknown;
  const magic=player+431;
  if(!BLESSING_MAGIC.every((byte,i)=>bytes[magic+i]===byte))return unknown;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),level=view.getUint32(player+0x60,true);
  if(level<1||level>713)return unknown;
  const scadu=bytes[magic+SCADUTREE_FROM_MAGIC],spirit=bytes[magic+REVERED_SPIRIT_FROM_MAGIC];
  return scadu<=20&&spirit<=10?{scaduLevel:scadu,spiritBlessingLevel:spirit}:unknown;
}

// Curated subset of the public ER event-flag BST. The table values and save
// layout are factual compatibility data; reference implementation is MIT:
// https://github.com/zebbedaja/er-save-parser
const BST_BLOCKS = new Map([
  [0,0],[9,9],[60,10],[61,11],[71,21],[72,22],[73,23],[74,24],[75,25],[76,26],[77,27],[78,28],[79,29],[80,30],
]);

export const TRACKED_FLAGS = [
  [20,'ageFracture'],[21,'ageStars'],[22,'frenziedEnding'],
  [102,'limgrave'],[104,'roundtable'],[108,'frenziedFlame'],[110,'forgeReached'],[114,'ranniStory'],[116,'frenziedNullified'],[118,'erdtreeFire'],
  [191,'godrickRune'],[192,'radahnRune'],[193,'morgottRune'],[194,'rykardRune'],[195,'mohgRune'],[196,'maleniaRune'],[197,'unbornRune'],
  [9100,'godrickDefeated'],[9101,'margitDefeated'],[9104,'morgottDefeated'],[9112,'mohgDefeated'],[9116,'malikethDefeated'],[9118,'rennalaDefeated'],[9120,'maleniaDefeated'],[9122,'rykardDefeated'],[9123,'eldenBeast'],[9130,'radahnDefeated'],[9131,'fireGiantDefeated'],
  [9500,'perfectOrderRune'],[9502,'deathPrinceRune'],[9504,'fellCurseRune'],
  [60020,'physick'],[60100,'torrent'],[60110,'spiritBell'],[60120,'craftingKit'],[60130,'whetstone'],[60140,'tailoring'],
  [71000,'godrickGrace'],[71001,'margitGrace'],[71007,'secludedCellGrace'],[71008,'stormveilGateGrace'],[71100,'capitalGrace'],[71101,'erdtreeSanctuaryGrace'],[71102,'eastCapitalGrace'],[71214,'ainselMainGrace'],[71222,'siofraGrace'],[71226,'nightsSacredGroundGrace'],[71300,'malikethGrace'],[71310,'greatBridgeGrace'],[71602,'volcanoManorGrace'],[71605,'audiencePathwayGrace'],[73504,'frenziedProscriptionGrace'],
  [76100,'churchEllehGrace'],[76101,'firstStepGrace'],[76102,'stormhillGrace'],[76120,'waypointGrace'],[76150,'pilgrimageGrace'],[76151,'morneRampartGrace'],[76161,'morneMoangraveGrace'],
  [76200,'liurniaGrace'],[76201,'liurniaShoreGrace'],[76209,'dectusGrace'],[76227,'fourBelfriesGrace'],[76228,'ranniRiseGrace'],[76301,'altusGrace'],[76351,'gelmirGrace'],[76400,'caelidGrace'],[76419,'redmanePlazaGrace'],[76420,'chamberPlazaGrace'],[76422,'radahnGrace'],[76501,'mountaintopsGrace'],[76508,'footForgeGrace'],[76509,'fireGiantGrace'],
];

function u32(view, offset) {
  if (offset < 0 || offset + 4 > view.byteLength) throw new Error('Unexpected end of save data.');
  return view.getUint32(offset, true);
}

function cleanName(bytes) {
  return new TextDecoder('utf-16le').decode(bytes).split('\0')[0].trim();
}

function profileLayout(view, offset) {
  const layouts = [{name:0,level:34,seconds:38},{name:0x0a,level:0x2e,seconds:0x32}];
  return layouts.find(({level}) => { const value=u32(view,offset+level); return value>0&&value<1000; }) ?? layouts[0];
}

function eventFlagOffset(view, slotIndex) {
  let offset = SLOT_BASE + slotIndex * SLOT_STRIDE + SLOT_DATA_OFFSET;
  offset += 4 + 4 + 24;
  for (let i=0;i<0x1400;i++) {
    const handle=u32(view,offset); offset+=8;
    const type=(handle&0xf0000000)>>>0;
    if(handle!==0&&type!==0xc0000000){offset+=8;if(type===0x80000000)offset+=5;}
  }
  offset += 0x110 + 6*18 + 0x34 + 13*16 + 88 + 28 + 88 + 88;
  offset += 16 + 12*2688 + 12*384 + 116 + 140 + 24;
  const projectileCount=u32(view,offset); if(projectileCount>10000)throw new Error('Invalid projectile count in save.');
  offset += 4 + projectileCount*8 + 156 + 12 + 303 + 16 + 12*0x780 + 12*0x80 + 256;
  const regionCount=u32(view,offset); if(regionCount>10000)throw new Error('Invalid region count in save.');
  offset += 4 + regionCount*4 + 40 + 1 + 68 + 4 + 4 + 4;
  let menuSize=u32(view,offset); offset+=4; if(menuSize>0x10000)menuSize=0x1000;
  offset += menuSize + 52 + 0x1b588 + 4;
  let tutorialSize=u32(view,offset); offset+=4; if(tutorialSize>0x10000)tutorialSize=0x400;
  offset += tutorialSize + 3 + 4 + 4 + 1 + 4 + 4 + 1 + 4 + 4;
  return offset;
}

function readFlag(bytes,eventId){
  const block=Math.floor(eventId/1000), blockOffset=BST_BLOCKS.get(block);
  if(blockOffset==null)return false;
  const index=eventId%1000, bytePos=blockOffset*125+Math.floor(index/8), bit=7-(index%8);
  return bytePos<bytes.length && ((bytes[bytePos]>>bit)&1)===1;
}

function normalizeFlags(raw){
  const f={...raw};
  // Seamless guests can inherit generic defeated bits. Progression rewards and
  // post-boss graces are stronger evidence for the gates that matter to hints.
  f.margit=f.margitDefeated||f.margitGrace;
  f.godrick=f.godrickRune||f.godrickGrace;
  f.rennala=f.unbornRune;
  f.radahn=f.radahnRune;
  f.rykard=f.rykardRune;
  f.morgott=f.morgottRune;
  f.mohg=f.mohgRune;
  f.malenia=f.maleniaRune;
  f.fireGiant=f.fireGiantDefeated||f.fireGiantGrace;
  f.maliketh=f.malikethDefeated||f.malikethGrace;
  return f;
}

export function parseSave(arrayBuffer){
  const bytes=new Uint8Array(arrayBuffer);
  if(bytes.length<USER10_DATA+0x60000)throw new Error('Save file is smaller than expected.');
  if(String.fromCharCode(...bytes.slice(0,4))!=='BND4')throw new Error('This is not a supported PC Elden Ring save.');
  const view=new DataView(arrayBuffer), profiles=[];
  for(let slot=0;slot<10;slot++){
    const active=view.getUint8(ACTIVE_PROFILES+slot)===1, base=PROFILE_SUMMARIES+slot*PROFILE_STRIDE, layout=profileLayout(view,base);
    const name=cleanName(bytes.slice(base+layout.name,base+layout.name+32)), level=u32(view,base+layout.level), secondsPlayed=u32(view,base+layout.seconds);
    if(active||name)profiles.push({slot,active,name:name||`Slot ${slot+1}`,level,secondsPlayed});
  }
  const slots=profiles.filter(p=>p.active).map(profile=>{
    const start=eventFlagOffset(view,profile.slot);
    if(start<0||start+EVENT_FLAGS_SIZE>bytes.length)throw new Error('Progress flags were outside the expected save bounds.');
    const eventBytes=bytes.subarray(start,start+EVENT_FLAGS_SIZE);
    const raw=Object.fromEntries(TRACKED_FLAGS.map(([id,key])=>[key,readFlag(eventBytes,id)]));
    return {...profile,...readBlessingLevels(bytes,profile.slot),flags:normalizeFlags(raw)};
  });
  return {slots};
}

export function formatPlaytime(seconds=0){
  const hours=Math.floor(seconds/3600), minutes=Math.floor((seconds%3600)/60);
  return `${hours}h ${minutes}m`;
}
