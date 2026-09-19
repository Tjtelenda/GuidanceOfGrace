import { planSession } from './content/session-planner.js';
import { parseSave, formatPlaytime } from './save-parser.js';
import { QUESTS, BRANCHES, REGIONS, FLAG_LABELS, TRANSITION_RISKS, getStage, getTransitionRisk, questAvailable } from './data.js';
import { migrateJourneyState } from './content/journey-state.js';
import { AREA_RECOMMENDATIONS, BOSS_RECOMMENDATIONS, recommendationForMap } from './content/recommendations.js';
import { STORY_BEATS, unlockedStory, GLOSSARY, THEORY_CARDS, STORY_VIDEOS, glossaryById } from './content/story-data.js';
import { QUEST_ITEM_LINKS, questItemsFor } from './content/item-links.js';
import { readinessLabel, roleNote, evidenceConfidence, dialogueRule } from './desktop/core.js';
import { ENDING_PATHS, endingPriority, endingWarning, mendingPathsVisible, pathStatus } from './content/mending-paths.js';
import { bossInsight } from './content/boss-insights.js';
import { GENERATED_BOSSES, GENERATED_BOSSES_SNAPSHOT } from './content/generated-bosses.js';
import { classifyBossLocation, deriveEncounterLocations } from './content/completion-catalog.js';
import { FORGE_SUPPLY, reachableForgeSupply } from './content/forge-supply.js';
import { buildKnowledgeIndex, searchKnowledge } from './content/knowledge-index.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE_KEY = 'guidance-of-grace-v2';
const LEGACY_KEY = 'guidance-of-grace-v1';
const SPOILERS = new Set(['low','balanced','full']);
const MODES = new Set(['Explorer','Guide']);
const defaultProfile = (name,mode) => ({ name, mode, playMode:'seamless', role:'joiner', scaduLevel:null, endingTarget:'undecided', sessionMinutes:90, spoiler:mode==='Explorer'?'low':'balanced', showAll:false, quest:{}, ledger:{}, character:null, lastSync:null, recentChanges:[], recentWarnings:[] });
const defaultState = () => ({ version:4, player:defaultProfile('Tarnished','Explorer') });

let state = loadState();
let pendingSave = null;

let desktopSettings = null;
let desktopGameRunning = false;
let mapLayer = 'base';
let mapFocus = null;
let renderedLocalTarget=null;
let visibleEventIds = new Set();
let activeJourneyId = null;
let switchingJourney=false;
let encounterCatalog=GENERATED_BOSSES;
let journeyList = [];
let journeyDialogResolve = null;
let supplementalKnowledge = [];
let KNOWLEDGE_INDEX = buildKnowledgeIndex({bosses:GENERATED_BOSSES,quests:QUESTS,forgeSupply:FORGE_SUPPLY,storyBeats:STORY_BEATS,glossary:GLOSSARY,questItems:QUEST_ITEM_LINKS});
let saveHandle = null;

function cleanCharacter(raw){
  if(!raw||typeof raw!=='object'||typeof raw.name!=='string'||!Number.isFinite(raw.level)||!raw.flags||typeof raw.flags!=='object')return null;
  const flags=Object.fromEntries(Object.keys(FLAG_LABELS).map(key=>[key,Boolean(raw.flags[key])]));
  const items=raw.items&&typeof raw.items==='object'?Object.fromEntries(Object.entries(raw.items).map(([key,value])=>[key,Boolean(value)])):{};
  const eventIds=Array.isArray(raw.eventIds)?raw.eventIds:raw.events&&typeof raw.events==='object'?Object.keys(raw.events).map(Number):[];return {slot:Number.isInteger(raw.slot)?raw.slot:0,active:Boolean(raw.active),name:raw.name.trim().slice(0,32)||'Tarnished',level:Math.max(1,Math.min(999,Math.trunc(raw.level))),secondsPlayed:Number.isFinite(raw.secondsPlayed)?Math.max(0,Math.trunc(raw.secondsPlayed)):0,mapId:typeof raw.mapId==='string'?raw.mapId:null,mapName:typeof raw.mapName==='string'?raw.mapName:null,lastRestedGrace:Number.isInteger(raw.lastRestedGrace)?raw.lastRestedGrace:null,inOnlineSession:Boolean(raw.inOnlineSession),notAlone:Boolean(raw.notAlone),totalDeathCount:Number.isFinite(raw.totalDeathCount)?Math.max(0,Math.trunc(raw.totalDeathCount)):0,scaduLevel:Number.isInteger(raw.scaduLevel)&&raw.scaduLevel>=0&&raw.scaduLevel<=20?raw.scaduLevel:null,spiritBlessingLevel:Number.isInteger(raw.spiritBlessingLevel)&&raw.spiritBlessingLevel>=0&&raw.spiritBlessingLevel<=10?raw.spiritBlessingLevel:null,eventIds:[...new Set(eventIds.filter(Number.isInteger))].slice(0,10000),items,flags};
}
function cleanProfile(raw={},fallback=defaultProfile('Tarnished','Guide')){
  const quest={};
  if(raw.quest&&typeof raw.quest==='object') for(const q of QUESTS){const v=raw.quest[q.id];if(Array.isArray(v))quest[q.id]=[...new Set(v.filter(n=>Number.isInteger(n)&&n>=0&&n<q.steps.length))].sort((a,b)=>a-b)}
  const c=cleanCharacter(raw.character),ledger={};
  if(raw.ledger&&typeof raw.ledger==='object')for(const [key,value] of Object.entries(raw.ledger))if(typeof value==='boolean'&&/^\d+$/.test(key))ledger[key]=value;
  return {
    name:typeof raw.name==='string'&&raw.name.trim()?raw.name.trim().slice(0,60):fallback.name,
    mode:MODES.has(raw.mode)?raw.mode:fallback.mode,
    playMode:raw.playMode==='single'?'single':'seamless',
    role:raw.role==='host'?'host':'joiner',
    scaduLevel:Number.isInteger(raw.scaduLevel)&&raw.scaduLevel>=0&&raw.scaduLevel<=20?raw.scaduLevel:null,
    endingTarget:ENDING_PATHS.some(path=>path.id===raw.endingTarget)?raw.endingTarget:'undecided',
    sessionMinutes:[30,60,90,120,180].includes(raw.sessionMinutes)?raw.sessionMinutes:90,
    spoiler:SPOILERS.has(raw.spoiler)?raw.spoiler:fallback.spoiler,
    showAll:Boolean(raw.showAll),
    savePath:typeof raw.savePath==='string'?raw.savePath:'',
    pinnedTarget:raw.pinnedTarget&&typeof raw.pinnedTarget==='object'?raw.pinnedTarget:null,
    tracked:Array.isArray(raw.tracked)?raw.tracked.filter(x=>typeof x==='string').slice(0,200):[],
    quest,
    ledger,
    character:c,
    lastSync:typeof raw.lastSync==='string'?raw.lastSync:null,
    recentChanges:Array.isArray(raw.recentChanges)?raw.recentChanges.filter(x=>typeof x==='string').slice(0,12):[],
    recentWarnings:Array.isArray(raw.recentWarnings)?raw.recentWarnings.filter(id=>typeof id==='string'&&getTransitionRisk(id)).slice(0,8):[],
  };
}
function sanitizeState(raw){return migrateJourneyState(raw,cleanProfile,defaultProfile('Tarnished','Explorer'));}
function loadState(){
  try{
    const current=localStorage.getItem(STORAGE_KEY), legacy=localStorage.getItem(LEGACY_KEY);
    const result=sanitizeState(JSON.parse(current||legacy||'null'));
    if(!current&&legacy)localStorage.setItem(STORAGE_KEY,JSON.stringify(result));
    return result;
  }catch{return defaultState()}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));if(!switchingJourney&&activeJourneyId&&window.guidanceDesktop?.isDesktop)void window.guidanceDesktop.saveJourney(activeJourneyId,state,{playMode:profile().playMode}).catch(error=>{$('#journeyStatus').textContent=`Journey could not be saved: ${error.message}`})}
