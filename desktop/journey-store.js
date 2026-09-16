import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FORMAT='guidance-of-grace-journey';
const VERSION=1;
const validId=id=>/^[a-f0-9-]{8,64}$/i.test(String(id??''));
const safeName=name=>String(name??'Journey').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').trim().slice(0,80)||'Journey';

export class JourneyStore{
  constructor(userDataPath){this.dir=path.join(userDataPath,'journeys');fs.mkdirSync(this.dir,{recursive:true});}
  file(id){if(!validId(id))throw new Error('Invalid journey id.');return path.join(this.dir,`${id}.grace`);}
  list(){return fs.readdirSync(this.dir).filter(name=>name.endsWith('.grace')).flatMap(name=>{try{const j=this.readPath(path.join(this.dir,name));return [{id:j.id,name:j.name,playMode:j.playMode,updatedAt:j.updatedAt,createdAt:j.createdAt}]}catch{return []}}).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));}
  readPath(file){const j=JSON.parse(fs.readFileSync(file,'utf8'));if(j?.format!==FORMAT||j?.version!==VERSION||!validId(j.id)||!['single','seamless'].includes(j.playMode)||!j.state||typeof j.state!=='object')throw new Error('Not a valid Guidance of Grace journey file.');return j;}
  load(id){return this.readPath(this.file(id));}
  create({name='Journey',playMode='single',state={}}={}){const now=new Date().toISOString(),id=crypto.randomUUID(),j={format:FORMAT,version:VERSION,id,name:safeName(name),playMode:playMode==='seamless'?'seamless':'single',createdAt:now,updatedAt:now,state};this.write(j);return j;}
  save(id,state,patch={}){const current=this.load(id),j={...current,...patch,id:current.id,format:FORMAT,version:VERSION,name:safeName(patch.name??current.name),playMode:(patch.playMode??current.playMode)==='seamless'?'seamless':'single',updatedAt:new Date().toISOString(),state};this.write(j);return j;}
  import(file){const original=this.readPath(file),now=new Date().toISOString(),j={...original,id:crypto.randomUUID(),name:safeName(original.name),createdAt:now,updatedAt:now};this.write(j);return j;}
  export(id,target){const j=this.load(id);fs.copyFileSync(this.file(j.id),target);return target;}
  write(j){fs.mkdirSync(this.dir,{recursive:true});const target=this.file(j.id),tmp=`${target}.tmp`;fs.writeFileSync(tmp,JSON.stringify(j,null,2));fs.renameSync(tmp,target);}
}

export const JOURNEY_FORMAT=FORMAT;
