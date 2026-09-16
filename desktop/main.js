import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { app, BrowserWindow, globalShortcut, ipcMain, dialog, shell } from 'electron';
import updater from 'electron-updater';
import { SettingsStore } from './settings-store.js';
import { JourneyStore } from './journey-store.js';
import { KnowledgeUpdater } from './knowledge-updater.js';
import { SaveMonitor, discoverSaveFiles } from './save-monitor.js';
import { GameMonitor } from './game-monitor.js';
import { discoverGameInstall } from './game-paths.js';
import { diffSnapshot, shouldNotify } from './core.js';

const { autoUpdater } = updater;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let mainWindow = null;
let overlayWindow = null;
let store = null;
let journeyStore = null;
let knowledgeUpdater = null;
let lastSlots = [];
let overlayPayload = { title: 'Guidance of Grace', message: 'No save connected yet.', warnings: [], npcs: [] };
let isQuitting = false;
let gameWasRunning = false;
let lastAutoNoticeSignature = '';
let overlayMode = 'guide';

const send = (channel, payload) => {
  for (const win of [mainWindow, overlayWindow]) if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

function secureWindow(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) { event.preventDefault(); if (/^https?:\/\//i.test(url)) void shell.openExternal(url); }
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

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 470, height: 620, minWidth: 380, minHeight: 280,
    frame: false, transparent: true, resizable: true, alwaysOnTop: true,
    skipTaskbar: true, show: false, hasShadow: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  secureWindow(overlayWindow);
  void overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
  overlayWindow.on('blur', () => { if (overlayWindow?.isVisible() && !overlayWindow.webContents.isDevToolsOpened()) overlayWindow.hide(); });
}

function toggleOverlay(force, mode='guide') {
  overlayMode = mode === 'map' ? 'map' : 'guide';
  if (!overlayWindow || overlayWindow.isDestroyed()) return false;
  const show = force ?? !overlayWindow.isVisible();
  if (show) {
    overlayWindow.webContents.send('desktop:overlay-payload', { ...overlayPayload, overlayMode });
    overlayWindow.showInactive();
    overlayWindow.focus();
  } else overlayWindow.hide();
  return show;
}

function registerHotkeys(settings = store.get()) {
  globalShortcut.unregisterAll();
  if (!settings.overlayEnabled) return true;
  const guideOk = globalShortcut.register(settings.overlayHotkey, () => toggleOverlay(undefined, 'guide'));
  const mapOk = globalShortcut.register(settings.mapOverlayHotkey, () => toggleOverlay(undefined, 'map'));
  return guideOk && mapOk;
}

function configureLoginItem() {
  if (process.platform !== 'win32') return;
  app.setLoginItemSettings({ openAtLogin: store.get().startWithWindows, args: ['--background'] });
}

function savePathOrAuto() {
  const settings = store.get(), preferred = settings.playMode === 'single' ? 'sl2' : 'co2';
  if (settings.selectedSavePath && fs.existsSync(settings.selectedSavePath) && path.extname(settings.selectedSavePath).slice(1).toLowerCase() === preferred) return settings.selectedSavePath;
  const saves = discoverSaveFiles();
  return saves.find(item => item.type === preferred)?.path ?? (settings.selectedSavePath && fs.existsSync(settings.selectedSavePath) ? settings.selectedSavePath : saves[0]?.path ?? '');
}

const saveMonitor = new SaveMonitor(slots => {
  const settings = store.get();
  const selected = Number.isInteger(settings.selectedSlot) ? slots.find(slot => slot.slot === settings.selectedSlot) : slots[0];
  const previous = Number.isInteger(settings.selectedSlot) ? lastSlots.find(slot => slot.slot === settings.selectedSlot) : lastSlots[0];
  const diff = selected ? diffSnapshot(previous, selected) : { changed: [], firstRead: true };
  lastSlots = slots;
  send('desktop:save', { slots, selected, diff, filePath: saveMonitor.filePath });
});

const gameMonitor = new GameMonitor(async running => {
  const settings = store.get();
  send('desktop:game', { running });
  if (running && !gameWasRunning) {
    gameWasRunning = true;
    if (settings.wakeWithGame && !saveMonitor.filePath) {
      const save = savePathOrAuto();
      if (save) { store.set({ selectedSavePath: save }); saveMonitor.watch(save); }
    }
  } else if (!running && gameWasRunning) {
    gameWasRunning = false;
    setTimeout(() => void saveMonitor.readNow().catch(() => {}), 2500);
    if (settings.closeAfterGame) setTimeout(() => {
      if (settings.startWithWindows) { mainWindow?.hide(); overlayWindow?.hide(); }
      else { isQuitting = true; app.quit(); }
    }, 4500);
  }
});

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
  ipcMain.handle('desktop:get-settings', () => store.get());
  ipcMain.handle('desktop:set-settings', (_event, patch) => {
    const before = store.get();
    const next = store.set(patch ?? {});
    if (next.startWithWindows !== before.startWithWindows) configureLoginItem();
    if (next.overlayHotkey !== before.overlayHotkey || next.mapOverlayHotkey !== before.mapOverlayHotkey || next.overlayEnabled !== before.overlayEnabled) registerHotkeys(next);
    if (next.playMode !== before.playMode) { const save=savePathOrAuto(); if(save&&save!==next.selectedSavePath){store.set({selectedSavePath:save});saveMonitor.watch(save)} }
    else if (next.selectedSavePath !== before.selectedSavePath) saveMonitor.watch(next.selectedSavePath);
    autoUpdater.autoDownload = next.autoDownloadUpdates;
    return next;
  });
  ipcMain.handle('desktop:discover-saves', () => discoverSaveFiles());
  ipcMain.handle('desktop:choose-save', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Choose Elden Ring save', properties: ['openFile'], filters: [{ name: 'Elden Ring saves', extensions: ['co2', 'sl2'] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    store.set({ selectedSavePath: result.filePaths[0] });
    saveMonitor.watch(result.filePaths[0]);
    return result.filePaths[0];
  });
  ipcMain.handle('desktop:use-save', (_event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) throw new Error('Save file not found.');
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
  ipcMain.handle('desktop:set-overlay-payload', (_event, payload) => {
    overlayPayload = payload && typeof payload === 'object' ? payload : overlayPayload;
    if (overlayWindow?.isVisible()) overlayWindow.webContents.send('desktop:overlay-payload', { ...overlayPayload, overlayMode });
    const notice = shouldNotify({ warnings: overlayPayload.warnings ?? [], areaNpcCount: overlayPayload.npcs?.length ?? 0, settings: store.get() });
    const signature = notice ? `${notice}:${(overlayPayload.warnings ?? []).map(w => w.id ?? w.title).join('|')}:${notice === 'area' ? (overlayPayload.npcs ?? []).map(n => n.id).join('|') : ''}` : '';
    if (notice && gameMonitor.running && signature !== lastAutoNoticeSignature) toggleOverlay(true);
    lastAutoNoticeSignature = signature;
    return true;
  });
  ipcMain.handle('desktop:toggle-overlay', (_event, mode='guide') => toggleOverlay(undefined, mode === 'map' ? 'map' : 'guide'));
  ipcMain.handle('desktop:list-journeys', () => journeyStore.list());
  ipcMain.handle('desktop:create-journey', (_event, input) => journeyStore.create(input ?? {}));
  ipcMain.handle('desktop:load-journey', (_event, id) => journeyStore.load(id));
  ipcMain.handle('desktop:save-journey', (_event, id, state, patch) => journeyStore.save(id, state, patch ?? {}));
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
  ipcMain.handle('desktop:update-knowledge', () => knowledgeUpdater.check());
  ipcMain.handle('desktop:import-knowledge', async () => {const result=await dialog.showOpenDialog(mainWindow,{title:'Import searchable Elden Ring marker/item catalog',properties:['openFile'],filters:[{name:'JSON catalog',extensions:['json']}]});if(result.canceled||!result.filePaths[0])return null;return knowledgeUpdater.importMarkers(result.filePaths[0]);});
  ipcMain.handle('desktop:open-game-movies', async () => {const detected=discoverGameInstall(),movieDir=detected.gameDir?path.join(detected.gameDir,'movie'):'';if(!movieDir||!fs.existsSync(movieDir))throw new Error('Elden Ring movie folder was not found.');return shell.openPath(movieDir);});
  ipcMain.handle('desktop:show-main', () => { mainWindow?.show(); mainWindow?.focus(); return true; });
  ipcMain.handle('desktop:check-updates', async () => {
    if (!app.isPackaged) return { state: 'dev', message: 'Update checks run in packaged builds.' };
    return autoUpdater.checkForUpdates();
  });
  ipcMain.handle('desktop:install-update', () => { if (app.isPackaged) autoUpdater.quitAndInstall(); return true; });
  ipcMain.handle('desktop:open-external', (_event, url) => { if (/^https?:\/\//i.test(url)) return shell.openExternal(url); return false; });
  ipcMain.on('desktop:overlay-action', (_event, action) => mainWindow?.webContents.send('desktop:overlay-action', action));
}

app.on('second-instance', (_event, argv) => {
  const index = argv.indexOf('--launch-mode');
  if (index >= 0 && argv[index + 1]) launchExecutable(configuredGame(argv[index + 1]));
  mainWindow?.show(); mainWindow?.focus();
});

app.whenReady().then(() => {
  store = new SettingsStore(app.getPath('userData'));
  journeyStore = new JourneyStore(app.getPath('userData'));
  knowledgeUpdater = new KnowledgeUpdater(app.getPath('userData'));
  createMainWindow(); createOverlayWindow(); setupIpc(); configureUpdater(); configureLoginItem();
  registerHotkeys(store.get());
  const save = savePathOrAuto();
  if (save) { store.set({ selectedSavePath: save }); saveMonitor.watch(save); }
  gameMonitor.start();
  const launchIndex = process.argv.indexOf('--launch-mode');
  if (launchIndex >= 0 && process.argv[launchIndex + 1]) setTimeout(() => launchExecutable(configuredGame(process.argv[launchIndex + 1])), 800);
  if (app.isPackaged && store.get().checkForUpdates) setTimeout(() => void autoUpdater.checkForUpdates().catch(() => {}), 5000);
  if (store.get().knowledgeAutoUpdate) setTimeout(() => void knowledgeUpdater.check().then(status=>send('desktop:knowledge',status)).catch(()=>{}), 8000);
});

app.on('before-quit', () => { isQuitting = true; saveMonitor.stop(); gameMonitor.stop(); globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !store?.get().keepRunningInBackground) app.quit();
});