async function flushJourney(){if(activeJourneyId&&window.guidanceDesktop)await window.guidanceDesktop.saveJourney(activeJourneyId,state,{playMode:profile().playMode});}
async function refreshKnowledge(){if(!window.guidanceDesktop)return;supplementalKnowledge=await window.guidanceDesktop.knowledgeCatalog();encounterCatalog=await window.guidanceDesktop.knowledgeEncounters();KNOWLEDGE_INDEX=buildKnowledgeIndex({bosses:encounterCatalog,quests:QUESTS,forgeSupply:FORGE_SUPPLY,storyBeats:STORY_BEATS,glossary:GLOSSARY,questItems:QUEST_ITEM_LINKS});}
function profile(){return state.player}
function flags(){return profile().character?.flags??{}}
function stage(){return getStage(flags())}
function questDone(q,p=profile()){return new Set(p.quest[q.id]??[])}
function regionReached(region,f=flags()){return Boolean(profile().character&&region.when(f))}
function questRelevant(q,f=flags()){return Boolean(q&&questAvailable(q,f))}
function activeEvidence(q,f=flags()){return (q.saveEvidence??[]).filter(([key])=>Boolean(f[key]))}
function hasStarted(q,p=profile()){return (p.quest[q.id]?.length??0)>0||activeEvidence(q,p.character?.flags??{}).length>0}
function isComplete(q,p=profile()){return (p.quest[q.id]?.length??0)>=q.steps.length}
function riskRelevant(r,p=profile()){
  if(!r.questIds?.length||r.always)return true;
  return r.questIds.some(id=>{const q=QUESTS.find(x=>x.id===id);return q&&!isComplete(q,p)});
}
function activeTransitionRisks(f=flags()){
  const rank={danger:2,warn:1,warning:1,note:0};
  return TRANSITION_RISKS.filter(r=>r.when(f)&&riskRelevant(r)).sort((a,b)=>rank[b.level]-rank[a.level]);
}
function esc(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
function safeUrl(url=''){try{const u=new URL(url);return u.protocol==='https:'?u.href:'#'}catch{return '#'}}

function currentMapName(){return profile().character?.mapName??''}
function currentRegionId(){
  const name=currentMapName().toLowerCase();
  const checks=[
    ['enir',/enir-ilim|divine gate|cleansing chamber/],['shadow-keep',/shadow keep|storehouse|dark chamber/],['rauh',/rauh|church of the bud/],['jagged',/jagged peak|bayle/],['abyss',/abyssal woods|midra/],['cerulean',/cerulean coast|stone coffin fissure|garden of deep purple/],['scadu-altus',/scadu altus|moorth|highroad cross/],['ensis',/castle ensis|rellana/],['belurat',/belurat|dancing lion/],['gravesite',/gravesite plain|three-path cross|main gate cross/],
    ['stormveil',/stormveil/],['weeping',/weeping|castle morne/],['liurnia',/liurnia|raya lucaria|caria manor/],['caelid',/caelid|redmane|dragonbarrow/],['gelmir',/gelmir|volcano manor/],['leyndell',/leyndell|capital/],['mountaintops',/mountaintops|flame peak|snowfield|haligtree/],['underground',/siofra|ainsel|nokron|nokstella|deeproot/],['altus',/altus/],['limgrave',/limgrave|stormhill/],
  ];
  return checks.find(([,pattern])=>pattern.test(name))?.[0] ?? ({'Stormveil Castle':'stormveil','Limgrave & Weeping Peninsula':'limgrave','Liurnia of the Lakes':'liurnia','Liurnia / Caelid / Altus approaches':'liurnia','Altus & the underground':'altus','Mountaintops of the Giants':'mountaintops'}[stage().area]??null);
}
function areaQuests(){
  const region=currentRegionId();
  return QUESTS.filter(q=>!isComplete(q)&&questRelevant(q)&&(region?q.regions.includes(region):true)).sort((a,b)=>Number(b.priority==='major')-Number(a.priority==='major')||activeEvidence(b).length-activeEvidence(a).length);
}
function areaRecommendation(){
  const c=profile().character;
  return recommendationForMap(c?.mapName??stage().area) ?? AREA_RECOMMENDATIONS.find(r=>r.id===currentRegionId()) ?? null;
}
function bossAhead(){
  const f=flags(),name=f.secludedCellGrace&&!f.godrick?'Godrick the Grafted':f.chamberPlazaGrace&&!f.radahn?'Starscourge Radahn':f.audiencePathwayGrace&&!f.rykard?'Rykard, Lord of Blasphemy':f.fireGiantGrace&&!f.fireGiant?'Fire Giant':f.greatBridgeGrace&&!f.maliketh?'Maliketh, the Black Blade':f.dlcMessmerDoor&&!f.messmerDefeated?'Messmer the Impaler':f.dlcBayleDoor&&!f.bayleDefeated?'Bayle the Dread':null;
  return name?BOSS_RECOMMENDATIONS.find(b=>b.name===name):null;
}
function currentScaduLevel(){return profile().character?.scaduLevel??profile().scaduLevel}
function currentReadiness(){
  const rec=bossAhead()??areaRecommendation();
  return rec?readinessLabel(profile().character?.level,rec,currentScaduLevel()):{state:'unknown',text:'No useful level range for this location'};
}
function itemState(key){return Boolean(profile().character?.items?.[key])}
function relevantItemClues(q){return questItemsFor(q.id,flags())}
function mapLabel(){return currentMapName()||stage().area}
function mapRegionForName(value=''){
  const name=String(value).toLowerCase();
  if(/enir/.test(name))return 'enir';if(/shadow keep|storehouse/.test(name))return 'shadow-keep';if(/rauh|church of the bud/.test(name))return 'rauh';if(/jagged|bayle/.test(name))return 'jagged';if(/abyss|midra/.test(name))return 'abyss';if(/cerulean|charo|stone coffin/.test(name))return 'cerulean';if(/scadu altus|scaduview|hinterland|fingerstone/.test(name))return 'scadu-altus';if(/ensis/.test(name))return 'ensis';if(/belurat/.test(name))return 'belurat';if(/gravesite/.test(name))return 'gravesite';
  if(/stormveil/.test(name))return 'stormveil';if(/weeping|morne/.test(name))return 'weeping';if(/liurnia|raya lucaria|caria|moonlight altar/.test(name))return 'liurnia';if(/caelid|dragonbarrow|redmane/.test(name))return 'caelid';if(/gelmir|volcano manor/.test(name))return 'gelmir';if(/leyndell|capital outskirts|ashen capital/.test(name))return 'leyndell';if(/mountaintops|forbidden lands|snowfield|haligtree|farum azula|flame peak/.test(name))return 'mountaintops';if(/siofra|ainsel|deeproot|mohgwyn|nokron/.test(name))return 'underground';if(/altus/.test(name))return 'altus';if(/limgrave|stranded graveyard/.test(name))return 'limgrave';return null;
}
function currentQuestStep(q){const done=questDone(q),i=q.steps.findIndex((_,index)=>!done.has(index)),index=i<0?Math.max(0,q.steps.length-1):i;return {index,step:q.steps[index]};}
function questLocation(q){const {step}=currentQuestStep(q);return {name:q.name,location:step?.area||q.area,hint:step?.clue||q.hint,region:mapRegionForName(step?.area)||q.regions.find(id=>REGIONS.some(r=>r.id===id))||q.regions[0]||null};}
function locateTarget(target){if(!target)return;mapFocus=target;profile().pinnedTarget=target;saveState();activateView('map');renderMap();void renderLocalTarget(target);const region=target.region&&REGIONS.some(r=>r.id===target.region)?target.region:mapRegionForName(`${target.regionName??''} ${target.region??''} ${target.location??''}`);if(region){const model=REGIONS.find(r=>r.id===region);mapLayer=model?.mapLayer==='shadow'?'shadow':'base';activateView('map');renderMap();requestAnimationFrame(()=>inspectRegion(region));}}

async function renderLocalTarget(target){
  if(!target||!Number.isFinite(target.x)||!window.guidanceDesktop)return;
  const crop=await window.guidanceDesktop.localMap(target);
  if(mapFocus!==target)return;
  $('#mapInspector').innerHTML=`<article class="map-focus"><p class="eyebrow">PINNED LOCAL LOCATION</p><h2>${esc(target.name)}</h2><p>${esc(target.location)}</p><p>${esc(target.hint)}</p></article>`;
  if(crop){renderedLocalTarget=target;$('#mapPins').innerHTML=`<span class="local-target-dot" style="left:${crop.x}%;top:${crop.y}%" aria-label="Pinned target">⟡</span>`;$('#worldMap').src=crop.image;$('#mapCredit').textContent='Local game map · cropped around your requested target · no game modification';}
}

function locateQuest(id){const q=QUESTS.find(x=>x.id===id);if(q)locateTarget(questLocation(q));}
function knowledgeVisible(item){if(profile().showAll)return true;if(item.type==='encounter'&&profile().spoiler!=='full'&&!visibleEventIds.has(item.flagId)){const query=$('#knowledgeSearch')?.value.trim().toLowerCase();if(!query||query.length<3||!item.title?.toLowerCase().includes(query))return false;}if(item.id?.startsWith('local:'))return Boolean(item.eventId&&visibleEventIds.has(item.eventId));if(item.type==='quest'){const q=QUESTS.find(x=>x.id===item.questId);return Boolean(q&&(questRelevant(q)||hasStarted(q)))}if(item.type==='story')return unlockedStory(flags()).some(b=>b.id===item.storyId);if(item.type==='glossary')return unlockedGlossary().some(g=>g.id===item.glossaryId);if(item.type==='forge'){const source=FORGE_SUPPLY.find(x=>x.id===item.forgeId);return Boolean(source?.when(flags()))}if(item.type==='item')return QUEST_ITEM_LINKS.some(x=>x.key===item.itemKey&&x.when(flags()));const regionId=mapRegionForName(`${item.region??''} ${item.location??''}`);const region=REGIONS.find(r=>r.id===regionId);return region?regionReached(region):false;}
function render(){
  document.body.classList.toggle('show-all',profile().showAll);
  $('#globalShowAll').checked=profile().showAll;
  $$('.desktop-only').forEach(el=>el.classList.toggle('hidden',!window.guidanceDesktop?.isDesktop));
  renderProfiles();renderHome();renderMendingPaths();renderActiveView();
}
function renderActiveView(){
  const id=$('.view.active')?.id??'home';
  const renderers={home:()=>{renderTransitionWarnings();renderForgeSupply()},map:renderMap,quests:renderQuests,check:renderChecks,session:renderSession,mending:renderMendingPaths,ledger:renderLedger,search:renderKnowledgeSearch,story:renderStory,desktop:renderDesktop,profiles:renderJourneys};
  renderers[id]?.();
}
function activateView(id){$$('.tab,.view').forEach(x=>x.classList.remove('active'));const tab=$(`.tab[data-view="${id}"]`);if(tab){tab.classList.add('active');const group=tab.closest('details');if(group)group.open=true;}$(`#${id}`)?.classList.add('active');renderActiveView();window.scrollTo({top:0,behavior:'smooth'})}

function renderProfiles(){ $('#spoilerSelect').value=profile().spoiler; }
function renderJourneys(){
  const panel=$('#journeyPanel');if(!panel)return;const desktop=Boolean(window.guidanceDesktop?.isDesktop);panel.classList.toggle('hidden',!desktop);if(!desktop)return;
  const select=$('#journeySelect');if(select)select.innerHTML=journeyList.map(j=>`<option value="${esc(j.id)}" ${j.id===activeJourneyId?'selected':''}>${esc(j.name)} · ${j.playMode==='single'?'Single Player':'Seamless'}</option>`).join('')||'<option>No journeys yet</option>';
  const current=journeyList.find(j=>j.id===activeJourneyId);$('#journeyStatus').textContent=current?`Current: ${current.name} · ${current.playMode==='single'?'Single Player':'Seamless Co-op'} · saved ${new Date(current.updatedAt).toLocaleString()}`:'Choose or create a companion journey.';
}
async function refreshJourneys(){if(!window.guidanceDesktop?.isDesktop)return [];journeyList=await window.guidanceDesktop.listJourneys();renderJourneys();return journeyList;}
async function loadJourney(id){if(!window.guidanceDesktop?.isDesktop||!id)return;await flushJourney();switchingJourney=true;try{const journey=await window.guidanceDesktop.loadJourney(id);state=sanitizeState(journey.state);activeJourneyId=journey.id;profile().playMode=journey.playMode;desktopSettings=await window.guidanceDesktop.getSettings();profile().savePath=desktopSettings.selectedSavePath;mapFocus=profile().pinnedTarget;pendingSave=null;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));await refreshJourneys();}finally{switchingJourney=false;}render();await window.guidanceDesktop.readSave().catch(()=>{});}
async function createJourney(playMode){const starter=defaultState();starter.player.playMode=playMode;const name=playMode==='single'?'Single Player Journey':'Seamless Co-op Journey',journey=await window.guidanceDesktop.createJourney({name,playMode,state:starter});await refreshJourneys();await loadJourney(journey.id);$('#journeyDialog')?.close();return journey;}
async function chooseJourneyOnLaunch(){if(!window.guidanceDesktop?.isDesktop)return;await refreshJourneys();if(!journeyList.length){const migrated=await window.guidanceDesktop.createJourney({name:profile().playMode==='single'?'Single Player Journey':'Seamless Co-op Journey',playMode:profile().playMode,state});journeyList=await window.guidanceDesktop.listJourneys();activeJourneyId=migrated.id;}
  const dialog=$('#journeyDialog'),choices=$('#journeyChoices');if(!dialog||!choices){await loadJourney(desktopSettings?.activeJourneyId||journeyList[0]?.id);return}
  choices.innerHTML=journeyList.map(j=>`<button type="button" class="character-choice" data-journey-id="${esc(j.id)}"><strong>${j.id===desktopSettings?.activeJourneyId?"Continue · ":""}${esc(j.name)}</strong><span>${j.playMode==='single'?'Single Player':'Seamless Co-op'} · ${new Date(j.updatedAt).toLocaleDateString()}</span></button>`).join('');await new Promise(resolve=>{journeyDialogResolve=resolve;dialog.showModal()});
}

