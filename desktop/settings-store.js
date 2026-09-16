import fs from 'node:fs';
import path from 'node:path';
import { normalizeDesktopSettings } from './core.js';

export class SettingsStore {
  constructor(userDataPath) {
    this.file = path.join(userDataPath, 'desktop-settings.json');
    this.settings = this.load();
  }

  load() {
    try { return normalizeDesktopSettings(JSON.parse(fs.readFileSync(this.file, 'utf8'))); }
    catch { return normalizeDesktopSettings(); }
  }

  get() { return { ...this.settings }; }

  set(patch) {
    this.settings = normalizeDesktopSettings({ ...this.settings, ...patch });
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.settings, null, 2));
    return this.get();
  }
}
