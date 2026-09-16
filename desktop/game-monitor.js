import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isGameProcess } from './core.js';

const execFileAsync = promisify(execFile);

export async function listWindowsProcesses() {
  if (process.platform !== 'win32') return [];
  try {
    const { stdout } = await execFileAsync('tasklist.exe', ['/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 3000 });
    return stdout.split(/\r?\n/).map(line => line.match(/^"([^"]+)"/i)?.[1]).filter(Boolean);
  } catch { return []; }
}

export class GameMonitor {
  constructor(onChange, intervalMs = 2000) {
    this.onChange = onChange;
    this.intervalMs = intervalMs;
    this.running = false;
    this.timer = null;
  }

  async poll() {
    const processes = await listWindowsProcesses();
    const nowRunning = processes.some(isGameProcess);
    if (nowRunning !== this.running) {
      this.running = nowRunning;
      this.onChange?.(nowRunning, processes);
    }
  }

  start() {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