function renderHome(){
  const p=profile(),s=stage(),c=p.character,f=flags();
  $('#heroTitle').textContent=c?s.area:'Choose a character';
  $('#heroSummary').textContent=c?s.summary:'Select a journey to read your local save.';
  $('#areaChip').textContent=c?`Current guidance: ${s.area}`:'No save connected';
  $('#characterName').textContent=c?.name??'Not selected';
  $('#characterMeta').textContent=c?`Level ${c.level} · ${formatPlaytime(c.secondsPlayed)}${c.mapName?` · ${c.mapName}`:''}${Number.isInteger(c.scaduLevel)&&f.dlcEntry?` · Scadutree ${c.scaduLevel}`:''}`:'Choose a save file to begin';
  $('#syncTitle').textContent=p.lastSync?`Updated ${new Date(p.lastSync).toLocaleString()}`:'Waiting for a save';
  $('#saveButton').textContent=window.guidanceDesktop?.isDesktop?'Read save now':c?'Update progress':'Connect save';
  $('#syncText').textContent=c?(window.guidanceDesktop?.isDesktop?`Tracking ${c.name}. The desktop watcher re-reads the save when Elden Ring writes it; nothing is written back.`:`Tracking ${c.name}. The browser re-reads the file only when you request an update.`):'The file is read locally and is never modified or uploaded.';
  $('#branchGrid').innerHTML=BRANCHES.filter(b=>profile().showAll||['nudge','npc','main'].includes(b.id)).map(b=>`<button class="branch" data-branch="${b.id}"><span class="icon">${b.icon}</span><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></button>`).join('');
  const risk=progressRisk(f);$('#riskChip').textContent=risk.text;$('#riskChip').className=`chip ${risk.level}`;
  const old=$('#readinessHome');if(old)old.remove();
  if(c){const ready=currentReadiness(),boss=bossAhead(),rec=boss??areaRecommendation(),card=document.createElement('div'),name=boss&&(p.spoiler==='full'||p.showAll)?`Major challenge ahead: ${boss.name}`:boss?'Major challenge ahead':'Area readiness',insight=boss?bossInsight(boss.name):null;card.id='readinessHome';card.className=`readiness-card ${ready.state}`;card.innerHTML=`<strong>${esc(name)}</strong><span>${esc(ready.text)}${rec?.note&&(p.showAll||p.spoiler==='full')?` · ${esc(rec.note)}`:''}</span>${insight?`<details class="tarnished-insight"><summary>Whisper of Grace</summary><p><b>Weakness:</b> ${esc(insight.weakness)}</p><p><b>Field note:</b> ${esc(insight.tip)}</p><p><b>If you want an edge:</b> ${esc(insight.exploit)}</p></details>`:''}`;$('.character-card').append(card)}
  const recent=p.recentChanges??[];$('#recentPanel').classList.toggle('hidden',recent.length===0);$('#recentChanges').innerHTML=recent.map(x=>`<span class="change-pill">✓ ${esc(x)}</span>`).join('');
}
function progressRisk(f){
  const current=activeTransitionRisks(f)[0];
  if(current)return {level:'warn',text:current.title};
  if(f.erdtreeFire)return {level:'warn',text:'Major world-state change active: check unfinished threads'};
  if(f.fireGiant)return {level:'warn',text:'A major world-state threshold is immediately ahead'};
  if(f.rykard)return {level:'warn',text:'Volcano Manor state changed: check its residents'};
  return {level:'safe',text:'No urgent tracked lockout detected'};
}

function riskText(r,aftermath=false){
  const value=aftermath?(r.aftermath??r.text):r.text;
  let text=typeof value==='function'?value(flags()):value;
  if(!aftermath&&r.id==='frenzied-door'){
    const target=ENDING_PATHS.find(path=>path.id===profile().endingTarget);
    if(target&&target.id!=='undecided'&&target.id!=='frenzy')text=`This conflicts with your selected ${target.name} path until the Frenzied Flame is reversed. ${text}`;
    else if(target?.id==='frenzy')text=`This advances your selected ${target.name} path. ${text}`;
  }
  return text;
}
function renderTransitionWarnings(){
  const panel=$('#transitionPanel'),p=profile();
  if(!p.character){panel.classList.add('hidden');return}
  const recent=(p.recentWarnings??[]).map(getTransitionRisk).filter(Boolean).map(r=>({r,aftermath:true}));
  const seen=new Set(recent.map(x=>x.r.id));
  const current=activeTransitionRisks().filter(r=>!seen.has(r.id)).map(r=>({r,aftermath:false}));
  const items=[...recent,...current].slice(0,1);
  panel.classList.toggle('hidden',items.length===0);
  if(!items.length)return;
  $('#transitionWarnings').innerHTML=items.map(({r,aftermath})=>{
    const links=(r.questIds??[]).map(id=>QUESTS.find(q=>q.id===id)).filter(q=>q&&questRelevant(q)).map(q=>`<span class="warning-actions"><button class="text-button" data-open-quest="${q.id}">${esc(q.name)} →</button><button class="text-button" data-locate-quest="${q.id}">Where? ⟡</button></span>`).join('');
    return `<article class="transition-warning ${r.level}"><p class="eyebrow">${aftermath?'JUST CHANGED':'BEFORE YOU MOVE ON'}</p><h2>${esc(aftermath?r.aftermathTitle??r.title:r.title)}</h2><details><summary>Tell me why</summary><p>${esc(riskText(r,aftermath))}</p></details>${links?`<div class="transition-links">${links}</div>`:''}</article>`;
  }).join('');
}

function renderForgeSupply(){
  const panel=$('#forgePanel');if(!panel)return;const reachable=reachableForgeSupply(flags());panel.classList.toggle('hidden',!profile().character||reachable.length===0);if(!profile().character||!reachable.length)return;
  $('#forgeSummary').textContent='Another permanent upgrade-material supply is reachable.';
  $('#forgeReachable').innerHTML=reachable.slice(0,profile().showAll?3:1).map(item=>`<article class="forge-source"><strong>${profile().showAll||profile().spoiler==='full'?esc(item.name):item.family==='somber'?'Somber forge supply available':'Forge supply available'}</strong><details><summary>Give me a hint</summary><p>${esc(item.clue)}</p></details><button class="text-button" data-forge-reveal="${item.id}">Show me where →</button></article>`).join('');
}

function recommendation(){
  const candidates=QUESTS.filter(q=>!isComplete(q)&&questRelevant(q)).sort((a,b)=>endingPriority(b.id,profile().endingTarget)-endingPriority(a.id,profile().endingTarget)||Number(b.priority==='major')-Number(a.priority==='major')||activeEvidence(b).length-activeEvidence(a).length);
  return candidates[0]??null;
}
function sessionIdeas(){
  const q=recommendation(),current=currentRegionId(),detected=new Set(profile().character?.eventIds??[]);
  const unfinished=encounterCatalog.filter(b=>mapRegionForName(b.region)===current&&!(profile().ledger?.[String(b.flagId)]??detected.has(b.flagId)));
  return planSession({minutes:profile().sessionMinutes??90,area:mapLabel(),quest:q?{id:q.id,name:q.name,hint:questLocation(q).hint,endingPriority:endingPriority(q.id,profile().endingTarget)>0}:null,risk:activeTransitionRisks().length>0,forge:reachableForgeSupply(flags()).length>0,dungeon:unfinished.some(b=>['dungeon','evergaol'].includes(classifyBossLocation(b.place,b.region))),legacy:unfinished.some(b=>classifyBossLocation(b.place,b.region)==='legacy'),underReady:currentReadiness().state==='under',dlc:Boolean(flags().dlcEntry),blessing:currentScaduLevel()});
}

