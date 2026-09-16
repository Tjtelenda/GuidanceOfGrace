import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeImportedMarkers } from './knowledge-updater.js';
const run=promisify(execFile);

export function buildLocalCatalog(sourceDir,gameVersion){
  const markers=JSON.parse(fs.readFileSync(path.join(sourceDir,'markers.json'),'utf8')).markers;
  const pickups=JSON.parse(fs.readFileSync(path.join(sourceDir,'items.json'),'utf8')).markers;
  const graces=markers.filter(m=>m.cat==='grace');
  const records=[...markers,...pickups].map(m=>{
    const nearest=graces.filter(g=>g.master===m.master).reduce((best,g)=>{const d=Math.hypot(g.px-m.px,g.py-m.py);return !best||d<best.d?{g,d}:best},null)?.g;
    const title=m.names?.en||m.id,near=nearest?.names?.en??'',pickup=m.id.startsWith('item:');
    return {id:`local:${m.id}`,title,type:pickup?'pickup':m.cat==='grace'?'grace':m.cat==='fragment'?'map fragment':'map location',region:m.master==='M10'?'Realm of Shadow':m.master==='M01'?'Underground':'Lands Between',location:near?`Near ${near}`:m.map??'',description:`${m.cat.replaceAll('_',' ')}. Locally generated position${m.map?` in ${m.map}`:''}. Nearest grace is a geographic clue, not a route or an accessibility guarantee.`,tags:[m.cat.replaceAll('_',' '),pickup?'item loot pickup':'point of interest'],rewards:pickup?[title]:[],x:m.px,y:m.py,layer:m.master,dlc:m.master==='M10',eventId:m.flag};
  });
  const dictionary=path.join(sourceDir,'dictionary.json');if(fs.existsSync(dictionary))records.push(...JSON.parse(fs.readFileSync(dictionary,'utf8')));
  return normalizeImportedMarkers({schemaVersion:1,source:'Local installed game via egormagurin/EldenRingMap@48f42e570ada1dd28717d7ce56aaeb92ee14521b',gameVersion,generatedAt:new Date().toISOString(),records});
}

export async function regenerateLocal(userData,updater,onProgress=()=>{}){
  const configFile=path.join(userData,'local-generation.json');
  if(!fs.existsSync(configFile))throw Error('Local extraction tools are not configured on this computer. Import a generated catalog instead.');
  const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
  // Renderer cannot choose commands; run only previously audited, pinned local scripts.
  if(path.basename(config.python).toLowerCase()!=='python.exe'||!Array.isArray(config.scripts)||config.scripts.length!==4)throw Error('Invalid local generator configuration.');
  for(const script of config.scripts){const hash=crypto.createHash('sha256').update(fs.readFileSync(script.path)).digest('hex');if(hash!==script.sha256)throw Error('Local extraction code changed. Re-audit it before generating new data.');}
  for(const script of config.scripts){onProgress(`Generating ${path.basename(script.path)}…`);await run(config.python,[script.path],{cwd:config.cwd,windowsHide:true,timeout:600000,maxBuffer:8*1024*1024,env:{...process.env,PYTHONPATH:config.pythonPath,ER_GAME_DIR:config.gameDir,ER_MOD_DIR:''}});}
  const value=buildLocalCatalog(config.dataDir,config.gameVersion),temp=path.join(config.dataDir,'grace-catalog.json');fs.writeFileSync(temp,JSON.stringify(value));
  return updater.importMarkers(temp);
}
