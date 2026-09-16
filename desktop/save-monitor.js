import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse, getBstMap, getEventFlagState } from '@zebbedaja/er-save-parser';
import { readBlessingLevels } from '../save-parser.js';
import { GENERATED_BOSSES } from '../content/generated-bosses.js';
import { TRACKED_FLAGS } from '../save-parser.js';

const SAVE_NAMES = ['ER0000.co2', 'ER0000.sl2'];
const WATCH_DEBOUNCE_MS = 1300;
const EVENT_BST=getBstMap();

export function discoverSaveFiles(appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')) {
  const root = path.join(appData, 'EldenRing');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => SAVE_NAMES.map(name => path.join(root, entry.name, name)))
    .filter(file => fs.existsSync(file))
    .map(file => ({ path: file, type: path.extname(file).slice(1), steamFolder: path.basename(path.dirname(file)) }));
}

function activeEventMap(slot) {
  const events = {};
  for (const flag of slot.eventFlags ?? []) if (flag.state) events[String(flag.id)] = { id: flag.id, name: flag.name, category: flag.category, location: flag.location ?? null };
  return events;
}

export function normalizeDesktopSave(parsed, rawBytes = null, extraEventIds=[]) {
  const summaries = parsed.profileSummaries ?? [];
  const active = new Set((parsed.activeProfiles ?? []).map((value, index) => value ? index : null).filter(Number.isInteger));
  return (parsed.slots ?? []).map((slot, index) => {
    const summary = summaries[index] ?? {};
    const character = slot.character ?? {};
    const rawName = (summary.name || character.characterName || '').split('\0')[0];
    if (!active.has(index)) return null;
    const ids=new Set((slot.eventFlags??[]).map(f=>f.id)),unsupportedEventIds=[];
    slot.eventFlags??=[];
    if(slot.eventFlagUint8Array)for(const id of new Set([...GENERATED_BOSSES.map(b=>b.flagId),...TRACKED_FLAGS.map(([id])=>id),...extraEventIds])){
      if(!ids.has(id)){
        if(!Number.isSafeInteger(id)||id<0||!EVENT_BST.has(Math.floor(id/1000))){unsupportedEventIds.push(id);continue;}
        try{slot.eventFlags.push({id,state:getEventFlagState(EVENT_BST,slot.eventFlagUint8Array,id)});}
        catch{unsupportedEventIds.push(id);}
      }
    }
    const name = rawName || `Slot ${index + 1}`;
    const blessings=rawBytes?readBlessingLevels(rawBytes,index):{scaduLevel:null,spiritBlessingLevel:null};
    return {
      slot: index,
      active: active.has(index) || Boolean(name),
      name,
      level: character.level ?? summary.level ?? 1,
      secondsPlayed: summary.secondsPlayed ?? 0,
      mapId: slot.mapId ?? null,
      mapName: slot.mapName ?? null,
      lastRestedGrace: slot.lastRestedGrace ?? null,
      inOnlineSession: Boolean(slot.inOnlineSessionFlag),
      notAlone: Boolean(slot.notAloneFlag),
      totalDeathCount: slot.totalDeathCount ?? 0,
      ...blessings,
      unsupportedEventIds,
      events: activeEventMap(slot),
      eventIds: (slot.eventFlags ?? []).filter(flag => flag.state).map(flag => flag.id),
      items: deriveItems(slot),
      flags: {...Object.fromEntries(TRACKED_FLAGS.map(([id,key])=>[key,has(slot,id)])),...deriveFlags(slot)},
    };
  }).filter(Boolean);
}

function has(slot, id) { return Boolean(slot.eventFlags?.find(flag => flag.id === id)?.state); }
function named(slot, pattern) { return Boolean(slot.eventFlags?.some(flag => flag.state && pattern.test(flag.name ?? ''))); }

function deriveItems(slot) {
  const checks = {
    irinasLetter:/Irina's Letter/i, academyKey:/Academy Glintstone Key/i, fingerslayerBlade:/Fingerslayer Blade/i,
    cursemarkDeath:/Cursemark of Death/i, unalloyedNeedle:/Unalloyed Gold Needle/i, valkyrieProsthesis:/Valkyrie's Prosthesis/i,
    haligtreeMedallionLeft:/Haligtree Secret Medallion \(Left\)/i, haligtreeMedallionRight:/Haligtree Secret Medallion \(Right\)/i,
    blackSyrup:/Black Syrup/i, thiollierConcoction:/Thiollier's Concoction/i, secretRiteScroll:/Secret Rite Scroll/i,
    holeLadenNecklace:/Hole-Laden Necklace/i,
  };
  return Object.fromEntries(Object.entries(checks).map(([key, pattern]) => [key, named(slot, pattern)]));
}