function openBranch(id){
  const s=stage(),f=flags(),q=recommendation();
  const base={
    wander:['Explore at your pace',f.erdtreeFire?'The world is already in a late state, but most exploration can continue. Check NPC threads before more obvious one-way story prompts.':'Nothing in the tracked save state says you need to rush. Pick a landmark, cave, road, or suspicious ruin and follow curiosity.'],
    nudge:[`A small nudge for ${s.area}`,'Open only as much help as you want. The first hint is deliberately vague.'],
    main:['The main thread','These hints point toward story progression without telling you what you will find there.'],
    missed:['Essentials check',essentialText(f)],
    npc:['One thread worth checking',q?(profile().spoiler==='low'&&!hasStarted(q)?q.hint:`${q.name}: ${q.hint}`):'Nothing stands out as urgent right now.'],
    session:['Three reasonable choices','The “Tonight” page keeps the group to three choices: free exploration, one NPC thread, or main progression.'],
  }[id];
  $('#guidanceLabel').textContent=id==='missed'?'SPOILER-LIGHT CHECK':'GUIDANCE'; $('#guidanceTitle').textContent=base[0]; $('#guidanceText').textContent=base[1];
  const hints=(id==='nudge'||id==='main')?s.hints:id==='npc'&&q?q.steps.slice(0,3).map(x=>x.clue):[];
  $('#hintStack').innerHTML=hints.map((h,i)=>`<div class="hint"><button type="button"><span>Hint ${i+1}${i===0?' · vague':i===1?' · direction':' · clearer'}</span><span>＋</span></button><p>${esc(h)}</p></div>`).join('');
  $('#guidancePanel').classList.remove('hidden'); $('#guidancePanel').scrollIntoView({behavior:'smooth',block:'center'});
}
function essentialText(f){
  const missing=[];
  if(!f.torrent)missing.push('There is an important early mobility unlock you have not triggered yet.');
  if(!f.craftingKit)missing.push('A basic early utility purchase still appears to be missing.');
  if(!f.physick)missing.push('A useful reusable flask in Limgrave is not present in the tracked flags.');
  if(f.margit&&!f.godrick)missing.push('Stormveil still has major unfinished progression.');
  if(f.godrick&&!f.rennala)missing.push('The next broad story region is open, with several NPC threads worth discovering naturally.');
  return missing.length?missing.join(' '):'No tracked early-game essential is obviously missing. Optional stories and smaller locations can still remain.';
}

function renderMap(){
  if(mapFocus&&renderedLocalTarget===mapFocus&&$('#worldMap').getAttribute('src')?.startsWith('data:image'))return;
  $('#mapInspector').innerHTML='<p class="eyebrow">YOUR MAP</p><h2>Choose a reached region or pin a search result.</h2>';
  const shadow=mapLayer==='shadow';
  $('#mapCanvas').classList.toggle('shadow-layer',shadow);
  $('#worldMap').removeAttribute('src'); $('#mapCredit').textContent=shadow?'Offline schematic of discovered Realm of Shadow regions. No external map asset is required.':'Offline region schematic. Locally generated locations can be pinned from Search.';
  $$('[data-map-layer]').forEach(button=>button.classList.toggle('active',button.dataset.mapLayer===mapLayer));
  $('#mapPins').innerHTML=REGIONS.filter(r=>(!r.hiddenOnMap||profile().showAll)&&(shadow?(r.mapLayer==='shadow'):r.mapLayer!=='shadow')).filter(r=>profile().showAll||regionReached(r)).map(r=>{const reached=regionReached(r),name=reached||profile().spoiler==='full'||profile().showAll?r.name:'Undiscovered';return `<button class="map-pin ${reached?'reached':'unknown'}" style="left:${r.x}%;top:${r.y}%" data-region="${r.id}" aria-label="${esc(name)}: ${reached?'reached':'not confirmed'}">${reached?'✓':'?'}<span>${esc(name)}</span></button>`}).join('');
}
function inspectRegion(id){
  const r=REGIONS.find(x=>x.id===id);if(!r)return;const reached=regionReached(r),qs=QUESTS.filter(q=>q.regions.includes(id)&&(profile().showAll||questRelevant(q)||hasStarted(q)));
  const missing=QUESTS.flatMap(q=>relevantItemClues(q).filter(item=>item.region===id&&!itemState(item.key))).filter((item,i,list)=>list.findIndex(x=>x.key===item.key)===i).slice(0,5);
  const focus=mapFocus&&(mapFocus.region===id||mapRegionForName(`${mapFocus.regionName??''} ${mapFocus.location??''}`)===id)?`<article class="map-focus"><p class="eyebrow">PINNED GUIDANCE</p><h3>${esc(mapFocus.name??'Target')}</h3><p>${esc(mapFocus.location??'')}</p>${mapFocus.hint?`<p>${esc(mapFocus.hint)}</p>`:''}</article>`:'';
  $('#mapInspector').innerHTML=`${focus}<p class="eyebrow">${reached?'SAVE EVIDENCE: REACHED':'NOT CONFIRMED BY TRACKED FLAGS'}</p><h2>${esc(r.name)}</h2><p>${esc(r.clue)}</p><p>${reached?'The save gives us evidence you have reached this broad region. It does not mean every cave, grace, boss, or NPC here is complete.':'Keep this muted until natural exploration or stronger save evidence reaches it.'}</p>${missing.length?`<div class="evidence-box"><strong>QUEST ITEMS TO LOOK FOR</strong>${missing.map(item=>`<p>◇ ${esc(item.name)} — ${esc(item.clue)}</p>`).join('')}</div>`:''}<div>${qs.slice(0,6).map(q=>`<div class="map-quest"><strong>${profile().spoiler==='low'&&!hasStarted(q)?'Possible NPC thread':esc(q.name)}</strong><br><small>${questDone(q).size}/${q.steps.length} manually confirmed</small><br><button class="text-button" data-open-quest="${q.id}">Open thread →</button> <button class="text-button" data-locate-quest="${q.id}">Current location →</button></div>`).join('')}</div>`;
}

function stepCopy(step){
  if(profile().showAll||profile().spoiler==='full')return `<strong>${esc(step.label)}</strong><small>${esc(step.area)}</small><p>${esc(step.detail)}</p>`;
  if(profile().spoiler==='balanced')return `<strong>${esc(step.label)}</strong><small>${esc(step.area)}</small><p>${esc(step.clue)}</p>`;
  return `<strong>${esc(step.area)}</strong><p>${esc(step.clue)}</p>`;
}
function visibleSteps(q,done){
  if(profile().showAll||profile().spoiler==='full')return q.steps.map((step,i)=>({step,i,veiled:false}));
  const firstOpen=q.steps.findIndex((_,i)=>!done.has(i));
  return q.steps.map((step,i)=>({step,i,veiled:!done.has(i)&&i>firstOpen+(profile().spoiler==='balanced'?1:0)}));
}
function questHistory(q,done,evidence){
  const manual=[...done].sort((a,b)=>a-b).map(i=>({kind:'Confirmed',text:`${q.steps[i].label} · ${q.steps[i].area}`}));
  const detected=evidence.map(([,text])=>({kind:'Save',text}));
  const world=TRANSITION_RISKS.filter(r=>r.questIds?.includes(q.id)&&r.outcomeFlag&&flags()[r.outcomeFlag]).map(r=>({kind:'World',text:riskText(r,true)}));
  const items=[...manual,...detected,...world];
  return `<details class="quest-history"><summary>What’s already happened <span>${items.length}</span></summary><div>${items.length?items.map(x=>`<p><strong>${esc(x.kind)}</strong>${esc(x.text)}</p>`).join(''):'<p>Nothing is confirmed for this thread yet. The site will add save evidence or anything you manually check off.</p>'}</div></details>`;
}
function renderQuests(){
  const dialogue=dialogueRule(profile().playMode,profile().role),notice=$('#questDialogueNotice');if(notice){notice.classList.toggle('hidden',!dialogue);notice.innerHTML=dialogue?`<p class="eyebrow">${profile().role==='joiner'?'SEAMLESS STORY RULE':'STORY DRIVER'}</p><h2>${esc(dialogue.title)}</h2><p>${esc(dialogue.text)}</p>`:'';}
  const input=$('#questSearch'),query=(input?.value??'').toLowerCase(),unfinished=$('#unfinishedOnly')?.checked,relevantOnly=$('#relevantOnly')?.checked,qp=profile().quest;
  let filtered=QUESTS.filter(q=>`${q.name} ${q.area} ${q.regions.join(' ')}`.toLowerCase().includes(query)&&(!unfinished||(qp[q.id]?.length??0)<q.steps.length));
  if(!profile().showAll&&(profile().mode==='Explorer'||relevantOnly))filtered=filtered.filter(q=>questRelevant(q)||hasStarted(q));
  filtered.sort((a,b)=>endingPriority(b.id,profile().endingTarget)-endingPriority(a.id,profile().endingTarget)||Number(b.priority==='major')-Number(a.priority==='major')||activeEvidence(b).length-activeEvidence(a).length);
  $('#questList').innerHTML=filtered.map(q=>{
    const done=questDone(q),pct=Math.round(done.size/q.steps.length*100),evidence=activeEvidence(q),relevant=questRelevant(q);
    const portrait=q.image&&desktopSettings?.remotePortraits?`<div class="quest-portrait"><img data-npc-image data-initials="${esc(q.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}" src="${safeUrl(q.image.src)}" alt="${esc(q.name)}" loading="lazy" referrerpolicy="no-referrer"><a href="${safeUrl(q.image.source)}" target="_blank" rel="noreferrer">${esc(q.image.credit)}</a></div>`:'';
    const confidence=evidenceConfidence(profile().role,evidence.some(([key])=>/Rune|Grace|grace|Defeated/i.test(key))?'grace':'world',profile().playMode);
    const evidenceBox=evidence.length?`<div class="evidence-box"><strong>SAVE EVIDENCE · ${esc(confidence.toUpperCase())}</strong>${evidence.map(([,text])=>`<p>✓ ${esc(text)}</p>`).join('')}<p>${esc(profile().playMode==='single'?'Single Player evidence belongs to this character, but conversations still require manual confirmation.':profile().role==='joiner'?'Joiner mode treats shared world flags cautiously. Let the Story Host initiate important NPC dialogue first.':'Story Host mode treats world-state flags as strong evidence, but conversations still require manual confirmation.')}</p></div>`:'';
    const itemClues=relevantItemClues(q);
    const itemBox=itemClues.length?`<div class="item-clues">${itemClues.map(item=>`<div class="item-clue ${itemState(item.key)?'have':''}"><span class="item-state">${itemState(item.key)?'✓':'◇'}</span><div><strong>${esc(item.name)}</strong><p>${itemState(item.key)?'Detected in this character’s save.':esc(item.clue)}</p></div>${!itemState(item.key)?`<button class="text-button" data-region-jump="${esc(item.region)}">Map →</button>`:''}</div>`).join('')}</div>`:'';
    return `<details open class="quest" data-quest-card="${q.id}"><summary><div class="quest-title">${q.image&&desktopSettings?.remotePortraits?`<img class="npc-thumb" data-npc-image data-initials="${esc(q.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}" src="${safeUrl(q.image.src)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span class="npc-fallback">${esc(q.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</span>`}<span class="progress-ring">${pct}%</span><div><h3>${esc(q.name)}</h3><div class="area">${esc(profile().showAll||profile().spoiler==='full'?q.area:questLocation(q).location)} · ${done.size}/${q.steps.length}</div><div class="quest-badges">${endingPriority(q.id,profile().endingTarget)?'<span class="badge ending">Mending Path</span>':''}${q.priority==='major'?'<span class="badge">major thread</span>':''}${evidence.length?`<span class="badge evidence">${evidence.length} save clue${evidence.length===1?'':'s'}</span>`:''}${!relevant&&profile().character?'<span class="badge">not current yet</span>':''}</div></div></div><span>＋</span></summary><div class="quest-body ${q.image&&desktopSettings?.remotePortraits?'with-image':''}">${portrait}<div><p class="quest-hint">Spoiler-light clue: ${esc(q.hint)}</p>${questHistory(q,done,evidence)}${evidenceBox}${itemBox}${visibleSteps(q,done).map(({step,i,veiled})=>veiled?`<div class="step veiled-step"><span class="veil-mark">✦</span><span><strong>Veiled by grace</strong><small>Future checkpoint hidden until this story advances.</small></span></div>`:`<label class="step"><input type="checkbox" data-quest="${q.id}" data-step="${i}" ${done.has(i)?'checked':''}><span class="step-copy">${stepCopy(step)}</span></label>`).join('')}</div></div></details>`;
  }).join('')||'<div class="panel quiet">No matching NPC threads.</div>';
}

