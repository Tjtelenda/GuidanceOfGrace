export class GameLifecycle {
  constructor({readFinal,onClose,delay=2500}){this.readFinal=readFinal;this.onClose=onClose;this.delay=delay;this.timer=null;this.running=false;this.generation=0;}
  change(running){const previous=this.running;this.running=running;this.generation++;clearTimeout(this.timer);if(previous&&!running){const generation=this.generation;this.timer=setTimeout(async()=>{try{await this.readFinal();}finally{if(generation===this.generation&&!this.running)await this.onClose();}},this.delay);}}
  stop(){clearTimeout(this.timer);this.generation++;}
}
