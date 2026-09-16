import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Only companion-owned files reach this helper. Never accept a game-save target.
export function atomicJson(file, value, validate = () => {}) {
  if (/\.(sl2|co2|bak)$/i.test(file)) throw new Error('Game saves are read-only.');
  validate(value);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temp, 'wx');
    try { fs.writeFileSync(fd, JSON.stringify(value, null, 2)); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    validate(JSON.parse(fs.readFileSync(temp, 'utf8')));
    if (fs.existsSync(file)) {
      try {validate(JSON.parse(fs.readFileSync(file,'utf8')));fs.copyFileSync(file,`${file}.previous`);}
      catch { /* Preserve the previous known-good copy if the active file is damaged. */ }
    }
    fs.renameSync(temp, file);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}

export function readJson(file, validate = () => {}) {
  for (const candidate of [file, `${file}.previous`]) {
    try { const value = JSON.parse(fs.readFileSync(candidate, 'utf8')); validate(value); return value; }
    catch { /* Keep the last validated cache available after interrupted writes. */ }
  }
  return null;
}