export function deriveFlags(slot) {
  const f = {
    limgrave: has(slot, 102), roundtable: has(slot, 104), ranniStory: has(slot, 114), frenziedFlame: has(slot, 108),
    forgeReached: has(slot, 110), frenziedNullified: has(slot, 116), erdtreeFire: has(slot, 118),
    godrickRune: has(slot, 191), radahnRune: has(slot, 192), morgottRune: has(slot, 193), rykardRune: has(slot, 194), mohgRune: has(slot, 195), maleniaRune: has(slot, 196), unbornRune: has(slot, 197),
    margitDefeated: has(slot, 9101), godrickDefeated: has(slot, 9100), rennalaDefeated: has(slot, 9118), radahnDefeated: has(slot, 9130),
    morgottDefeated: has(slot, 9104), rykardDefeated: has(slot, 9122), fireGiantDefeated: has(slot, 9131), mohgDefeated: has(slot, 9112), maleniaDefeated: has(slot, 9120), malikethDefeated: has(slot, 9116), eldenBeast: has(slot, 9123),
    torrent: has(slot, 60100), spiritBell: has(slot, 60110), craftingKit: has(slot, 60120), whetstone: has(slot, 60130), physick: has(slot, 60020), tailoring: has(slot, 60140),
    firstStepGrace: has(slot, 76101), stormhillGrace: has(slot, 76102), secludedCellGrace: has(slot, 71007), godrickGrace: has(slot, 71000), margitGrace: has(slot, 71001),
    morneRampartGrace: has(slot, 76151), morneMoangraveGrace: has(slot, 76161), liurniaGrace: has(slot, 76200), liurniaShoreGrace: has(slot, 76201), dectusGrace: has(slot, 76209), fourBelfriesGrace: has(slot, 76227), ranniRiseGrace: has(slot, 76228),
    altusGrace: has(slot, 76301), gelmirGrace: has(slot, 76351), caelidGrace: has(slot, 76400), redmanePlazaGrace: has(slot, 76419), chamberPlazaGrace: has(slot, 76420), radahnGrace: has(slot, 76422),
    eastCapitalGrace: has(slot, 71102), capitalGrace: has(slot, 71100), erdtreeSanctuaryGrace: has(slot, 71101),
    siofraGrace: has(slot, 71222), ainselMainGrace: has(slot, 71214), nightsSacredGroundGrace: has(slot, 71226),
    volcanoManorGrace: has(slot, 71602), audiencePathwayGrace: has(slot, 71605), mountaintopsGrace: has(slot, 76501), footForgeGrace: has(slot, 76508), fireGiantGrace: has(slot, 76509),
    greatBridgeGrace: has(slot, 71310), malikethGrace: has(slot, 71300), frenziedProscriptionGrace: has(slot, 73504),
    dlcEntry: named(slot, /Gravesite Plain|Three-Path Cross|Main Gate Cross/i),
    dlcBelurat: named(slot, /Belurat|Divine Beast Dancing Lion/i),
    dlcEnsis: named(slot, /Castle Ensis|Rellana/i),
    dlcScaduAltus: named(slot, /Scadu Altus|Highroad Cross|Moorth Ruins/i),
    dlcShadowKeep: named(slot, /Shadow Keep|Storehouse/i),
    dlcStorehouse: named(slot, /Storehouse|Specimen Storehouse/i),
    dlcMessmerDoor: named(slot, /Dark Chamber Entrance/i),
    dlcRauh: named(slot, /Rauh|Church of the Bud/i),
    dlcAbyss: named(slot, /Abyssal Woods|Midra/i),
    dlcJaggedPeak: named(slot, /Jagged Peak|Bayle/i),
    dlcCerulean: named(slot, /Cerulean Coast|Stone Coffin Fissure|Garden of Deep Purple/i),
    dlcFissure: named(slot, /Stone Coffin Fissure|Fissure Cross|Garden of Deep Purple/i),
    dlcBayleDoor: named(slot, /Jagged Peak Summit/i),
    dlcEnirIlim: named(slot, /Enir-Ilim|Divine Gate Front Staircase|Consort of Miquella/i),
    dancingLionDefeated: named(slot, /Defeated Divine Beast Dancing Lion/i),
    rellanaDefeated: named(slot, /Defeated Rellana/i),
    messmerDefeated: named(slot, /Defeated Messmer/i),
    rominaDefeated: named(slot, /Defeated Romina/i),
    bayleDefeated: named(slot, /Defeated Bayle/i),
    putrescentDefeated: named(slot, /Defeated Putrescent Knight/i),
    metyrDefeated: named(slot, /Defeated Metyr/i),
    midraDefeated: named(slot, /Defeated Midra/i),
    gaiusDefeated: named(slot, /Defeated Commander Gaius/i),
    scadutreeAvatarDefeated: named(slot, /Defeated Scadutree Avatar/i),
    consortDefeated: named(slot, /Defeated Radahn, Consort of Miquella/i),
  };
  f.margit = f.margitGrace || f.margitDefeated;
  f.godrick = f.godrickRune || f.godrickGrace;
  f.rennala = f.unbornRune;
  f.radahn = f.radahnRune;
  f.rykard = f.rykardRune;
  f.morgott = f.morgottRune;
  f.mohg = f.mohgRune;
  f.malenia = f.maleniaRune;
  f.fireGiant = f.fireGiantGrace || f.fireGiantDefeated;
  f.maliketh = f.malikethGrace || f.malikethDefeated;
  return f;
}

