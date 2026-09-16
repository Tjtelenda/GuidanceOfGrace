import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { atomicJson, readJson } from './atomic-store.js';

const FORMAT='guidance-of-grace-journey';
const VERSION=1;
const validId=id=>/^[a-f0-9-]{8,64}$/i.test(String(id??''));
const safeName=name=>String(name??'Journey').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').trim().slice(0,80)||'Journey';

export class JourneyStore{
  constructor(userDataPath){this.dir=path.join(userDataPath,'journeys');fs.mkdirSync(this.dir,{recursive:true});}
  file(id){if(!validId(id))throw new Error('Invalid journey id.');return path.join(this.dir,`${id}.grace`);}
  list(){return fs.readdirSync(this.dir).filter(name=>name.endsWith('.grace')).flatMap(name=>{try{const j=this.readPath(path.join(this.dir,name));return [{id:j.id,name:j.name,playMode:j.playMode,updatedAt:j.updatedAt,createdAt:j.createdAt}]}catch{return []}}).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));}
  readPath(file){if(path.extname(file).toLowerCase()!=='.grace')throw new Error('Choose a .grace companion journey.');const j=readJson(file,validateJourney);if(!j)throw new Error('Not a valid Guidance of Grace journey file.');return j;}
  load(id){return this.readPath(this.file(id));}
  create({name='Journey',playMode='single',state={}}={}){const now=new Date().toISOString(),id=crypto.randomUUID(),j={format:FORMAT,version:VERSION,id,name:safeName(name),playMode:playMode==='seamless'?'seamless':'single',createdAt:now,updatedAt:now,state};this.write(j);return j;}
  save(id,state,patch={}){const current=this.load(id),j={...current,...patch,id:current.id,format:FORMAT,version:VERSION,name:safeName(patch.name??current.name),playMode:(patch.playMode??current.playMode)==='seamless'?'seamless':'single',updatedAt:new Date().toISOString(),state};this.write(j);return j;}
  import(file){const original=this.readPath(file),now=new Date().toISOString(),j={...original,id:crypto.randomUUID(),name:safeName(original.name),createdAt:now,updatedAt:now};this.write(j);return j;}
  export(id,target){if(path.extname(target).toLowerCase()!=='.grace')throw new Error('Journey exports must use .grace.');atomicJson(target,this.load(id),validateJourney);return target;}
  write(j){atomicJson(this.file(j.id),j,validateJourney);}
}

export function validateJourney(j){if(j?.format!==FORMAT||j?.version!==VERSION||!validId(j.id)||!['single','seamless'].includes(j.playMode)||!j.state||typeof j.state!=='object'||Array.isArray(j.state))throw new Error('Invalid companion journey.');}

export const JOURNEY_FORMAT=FORMAT;