function renderChecks(){
  const f=flags(),unfinished=QUESTS.filter(q=>hasStarted(q)&&!isComplete(q)),volcano=QUESTS.find(q=>q.id==='volcano');
  const checks=[
    ...activeTransitionRisks(f).slice(0,4).map(r=>({ok:false,title:r.title,text:riskText(r)})),
    {ok:!f.erdtreeFire,title:'Major world-state threshold',text:f.erdtreeFire?'A major world-state change is active. Finish NPC business you still care about before more one-way story prompts.':f.fireGiant?'You are immediately before a major world-state threshold. This is an excellent time for NPC cleanup.':'No tracked late-game world-state change is active.'},
    {ok:unfinished.length===0,title:'NPC stories already in motion',text:unfinished.length?`${unfinished.length} thread${unfinished.length===1?' is':'s are'} in motion or have save evidence: ${unfinished.slice(0,5).map(q=>q.name).join(', ')}${unfinished.length>5?'…':''}`:'No partially confirmed NPC thread currently needs attention.'},
    {ok:!f.rykard||isComplete(volcano),title:'Volcano Manor contracts',text:f.rykard&&!isComplete(volcano)?'Rykard is defeated. Some manor quest opportunities can change after this point, so check the household if you have unfinished business there.':'No tracked Volcano Manor warning needs attention.'},
    {ok:!!f.torrent,title:'Early mobility',text:f.torrent?'The early mobility unlock is present.':'The early mobility unlock is not present in the tracked flags. Explore and rest along Limgrave’s main roads before pushing hard content.'},
    {ok:!!f.craftingKit,title:'Basic utility',text:f.craftingKit?'The basic crafting unlock is present.':'A very early merchant utility purchase appears to be missing.'},
  ];
  $('#checkList').innerHTML=checks.map(c=>`<article class="check-item ${c.ok?'':'warn'}"><span class="check-mark">${c.ok?'✓':'!'}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div></article>`).join('');
}
function renderSession(){
  $('#sessionTime').value=String(profile().sessionMinutes??90);
  $('#sessionCards').innerHTML=sessionIdeas().map((c,i)=>`<article class="panel session-card"><span class="num">0${i+1}</span><span class="time-chip">${esc(c.time)}</span><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p></article>`).join('');
}

function renderMendingPaths(){
  const tab=$('[data-view="mending"]'),view=$('#mending'),visible=Boolean(profile().showAll||(profile().character&&mendingPathsVisible(flags())));if(tab)tab.classList.toggle('hidden',!visible);if(!view)return;
  if(!visible){view.innerHTML='<div class="panel quiet"><h2>The paths are still veiled.</h2><p>This section appears naturally once different ways of mending the world begin to matter.</p></div>';return}
  const target=profile().endingTarget,warning=endingWarning(target,flags());
  const questState=id=>{const q=QUESTS.find(x=>x.id===id);return !q?'unseen':isComplete(q)?'complete':hasStarted(q)?'started':'unseen'};
  view.innerHTML=`<div class="section-heading page-heading"><div><p class="eyebrow">MENDING PATHS</p><h1>Choose a direction, not a commitment</h1></div><p>Most ending prerequisites can coexist in one playthrough, and the final choice is made at the end. ${profile().showAll||flags().frenziedFlame||flags().frenziedProscriptionGrace?'The Frenzied Flame overrides other choices until removed through its reversal route.':'Some choices can restrict other paths. Guidance will warn when that becomes relevant.'}</p></div>${warning?`<article class="transition-warning danger"><p class="eyebrow">PATH WARNING</p><h2>${esc(warning.title)}</h2><p>${esc(warning.text)}</p></article>`:''}<div class="ending-grid">${ENDING_PATHS.map(path=>{const status=pathStatus(path,flags(),questState),selected=target===path.id;if(status.state==='hidden'&&!profile().showAll)return `<div class="ending-card veiled-ending"><span class="veil-mark">✦</span><p class="eyebrow">VEILED BY GRACE</p><h2>Unrevealed path</h2><p>Keep exploring. Guidance of Grace will reveal this possibility when your character has actually encountered its thread.</p></div>`;return `<button class="ending-card ${selected?'selected':''} ${status.state}" data-ending="${path.id}"><span class="eyebrow">${esc(status.state.toUpperCase())}</span><h2>${esc(path.name)}</h2><strong>${esc(path.subtitle)}</strong><p>${esc(path.description)}</p><small>${esc(status.text)}</small></button>`}).join('')}</div><p class="muted-copy">Selecting a path only changes Guidance of Grace priorities and warnings. It never changes the game or your save.</p>`;
}

function renderLedger(){
  const root=$('#ledgerList');if(!root)return;const visibleBosses=encounterCatalog.filter(b=>profile().showAll||knowledgeVisible({type:'ledger-region',region:b.region,location:b.place}));
  const stats=$('#ledgerStats'),detected=new Set(profile().character?.eventIds??[]),manual=profile().ledger??{},locations=deriveEncounterLocations(visibleBosses.map(b=>profile().showAll||profile().spoiler==='full'||detected.has(b.flagId)||manual[String(b.flagId)]?b:{...b,name:'Major challenge'}));
  if(stats){const done=encounterCatalog.filter(b=>manual[String(b.flagId)]??detected.has(b.flagId)).length,dungeons=locations.filter(x=>x.type==='dungeon').length,evergaols=locations.filter(x=>x.type==='evergaol').length,legacy=locations.filter(x=>x.type==='legacy').length;stats.innerHTML=`<span class="chip">${done}/${encounterCatalog.length} encounters</span><span class="chip">${dungeons} boss-bearing dungeons/gaols</span><span class="chip">${evergaols} evergaols</span><span class="chip">${legacy} legacy locations</span><span class="chip">${encounterCatalog.filter(b=>b.dlc).length} DLC encounters</span>`}
  if(!encounterCatalog.length){root.innerHTML='<article class="panel quiet"><h2>Encounter catalog unavailable</h2><p>The bundled catalog did not load. Use the knowledge updater or reinstall the application.</p></article>';return}
  const groups=visibleBosses.reduce((out,boss)=>((out[boss.region]??=[]).push(boss),out),{});
  root.innerHTML=`<details class="ledger-region ledger-location-index"><summary>Boss-bearing locations <span>${locations.length}</span></summary>${locations.map(loc=>`<div class="ledger-row location-row"><span class="location-mark">⌖</span><span><strong>${esc(loc.name)}</strong><small>${esc(loc.region)} · ${esc(loc.type)} · ${loc.encounters.length} encounter${loc.encounters.length===1?'':'s'}</small><span class="location-enemies">${esc(loc.encounters.join(' · '))}</span></span></div>`).join('')}</details>`+Object.entries(groups).map(([region,bosses])=>{const done=bosses.filter(b=>manual[String(b.flagId)]??detected.has(b.flagId)).length;return `<details class="ledger-region"><summary>${esc(region)} <span>${done}/${bosses.length}</span></summary>${bosses.map(boss=>{const checked=manual[String(boss.flagId)]??detected.has(boss.flagId),auto=detected.has(boss.flagId),kind=classifyBossLocation(boss.place,boss.region),revealed=profile().showAll||profile().spoiler==='full'||checked,insight=revealed?bossInsight(boss.name):null;return `<div class="ledger-row"><input type="checkbox" data-ledger="${boss.flagId}" aria-label="Mark ${esc(revealed?boss.name:"Major challenge")} complete" ${checked?'checked':''} ><span><strong>${esc(revealed?boss.name:"Major challenge")}</strong><small>${esc(boss.place||kind)} · ${esc(kind)}${boss.dlc?' · Shadow of the Erdtree':''}${auto?profile().playMode==='seamless'&&profile().role==='joiner'?' · shared-world evidence':' · save evidence':''}</small>${insight?`<details class="ledger-insight"><summary>Whisper of Grace</summary><p><b>Weakness:</b> ${esc(insight.weakness)}</p><p><b>Field note:</b> ${esc(insight.tip)}</p><p><b>If you want an edge:</b> ${esc(insight.exploit)}</p></details>`:''}</span></div>`}).join('')}</details>`}).join('');
}

