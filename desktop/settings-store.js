import path from 'node:path';
import { normalizeDesktopSettings } from './core.js';
import { atomicJson, readJson } from './atomic-store.js';

export class SettingsStore {
  constructor(userDataPath) {
    this.file = path.join(userDataPath, 'desktop-settings.json');
    this.settings = this.load();
  }

  load() {
    try { return normalizeDesktopSettings(readJson(this.file) ?? {}); }
    catch { return normalizeDesktopSettings(); }
  }

  get() { return { ...this.settings }; }

  set(patch) {
    const next = normalizeDesktopSettings({ ...this.settings, ...patch });
    atomicJson(this.file, next);
    this.settings=next;
    return this.get();
  }
}
