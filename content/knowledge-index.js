import { classifyBossLocation, deriveEncounterLocations } from './completion-catalog.js';

export const normalizeSearch=value=>String(value??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const words=normalizeSearch;
const join=(...values)=>values.flat(Infinity).filter(Boolean).join(' ');
const record=(input)=>({...input,searchText:words(join(input.title,input.subtitle,input.region,input.location,input.tags,input.rewards,input.enemies,input.description,input.steps))});

export function buildKnowledgeIndex({bosses=[],quests=[],forgeSupply=[],storyBeats=[],glossary=[],questItems=[]}={}){
  const entries=[];
  for(const boss of bosses)entries.push(record({id:`boss:${boss.flagId}`,type:'encounter',title:boss.name,subtitle:boss.mainStory?'Main-story encounter':boss.remembrance?'Remembrance encounter':'Boss encounter',region:boss.region,location:boss.place,tags:[classifyBossLocation(boss.place,boss.region),boss.dlc?'shadow of the erdtree':'base game',boss.mainStory?'main story':'optional',boss.remembrance?'remembrance':'',boss.greatRune?'great rune':''],enemies:[boss.name],rewards:[boss.remembrance?'Remembrance':'',boss.greatRune?'Great Rune':''],flagId:boss.flagId,dlc:Boolean(boss.dlc)}));
  for(const loc of deriveEncounterLocations(bosses))entries.push(record({id:`location:${loc.id}`,type:'location',title:loc.name,subtitle:loc.type==='evergaol'?'Evergaol':loc.type==='dungeon'?'Dungeon / gaol':loc.type==='legacy'?'Legacy dungeon':'Encounter location',region:loc.region,location:loc.name,tags:[loc.type,loc.dlc?'shadow of the erdtree':'base game'],enemies:loc.encounters,description:`Contains ${loc.encounters.join(', ')}.`,dlc:loc.dlc}));
  for(const q of quests)entries.push(record({id:`quest:${q.id}`,type:'quest',title:q.name,subtitle:'NPC / side-story thread',region:(q.regions??[]).join(' '),location:(q.steps??[]).map(s=>s.area),tags:[q.priority,'npc','quest',(q.regions??[])],steps:(q.steps??[]).map(s=>`${s.label} ${s.area} ${s.clue??''}`),questId:q.id}));
  for(const item of forgeSupply)entries.push(record({id:`forge:${item.id}`,type:'forge',title:item.name,subtitle:'Forge Supply · permanent Roundtable unlock',region:item.regionName,location:item.location,tags:['bell bearing','smithing stone','weapon upgrade','roundtable hold',item.family],rewards:item.unlocks,enemies:[item.source],description:item.clue,forgeId:item.id}));
  for(const beat of storyBeats)entries.push(record({id:`story:${beat.id}`,type:'story',title:beat.title,subtitle:'Book of Knowledge · story beat',tags:['story','lore','book of knowledge',beat.glossary??[]],description:beat.summary??beat.text??'',storyId:beat.id}));
  for(const g of glossary)entries.push(record({id:`glossary:${g.id}`,type:'glossary',title:g.name,subtitle:'Book of Knowledge · glossary',tags:['lore','character','glossary'],description:join(g.summary,g.confirmed,g.interpretation),glossaryId:g.id}));
  for(const item of questItems)entries.push(record({id:`item:${item.key}`,type:'item',title:item.name,subtitle:'Quest / key item',region:item.region,location:item.clue,tags:['item','quest item',item.questIds],description:item.clue,itemKey:item.key,questIds:item.questIds}));
  return entries;
}

export function searchKnowledge(index,query,{limit=100}={}){
  const terms=words(query).split(/\s+/).filter(Boolean);
  if(!terms.length)return index.slice(0,limit);
  return index.map(item=>{const hay=item.searchText||words(join(item.title,item.subtitle,item.region,item.location,item.tags,item.rewards,item.enemies,item.description));return {item,match:terms.every(term=>hay.includes(term)),score:terms.reduce((score,term)=>score+(hay.includes(term)?1:0)+(words(item.title).includes(term)?2:0),0)}}).filter(x=>x.match).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title)).slice(0,limit).map(x=>x.item);
}
