import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function steamRootFromRegistry() {
  if (process.platform !== 'win32') return '';
  for (const key of [
    'HKCU\\Software\\Valve\\Steam',
    'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam',
  ]) {
    try {
      const output = execFileSync('reg.exe', ['query', key, '/v', 'SteamPath'], { encoding: 'utf8', windowsHide: true });
      const match = output.match(/SteamPath\s+REG_SZ\s+(.+)$/mi);
      if (match?.[1]) return match[1].trim().replace(/\//g, path.sep);
    } catch {}
  }
  return '';
}

function libraryRoots(steamRoot) {
  if (!steamRoot) return [];
  const roots = new Set([steamRoot]);
  const vdf = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
  try {
    const text = fs.readFileSync(vdf, 'utf8');
    for (const match of text.matchAll(/"path"\s+"([^"]+)"/g)) roots.add(match[1].replace(/\\\\/g, '\\'));
  } catch {}
  return [...roots];
}

export function discoverGameInstall() {
  const steamRoot = steamRootFromRegistry() || [
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Steam'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Steam'),
  ].find(candidate => candidate && fs.existsSync(candidate)) || '';

  for (const root of libraryRoots(steamRoot)) {
    const gameDir = path.join(root, 'steamapps', 'common', 'ELDEN RING', 'Game');
    const vanilla = path.join(gameDir, 'eldenring.exe');
    if (!fs.existsSync(vanilla)) continue;
    const seamlessCandidates = [path.join(gameDir, 'ersc_launcher.exe'), path.join(gameDir, 'SeamlessCoop', 'ersc_launcher.exe')];
    return { gameDir, vanilla, protected: path.join(gameDir, 'start_protected_game.exe'), seamless: seamlessCandidates.find(fs.existsSync) ?? '' };
  }
  return { gameDir: '', vanilla: '', protected: '', seamless: '' };
}
