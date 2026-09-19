import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } from 'electron';
import updater from 'electron-updater';
import { SettingsStore } from './settings-store.js';
import { JourneyStore } from './journey-store.js';
import { KnowledgeUpdater } from './knowledge-updater.js';
import { SaveMonitor, discoverSaveFiles, parseSaveFile } from './save-monitor.js';
import { GameMonitor } from './game-monitor.js';
import { GameLifecycle } from './game-lifecycle.js';
import { regenerateLocal } from './local-generator.js';
import { localPlayerState } from '../content/journey-state.js';
import { listLocalMovies, playableMovie } from './local-media.js';
import { discoverGameInstall } from './game-paths.js';
import { diffSnapshot, resolveSavePath } from './core.js';

const { autoUpdater } = updater;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let mainWindow = null;
let store = null;
let journeyStore = null;
let knowledgeUpdater = null;
let lastSlots = [];
let isQuitting = false;
let gameWasRunning = false;
let tray=null;
let localGeneration=null;
let finalSaveAcknowledged=null;

const send = (channel, payload) => {
  for (const win of [mainWindow]) if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

function secureWindow(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault(); if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 920, minHeight: 650,
    backgroundColor: '#0e0d0b', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  secureWindow(mainWindow);
  void mainWindow.loadFile(path.join(root, 'index.html'), { query: { desktop: '1' } });
  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--background')) mainWindow.show();
  });
  mainWindow.on('close', event => {
    if (!isQuitting && store?.get().keepRunningInBackground) { event.preventDefault(); mainWindow.hide(); }
  });
}

function configureLoginItem() {
  if (process.platform !== 'win32') return;
  app.setLoginItemSettings({ openAtLogin: store.get().startWithWindows, args: ['--background'] });
}

function savePathOrAuto() {
  return resolveSavePath(store.get(), { exists: fs.existsSync, discover: discoverSaveFiles });
}

const saveMonitor = new SaveMonitor((slots,filePath) => {
  const settings = store.get();
  const selected = Number.isInteger(settings.selectedSlot) ? slots.find(slot => slot.slot === settings.selectedSlot) : slots[0];
  const previous = Number.isInteger(settings.selectedSlot) ? lastSlots.find(slot => slot.slot === settings.selectedSlot) : lastSlots[0];
  const diff = selected ? diffSnapshot(previous, selected) : { changed: [], firstRead: true };
  lastSlots = slots;
  send('desktop:save', { slots, selected, diff, filePath, journeyId:settings.activeJourneyId });
},{parseFile:file=>parseSaveFile(file,knowledgeUpdater?.catalog().map(r=>r.eventId).filter(Number.isSafeInteger)??[]),onError:error=>send('desktop:save-error',{message:error.message})});

async function readFinalSnapshot(){
  const journeyId=store.get().activeJourneyId;
  if(!journeyId||!saveMonitor.filePath)return;
  let timer;
  const saved=new Promise(resolve=>{finalSaveAcknowledged=id=>{if(id===journeyId)resolve()};timer=setTimeout(resolve,3000);});
  try{await saveMonitor.readNow();await saved;}finally{clearTimeout(timer);finalSaveAcknowledged=null;}
}
const lifecycle=new GameLifecycle({readFinal:()=>readFinalSnapshot().catch(()=>{}),onClose:()=>{if(store.get().closeAfterGame){if(store.get().keepRunningInBackground){mainWindow?.hide();}else{isQuitting=true;app.quit();}}}});
const gameMonitor = new GameMonitor(async running => {
  lifecycle.change(running);
  const settings = store.get();
  send('desktop:game', { running });
  if (running && !gameWasRunning) {
    gameWasRunning = true;
    if(settings.wakeWithGame)mainWindow?.show();
    if (settings.wakeWithGame && settings.activeJourneyId && !saveMonitor.filePath) {
      const save = savePathOrAuto();
      if (save) { store.set({ selectedSavePath: save }); saveMonitor.watch(save); }
    }
  } else if (!running && gameWasRunning) {
    gameWasRunning = false;
  }
});

