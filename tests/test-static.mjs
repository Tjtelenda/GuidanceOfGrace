import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
const html=read('index.html'), app=read('app.js'), cloud=read('cloud.js'), sql=read('cloud/supabase.sql'), config=read('cloud-config.js'), monitor=read('desktop/save-monitor.js'), main=read('desktop/main.js'), preload=read('desktop/preload.cjs');
for (const id of ['journeySelect','spoilerSelect','saveButton','transitionPanel','transitionWarnings','mapPins','mapInspector','questList','checkList','sessionCards','sessionTime','mending','ledgerList','storyBeats','glossaryList','desktopPlayMode','desktopRole','scaduHelp','videoDialog','localVideo','characterDialog']) {
  assert.match(html,new RegExp(`id=["']${id}["']`),`Missing #${id}`);
}
assert.doesNotMatch(app,/\bfetch\s*\(/,'Save/UI module should not perform network requests directly.');
assert.doesNotMatch(app,/from ['"]\.\/cloud\.js/,'Local companion must not initialize the obsolete team cloud client.');
assert.doesNotMatch(html,/id="(?:profileSelect|profileCards|cloudControls)"/,'Removed remote-player controls must not return.');
assert.doesNotMatch(cloud,/service[_-]?role/i,'Browser cloud client must not contain a service-role credential.');
assert.doesNotMatch(config,/sb_secret_|service_role/i,'Cloud config must not contain a privileged key.');
assert.doesNotMatch(monitor,/write(File|FileSync|Sync)|appendFile|truncate|rename\(/,'Save watcher must remain read-only.');
assert.doesNotMatch(main,/OpenProcess|ReadProcessMemory|WriteProcessMemory|dll|inject/i,'Desktop shell must not inject into or read Elden Ring process memory.');
assert.match(preload,/contextBridge/,'Renderer should use an isolated preload bridge.');

assert.doesNotMatch(main,/globalShortcut|createOverlayWindow|setAlwaysOnTop/,'Second-screen app must not create overlays or register game hotkeys.');
assert.doesNotMatch(preload,/toggleOverlay|setOverlayPayload|overlayAction/,'Overlay API must be removed.');
assert.match(app,/VEILED BY GRACE/,'Undiscovered ending paths should stay veiled.');
assert.match(monitor,/eventIds:\s*\(slot\.eventFlags/,'Desktop save normalization must expose full active event IDs for Journey Ledger auto-checks.');
assert.match(sql,/enable row level security/i);
assert.match(sql,/is_campaign_member/);
assert.match(sql,/foreign key \(campaign_id,user_id\) references public\.campaign_members/i);
console.log('PASS: required desktop/story/UI surfaces exist; save watching is read-only; no process-memory injection; cloud scaffold uses RLS and no privileged browser credential.');