function renderKnowledgeSearch(){
  const input=$('#knowledgeSearch'),root=$('#knowledgeResults'),toggle=$('#showAllKnowledge'),count=$('#searchCount');if(!input||!root)return;
  if(toggle)toggle.checked=profile().showAll;
  visibleEventIds=new Set(profile().character?.eventIds??[]);
  const query=input.value.trim(),all=[...KNOWLEDGE_INDEX,...supplementalKnowledge],matches=searchKnowledge(all.filter(knowledgeVisible),query,{limit:160}).map(item=>item.type==='quest'?{...item,location:questLocation(QUESTS.find(q=>q.id===item.questId)).location}:item.type==='location'&&!profile().showAll&&profile().spoiler!=='full'?{...item,enemies:[],description:'Encounter location in a reached region. Explore to learn what waits here.'}:item);
  if(count)count.textContent=`${matches.length}${matches.length===160?'+':''} result${matches.length===1?'':'s'}`;
  const typeLabel={encounter:'Encounter',location:'Location',quest:'NPC thread',forge:'Forge Supply',story:'Book of Knowledge',glossary:'Glossary',item:'Quest item','boss-detail':'Boss detail'};
  root.innerHTML=matches.map(item=>{const region=mapRegionForName(`${item.region??''} ${item.location??''}`),canMap=Boolean(region||Number.isFinite(item.x)||item.type==='quest'||item.type==='forge'),rewards=(item.rewards??[]).filter(Boolean);let actions='';if(item.type==='quest')actions=`<button class="text-button" data-open-quest="${esc(item.questId)}">Open thread →</button><button class="text-button" data-locate-quest="${esc(item.questId)}">Where now? ⟡</button>`;else if(item.type==='forge')actions=`<button class="text-button" data-forge-reveal="${esc(item.forgeId)}">Reveal location →</button>`;else if(item.type==='story'||item.type==='glossary')actions='<button class="text-button" data-view="story">Open Books of Knowledge →</button>';else if(canMap)actions=`<button class="text-button" data-locate-record="${esc(item.id)}">Show on map →</button>`;return `<article class="panel knowledge-result" data-knowledge-id="${esc(item.id)}"><p class="eyebrow">${esc(typeLabel[item.type]??item.type)}</p><h2>${esc(item.title)}</h2>${item.subtitle?`<strong>${esc(item.subtitle)}</strong>`:''}${item.region||item.location?`<p class="meta">${esc([item.region,item.location].filter(Boolean).join(' · '))}</p>`:''}${item.description?`<p>${esc(item.description)}</p>`:''}${item.enemies?.length?`<p><b>Encounter:</b> ${esc(item.enemies.join(', '))}</p>`:''}${rewards.length?`<p><b>Rewards / drops:</b> ${esc(rewards.join(', '))}</p>`:''}<div class="button-row">${actions}<button class="text-button" data-track-record="${esc(item.id)}">${profile().tracked?.includes(item.id)?'Tracked ✓':'Track this'}</button></div></article>`}).join('')||'<article class="panel quiet"><h2>No matching records</h2><p>Try a boss, NPC, dungeon type, upgrade stone, bell bearing, item or region. Enable Show all to search undiscovered content deliberately.</p></article>';
}
function locateKnowledgeRecord(id){const item=[...KNOWLEDGE_INDEX,...supplementalKnowledge].find(x=>x.id===id);if(!item)return;locateTarget({x:item.x,y:item.y,layer:item.layer,name:item.title,location:item.location||item.region,region:mapRegionForName(`${item.region??''} ${item.location??''}`),regionName:item.region,hint:item.description});}
function revealForge(id){const item=FORGE_SUPPLY.find(x=>x.id===id);if(!item)return;locateTarget({name:item.name,location:item.location,region:item.region,regionName:item.regionName,hint:`${item.source} Unlocks at the Twin Maiden Husks: ${item.unlocks.join(', ')}.`});}

function unlockedGlossary(){if(profile().showAll)return GLOSSARY;const ids=new Set(unlockedStory(flags()).flatMap(beat=>beat.glossary??[]));return GLOSSARY.filter(entry=>ids.has(entry.id));}
function renderStory(){
  const beats=profile().showAll?STORY_BEATS:unlockedStory(flags()),c=profile().character,ready=currentReadiness();
  $('#storyStatus').innerHTML=`<div><p class="eyebrow">SAVE-GATED STORY</p><h2>${c?`${esc(c.name)} · ${esc(mapLabel())}`:'Connect a character to unlock story beats'}</h2><p class="muted-copy">${c?`Showing ${beats.length} story beat${beats.length===1?'':'s'} supported by this character’s progress. Future chapters remain hidden.`:'The glossary and theories will grow with the save instead of exposing the whole game up front.'}</p></div><span class="chip ${ready.state}">${esc(ready.text)}</span>`;
  $('#storyBeats').innerHTML=beats.map(beat=>`<article class="panel story-beat"><div class="story-beat-head"><div><span class="chapter">${esc(beat.chapter)}</span><h2>${esc(beat.title)}</h2></div></div><p>${esc(beat.summary)}</p><div class="glossary-links">${(beat.glossary??[]).map(id=>glossaryById(id)).filter(Boolean).map(entry=>`<button class="glossary-link" data-glossary="${entry.id}">${esc(entry.name)}</button>`).join('')}</div>${beat.learnMore?`<details class="learn-more"><summary>Learn more about why this matters…</summary><p>${esc(beat.learnMore)}</p></details>`:''}</article>`).join('');
  renderGlossary();
  const theories=profile().showAll?THEORY_CARDS:THEORY_CARDS.filter(card=>card.unlock(flags()));
  $('#theoryList').innerHTML=theories.length?theories.map(card=>`<article class="theory-card"><h3>${esc(card.title)}</h3><p class="confirmed"><strong>Confirmed:</strong> ${esc(card.confirmed)}</p><details class="learn-more"><summary>Community interpretation / theory</summary><p class="theory">${esc(card.theory)}</p><p>${esc(card.caution)}</p></details></article>`).join(''):'<p class="muted-copy">No theory cards have unlocked yet.</p>';
  const videos=profile().showAll?STORY_VIDEOS:STORY_VIDEOS.filter(video=>video.unlock(flags()));
  $('#storyVideos').innerHTML=videos.map(video=>`<article class="video-card"><p class="eyebrow">${video.kind==='official'?'OFFICIAL RECORD':video.kind==='community-cutscenes'?'COMMUNITY CUTSCENE ARCHIVE':'COMMUNITY DEEP DIVE'}</p><h3>${esc(video.title)}</h3><p>${esc(video.creator)} · ${esc(video.spoiler)}</p><button class="text-button" data-external="${safeUrl(video.url)}">Open ${video.kind==='official'?'official record':'video'} →</button></article>`).join('')||'<p class="muted-copy">No videos are safe for the current spoiler state yet.</p>';
}
function renderGlossary(){
  const query=($('#glossarySearch')?.value??'').trim().toLowerCase();
  const entries=unlockedGlossary().filter(entry=>`${entry.name} ${entry.summary}`.toLowerCase().includes(query));
  $('#glossaryList').innerHTML=entries.map(entry=>`<article class="glossary-entry" data-glossary-entry="${entry.id}"><h3>${esc(entry.name)}</h3><p>${esc(entry.summary)}</p></article>`).join('')||'<p class="muted-copy">No unlocked glossary entries match.</p>';
}

function renderKnowledgeStatus(status){const el=$('#knowledgeStatus');if(!el)return;if(!status){el.textContent=`Bundled offline snapshot: ${GENERATED_BOSSES_SNAPSHOT.count} encounters verified ${GENERATED_BOSSES_SNAPSHOT.verified}.`;return}el.textContent=`Encounter source: ${status.source??GENERATED_BOSSES_SNAPSHOT.source} · version ${String(status.version??'bundled').slice(0,16)} · last successful update ${status.lastUpdated?new Date(status.lastUpdated).toLocaleString():'bundled snapshot'}. ${(status.sources??[]).some(x=>x.state==='error')?'Latest check unavailable; last valid data remains active. ':''}${status.local?`Local catalog: ${status.local.records} records · ${status.local.gameVersion} · generated ${new Date(status.local.generatedAt).toLocaleString()} · ${status.local.source}`:''}`;}

