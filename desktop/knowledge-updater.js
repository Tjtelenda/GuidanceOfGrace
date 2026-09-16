import fs from 'node:fs';
import path from 'node:path';

export const KNOWLEDGE_SOURCES=[
  {id:'encounters',name:'ER Boss Kill Checklist',license:'MIT',url:'https://raw.githubusercontent.com/BuLEEto/ER_Boss_Kill_Checklist/master/bosses.json',kind:'encounters',minimum:207},
  {id:'boss-details',name:'Elden Ring API',license:'MIT',url:'https://eldenring.fanapis.com/api/bosses?limit=500',kind:'boss-details'},
];

export function validateBossCatalog(value,minimum=207){
  if(!Array.isArray(value))throw new Error('Boss catalog is not an array.');
  const entries=value.flatMap(region=>Array.isArray(region?.bosses)?region.bosses.map(b=>({...b,region_name:region.region_name,dlc:Boolean(region.dlc)})):[]);
  if(entries.length<minimum)throw new Error(`Boss catalog has ${entries.length} encounters; expected at least ${minimum}.`);
  if(entries.some(b=>!b.boss||!Number.isInteger(b.flag_id)))throw new Error('Boss catalog contains invalid records.');
  return {regions:value.length,encounters:entries.length,dlc:entries.filter(b=>b.dlc).length};
}

function validateBossDetails(value){
  const entries=Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[];
  if(!entries.length||entries.some(b=>typeof b?.name!=='string'))throw new Error('Boss detail source returned no valid records.');
  return {records:entries.length};
}
function normalizeImportedMarkers(value){
  const raw=Array.isArray(value)?value:Array.isArray(value?.markers)?value.markers:Array.isArray(value?.data)?value.data:[];
  const normalized=raw.flatMap((row,index)=>{if(!row||typeof row!=='object')return [];const title=row.name??row.title??row.label??row.item_name??row.itemName;if(!title)return [];return [{id:String(row.id??`import-${index}`),type:String(row.category??row.type??'marker'),title:String(title),region:String(row.region??row.area??row.map??''),location:String(row.location??row.place??row.landmark??''),description:String(row.description??row.effect??''),rewards:Array.isArray(row.drops)?row.drops:Array.isArray(row.rewards)?row.rewards:[],tags:[row.category,row.type,row.subcategory].filter(Boolean).map(String),lat:Number.isFinite(row.lat)?row.lat:null,long:Number.isFinite(row.long)?row.long:null,x:Number.isFinite(row.x)?row.x:null,y:Number.isFinite(row.y)?row.y:null}]} );
  if(!normalized.length)throw new Error('No searchable marker records were found in this JSON file.');
  return normalized.slice(0,20000);
}

export class KnowledgeUpdater{
  constructor(userDataPath){this.dir=path.join(userDataPath,'knowledge');this.statusFile=path.join(this.dir,'status.json');fs.mkdirSync(this.dir,{recursive:true});}
  status(){try{return JSON.parse(fs.readFileSync(this.statusFile,'utf8'))}catch{return {lastChecked:null,lastUpdated:null,sources:[]}}}
  catalog(){let bossDetails=[],markers=[];try{const value=JSON.parse(fs.readFileSync(path.join(this.dir,'boss-details.json'),'utf8'));bossDetails=(Array.isArray(value)?value:value.data??[]).map((b,index)=>({id:`remote-boss-${b.id??index}`,type:'boss-detail',title:b.name,region:b.region??'',location:b.location??'',description:b.description??'',rewards:Array.isArray(b.drops)?b.drops:[],tags:['boss','drop','remote detail']}))}catch{}try{markers=JSON.parse(fs.readFileSync(path.join(this.dir,'imported-markers.json'),'utf8'))}catch{}return [...bossDetails,...markers]}
  importMarkers(file){const value=JSON.parse(fs.readFileSync(file,'utf8')),markers=normalizeImportedMarkers(value);fs.writeFileSync(path.join(this.dir,'imported-markers.json'),JSON.stringify(markers));return {records:markers.length};}
  async check(){const result={lastChecked:new Date().toISOString(),lastUpdated:null,sources:[]};for(const source of KNOWLEDGE_SOURCES){try{const response=await fetch(source.url,{headers:{'user-agent':'Guidance-of-Grace'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);const raw=await response.text(),value=JSON.parse(raw),summary=source.kind==='encounters'?validateBossCatalog(value,source.minimum):validateBossDetails(value);fs.writeFileSync(path.join(this.dir,`${source.id}.json`),raw);result.sources.push({...source,...summary,state:'updated'});result.lastUpdated=result.lastChecked;}catch(error){result.sources.push({...source,state:'error',message:error.message});}}fs.writeFileSync(this.statusFile,JSON.stringify(result,null,2));return result;}
}
