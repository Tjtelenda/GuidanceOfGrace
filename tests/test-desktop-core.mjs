import assert from 'node:assert/strict';
import { DEFAULT_DESKTOP_SETTINGS, dialogueRule, diffSnapshot, evidenceConfidence, isGameProcess, normalizeDesktopSettings, readinessLabel, resolveSavePath, roleNote } from '../desktop/core.js';

assert.equal(normalizeDesktopSettings({ multiplayerRole:'host' }).multiplayerRole,'host');
assert.equal(normalizeDesktopSettings({ playMode:'single' }).playMode,'single');
assert.equal(normalizeDesktopSettings({ playMode:'anything' }).playMode,'seamless');
assert.equal(normalizeDesktopSettings({ multiplayerRole:'anything' }).multiplayerRole,'joiner');
assert.equal(normalizeDesktopSettings({ minimizeToTray:false }).keepRunningInBackground,false,'legacy background setting should migrate');
assert.equal(normalizeDesktopSettings({ selectedSlot:11 }).selectedSlot,null);
assert.equal(isGameProcess('ELDENRING.EXE'),true);
assert.equal(isGameProcess('ersc_launcher.exe'),true);
assert.equal(isGameProcess('notepad.exe'),false);
assert.equal(evidenceConfidence('joiner','world'),'cautious');
assert.equal(evidenceConfidence('joiner','grace'),'medium');
assert.equal(evidenceConfidence('host','world'),'strong');
assert.equal(evidenceConfidence('joiner','world','single'),'strong');
assert.equal(dialogueRule('single','joiner'),null);
assert.match(dialogueRule('seamless','joiner').text,/Story Host/i);
assert.match(roleNote('joiner','seamless'),/NPC talk events/i);
assert.deepEqual(diffSnapshot({flags:{a:false},mapName:'A',lastRestedGrace:1},{flags:{a:true,b:false},mapName:'B',lastRestedGrace:2}),{changed:['a','currentMap','lastRestedGrace'],firstRead:false});
assert.equal(readinessLabel(20,{min:30,max:40}).state,'under');
assert.equal(readinessLabel(35,{min:30,max:40}).state,'ready');
console.log('PASS: single/co-op settings, Story Host rules, host/joiner confidence, game detection, save diffs, readiness, and disabled-by-default process monitoring.');

assert.equal(DEFAULT_DESKTOP_SETTINGS.wakeWithGame,false);
assert.equal(normalizeDesktopSettings().wakeWithGame,false);
assert.equal(normalizeDesktopSettings({wakeWithGame:true}).wakeWithGame,true);
assert.equal('overlayEnabled' in normalizeDesktopSettings({overlayEnabled:true}),false);

// Synthetic files/process lists only: no real game or save access.
const { default: fs } = await import('node:fs');
const { default: os } = await import('node:os');
const { default: path } = await import('node:path');
const { SaveMonitor } = await import('../desktop/save-monitor.js');
const { GameMonitor } = await import('../desktop/game-monitor.js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'grace-runtime-'));
const file=path.join(temp,'synthetic.co2');
fs.writeFileSync(file,'synthetic');
let parses=0,emissions=0;
const monitor=new SaveMonitor(()=>emissions++,{stableMs:1,parseFile:async()=>{parses++;await new Promise(resolve=>setTimeout(resolve,5));return [{slot:0}];}});
try {
  monitor.filePath=file;
  await Promise.all([monitor.readNow(),monitor.readNow(),monitor.readNow()]);
  assert.equal(parses,1,'concurrent reads share one parser pass');
  assert.equal(emissions,1);
  await monitor.readNow({notifyUnchanged:false});
  assert.equal(parses,1,'unchanged watcher notifications do not reparse');
  assert.equal(emissions,1,'unchanged watcher notifications do not rerender');
  await monitor.readNow();
  assert.equal(parses,1);
  assert.equal(emissions,2,'explicit/final read still delivers a snapshot acknowledgment');
  fs.appendFileSync(file,'new write');
  await monitor.readNow({notifyUnchanged:false});
  assert.equal(parses,2,'a real file change reparses');
  assert.equal(emissions,3);
} finally {
  monitor.stop();
  fs.unlinkSync(file);
  fs.rmdirSync(temp);
}
let finish,scans=0;
const transitions=[];
const game=new GameMonitor(running=>transitions.push(running),undefined,()=>{scans++;return new Promise(resolve=>{finish=resolve;});});
assert.equal(game.intervalMs,10000);
const polling=game.poll();
assert.equal(game.poll(),polling,'overlapping process checks share the same work');
assert.equal(scans,1);
game.stop();finish(['eldenring.exe']);await polling;
assert.deepEqual(transitions,[],'stopped process monitor ignores its in-flight scan');
const mainSource=fs.readFileSync(new URL('../desktop/main.js',import.meta.url),'utf8');
const preloadSource=fs.readFileSync(new URL('../desktop/preload.cjs',import.meta.url),'utf8');
assert.doesNotMatch(mainSource,/globalShortcut|createOverlayWindow|desktop:toggle-overlay/);
assert.doesNotMatch(preloadSource,/toggleOverlay|setOverlayPayload|overlayAction/);
console.log('PASS: no overlay runtime; save read deduplication, unchanged suppression, final acknowledgment, and bounded process monitoring.');

const discovered=[{type:'sl2',path:'other-account.sl2'},{type:'co2',path:'other-account.co2'}];
const discovery={exists:()=>false,discover:()=>discovered};
assert.equal(resolveSavePath({playMode:'single',selectedSavePath:'missing.sl2'},discovery),'','missing bound saves must not switch accounts');
assert.equal(resolveSavePath({playMode:'single',selectedSavePath:'wrong.co2'},{...discovery,exists:()=>true}),'','wrong save modes cannot be substituted');
assert.equal(resolveSavePath({playMode:'single'},discovery),'other-account.sl2','unbound journeys may discover a save');
assert.equal(resolveSavePath({playMode:'seamless',selectedSavePath:'existing.co2'},{...discovery,exists:()=>true}),'existing.co2');
console.log('PASS: missing and mismatched save bindings never silently switch accounts.');
