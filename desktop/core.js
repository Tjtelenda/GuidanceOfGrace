export const DEFAULT_HOTKEY = 'CommandOrControl+Shift+G';
export const DEFAULT_MAP_HOTKEY = 'CommandOrControl+Shift+M';
export const GAME_PROCESSES = new Set(['eldenring.exe', 'ersc_launcher.exe', 'start_protected_game.exe']);

export const DEFAULT_DESKTOP_SETTINGS = Object.freeze({
  overlayHotkey: DEFAULT_HOTKEY,
  mapOverlayHotkey: DEFAULT_MAP_HOTKEY,
  overlayEnabled: true,
  autoShowWarnings: true,
  autoShowAreaNpcs: false,
  startWithWindows: false,
  wakeWithGame: true,
  closeAfterGame: false,
  checkForUpdates: true,
  autoDownloadUpdates: false,
  knowledgeAutoUpdate: true,
  keepRunningInBackground: true,
  gameLaunchMode: 'seamless',
  gamePath: '',
  seamlessLauncherPath: '',
  selectedSavePath: '',
  selectedSlot: null,
  playMode: 'seamless',
  multiplayerRole: 'joiner',
  activeJourneyId: '',
});

export function normalizeDesktopSettings(raw = {}) {
  const role = raw.multiplayerRole === 'host' ? 'host' : 'joiner';
  const playMode = raw.playMode === 'single' ? 'single' : 'seamless';
  const launchMode = ['seamless', 'vanilla', 'manual'].includes(raw.gameLaunchMode) ? raw.gameLaunchMode : 'seamless';
  return {
    ...DEFAULT_DESKTOP_SETTINGS,
    overlayHotkey: typeof raw.overlayHotkey === 'string' && raw.overlayHotkey.trim() ? raw.overlayHotkey.trim() : DEFAULT_HOTKEY,
    mapOverlayHotkey: typeof raw.mapOverlayHotkey === 'string' && raw.mapOverlayHotkey.trim() ? raw.mapOverlayHotkey.trim() : DEFAULT_MAP_HOTKEY,
    overlayEnabled: raw.overlayEnabled !== false,
    autoShowWarnings: raw.autoShowWarnings !== false,
    autoShowAreaNpcs: Boolean(raw.autoShowAreaNpcs),
    startWithWindows: Boolean(raw.startWithWindows),
    wakeWithGame: raw.wakeWithGame !== false,
    closeAfterGame: Boolean(raw.closeAfterGame),
    checkForUpdates: raw.checkForUpdates !== false,
    autoDownloadUpdates: Boolean(raw.autoDownloadUpdates),
    knowledgeAutoUpdate: raw.knowledgeAutoUpdate !== false,
    keepRunningInBackground: raw.keepRunningInBackground ?? raw.minimizeToTray ?? true,
    gameLaunchMode: launchMode,
    gamePath: typeof raw.gamePath === 'string' ? raw.gamePath : '',
    seamlessLauncherPath: typeof raw.seamlessLauncherPath === 'string' ? raw.seamlessLauncherPath : '',
    selectedSavePath: typeof raw.selectedSavePath === 'string' ? raw.selectedSavePath : '',
    selectedSlot: Number.isInteger(raw.selectedSlot) && raw.selectedSlot >= 0 && raw.selectedSlot < 10 ? raw.selectedSlot : null,
    playMode,
    multiplayerRole: role,
    activeJourneyId: typeof raw.activeJourneyId === 'string' ? raw.activeJourneyId : '',
  };
}

export function diffSnapshot(previous, next) {
  if (!previous) return { changed: [], firstRead: true };
  const changed = [];
  const oldFlags = previous.flags ?? {};
  const newFlags = next.flags ?? {};
  for (const [key, value] of Object.entries(newFlags)) {
    if (Boolean(value) && !Boolean(oldFlags[key])) changed.push(key);
  }
  if (previous.mapName !== next.mapName && next.mapName) changed.push('currentMap');
  if (previous.lastRestedGrace !== next.lastRestedGrace && next.lastRestedGrace != null) changed.push('lastRestedGrace');
  return { changed, firstRead: false };
}

export function evidenceConfidence(role, evidenceType, playMode = 'seamless') {
  if (playMode === 'single') return evidenceType === 'manual' ? 'confirmed' : 'strong';
  if (role === 'host') return evidenceType === 'manual' ? 'confirmed' : 'strong';
  if (evidenceType === 'reward' || evidenceType === 'inventory' || evidenceType === 'manual') return 'strong';
  if (evidenceType === 'grace' || evidenceType === 'location') return 'medium';
  return 'cautious';
}

export function roleNote(role, playMode = 'seamless') {
  if (playMode === 'single') return 'Single Player: all progression belongs to this character, so save evidence can be interpreted directly.';
  return role === 'host'
    ? 'Story Host: world-state flags are treated as strong evidence. For the cleanest story experience, let this player initiate NPC dialogue.'
    : 'Joiner: Seamless synchronizes NPC talk events and progression. Let the Story Host speak to story NPCs first so earlier dialogue is not advanced before they hear it.';
}

export function dialogueRule(playMode = 'seamless', role = 'joiner') {
  if (playMode === 'single') return null;
  return role === 'host'
    ? { level:'note', title:'Story Host', text:'You are the designated story driver. Initiate important NPC conversations first so the group hears them in order.' }
    : { level:'warning', title:'Let the Story Host speak first', text:'Seamless Co-op synchronizes NPC talk events and progression. Around story NPCs, avoid advancing dialogue before the Story Host has heard it.' };
}

export function isGameProcess(name = '') {
  return GAME_PROCESSES.has(String(name).toLowerCase());
}

export function readinessLabel(level, recommendation = {}, scaduLevel = null) {
  const { min = 1, max = null, scaduMin = null, scaduMax = null } = recommendation;
  if (!Number.isFinite(level)) return { state: 'unknown', text: 'Level unavailable' };
  const runeText = `${min}${max ? `–${max}` : '+'}`;
  const scaduText = scaduMin != null ? `${scaduMin}${scaduMax != null ? `–${scaduMax}` : '+'}` : null;
  if (level < min) return { state: 'under', text: `Below the usual rune-level range (${runeText})${scaduText ? ` · Scadutree target ${scaduText}` : ''}` };
  if (scaduMin != null && Number.isFinite(scaduLevel) && scaduLevel < scaduMin) return { state:'under', text:`Rune level is reasonable · Scadutree ${scaduLevel} is below the usual ${scaduText}` };
  if (max && level > max + 15) return { state: 'over', text: `Above the usual range (${min}–${max})` };
  const suffix = scaduText ? Number.isFinite(scaduLevel) ? ` · Scadutree ${scaduLevel} (target ${scaduText})` : ` · Scadutree target ${scaduText} (save value unavailable; manual fallback can be used)` : '';
  return { state: 'ready', text: `Comfortable rune-level range (${runeText})${suffix}` };
}

export function shouldNotify({ warnings = [], areaNpcCount = 0, settings }) {
  if (settings.autoShowWarnings && warnings.some(w => w.level === 'danger' || w.level === 'warning')) return 'warning';
  if (settings.autoShowAreaNpcs && areaNpcCount > 0) return 'area';
  return null;
}
