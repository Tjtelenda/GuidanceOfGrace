export class GameLifecycle {
  constructor({ readFinal, onClose, delay = 2500, schedule = setTimeout, cancel = clearTimeout }) {
    this.readFinal = readFinal;
    this.onClose = onClose;
    this.delay = delay;
    this.schedule = schedule;
    this.cancel = cancel;
    this.timer = null;
    this.running = false;
    this.generation = 0;
  }

  change(running) {
    if (running === this.running) return;
    const previous = this.running;
    this.running = running;
    this.generation++;
    this.cancel(this.timer);
    this.timer = null;
    if (previous && !running) {
      const generation = this.generation;
      this.timer = this.schedule(async () => {
        this.timer = null;
        try {
          await this.readFinal();
        } finally {
          if (generation === this.generation && !this.running) await this.onClose();
        }
      }, this.delay);
    }
  }

  stop() {
    this.cancel(this.timer);
    this.timer = null;
    this.generation++;
  }
}