function configureGameMonitor() {
  const settings = store.get();
  if (settings.wakeWithGame || settings.closeAfterGame) gameMonitor.start();
  else { gameMonitor.stop(); lifecycle.stop(); lifecycle.running = false; gameWasRunning = false; }
}

function launchExecutable(executable) {
  if (!executable || !fs.existsSync(executable)) throw new Error('The configured game executable was not found.');
  const child = spawn(executable, [], { cwd: path.dirname(executable), detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return true;
}

function configuredGame(mode) {
  const settings = store.get();
  const detected = discoverGameInstall();
  if (mode === 'seamless') return settings.seamlessLauncherPath || detected.seamless;
  return settings.gamePath || detected.protected || detected.vanilla;
}

function configureUpdater() {
  autoUpdater.autoDownload = store.get().autoDownloadUpdates;
  const relay = (state, extra = {}) => send('desktop:update', { state, ...extra });
  autoUpdater.on('checking-for-update', () => relay('checking'));
  autoUpdater.on('update-available', info => relay('available', { version: info.version }));
  autoUpdater.on('update-not-available', info => relay('current', { version: info.version }));
  autoUpdater.on('download-progress', progress => relay('downloading', { percent: Math.round(progress.percent) }));
  autoUpdater.on('update-downloaded', info => relay('ready', { version: info.version }));
  autoUpdater.on('error', error => relay('error', { message: error.message }));
}

function setupIpc() {
  ipcMain.handle('desktop:generate-local',()=>{if(!localGeneration)localGeneration=regenerateLocal(app.getPath('userData'),knowledgeUpdater,message=>send('desktop:generation',{message})).finally(()=>{localGeneration=null});return localGeneration;});
  ipcMain.handle('desktop:local-map',(_event,target)=>{
    if(!['M00','M01','M10'].includes(target?.layer)||!Number.isFinite(target.x)||!Number.isFinite(target.y)||target.x<0||target.y<0||target.x>10496||target.y>10496)return null;
    const file=path.join(app.getPath('userData'),'knowledge','maps',`${target.layer}.png`);
    if(!fs.existsSync(file))return null;
    const img=nativeImage.createFromPath(file),size=img.getSize(),scale=size.width/10496;
    if(img.isEmpty())return null;
    const width=Math.min(600,size.width),height=Math.min(450,size.height),x=Math.max(0,Math.min(size.width-width,Math.round(target.x*scale-width/2))),y=Math.max(0,Math.min(size.height-height,Math.round(target.y*scale-height/2)));
    return {image:img.crop({x,y,width,height}).toDataURL(),x:(target.x*scale-x)/width*100,y:(target.y*scale-y)/height*100};
  });
  ipcMain.handle('desktop:app-info',()=>({version:app.getVersion(),packaged:app.isPackaged,appPath:app.getAppPath(),userData:app.getPath('userData')}));
  ipcMain.handle('desktop:get-settings', () => store.get());
  ipcMain.handle('desktop:set-settings', (_event, patch) => {
    const before = store.get();
    const candidate={...before,...patch};
    if(candidate.selectedSavePath&&!new RegExp(candidate.playMode==='single'?'\\.sl2$':'\\.co2$','i').test(candidate.selectedSavePath))candidate.selectedSavePath='';
    const next = store.set(candidate);
    configureGameMonitor();
    if (next.startWithWindows !== before.startWithWindows) configureLoginItem();
    if (next.playMode !== before.playMode) { const save=savePathOrAuto();store.set({selectedSavePath:save});lastSlots=[];saveMonitor.watch(save); }
    else if (next.selectedSavePath !== before.selectedSavePath) saveMonitor.watch(next.selectedSavePath);
    autoUpdater.autoDownload = next.autoDownloadUpdates;
    return store.get();
  });
  ipcMain.handle('desktop:discover-saves', () => discoverSaveFiles());
  ipcMain.handle('desktop:choose-save', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Choose Elden Ring save', properties: ['openFile'], filters: [{ name: 'Elden Ring saves', extensions: ['co2', 'sl2'] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    if(!new RegExp(store.get().playMode==='single'?'\\.sl2$':'\\.co2$','i').test(result.filePaths[0]))throw new Error('The save type must match this journey mode.');
    store.set({ selectedSavePath: result.filePaths[0] });
    saveMonitor.watch(result.filePaths[0]);
    return result.filePaths[0];
  });
  ipcMain.handle('desktop:use-save', (_event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) throw new Error('Save file not found.');
    if(!new RegExp(store.get().playMode==='single'?'\\.sl2$':'\\.co2$','i').test(filePath))throw new Error('The save type must match this journey mode.');
    store.set({ selectedSavePath: filePath }); saveMonitor.watch(filePath); return filePath;
  });
  ipcMain.handle('desktop:read-save', () => saveMonitor.readNow());
  ipcMain.handle('desktop:discover-games', () => discoverGameInstall());
  ipcMain.handle('desktop:choose-game', async (_event, kind) => {
    const result = await dialog.showOpenDialog(mainWindow, { title: kind === 'seamless' ? 'Choose ersc_launcher.exe' : 'Choose Elden Ring launcher', properties: ['openFile'], filters: [{ name: 'Executable', extensions: ['exe'] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    store.set(kind === 'seamless' ? { seamlessLauncherPath: result.filePaths[0] } : { gamePath: result.filePaths[0] });
    return result.filePaths[0];
  });
  ipcMain.handle('desktop:launch-game', (_event, mode) => launchExecutable(configuredGame(mode)));
  ipcMain.handle('desktop:create-shortcut', (_event, mode) => {
    if (!app.isPackaged || process.platform !== 'win32') throw new Error('Launcher shortcuts are created from the installed Windows build.');
    const desktop = app.getPath('desktop');
    const link = path.join(desktop, `Guidance of Grace - ${mode === 'seamless' ? 'Seamless Co-op' : 'Elden Ring'}.lnk`);
    const ok = shell.writeShortcutLink(link, 'create', { target: process.execPath, args: `--launch-mode ${mode}`, workingDirectory: path.dirname(process.execPath), description: 'Launch Elden Ring with Guidance of Grace' });
    if (!ok) throw new Error('Windows did not create the shortcut.');
    return link;
  });
  ipcMain.handle('desktop:list-journeys', () => journeyStore.list());
  ipcMain.handle('desktop:create-journey', (_event, input) => journeyStore.create(input ?? {}));
  ipcMain.handle('desktop:load-journey', (_event, id) => {
    const journey=journeyStore.load(id),p=localPlayerState(journey.state);
    saveMonitor.stop();lastSlots=[];
    store.set({activeJourneyId:id,playMode:journey.playMode,multiplayerRole:p.role??'joiner',selectedSavePath:p.savePath??'',selectedSlot:p.character?.slot??null});
    const save=savePathOrAuto();if(save)store.set({selectedSavePath:save});saveMonitor.watch(save);
    return journey;
  });
  ipcMain.handle('desktop:save-journey', (_event, id, state, patch) => {const saved=journeyStore.save(id,state,patch??{});finalSaveAcknowledged?.(id);return saved;});
  ipcMain.handle('desktop:import-journey', async () => {
    const result=await dialog.showOpenDialog(mainWindow,{title:'Import Guidance of Grace journey',properties:['openFile'],filters:[{name:'Guidance of Grace Journey',extensions:['grace']}]});
    if(result.canceled||!result.filePaths[0])return null;return journeyStore.import(result.filePaths[0]);
  });
  ipcMain.handle('desktop:export-journey', async (_event,id) => {
    const journey=journeyStore.load(id);const result=await dialog.showSaveDialog(mainWindow,{title:'Export Guidance of Grace journey',defaultPath:`${journey.name.replace(/[^a-z0-9 _-]/gi,'').trim()||'journey'}.grace`,filters:[{name:'Guidance of Grace Journey',extensions:['grace']}]});
    if(result.canceled||!result.filePath)return null;return journeyStore.export(id,result.filePath);
  });
  ipcMain.handle('desktop:knowledge-status', () => knowledgeUpdater.status());
  ipcMain.handle('desktop:knowledge-catalog', () => knowledgeUpdater.catalog());
  ipcMain.handle('desktop:knowledge-encounters', () => knowledgeUpdater.encounters());
  ipcMain.handle('desktop:update-knowledge', () => knowledgeUpdater.check());
  ipcMain.handle('desktop:import-knowledge', async () => {const result=await dialog.showOpenDialog(mainWindow,{title:'Import searchable Elden Ring marker/item catalog',properties:['openFile'],filters:[{name:'JSON catalog',extensions:['json']}]});if(result.canceled||!result.filePaths[0])return null;return knowledgeUpdater.importMarkers(result.filePaths[0]);});
  ipcMain.handle('desktop:open-game-movies', () => listLocalMovies(discoverGameInstall().gameDir));
  ipcMain.handle('desktop:choose-video', async () => {
    const result=await dialog.showOpenDialog(mainWindow,{title:'Play a local video',properties:['openFile'],filters:[{name:'Playable video',extensions:['mp4','webm','ogv']} ]});
    return result.canceled?null:playableMovie(result.filePaths[0]);
  });
  ipcMain.handle('desktop:show-main', () => { mainWindow?.show(); mainWindow?.focus(); return true; });
  ipcMain.handle('desktop:check-updates', async () => {
    if (!app.isPackaged) return { state: 'dev', message: 'Update checks run in packaged builds.' };
    if(!fs.existsSync(path.join(process.resourcesPath,'app-update.yml')))return {state:'unconfigured',message:'No release repository is configured yet. This installed version remains usable offline.'};
    try{await autoUpdater.checkForUpdates();return {state:'checked',message:'Update check completed.'};}catch(error){return {state:'error',message:'Release feed unavailable. Installed version remains usable offline.'};}
  });
  ipcMain.handle('desktop:install-update', () => { if (app.isPackaged) autoUpdater.quitAndInstall(); return true; });
  ipcMain.handle('desktop:open-external', (_event, url) => { if (/^https?:\/\//i.test(url)) return shell.openExternal(url); return false; });
}

app.on('second-instance', (_event, argv) => {
  const index = argv.indexOf('--launch-mode');
  if (index >= 0 && argv[index + 1]) launchExecutable(configuredGame(argv[index + 1]));
  mainWindow?.show(); mainWindow?.focus();
});

app.whenReady().then(() => {
  if(!gotLock)return;
  store = new SettingsStore(app.getPath('userData'));
  journeyStore = new JourneyStore(app.getPath('userData'));
  knowledgeUpdater = new KnowledgeUpdater(app.getPath('userData'));
  createMainWindow(); setupIpc(); configureUpdater(); configureLoginItem();
  const icon=nativeImage.createFromPath(path.join(__dirname,'icon.png'));
  tray=new Tray(icon);tray.setToolTip('Guidance of Grace');tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Guidance of Grace',click:()=>{mainWindow?.show();mainWindow?.focus()}},{type:'separator'},{label:'Quit',click:()=>{isQuitting=true;app.quit()}}]));tray.on('double-click',()=>mainWindow?.show());
  configureGameMonitor();
  const launchIndex = process.argv.indexOf('--launch-mode');
  if (launchIndex >= 0 && process.argv[launchIndex + 1]) setTimeout(() => launchExecutable(configuredGame(process.argv[launchIndex + 1])), 800);
  if (app.isPackaged && fs.existsSync(path.join(process.resourcesPath,'app-update.yml')) && store.get().checkForUpdates) setTimeout(() => void autoUpdater.checkForUpdates().catch(() => {}), 5000);
  if (store.get().knowledgeAutoUpdate) setTimeout(() => void knowledgeUpdater.check().then(status=>send('desktop:knowledge',status)).catch(()=>{}), 8000);
});

app.on('before-quit', () => { isQuitting = true; lifecycle.stop();saveMonitor.stop(); gameMonitor.stop(); });
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !store?.get().keepRunningInBackground) app.quit();
});