function renderDesktop(){
  const isDesktop=Boolean(window.guidanceDesktop?.isDesktop);$$('.desktop-only').forEach(el=>el.classList.toggle('hidden',!isDesktop));if(!isDesktop||!desktopSettings)return;
  const set=(id,value,property='checked')=>{const el=$(id);if(el)el[property]=value};
  set('#desktopPlayMode',desktopSettings.playMode,'value');set('#desktopRole',desktopSettings.multiplayerRole,'value');
  for(const key of ['wakeWithGame','closeAfterGame','keepRunningInBackground','startWithWindows','checkForUpdates','autoDownloadUpdates','knowledgeAutoUpdate','remotePortraits'])set(`#${key}`,Boolean(desktopSettings[key]));
  $('#desktopRoleWrap').classList.toggle('hidden',desktopSettings.playMode==='single');$('#roleExplanation').textContent=roleNote(desktopSettings.multiplayerRole,desktopSettings.playMode);
  $('#desktopSavePath').textContent=desktopSettings.selectedSavePath||'No save selected; the app will prefer a discovered .co2 file for Seamless or .sl2 for vanilla.';
  const parsed=profile().character?.scaduLevel;$('#scaduLevel').value=parsed??profile().scaduLevel??'';$('#scaduLevel').disabled=Number.isInteger(parsed);$('#scaduHelp').textContent=Number.isInteger(parsed)?`Read from save: Scadutree ${parsed} · Revered Spirit Ash ${profile().character?.spiritBlessingLevel??'unknown'}.`:'Automatic blessing read unavailable for this slot; manual fallback is enabled.';
  $('#desktopSlot').innerHTML=pendingSave?.slots?.length?pendingSave.slots.map(c=>`<option value="${c.slot}" ${c.slot===desktopSettings.selectedSlot?'selected':''}>${esc(c.name)} · Lv ${c.level}${Number.isInteger(c.scaduLevel)?` · Scadu ${c.scaduLevel}`:''}</option>`).join(''):'<option value="">Waiting for save read</option>';
}

function applyCharacter(raw,{changedKeys=null}={}){
  const c=cleanCharacter(raw);if(!c)return;
  const p=profile(),old=p.character;
  const changed=changedKeys??(old&&old.name===c.name?Object.keys(c.flags).filter(k=>c.flags[k]&&!old.flags?.[k]):[]);
  p.recentChanges=changed.filter(k=>FLAG_LABELS[k]).map(k=>FLAG_LABELS[k]).slice(0,12);
  p.recentWarnings=TRANSITION_RISKS.filter(r=>r.triggerFlags?.some(k=>changed.includes(k))).map(r=>r.id).slice(0,8);
  p.character=c;p.lastSync=new Date().toISOString();saveState();render();
}

async function handleSave(file){
  try{
    const parsed=parseSave(await file.arrayBuffer());if(!parsed.slots.length)throw new Error('No active character slots were found.');pendingSave=parsed;
    $('#characterChoices').innerHTML=parsed.slots.map(c=>`<button type="button" class="character-choice" data-slot="${c.slot}"><strong>${esc(c.name)}</strong><span>Level ${c.level} · ${formatPlaytime(c.secondsPlayed)}</span></button>`).join('');$('#characterDialog').showModal();
  }catch(error){alert(`Could not read this save: ${error.message}`)}
}
async function chooseCharacter(slot){
  const c=pendingSave?.slots.find(s=>s.slot===slot);if(!c)return;
  if(window.guidanceDesktop){
    if(profile().character&&profile().character.slot!==slot)await createJourney(profile().playMode);
    desktopSettings=await window.guidanceDesktop.setSettings({selectedSlot:slot});
  }
  applyCharacter(c);if($('#characterDialog').open)$('#characterDialog').close();
}
async function pickOrUpdateSave(){
  try{if(window.guidanceDesktop?.isDesktop)return window.guidanceDesktop.readSave();let handle=saveHandle;if(!handle&&window.showOpenFilePicker){[handle]=await window.showOpenFilePicker({types:[{description:'Elden Ring save',accept:{'application/octet-stream':['.co2','.sl2']}}]});saveHandle=handle}if(handle)return handleSave(await handle.getFile());$('#saveInput').click()}catch(error){if(error.name!=='AbortError')alert(`Could not open the save: ${error.message}`)}
}

$('#spoilerSelect').addEventListener('change',e=>{profile().spoiler=e.target.value;saveState();render()});
$('#saveButton').addEventListener('click',pickOrUpdateSave);$('#syncAgain').addEventListener('click',pickOrUpdateSave);
$('#saveInput').addEventListener('change',e=>{if(e.target.files[0])handleSave(e.target.files[0]);e.target.value=''});
$('#closeGuidance').addEventListener('click',()=>$('#guidancePanel').classList.add('hidden'));
$('#questSearch').addEventListener('input',renderQuests);$('#unfinishedOnly').addEventListener('change',renderQuests);$('#relevantOnly').addEventListener('change',renderQuests);
$('#glossarySearch').addEventListener('input',renderGlossary);
$('#sessionTime').addEventListener('change',e=>{profile().sessionMinutes=Number(e.target.value)||90;saveState();renderSession();});