export async function parseSaveFile(filePath, extraEventIds=[]) {
  if(!/\.(sl2|co2)$/i.test(filePath))throw new Error('Choose a .sl2 or .co2 game save.');
  const buffer = await fs.promises.readFile(filePath);
  if(buffer.length<0x19003b0+0x60000||buffer.toString('ascii',0,4)!=='BND4')throw new Error('Unsupported or incomplete PC game save.');
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return normalizeDesktopSave(parse(arrayBuffer, { logLevel: 'none', includeEventFlagUInt8Array:true }), new Uint8Array(arrayBuffer),extraEventIds);
}

export class SaveMonitor {
  constructor(onSnapshot, {parseFile=parseSaveFile,debounceMs=WATCH_DEBOUNCE_MS,stableMs=300,onError=()=>{}}={}) {
    this.onSnapshot = onSnapshot;
    this.filePath = '';
    this.watcher = null;
    this.timer = null;
    this.generation=0;this.parseFile=parseFile;this.debounceMs=debounceMs;this.stableMs=stableMs;this.onError=onError;
  }

  async readNow() {
    if (!this.filePath) return [];
    const file=this.filePath,generation=this.generation;
    const before=await fs.promises.stat(file);
    await new Promise(resolve=>setTimeout(resolve,this.stableMs));
    const stable=await fs.promises.stat(file);
    if(before.size!==stable.size||before.mtimeMs!==stable.mtimeMs)throw new Error('Save is still being written; waiting for a stable read.');
    const slots = await this.parseFile(file);
    const after=await fs.promises.stat(file);
    if(stable.size!==after.size||stable.mtimeMs!==after.mtimeMs)throw new Error('Save changed during parsing; waiting for the next read.');
    if(generation!==this.generation)return [];
    this.onSnapshot?.(slots,file);
    return slots;
  }

  watch(filePath) {
    this.stop();
    if(filePath&&!/\.(sl2|co2)$/i.test(filePath))throw new Error('Choose a .sl2 or .co2 game save.');
    this.filePath = filePath;
    if (!filePath || !fs.existsSync(filePath)) return;
    this.watcher = fs.watch(path.dirname(filePath), { persistent: false }, (_event,name) => {
      if(!name||String(name).toLowerCase()===path.basename(filePath).toLowerCase())this.schedule();
    });
    this.watcher.on('error',this.onError);
    this.schedule(0);
  }

  schedule(delay=this.debounceMs,attempt=0){clearTimeout(this.timer);this.timer=setTimeout(()=>void this.readNow().catch(error=>{this.onError(error);if(attempt<5&&this.filePath)this.schedule(this.debounceMs,attempt+1)}),delay);}

  stop() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    this.watcher?.close();
    this.watcher = null;
    this.filePath='';
  }
}
