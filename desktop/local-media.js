import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const playableExtensions = new Set(['.mp4', '.webm', '.ogv']);

export function playableMovie(file) {
  if (!file || !playableExtensions.has(path.extname(file).toLowerCase()) || !fs.statSync(file).isFile()) {
    throw new Error('Choose an MP4, WebM or Ogg video.');
  }
  return { name: path.basename(file), url: pathToFileURL(path.resolve(file)).href };
}

export function listLocalMovies(gameDir) {
  const folder = gameDir ? path.join(gameDir, 'movie') : '';
  if (!folder || !fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(bk2|bik|mp4|webm|ogv)$/i.test(entry.name))
    .map(entry => {
      const supported = playableExtensions.has(path.extname(entry.name).toLowerCase());
      return supported ? { ...playableMovie(path.join(folder, entry.name)), supported } :
        { name: entry.name, supported, reason: 'Bink video needs a licensed decoder or a locally converted MP4/WebM copy.' };
    });
}
