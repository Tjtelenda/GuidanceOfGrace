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
  constructor(onChange, intervalMs = 10000, listProcesses = listWindowsProcesses) {
    this.onChange = onChange;
    this.intervalMs = intervalMs;
    this.running = false;
    this.timer = null;
    this.listProcesses=listProcesses;
    this.generation=0;
    this.pending=null;
  }

  poll() {
    if (this.pending) return this.pending;
    const generation=this.generation;
    const pending=(async()=>{
      const processes = await this.listProcesses();
      if(generation!==this.generation)return;
      const nowRunning = processes.some(isGameProcess);
      if (nowRunning !== this.running) {
        this.running = nowRunning;
        this.onChange?.(nowRunning, processes);
      }
    })().finally(()=>{if(this.pending===pending)this.pending=null;});
    this.pending=pending;
    return pending;
  }

  start() {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.generation++;
    this.pending=null;
    this.running=false;
  }
}