document.addEventListener('click',e=>{
  const tracked=e.target.closest('[data-track-record]');if(tracked){const ids=new Set(profile().tracked??[]),id=tracked.dataset.trackRecord;ids.has(id)?ids.delete(id):ids.add(id);profile().tracked=[...ids];saveState();renderKnowledgeSearch();return;}
  const nav=e.target.closest('[data-view]');if(nav){activateView(nav.dataset.view);return}
  const layer=e.target.closest('[data-map-layer]');if(layer){mapLayer=layer.dataset.mapLayer==='shadow'?'shadow':'base';renderMap();return}
  const branch=e.target.closest('[data-branch]');if(branch){openBranch(branch.dataset.branch);return}
  const hint=e.target.closest('.hint button');if(hint){const box=hint.parentElement;box.classList.toggle('open');hint.lastElementChild.textContent=box.classList.contains('open')?'−':'＋';return}
  const choice=e.target.closest('[data-slot]');if(choice){chooseCharacter(Number(choice.dataset.slot));return}
  const pin=e.target.closest('[data-region]');if(pin){inspectRegion(pin.dataset.region);return}
  const region=e.target.closest('[data-region-jump]');if(region){const target=REGIONS.find(r=>r.id===region.dataset.regionJump);mapLayer=target?.mapLayer==='shadow'?'shadow':'base';activateView('map');renderMap();requestAnimationFrame(()=>inspectRegion(region.dataset.regionJump));return}
  const glossary=e.target.closest('[data-glossary]');if(glossary){$('#glossarySearch').value=glossaryById(glossary.dataset.glossary)?.name??'';renderGlossary();document.querySelector(`[data-glossary-entry="${CSS.escape(glossary.dataset.glossary)}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});return}
  const ending=e.target.closest('[data-ending]');if(ending){profile().endingTarget=ending.dataset.ending;saveState();render();return}
  const external=e.target.closest('[data-external]');if(external){const url=safeUrl(external.dataset.external);if(window.guidanceDesktop?.isDesktop)void window.guidanceDesktop.openExternal(url);else window.open(url,'_blank','noopener,noreferrer');return}
  const locateQ=e.target.closest('[data-locate-quest]');if(locateQ){locateQuest(locateQ.dataset.locateQuest);return}
  const forge=e.target.closest('[data-forge-reveal]');if(forge){revealForge(forge.dataset.forgeReveal);return}
  const record=e.target.closest('[data-locate-record]');if(record){locateKnowledgeRecord(record.dataset.locateRecord);return}
  const journey=e.target.closest('[data-journey-id]');if(journey){awaitJourneyLoad(journey.dataset.journeyId);return}
  const q=e.target.closest('[data-open-quest]');if(q){openQuest(q.dataset.openQuest)}
});
document.addEventListener('error',e=>{const img=e.target.closest?.('img[data-npc-image]');if(!img)return;const fallback=document.createElement('span');fallback.className=img.classList.contains('npc-thumb')?'npc-fallback':'npc-fallback portrait-fallback';fallback.textContent=img.dataset.initials||'?';img.replaceWith(fallback)},true);
document.addEventListener('change',e=>{
  if(e.target.matches('[data-ledger]')){profile().ledger[e.target.dataset.ledger]=e.target.checked;saveState();renderLedger();return}
  if(e.target.matches('[data-quest]')){const id=e.target.dataset.quest,step=Number(e.target.dataset.step),set=new Set(profile().quest[id]??[]);e.target.checked?set.add(step):set.delete(step);profile().quest[id]=[...set].sort((a,b)=>a-b);saveState();renderQuests();renderChecks();return}
});

async function awaitJourneyLoad(id){try{await loadJourney(id);$('#journeyDialog')?.close();journeyDialogResolve?.();journeyDialogResolve=null}catch(error){alert(error.message)}}

function openQuest(id){activateView('quests');$('#questSearch').value='';renderQuests();requestAnimationFrame(()=>{const card=$(`[data-quest-card="${CSS.escape(id)}"]`);if(card){card.open=true;card.scrollIntoView({behavior:'smooth',block:'start'})}})}

async function updateDesktopSettings(patch){
  if(!window.guidanceDesktop?.isDesktop)return;
  if(patch.playMode&&patch.playMode!==profile().playMode){await createJourney(patch.playMode);return;}
  desktopSettings=await window.guidanceDesktop.setSettings(patch);profile().playMode=desktopSettings.playMode;profile().role=desktopSettings.multiplayerRole;profile().savePath=desktopSettings.selectedSavePath;saveState();render();
}

async function initDesktop(){
  if(!window.guidanceDesktop?.isDesktop)return;
  desktopSettings=await window.guidanceDesktop.getSettings();
  await chooseJourneyOnLaunch();
  desktopSettings=await window.guidanceDesktop.getSettings();profile().playMode=desktopSettings.playMode;profile().role=desktopSettings.multiplayerRole;saveState();
  const games=await window.guidanceDesktop.discoverGames().catch(()=>({}));
  await refreshKnowledge();
  const info=await window.guidanceDesktop.appInfo();$('#appVersion').textContent=`Version ${info.version}`;
  window.guidanceDesktop.onSaveError(error=>{$('#syncText').textContent=error.message;});
  renderKnowledgeStatus(await window.guidanceDesktop.knowledgeStatus().catch(()=>null));
  window.guidanceDesktop.onKnowledge(status=>{renderKnowledgeStatus(status);void window.guidanceDesktop.knowledgeCatalog().then(items=>{supplementalKnowledge=items;renderKnowledgeSearch()})});
  $('#gamePathStatus').textContent=games?.gameDir?`Detected: ${games.gameDir}${games.seamless?' · Seamless launcher found':' · Seamless launcher not auto-detected'}`:'Steam Elden Ring install was not auto-detected; you can still choose launchers manually in a later build or launch the game normally.';
  window.guidanceDesktop.onSave(payload=>{
    if(switchingJourney||payload.journeyId!==activeJourneyId)return;
    profile().savePath=payload.filePath;
    pendingSave={slots:payload.slots??[]};
    if(!Number.isInteger(desktopSettings?.selectedSlot)){if(pendingSave.slots.length){$('#characterChoices').innerHTML=pendingSave.slots.map(c=>`<button type="button" class="character-choice" data-slot="${c.slot}"><strong>${esc(c.name)}</strong><span>Level ${c.level}</span></button>`).join('');if(!$('#characterDialog').open)$('#characterDialog').showModal();}return;}
    const selected=payload.slots?.find(slot=>slot.slot===desktopSettings.selectedSlot);
    if(!selected){$('#syncText').textContent='The selected character is unavailable. Choose a character to continue.';desktopSettings.selectedSlot=null;if(pendingSave.slots.length){$('#characterChoices').innerHTML=pendingSave.slots.map(c=>`<button type="button" class="character-choice" data-slot="${c.slot}"><strong>${esc(c.name)}</strong><span>Level ${c.level}</span></button>`).join('');if(!$('#characterDialog').open)$('#characterDialog').showModal();}return;}
    if(selected)applyCharacter(selected,{changedKeys:payload.diff?.changed??[]});
    if($('#desktop').classList.contains('active'))renderDesktop();
  });
  window.guidanceDesktop.onGame(({running})=>{desktopGameRunning=Boolean(running);$('#gamePathStatus').textContent=`${running?'Elden Ring is running.':'Elden Ring is not running.'} ${games?.gameDir?`Install: ${games.gameDir}`:''}`});
  window.guidanceDesktop.onUpdate(update=>{const text={checking:'Checking for updates…',available:`Version ${update.version} is available.`,current:'Guidance of Grace is up to date.',downloading:`Downloading… ${update.percent??0}%`,ready:`Version ${update.version} is ready to install.`,dev:'Update checks run after the app is packaged.',error:`Update error: ${update.message??'unknown error'}`}[update.state]??update.message??update.state;$('#updateStatus').textContent=text;$('#installUpdate').classList.toggle('hidden',update.state!=='ready')});
  await window.guidanceDesktop.readSave().catch(()=>{});render();
}

for(const [id,key] of [['#desktopPlayMode','playMode'],['#desktopRole','multiplayerRole']])$(id).addEventListener('change',e=>void updateDesktopSettings({[key]:e.target.value}));
for(const key of ['wakeWithGame','closeAfterGame','keepRunningInBackground','startWithWindows','checkForUpdates','autoDownloadUpdates','knowledgeAutoUpdate','remotePortraits'])$(`#${key}`).addEventListener('change',e=>void updateDesktopSettings({[key]:e.target.checked}));
$('#desktopSlot').addEventListener('change',e=>{const slot=Number(e.target.value);if(Number.isInteger(slot))void chooseCharacter(slot);});
$('#scaduLevel').addEventListener('change',e=>{if(Number.isInteger(profile().character?.scaduLevel))return;const value=e.target.value===''?null:Number(e.target.value);profile().scaduLevel=Number.isInteger(value)&&value>=0&&value<=20?value:null;saveState();renderHome();renderStory();});
$('#chooseDesktopSave').addEventListener('click',async()=>{const chosen=await window.guidanceDesktop?.chooseSave();if(chosen){desktopSettings=await window.guidanceDesktop.getSettings();renderDesktop()}});
$('#refreshDesktopSave').addEventListener('click',()=>window.guidanceDesktop?.readSave());
$('#chooseSeamless').addEventListener('click',async()=>{if(window.guidanceDesktop){await window.guidanceDesktop.chooseGame('seamless');desktopSettings=await window.guidanceDesktop.getSettings();renderDesktop()}});
$('#chooseVanilla').addEventListener('click',async()=>{if(window.guidanceDesktop){await window.guidanceDesktop.chooseGame('vanilla');desktopSettings=await window.guidanceDesktop.getSettings();renderDesktop()}});
$('#launchSeamless').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.launchGame('seamless').catch(error=>alert(error.message))});
$('#launchVanilla').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.launchGame('vanilla').catch(error=>alert(error.message))});
$('#shortcutSeamless').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.createLauncherShortcut('seamless').then(path=>alert(`Created ${path}`)).catch(error=>alert(error.message))});
$('#shortcutVanilla').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.createLauncherShortcut('vanilla').then(path=>alert(`Created ${path}`)).catch(error=>alert(error.message))});
$('#checkUpdates').addEventListener('click',async()=>{const result=await window.guidanceDesktop?.checkUpdates();if(result?.state)$('#updateStatus').textContent=result.message??result.state});
$('#installUpdate').addEventListener('click',()=>window.guidanceDesktop?.installUpdate());
$('#checkKnowledge').addEventListener('click',async()=>{if(!window.guidanceDesktop)return;$('#knowledgeStatus').textContent='Refreshing licensed knowledge sources…';const status=await window.guidanceDesktop.updateKnowledge();await refreshKnowledge();renderLedger();renderKnowledgeSearch();renderKnowledgeStatus(status)});
function playLocalVideo(movie){if(!movie)return;$('#localVideoTitle').textContent=movie.name;$('#localVideoStatus').textContent='';$('#localVideo').src=movie.url;if(!$('#videoDialog').open)$('#videoDialog').showModal();}
$('#openGameMovies').addEventListener('click',async()=>{
  try{const movies=await window.guidanceDesktop.openGameMovies();$('#localMovieList').innerHTML=movies.map((m,i)=>`<li>${esc(m.name)} ${m.supported?`<button class="text-button" data-local-movie="${i}">Play</button>`:'<span class="meta">Bink format · conversion required</span>'}</li>`).join('');$('#localVideoTitle').textContent='Local videos';$('#localVideoStatus').textContent=movies.some(m=>!m.supported)?'Installed cutscenes use Bink 2, which this player cannot decode. Open a locally converted MP4 or WebM to play it here.':movies.length?'Select a video.':'No installed movies found. Open a local video instead.';$('#videoDialog').showModal();$('#localMovieList').onclick=e=>{const b=e.target.closest('[data-local-movie]');if(b)playLocalVideo(movies[Number(b.dataset.localMovie)]);};}catch(error){alert(error.message);}
});
$('#chooseLocalVideo').addEventListener('click',async()=>{const movie=await window.guidanceDesktop.chooseVideo();playLocalVideo(movie);});
$('#localVideo').addEventListener('error',()=>{$('#localVideoStatus').textContent='This video codec is not supported. Try an H.264 MP4 or VP8/VP9 WebM.';});
$('#videoDialog').addEventListener('close',()=>{$('#localVideo').pause();$('#localVideo').removeAttribute('src');$('#localVideo').load();});
$('#importKnowledge').addEventListener('click',async()=>{const result=await window.guidanceDesktop?.importKnowledge();if(result){supplementalKnowledge=await window.guidanceDesktop.knowledgeCatalog();renderKnowledgeSearch();alert(`Imported ${result.records} searchable game-data records.`)}});
$('#journeySelect').addEventListener('change',e=>void awaitJourneyLoad(e.target.value));
$('#newSingleJourney').addEventListener('click',()=>void createJourney('single'));
$('#newSeamlessJourney').addEventListener('click',()=>void createJourney('seamless'));
$('#journeyCreateSingle').addEventListener('click',()=>void createJourney('single').then(()=>{journeyDialogResolve?.();journeyDialogResolve=null}));
$('#journeyCreateSeamless').addEventListener('click',()=>void createJourney('seamless').then(()=>{journeyDialogResolve?.();journeyDialogResolve=null}));
$('#importJourney').addEventListener('click',async()=>{const j=await window.guidanceDesktop?.importJourney();if(j){await refreshJourneys();await loadJourney(j.id)}});
$('#exportJourney').addEventListener('click',()=>activeJourneyId&&window.guidanceDesktop?.exportJourney(activeJourneyId));
let searchTimer;$('#knowledgeSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderKnowledgeSearch,120);});
$('#showAllKnowledge').addEventListener('change',e=>{profile().showAll=e.target.checked;saveState();render()});


if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
void initDesktop();

$('#globalShowAll').addEventListener('change',e=>{profile().showAll=e.target.checked;saveState();render()});

$('#generateLocal').addEventListener('click',async()=>{const button=$('#generateLocal');button.disabled=true;try{const result=await window.guidanceDesktop.generateLocal();await refreshKnowledge();render();$('#knowledgeStatus').textContent=`Generated ${result.records} local records · ${result.gameVersion}`;}catch(error){$('#knowledgeStatus').textContent=error.message;}finally{button.disabled=false;}});
window.guidanceDesktop?.onGeneration(({message})=>{$('#knowledgeStatus').textContent=message});
$('#journeyImportChooser').addEventListener('click',async()=>{const j=await window.guidanceDesktop.importJourney();if(j)await awaitJourneyLoad(j.id)});
