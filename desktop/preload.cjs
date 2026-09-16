const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, fn) => {
  const listener = (_event, payload) => fn(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('guidanceDesktop', {
  isDesktop: true,
  getSettings: () => ipcRenderer.invoke('desktop:get-settings'),
  setSettings: patch => ipcRenderer.invoke('desktop:set-settings', patch),
  discoverSaves: () => ipcRenderer.invoke('desktop:discover-saves'),
  chooseSave: () => ipcRenderer.invoke('desktop:choose-save'),
  useSave: filePath => ipcRenderer.invoke('desktop:use-save', filePath),
  readSave: () => ipcRenderer.invoke('desktop:read-save'),
  chooseGame: kind => ipcRenderer.invoke('desktop:choose-game', kind),
  discoverGames: () => ipcRenderer.invoke('desktop:discover-games'),
  launchGame: mode => ipcRenderer.invoke('desktop:launch-game', mode),
  createLauncherShortcut: mode => ipcRenderer.invoke('desktop:create-shortcut', mode),
  setOverlayPayload: payload => ipcRenderer.invoke('desktop:set-overlay-payload', payload),
  toggleOverlay: mode => ipcRenderer.invoke('desktop:toggle-overlay', mode),
  listJourneys: () => ipcRenderer.invoke('desktop:list-journeys'),
  createJourney: input => ipcRenderer.invoke('desktop:create-journey', input),
  loadJourney: id => ipcRenderer.invoke('desktop:load-journey', id),
  saveJourney: (id, state, patch) => ipcRenderer.invoke('desktop:save-journey', id, state, patch),
  importJourney: () => ipcRenderer.invoke('desktop:import-journey'),
  exportJourney: id => ipcRenderer.invoke('desktop:export-journey', id),
  knowledgeStatus: () => ipcRenderer.invoke('desktop:knowledge-status'),
  knowledgeCatalog: () => ipcRenderer.invoke('desktop:knowledge-catalog'),
  updateKnowledge: () => ipcRenderer.invoke('desktop:update-knowledge'),
  importKnowledge: () => ipcRenderer.invoke('desktop:import-knowledge'),
  openGameMovies: () => ipcRenderer.invoke('desktop:open-game-movies'),
  showMain: () => ipcRenderer.invoke('desktop:show-main'),
  checkUpdates: () => ipcRenderer.invoke('desktop:check-updates'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),
  openExternal: url => ipcRenderer.invoke('desktop:open-external', url),
  onSave: fn => on('desktop:save', fn),
  onGame: fn => on('desktop:game', fn),
  onUpdate: fn => on('desktop:update', fn),
  onKnowledge: fn => on('desktop:knowledge', fn),
  onOverlayPayload: fn => on('desktop:overlay-payload', fn),
  onOverlayAction: fn => on('desktop:overlay-action', fn),
  overlayAction: action => ipcRenderer.send('desktop:overlay-action', action),
});
