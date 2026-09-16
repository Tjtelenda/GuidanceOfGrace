import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { atomicJson, readJson } from './atomic-store.js';
import { GENERATED_BOSSES, GENERATED_BOSSES_SNAPSHOT } from '../content/generated-bosses.js';

export const KNOWLEDGE_SOURCES=Object.freeze([
  {id:'encounters',name:'ER Boss Kill Checklist',identity:'BuLEEto/ER_Boss_Kill_Checklist',license:'MIT',url:'https://raw.githubusercontent.com/BuLEEto/ER_Boss_Kill_Checklist/main/bosses.json',minimum:207},
]);
const text=(value,max=10000)=>typeof value==='string'?value.slice(0,max):'';
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateBossCatalog(value,minimum=207){
  if(!Array.isArray(value))throw new Error('Boss catalog is not an array.');
  const entries=[];
  for(const region of value){
    if(typeof region?.region_name!=='string'||!Array.isArray(region.bosses))throw new Error('Invalid encounter region.');
    for(const b of region.bosses){
      if(typeof b?.boss!=='string'||!b.boss||!Number.isSafeInteger(b.flag_id)||b.flag_id<0||b.flag_id>0xffffffff)throw new Error('Invalid encounter record.');
      entries.push(b);
    }
  }
  if(entries.length<minimum||entries.length>500)throw new Error('Unexpected encounter count.');
  if(new Set(entries.map(b=>b.flag_id)).size!==entries.length)throw new Error('Duplicate encounter identity.');
  return {regions:value.length,encounters:entries.length};
}

export function normalizeImportedMarkers(value){
  if(value?.schemaVersion!==1||!text(value.source)||!text(value.gameVersion)||!Number.isFinite(Date.parse(value.generatedAt))||!Array.isArray(value.records))throw new Error('Catalog needs schemaVersion 1, source, gameVersion, generatedAt and records.');
  if(!value.records.length||value.records.length>100000)throw new Error('Invalid catalog size.');
  const ids=new Set();
  const records=value.records.map(row=>{
    if(!row||typeof row.id!=='string'||!row.id||row.id.length>200||ids.has(row.id)||!text(row.title)||!text(row.type))throw new Error('Invalid or duplicate catalog record.');
    ids.add(row.id);
    for(const key of ['x','y','lat','long'])if(row[key]!=null&&!Number.isFinite(row[key]))throw new Error('Invalid marker coordinates.');
    return {id:text(row.id,200),title:text(row.title,300),type:text(row.type,80),region:text(row.region,300),location:text(row.location,500),description:text(row.description),tags:(row.tags??[]).filter(x=>typeof x==='string').slice(0,50),rewards:(row.rewards??[]).filter(x=>typeof x==='string').slice(0,50),x:row.x??null,y:row.y??null,lat:row.lat??null,long:row.long??null,layer:text(row.layer,80),dlc:Boolean(row.dlc),eventId:Number.isSafeInteger(row.eventId)?row.eventId:null};
  });
  return {schemaVersion:1,source:text(value.source,1000),gameVersion:text(value.gameVersion,300),generatedAt:value.generatedAt,records};
}

function validateCache(cache){
  if(cache?.schemaVersion!==1||cache.source!==KNOWLEDGE_SOURCES[0].identity)throw new Error('Untrusted source identity.');
  validateBossCatalog(cache.data);
  if(cache.version!==digest(cache.data))throw new Error('Knowledge checksum mismatch.');
}

export class KnowledgeUpdater{
  constructor(userDataPath,{fetcher=globalThis.fetch}={}){this.dir=path.join(userDataPath,'knowledge');this.statusFile=path.join(this.dir,'status.json');this.fetcher=fetcher;this.pending=null;fs.mkdirSync(this.dir,{recursive:true});}
  status(){this.catalog();return {...(readJson(this.statusFile)??{lastChecked:null,lastUpdated:null,version:GENERATED_BOSSES_SNAPSHOT.verified,source:GENERATED_BOSSES_SNAPSHOT.source,sources:[]}),local:this.catalogMetadata??null};}
  encounters(){const cache=readJson(path.join(this.dir,'encounters.json'),validateCache);if(!cache)return GENERATED_BOSSES;
    return cache.data.flatMap(r=>r.bosses.map(b=>({name:b.boss,place:b.place??'',region:r.region_name,flagId:b.flag_id,dlc:Boolean(r.dlc??b.dlc??GENERATED_BOSSES.find(x=>x.flagId===b.flag_id)?.dlc),mainStory:Boolean(b.main_story),remembrance:Boolean(b.rememberance??b.remembrance),greatRune:Boolean(b.great_rune)})));}
  catalog(){
    const file=path.join(this.dir,'imported-markers.json');let stamp='missing';
    try{const stat=fs.statSync(file);stamp=`${stat.mtimeMs}:${stat.size}`;}catch{}
    if(this.catalogStamp!==stamp){const value=readJson(file,normalizeImportedMarkers);this.cachedCatalog=value?.records??[];this.catalogMetadata=value?{source:value.source,gameVersion:value.gameVersion,generatedAt:value.generatedAt,records:value.records.length}:null;this.catalogStamp=stamp;}
    return this.cachedCatalog??[];
  }
  importMarkers(file){if(path.extname(file).toLowerCase()!=='.json'||fs.statSync(file).size>80*1024*1024)throw new Error('Choose a JSON catalog smaller than 80 MB.');const value=normalizeImportedMarkers(JSON.parse(fs.readFileSync(file,'utf8')));atomicJson(path.join(this.dir,'imported-markers.json'),value,normalizeImportedMarkers);return {records:value.records.length,source:value.source,gameVersion:value.gameVersion,generatedAt:value.generatedAt};}
  check(){if(!this.pending)this.pending=this.checkOnce().finally(()=>{this.pending=null});return this.pending;}
  async checkOnce(){
    const previous=this.status(),result={...previous,lastChecked:new Date().toISOString(),sources:[]};
    for(const source of KNOWLEDGE_SOURCES){try{
      const response=await this.fetcher(source.url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'user-agent':'Guidance-of-Grace'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      if(response.url&&response.url!==source.url)throw new Error('Unexpected source URL.');
      const raw=await response.text();if(raw.length>5*1024*1024)throw new Error('Knowledge response too large.');
      const data=JSON.parse(raw),summary=validateBossCatalog(data,source.minimum),version=digest(data);
      atomicJson(path.join(this.dir,'encounters.json'),{schemaVersion:1,source:source.identity,version,downloadedAt:result.lastChecked,data},validateCache);
      result.sources.push({...source,...summary,state:'updated',version});result.lastUpdated=result.lastChecked;result.version=version;result.source=source.identity;
    }catch(error){result.sources.push({...source,state:'error',message:error.message});}}
    atomicJson(this.statusFile,result);return result;
  }
}
