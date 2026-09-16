import { parseSave, formatPlaytime } from './save-parser.js';
import { QUESTS, BRANCHES, REGIONS, MAP_IMAGE, FLAG_LABELS, TRANSITION_RISKS, getStage, getTransitionRisk, questAvailable } from './data.js';
import { cloudStatus, consumeAuthRedirect, loadUser, sendMagicLink, signOut, createCampaign, joinCampaign, listCampaigns, setCampaign, pushProfile, fetchCampaign } from './cloud.js';
import { AREA_RECOMMENDATIONS, BOSS_RECOMMENDATIONS, recommendationForMap } from './content/recommendations.js';
import { STORY_BEATS, unlockedStory, GLOSSARY, THEORY_CARDS, STORY_VIDEOS, glossaryById } from './content/story-data.js';
import { QUEST_ITEM_LINKS, questItemsFor } from './content/item-links.js';
import { readinessLabel, roleNote, evidenceConfidence, dialogueRule } from './desktop/core.js';
import { ENDING_PATHS, endingPriority, endingWarning, mendingPathsVisible, pathStatus } from './content/mending-paths.js';
import { bossInsight } from './content/boss-insights.js';
import { GENERATED_BOSSES, GENERATED_BOSSES_SNAPSHOT } from './content/generated-bosses.js';
import { classifyBossLocation, deriveEncounterLocations, COMPLETION_CATALOG_SOURCE } from './content/completion-catalog.js';
import { FORGE_SUPPLY, reachableForgeSupply } from './content/forge-supply.js';
import { buildKnowledgeIndex, searchKnowledge } from './content/knowledge-index.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE_KEY = 'guidance-of-grace-v2';
const LEGACY_KEY = 'guidance-of-grace-v1';
const SPOILERS = new Set(['low','balanced','full']);
const MODES = new Set(['Explorer','Guide']);
const defaultProfile = (name,mode) => ({ name, mode, playMode:'seamless', role:'joiner', scaduLevel:null, endingTarget:'undecided', sessionMinutes:90, spoiler:mode==='Explorer'?'low':'balanced', showAll:false, quest:{}, ledger:{}, character:null, lastSync:null, recentChanges:[], recentWarnings:[] });
const defaultState = () => ({ version:3, active:0, profiles:[defaultProfile('New Tarnished','Explorer'),defaultProfile('Guide 1','Guide'),defaultProfile('Guide 2','Guide')] });

let state = loadState();
let pendingSave = null;
let remoteStates = [];
let desktopSettings = null;
let desktopGameRunning = false;
let mapLayer = 'base';
let mapFocus = null;
let overlayMapTarget = null;
let activeJourneyId = null;
let journeyList = [];
let journeySaveTimer = null;
let journeyDialogResolve = null;
let suppressJourneySave = false;
let supplementalKnowledge = [];
const ENCOUNTER_LOCATIONS = deriveEncounterLocations(GENERATED_BOSSES);
const KNOWLEDGE_INDEX = buildKnowledgeIndex({bosses:GENERATED_BOSSES,quests:QUESTS,forgeSupply:FORGE_SUPPLY,storyBeats:STORY_BEATS,glossary:GLOSSARY,questItems:QUEST_ITEM_LINKS});
const saveHandles = [null,null,null];

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
  if(raw.ledger&&typeof raw.ledger==='object')for(const [key,value] of Object.entries(raw.ledger))if(value===true&&/^\d+$/.test(key))ledger[key]=true;
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
    quest,
    ledger,
    character:c,
    lastSync:typeof raw.lastSync==='string'?raw.lastSync:null,
    recentChanges:Array.isArray(raw.recentChanges)?raw.recentChanges.filter(x=>typeof x==='string').slice(0,12):[],
    recentWarnings:Array.isArray(raw.recentWarnings)?raw.recentWarnings.filter(id=>typeof id==='string'&&getTransitionRisk(id)).slice(0,8):[],
  };
}
function sanitizeState(raw){
  const base=defaultState(), profiles=base.profiles.map((p,i)=>cleanProfile(raw?.profiles?.[i],p));
  const active=Number.isInteger(raw?.active)&&raw.active>=0&&raw.active<3?raw.active:0;
  return {version:3,active,profiles};
}
function loadState(){
  try{
    const current=localStorage.getItem(STORAGE_KEY), legacy=localStorage.getItem(LEGACY_KEY);
    const result=sanitizeState(JSON.parse(current||legacy||'null'));
    if(!current&&legacy)localStorage.setItem(STORAGE_KEY,JSON.stringify(result));
    return result;
  }catch{return defaultState()}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));if(!suppressJourneySave&&activeJourneyId&&window.guidanceDesktop?.isDesktop){clearTimeout(journeySaveTimer);journeySaveTimer=setTimeout(()=>void window.guidanceDesktop.saveJourney(activeJourneyId,state,{playMode:profile().playMode}).catch(()=>{}),250)}}
function profile(){return state.profiles[state.active]}
function flags(){return profile().character?.flags??{}}
function stage(){return getStage(flags())}
function questDone(q,p=profile()){return new Set(p.quest[q.id]??[])}
function regionReached(region,f=flags()){return Boolean(profile().character&&region.when(f))}
function questRelevant(q,f=flags()){return !profile().character||questAvailable(q,f)}
function activeEvidence(q,f=flags()){return (q.saveEvidence??[]).filter(([key])=>Boolean(f[key]))}
function hasStarted(q,p=profile()){return (p.quest[q.id]?.length??0)>0||activeEvidence(q,p.character?.flags??{}).length>0}
function isComplete(q,p=profile()){return (p.quest[q.id]?.length??0)>=q.steps.length}
function riskRelevant(r,p=profile()){
  if(!r.questIds?.length||r.always)return true;
  return r.questIds.some(id=>{const q=QUESTS.find(x=>x.id===id);return q&&!isComplete(q,p)});
}
function activeTransitionRisks(f=flags()){
  const rank={danger:2,warn:1,note:0};
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
function questLocation(q){const {step}=currentQuestStep(q);return {name:q.name,location:step?.area||q.area,hint:step?.clue||q.hint,region:q.regions.find(id=>REGIONS.some(r=>r.id===id))??q.regions[0]??null};}
function locateTarget(target){if(!target)return;mapFocus=target;overlayMapTarget=target;const region=target.region&&REGIONS.some(r=>r.id===target.region)?target.region:mapRegionForName(`${target.regionName??''} ${target.region??''} ${target.location??''}`);if(region){const model=REGIONS.find(r=>r.id===region);mapLayer=model?.mapLayer==='shadow'?'shadow':'base';activateView('map');renderMap();requestAnimationFrame(()=>inspectRegion(region));}syncOverlay();}
function locateQuest(id){const q=QUESTS.find(x=>x.id===id);if(q)locateTarget(questLocation(q));}
function knowledgeVisible(item){if(profile().showAll||!profile().character)return true;if(item.type==='quest'){const q=QUESTS.find(x=>x.id===item.questId);return Boolean(q&&(questRelevant(q)||hasStarted(q)))}if(item.type==='story')return unlockedStory(flags()).some(b=>b.id===item.storyId);if(item.type==='glossary')return unlockedGlossary().some(g=>g.id===item.glossaryId);if(item.type==='forge'){const source=FORGE_SUPPLY.find(x=>x.id===item.forgeId);return Boolean(source?.when(flags()))}if(item.type==='item')return QUEST_ITEM_LINKS.some(x=>x.key===item.itemKey&&x.when(flags()));const regionId=mapRegionForName(`${item.region??''} ${item.location??''}`);const region=REGIONS.find(r=>r.id===regionId);return region?regionReached(region):false;}
function overlayPayload(){
  const c=profile().character,dialogue=dialogueRule(profile().playMode,profile().role);
  const warnings=activeTransitionRisks().slice(0,3).map(r=>({id:r.id,level:r.level==='warn'?'warning':r.level,title:r.title,text:riskText(r),questId:(r.questIds??[]).find(id=>questRelevant(QUESTS.find(q=>q.id===id)))}));
  const ending=endingWarning(profile().endingTarget,flags());if(ending)warnings.unshift({...ending,id:'mending-path'});
  const nearby=areaQuests().slice(0,2).map(q=>({id:q.id,name:q.name,hint:q.hint}));
  const npcs=nearby.map(n=>({...n,...questLocation(QUESTS.find(q=>q.id===n.id))}));
  return {area:mapLabel(),character:c?`${c.name} · Lv ${c.level}${desktopGameRunning?' · game running':''}`:'No save connected',readiness:currentReadiness(),role:profile().playMode==='single'?'Single Player':profile().role==='host'?'Story Host':'Joiner',dialogue,hotkey:desktopSettings?.overlayHotkey,mapHotkey:desktopSettings?.mapOverlayHotkey,mapTarget:overlayMapTarget,npcs,warnings:warnings.slice(0,3),suggestions:sessionIdeas()};
}
function syncOverlay(){if(window.guidanceDesktop?.isDesktop&&profile().character)void window.guidanceDesktop.setOverlayPayload(overlayPayload())}

function render(){renderProfiles();renderHome();renderTransitionWarnings();renderForgeSupply();renderMap();renderQuests();renderChecks();renderSession();renderMendingPaths();renderLedger();renderKnowledgeSearch();renderStory();renderDesktop();renderJourneys();syncOverlay();void renderCloud()}
function activateView(id){$$('.tab,.view').forEach(x=>x.classList.remove('active'));const tab=$(`.tab[data-view="${id}"]`);if(tab)tab.classList.add('active');$(`#${id}`)?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}

function renderProfiles(){
  $('#profileSelect').innerHTML=state.profiles.map((p,i)=>`<option value="${i}" ${i===state.active?'selected':''}>${esc(p.name)}</option>`).join('');
  $('#spoilerSelect').value=profile().spoiler;
  $('#profileCards').innerHTML=state.profiles.map((p,i)=>`<article class="panel profile-card"><p class="eyebrow">${esc(p.mode.toUpperCase())} VIEW · ${p.playMode==='single'?'SINGLE PLAYER':p.role==='host'?'STORY HOST':'JOINER'}</p><input type="text" data-profile-name="${i}" value="${esc(p.name)}" aria-label="Profile ${i+1} name"><select data-profile-mode="${i}" aria-label="Profile ${i+1} guidance mode"><option ${p.mode==='Explorer'?'selected':''}>Explorer</option><option ${p.mode==='Guide'?'selected':''}>Guide</option></select><select data-profile-play="${i}" aria-label="Profile ${i+1} play mode"><option value="single" ${p.playMode==='single'?'selected':''}>Single Player</option><option value="seamless" ${p.playMode==='seamless'?'selected':''}>Seamless Co-op</option></select>${p.playMode==='seamless'?`<select data-profile-role="${i}" aria-label="Profile ${i+1} co-op role"><option value="host" ${p.role==='host'?'selected':''}>Story Host</option><option value="joiner" ${p.role==='joiner'?'selected':''}>Joiner</option></select>`:''}<p class="meta">${p.character?`${esc(p.character.name)} · Lv ${p.character.level}`:'No save character connected'}</p><p>${p.mode==='Explorer'?'Minimal spoilers and a small decision set.':'Clearer progression context for helping without backseat-driving.'}</p></article>`).join('');
}
function renderJourneys(){
  const panel=$('#journeyPanel');if(!panel)return;const desktop=Boolean(window.guidanceDesktop?.isDesktop);panel.classList.toggle('hidden',!desktop);if(!desktop)return;
  const select=$('#journeySelect');if(select)select.innerHTML=journeyList.map(j=>`<option value="${esc(j.id)}" ${j.id===activeJourneyId?'selected':''}>${esc(j.name)} · ${j.playMode==='single'?'Single Player':'Seamless'}</option>`).join('')||'<option>No journeys yet</option>';
  const current=journeyList.find(j=>j.id===activeJourneyId);$('#journeyStatus').textContent=current?`Current: ${current.name} · ${current.playMode==='single'?'Single Player':'Seamless Co-op'} · saved ${new Date(current.updatedAt).toLocaleString()}`:'Choose or create a companion journey.';
}
async function refreshJourneys(){if(!window.guidanceDesktop?.isDesktop)return [];journeyList=await window.guidanceDesktop.listJourneys();renderJourneys();return journeyList;}
async function loadJourney(id){if(!window.guidanceDesktop?.isDesktop||!id)return;const journey=await window.guidanceDesktop.loadJourney(id);suppressJourneySave=true;state=sanitizeState(journey.state);activeJourneyId=journey.id;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));suppressJourneySave=false;desktopSettings=await window.guidanceDesktop.setSettings({activeJourneyId:journey.id,playMode:journey.playMode});profile().playMode=journey.playMode;profile().role=desktopSettings.multiplayerRole;await refreshJourneys();render();await window.guidanceDesktop.readSave().catch(()=>{});}
async function createJourney(playMode){const starter=defaultState();for(const p of starter.profiles)p.playMode=playMode;const name=playMode==='single'?'Single Player Journey':'Seamless Co-op Journey',journey=await window.guidanceDesktop.createJourney({name,playMode,state:starter});await refreshJourneys();await loadJourney(journey.id);$('#journeyDialog')?.close();return journey;}
async function chooseJourneyOnLaunch(){if(!window.guidanceDesktop?.isDesktop)return;await refreshJourneys();if(!journeyList.length){const migrated=await window.guidanceDesktop.createJourney({name:profile().playMode==='single'?'Single Player Journey':'Seamless Co-op Journey',playMode:profile().playMode,state});journeyList=await window.guidanceDesktop.listJourneys();activeJourneyId=migrated.id;}
  const dialog=$('#journeyDialog'),choices=$('#journeyChoices');if(!dialog||!choices){await loadJourney(desktopSettings?.activeJourneyId||journeyList[0]?.id);return}
  choices.innerHTML=journeyList.map(j=>`<button type="button" class="character-choice" data-journey-id="${esc(j.id)}"><strong>${esc(j.name)}</strong><span>${j.playMode==='single'?'Single Player':'Seamless Co-op'} · ${new Date(j.updatedAt).toLocaleDateString()}</span></button>`).join('');await new Promise(resolve=>{journeyDialogResolve=resolve;dialog.showModal()});
}

function renderHome(){
  const p=profile(),s=stage(),c=p.character,f=flags();
  $('#heroTitle').textContent=c?s.title:'You’re doing fine.';
  $('#heroSummary').textContent=c?s.summary:'Connect an Elden Ring save and I’ll keep the guidance intentionally light.';
  $('#areaChip').textContent=c?`Current guidance: ${s.area}`:'No save connected';
  $('#characterName').textContent=c?.name??'Not selected';
  $('#characterMeta').textContent=c?`Level ${c.level} · ${formatPlaytime(c.secondsPlayed)}${c.mapName?` · ${c.mapName}`:''}${Number.isInteger(c.scaduLevel)&&f.dlcEntry?` · Scadutree ${c.scaduLevel}`:''}`:'Choose a save file to begin';
  $('#syncTitle').textContent=p.lastSync?`Updated ${new Date(p.lastSync).toLocaleString()}`:'Waiting for a save';
  $('#saveButton').textContent=window.guidanceDesktop?.isDesktop?'Read save now':c?'Update progress':'Connect save';
  $('#syncText').textContent=c?(window.guidanceDesktop?.isDesktop?`Tracking ${c.name}. The desktop watcher re-reads the save when Elden Ring writes it; nothing is written back.`:`Tracking ${c.name}. The browser re-reads the file only when you request an update.`):'The file is read locally and is never modified or uploaded.';
  $('#branchGrid').innerHTML=BRANCHES.map(b=>`<button class="branch" data-branch="${b.id}"><span class="icon">${b.icon}</span><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></button>`).join('');
  const risk=progressRisk(f);$('#riskChip').textContent=risk.text;$('#riskChip').className=`chip ${risk.level}`;
  const old=$('#readinessHome');if(old)old.remove();
  if(c){const ready=currentReadiness(),boss=bossAhead(),rec=boss??areaRecommendation(),card=document.createElement('div'),name=boss&&p.spoiler==='full'?`Major challenge ahead: ${boss.name}`:boss?'Major challenge ahead':'Area readiness',insight=boss?bossInsight(boss.name):null;card.id='readinessHome';card.className=`readiness-card ${ready.state}`;card.innerHTML=`<strong>${esc(name)}</strong><span>${esc(ready.text)}${rec?.note?` · ${esc(rec.note)}`:''}</span>${insight?`<details class="tarnished-insight"><summary>Tarnished insight</summary><p><b>Weakness:</b> ${esc(insight.weakness)}</p><p><b>Field note:</b> ${esc(insight.tip)}</p><p><b>If you want an edge:</b> ${esc(insight.exploit)}</p></details>`:''}`;$('.character-card').append(card)}
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
  const items=[...recent,...current].slice(0,2);
  panel.classList.toggle('hidden',items.length===0);
  if(!items.length)return;
  $('#transitionWarnings').innerHTML=items.map(({r,aftermath})=>{
    const links=(r.questIds??[]).map(id=>QUESTS.find(q=>q.id===id)).filter(q=>q&&questRelevant(q)).map(q=>`<span class="warning-actions"><button class="text-button" data-open-quest="${q.id}">${esc(q.name)} →</button><button class="text-button" data-locate-quest="${q.id}">Where? ⟡</button></span>`).join('');
    return `<article class="transition-warning ${r.level}"><p class="eyebrow">${aftermath?'JUST CHANGED':'BEFORE YOU MOVE ON'}</p><h2>${esc(aftermath?r.aftermathTitle??r.title:r.title)}</h2><p>${esc(riskText(r,aftermath))}</p>${links?`<div class="transition-links">${links}</div>`:''}</article>`;
  }).join('');
}

function renderForgeSupply(){
  const panel=$('#forgePanel');if(!panel)return;const reachable=reachableForgeSupply(flags());panel.classList.toggle('hidden',!profile().character||reachable.length===0);if(!profile().character||!reachable.length)return;
  $('#forgeSummary').textContent=`${reachable.length} permanent upgrade-material source${reachable.length===1?' is':'s are'} now reachable. Exact locations stay hidden until you ask.`;
  $('#forgeReachable').innerHTML=reachable.slice(0,3).map(item=>`<article class="forge-source"><strong>${profile().spoiler==='full'?esc(item.name):item.family==='somber'?'Somber forge supply available':'Forge supply available'}</strong><span>${esc(item.clue)}</span><button class="text-button" data-forge-reveal="${item.id}">Show me where →</button></article>`).join('');
}

function recommendation(){
  const candidates=QUESTS.filter(q=>!isComplete(q)&&questRelevant(q)).sort((a,b)=>endingPriority(b.id,profile().endingTarget)-endingPriority(a.id,profile().endingTarget)||Number(b.priority==='major')-Number(a.priority==='major')||activeEvidence(b).length-activeEvidence(a).length);
  return candidates[0]??QUESTS.find(q=>!isComplete(q))??null;
}
function sessionIdeas(){
  const s=stage(),q=recommendation(),f=flags(),budget=profile().sessionMinutes??90;
  const options=[
    {title:`Wander ${s.area}`,minutes:45,text:'Pick one interesting landmark and let the new player choose the route. Stop after one satisfying discovery rather than clearing a whole region.'},
    {title:profile().spoiler==='low'&&!hasStarted(q??{})?'Follow an NPC thread':q?`Check on ${q.name}`:'Follow an NPC thread',minutes:30,text:q?.hint??'Talk to people you have already met and follow one thread until it naturally goes quiet.'},
    {title:'Advance the main thread',minutes:60,text:s.hints[0]??'Follow the strongest visual or grace-guided direction when everyone wants story progress.'},
    {title:'Clear a compact side activity',minutes:25,text:'Pick one nearby cave, catacomb, evergaol, or field encounter and call the session after the reward.'},
  ];
  if(f.fireGiant||f.erdtreeFire)options[2]={title:'Cleanup night',minutes:60,text:'Revisit unfinished NPC threads and optional regions before another major story push.'};
  const fitting=options.filter(option=>option.minutes<=budget).slice(0,3);return (fitting.length?fitting:options.slice(-1)).map(option=>({...option,time:`~${option.minutes} min`}));
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
  const shadow=mapLayer==='shadow';
  $('#mapCanvas').classList.toggle('shadow-layer',shadow);
  $('#worldMap').src=shadow?'':safeUrl(MAP_IMAGE.url); $('#mapCredit').textContent=shadow?'Offline schematic of discovered Realm of Shadow regions. No external map asset is required.':`${MAP_IMAGE.credit} The app remains usable offline if the optional image is unavailable.`;
  $$('[data-map-layer]').forEach(button=>button.classList.toggle('active',button.dataset.mapLayer===mapLayer));
  $('#mapPins').innerHTML=REGIONS.filter(r=>!r.hiddenOnMap&&(shadow?(r.mapLayer==='shadow'):r.mapLayer!=='shadow')).filter(r=>profile().showAll||profile().spoiler!=='low'||regionReached(r)).map(r=>{const reached=regionReached(r),name=reached||profile().spoiler==='full'||profile().showAll?r.name:'Undiscovered';return `<button class="map-pin ${reached?'reached':'unknown'}" style="left:${r.x}%;top:${r.y}%" data-region="${r.id}" aria-label="${esc(name)}: ${reached?'reached':'not confirmed'}">${reached?'✓':'?'}<span>${esc(name)}</span></button>`}).join('');
}
function inspectRegion(id){
  const r=REGIONS.find(x=>x.id===id);if(!r)return;const reached=regionReached(r),qs=QUESTS.filter(q=>q.regions.includes(id)&&(profile().mode==='Guide'||questRelevant(q)||hasStarted(q)));
  const missing=QUESTS.flatMap(q=>relevantItemClues(q).filter(item=>item.region===id&&!itemState(item.key))).filter((item,i,list)=>list.findIndex(x=>x.key===item.key)===i).slice(0,5);
  const focus=mapFocus&&(mapFocus.region===id||mapRegionForName(`${mapFocus.regionName??''} ${mapFocus.location??''}`)===id)?`<article class="map-focus"><p class="eyebrow">PINNED GUIDANCE</p><h3>${esc(mapFocus.name??'Target')}</h3><p>${esc(mapFocus.location??'')}</p>${mapFocus.hint?`<p>${esc(mapFocus.hint)}</p>`:''}<button class="text-button desktop-only ${window.guidanceDesktop?.isDesktop?'':'hidden'}" data-pin-overlay>Show in overlay →</button></article>`:'';
  $('#mapInspector').innerHTML=`${focus}<p class="eyebrow">${reached?'SAVE EVIDENCE: REACHED':'NOT CONFIRMED BY TRACKED FLAGS'}</p><h2>${esc(r.name)}</h2><p>${esc(r.clue)}</p><p>${reached?'The save gives us evidence you have reached this broad region. It does not mean every cave, grace, boss, or NPC here is complete.':'Keep this muted until natural exploration or stronger save evidence reaches it.'}</p>${missing.length?`<div class="evidence-box"><strong>QUEST ITEMS TO LOOK FOR</strong>${missing.map(item=>`<p>◇ ${esc(item.name)} — ${esc(item.clue)}</p>`).join('')}</div>`:''}<div>${qs.slice(0,6).map(q=>`<div class="map-quest"><strong>${profile().spoiler==='low'&&!hasStarted(q)?'Possible NPC thread':esc(q.name)}</strong><br><small>${questDone(q).size}/${q.steps.length} manually confirmed</small><br><button class="text-button" data-open-quest="${q.id}">Open thread →</button> <button class="text-button" data-locate-quest="${q.id}">Current location →</button></div>`).join('')}</div>`;
}

function stepCopy(step){
  if(profile().spoiler==='full')return `<strong>${esc(step.label)}</strong><small>${esc(step.area)}</small><p>${esc(step.detail)}</p>`;
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
  if(!profile().showAll&&profile().character&&(profile().mode==='Explorer'||relevantOnly))filtered=filtered.filter(q=>questRelevant(q)||hasStarted(q));
  filtered.sort((a,b)=>endingPriority(b.id,profile().endingTarget)-endingPriority(a.id,profile().endingTarget)||Number(b.priority==='major')-Number(a.priority==='major')||activeEvidence(b).length-activeEvidence(a).length);
  $('#questList').innerHTML=filtered.map(q=>{
    const done=questDone(q),pct=Math.round(done.size/q.steps.length*100),evidence=activeEvidence(q),relevant=questRelevant(q);
    const portrait=q.image?`<div class="quest-portrait"><img data-npc-image data-initials="${esc(q.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}" src="${safeUrl(q.image.src)}" alt="${esc(q.name)}" loading="lazy" referrerpolicy="no-referrer"><a href="${safeUrl(q.image.source)}" target="_blank" rel="noreferrer">${esc(q.image.credit)}</a></div>`:'';
    const confidence=evidenceConfidence(profile().role,evidence.some(([key])=>/Rune|Grace|grace|Defeated/i.test(key))?'grace':'world',profile().playMode);
    const evidenceBox=evidence.length?`<div class="evidence-box"><strong>SAVE EVIDENCE · ${esc(confidence.toUpperCase())}</strong>${evidence.map(([,text])=>`<p>✓ ${esc(text)}</p>`).join('')}<p>${esc(profile().playMode==='single'?'Single Player evidence belongs to this character, but conversations still require manual confirmation.':profile().role==='joiner'?'Joiner mode treats shared world flags cautiously. Let the Story Host initiate important NPC dialogue first.':'Story Host mode treats world-state flags as strong evidence, but conversations still require manual confirmation.')}</p></div>`:'';
    const itemClues=relevantItemClues(q);
    const itemBox=itemClues.length?`<div class="item-clues">${itemClues.map(item=>`<div class="item-clue ${itemState(item.key)?'have':''}"><span class="item-state">${itemState(item.key)?'✓':'◇'}</span><div><strong>${esc(item.name)}</strong><p>${itemState(item.key)?'Detected in this character’s save.':esc(item.clue)}</p></div>${!itemState(item.key)?`<button class="text-button" data-region-jump="${esc(item.region)}">Map →</button>`:''}</div>`).join('')}</div>`:'';
    return `<details class="quest" data-quest-card="${q.id}"><summary><div class="quest-title">${q.image?`<img class="npc-thumb" data-npc-image data-initials="${esc(q.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}" src="${safeUrl(q.image.src)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span class="npc-fallback">${esc(q.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</span>`}<span class="progress-ring">${pct}%</span><div><h3>${esc(q.name)}</h3><div class="area">${esc(q.area)} · ${done.size}/${q.steps.length}</div><div class="quest-badges">${endingPriority(q.id,profile().endingTarget)?'<span class="badge ending">Mending Path</span>':''}${q.priority==='major'?'<span class="badge">major thread</span>':''}${evidence.length?`<span class="badge evidence">${evidence.length} save clue${evidence.length===1?'':'s'}</span>`:''}${!relevant&&profile().character?'<span class="badge">not current yet</span>':''}</div></div></div><span>＋</span></summary><div class="quest-body ${q.image?'with-image':''}">${portrait}<div><p class="quest-hint">Spoiler-light clue: ${esc(q.hint)}</p>${questHistory(q,done,evidence)}${evidenceBox}${itemBox}${visibleSteps(q,done).map(({step,i,veiled})=>veiled?`<div class="step veiled-step"><span class="veil-mark">✦</span><span><strong>Veiled by grace</strong><small>Future checkpoint hidden until this story advances.</small></span></div>`:`<label class="step"><input type="checkbox" data-quest="${q.id}" data-step="${i}" ${done.has(i)?'checked':''}><span class="step-copy">${stepCopy(step)}</span></label>`).join('')}</div></div></details>`;
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
  const questState=id=>{const q=QUESTS.find(x=>x.id===id);return !q?'unseen':isComplete(q)?'complete':hasStarted(q)||questRelevant(q)?'started':'unseen'};
  view.innerHTML=`<div class="section-heading page-heading"><div><p class="eyebrow">MENDING PATHS</p><h1>Choose a direction, not a commitment</h1></div><p>Most ending prerequisites can coexist in one playthrough, and the final choice is made at the end. The Frenzied Flame is the major exception: while active it overrides the others unless removed with Miquella’s Needle.</p></div>${warning?`<article class="transition-warning danger"><p class="eyebrow">PATH WARNING</p><h2>${esc(warning.title)}</h2><p>${esc(warning.text)}</p></article>`:''}<div class="ending-grid">${ENDING_PATHS.map(path=>{const status=pathStatus(path,flags(),questState),selected=target===path.id;if(status.state==='hidden'&&!profile().showAll)return `<div class="ending-card veiled-ending"><span class="veil-mark">✦</span><p class="eyebrow">VEILED BY GRACE</p><h2>Unrevealed path</h2><p>Keep exploring. Guidance of Grace will reveal this possibility when your character has actually encountered its thread.</p></div>`;return `<button class="ending-card ${selected?'selected':''} ${status.state}" data-ending="${path.id}"><span class="eyebrow">${esc(status.state.toUpperCase())}</span><h2>${esc(path.name)}</h2><strong>${esc(path.subtitle)}</strong><p>${esc(path.description)}</p><small>${esc(status.text)}</small></button>`}).join('')}</div><p class="muted-copy">Selecting a path only changes Guidance of Grace priorities and warnings. It never changes the game or your save.</p>`;
}

function renderLedger(){
  const root=$('#ledgerList');if(!root)return;
  const stats=$('#ledgerStats'),detected=new Set(profile().character?.eventIds??[]),manual=profile().ledger??{},locations=ENCOUNTER_LOCATIONS;
  if(stats){const done=GENERATED_BOSSES.filter(b=>detected.has(b.flagId)||manual[String(b.flagId)]).length,dungeons=locations.filter(x=>x.type==='dungeon').length,evergaols=locations.filter(x=>x.type==='evergaol').length,legacy=locations.filter(x=>x.type==='legacy').length;stats.innerHTML=`<span class="chip">${done}/${GENERATED_BOSSES.length} encounters</span><span class="chip">${dungeons} boss-bearing dungeons/gaols</span><span class="chip">${evergaols} evergaols</span><span class="chip">${legacy} legacy locations</span><span class="chip">${GENERATED_BOSSES.filter(b=>b.dlc).length} DLC encounters</span>`}
  if(!GENERATED_BOSSES.length){root.innerHTML='<article class="panel quiet"><h2>Encounter catalog unavailable</h2><p>The bundled catalog did not load. Use the knowledge updater or reinstall the application.</p></article>';return}
  const groups=GENERATED_BOSSES.reduce((out,boss)=>((out[boss.region]??=[]).push(boss),out),{});
  root.innerHTML=`<details class="ledger-region ledger-location-index"><summary>Boss-bearing locations <span>${locations.length}</span></summary>${locations.map(loc=>`<div class="ledger-row location-row"><span class="location-mark">⌖</span><span><strong>${esc(loc.name)}</strong><small>${esc(loc.region)} · ${esc(loc.type)} · ${loc.encounters.length} encounter${loc.encounters.length===1?'':'s'}</small><span class="location-enemies">${esc(loc.encounters.join(' · '))}</span></span></div>`).join('')}</details>`+Object.entries(groups).map(([region,bosses])=>{const done=bosses.filter(b=>detected.has(b.flagId)||manual[String(b.flagId)]).length;return `<details class="ledger-region"><summary>${esc(region)} <span>${done}/${bosses.length}</span></summary>${bosses.map(boss=>{const checked=detected.has(boss.flagId)||manual[String(boss.flagId)],auto=detected.has(boss.flagId),kind=classifyBossLocation(boss.place,boss.region),insight=bossInsight(boss.name);return `<div class="ledger-row"><input type="checkbox" data-ledger="${boss.flagId}" aria-label="Mark ${esc(boss.name)} complete" ${checked?'checked':''} ${auto?'disabled':''}><span><strong>${esc(boss.name)}</strong><small>${esc(boss.place||kind)} · ${esc(kind)}${boss.dlc?' · Shadow of the Erdtree':''}${auto?' · save confirmed':''}</small>${insight?`<details class="ledger-insight"><summary>Whisper of Grace</summary><p><b>Weakness:</b> ${esc(insight.weakness)}</p><p><b>Field note:</b> ${esc(insight.tip)}</p><p><b>If you want an edge:</b> ${esc(insight.exploit)}</p></details>`:''}</span></div>`}).join('')}</details>`}).join('');
}

function renderKnowledgeSearch(){
  const input=$('#knowledgeSearch'),root=$('#knowledgeResults'),toggle=$('#showAllKnowledge'),count=$('#searchCount');if(!input||!root)return;
  if(toggle)toggle.checked=profile().showAll;
  const query=input.value.trim(),all=[...KNOWLEDGE_INDEX,...supplementalKnowledge],matches=searchKnowledge(all,query,{limit:160}).filter(knowledgeVisible);
  if(count)count.textContent=`${matches.length}${matches.length===160?'+':''} result${matches.length===1?'':'s'}`;
  const typeLabel={encounter:'Encounter',location:'Location',quest:'NPC thread',forge:'Forge Supply',story:'Book of Knowledge',glossary:'Glossary',item:'Quest item','boss-detail':'Boss detail'};
  root.innerHTML=matches.map(item=>{const region=mapRegionForName(`${item.region??''} ${item.location??''}`),canMap=Boolean(region||item.type==='quest'||item.type==='forge'),rewards=(item.rewards??[]).filter(Boolean);let actions='';if(item.type==='quest')actions=`<button class="text-button" data-open-quest="${esc(item.questId)}">Open thread →</button><button class="text-button" data-locate-quest="${esc(item.questId)}">Where now? ⟡</button>`;else if(item.type==='forge')actions=`<button class="text-button" data-forge-reveal="${esc(item.forgeId)}">Reveal location →</button>`;else if(item.type==='story'||item.type==='glossary')actions='<button class="text-button" data-view="story">Open Books of Knowledge →</button>';else if(canMap)actions=`<button class="text-button" data-locate-record="${esc(item.id)}">Show on map →</button>`;return `<article class="panel knowledge-result" data-knowledge-id="${esc(item.id)}"><p class="eyebrow">${esc(typeLabel[item.type]??item.type)}</p><h2>${esc(item.title)}</h2>${item.subtitle?`<strong>${esc(item.subtitle)}</strong>`:''}${item.region||item.location?`<p class="meta">${esc([item.region,item.location].filter(Boolean).join(' · '))}</p>`:''}${item.description?`<p>${esc(item.description)}</p>`:''}${item.enemies?.length?`<p><b>Encounter:</b> ${esc(item.enemies.join(', '))}</p>`:''}${rewards.length?`<p><b>Rewards / drops:</b> ${esc(rewards.join(', '))}</p>`:''}<div class="button-row">${actions}</div></article>`}).join('')||'<article class="panel quiet"><h2>No matching records</h2><p>Try a boss, NPC, dungeon type, upgrade stone, bell bearing, item or region. Enable Show all to search undiscovered content deliberately.</p></article>';
}
function locateKnowledgeRecord(id){const item=[...KNOWLEDGE_INDEX,...supplementalKnowledge].find(x=>x.id===id);if(!item)return;locateTarget({name:item.title,location:item.location||item.region,region:mapRegionForName(`${item.region??''} ${item.location??''}`),regionName:item.region,hint:item.description});}
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

function renderKnowledgeStatus(status){const el=$('#knowledgeStatus');if(!el)return;if(!status){el.textContent=`Bundled offline snapshot: ${GENERATED_BOSSES_SNAPSHOT.count} encounters verified ${GENERATED_BOSSES_SNAPSHOT.verified}.`;return}const ok=(status.sources??[]).filter(x=>x.state==='updated'),bad=(status.sources??[]).filter(x=>x.state==='error');el.textContent=`Knowledge checked ${status.lastChecked?new Date(status.lastChecked).toLocaleString():'never'} · ${ok.length} source${ok.length===1?'':'s'} refreshed${bad.length?` · ${bad.length} unavailable (bundled data remains active)`:''}.`;}

function renderDesktop(){
  const isDesktop=Boolean(window.guidanceDesktop?.isDesktop);$$('.desktop-only').forEach(el=>el.classList.toggle('hidden',!isDesktop));if(!isDesktop||!desktopSettings)return;
  const set=(id,value,property='checked')=>{const el=$(id);if(el)el[property]=value};
  set('#desktopPlayMode',desktopSettings.playMode,'value');set('#desktopRole',desktopSettings.multiplayerRole,'value');set('#overlayHotkey',desktopSettings.overlayHotkey,'value');set('#mapOverlayHotkey',desktopSettings.mapOverlayHotkey,'value');
  for(const key of ['overlayEnabled','autoShowWarnings','autoShowAreaNpcs','wakeWithGame','closeAfterGame','keepRunningInBackground','startWithWindows','checkForUpdates','autoDownloadUpdates','knowledgeAutoUpdate'])set(`#${key}`,Boolean(desktopSettings[key]));
  $('#desktopRoleWrap').classList.toggle('hidden',desktopSettings.playMode==='single');$('#roleExplanation').textContent=roleNote(desktopSettings.multiplayerRole,desktopSettings.playMode);
  profile().playMode=desktopSettings.playMode;profile().role=desktopSettings.multiplayerRole;saveState();
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
function chooseCharacter(slot){
  const c=pendingSave?.slots.find(s=>s.slot===slot);if(!c)return;applyCharacter(c);if($('#characterDialog').open)$('#characterDialog').close();
}
async function pickOrUpdateSave(){
  try{if(window.guidanceDesktop?.isDesktop)return window.guidanceDesktop.readSave();let handle=saveHandles[state.active];if(!handle&&window.showOpenFilePicker){[handle]=await window.showOpenFilePicker({types:[{description:'Elden Ring save',accept:{'application/octet-stream':['.co2','.sl2']}}]});saveHandles[state.active]=handle}if(handle)return handleSave(await handle.getFile());$('#saveInput').click()}catch(error){if(error.name!=='AbortError')alert(`Could not open the save: ${error.message}`)}
}

function exportTracker(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='guidance-of-grace-tracker.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function importTracker(file){
  try{const parsed=JSON.parse(await file.text());if(!parsed||!Array.isArray(parsed.profiles))throw new Error('This does not look like a Guidance of Grace export.');state=sanitizeState(parsed);saveState();render()}catch(error){alert(`Could not import tracker: ${error.message}`)}
}

function cloudMessage(text,error=false){const el=$('#cloudMessage');el.textContent=text;el.style.color=error?'var(--danger)':'var(--gold2)'}
async function renderCloud(){
  const status=cloudStatus();$('#cloudHeading').textContent=status.configured?(status.signedIn?'Shared campaign':'Sign in to share progress'):'Cloud sync is ready to configure';
  $('#cloudStatusText').textContent=status.configured?'Only derived tracker progress is synced. The .co2 file stays on this computer.':'The SQL schema and client are included. Work only needs to attach a Supabase project and deployment.';
  $('#cloudAuth').classList.toggle('hidden',!status.configured||status.signedIn);$('#cloudControls').classList.toggle('hidden',!status.configured||!status.signedIn);
  $('#sendMagicLink').disabled=!status.configured;
  if(!status.configured)return;
  if(!status.signedIn)return;
  try{
    const user=await loadUser();$('#cloudUser').textContent=user?.email??'signed-in user';const campaigns=await listCampaigns();
    const selected=cloudStatus().campaignId;$('#campaignSelect').innerHTML='<option value="">Choose a campaign</option>'+campaigns.map(r=>`<option value="${esc(r.campaign_id)}" ${r.campaign_id===selected?'selected':''}>${esc(r.campaigns?.name??'Campaign')} · ${esc(r.role)}</option>`).join('');
    if(selected){remoteStates=await fetchCampaign(selected);renderRemoteProfiles()}else $('#remoteProfiles').innerHTML='';
  }catch(error){cloudMessage(error.message,true)}
}
function renderRemoteProfiles(){
  $('#remoteProfiles').innerHTML=remoteStates.length?remoteStates.map(r=>{const p=r.profile??{},c=p.character;return `<article class="remote-card"><strong>${esc(r.display_name||p.name||'Tarnished')} · ${esc(r.role||'member')}</strong><span>${c?`${esc(c.name)} · Lv ${c.level} · ${esc(getStage(c.flags??{}).area)}`:'No synced save character'} · updated ${r.updated_at?new Date(r.updated_at).toLocaleString():'unknown'}</span></article>`}).join(''):'<p>No member has synced a profile yet.</p>';
}

$('#profileSelect').addEventListener('change',e=>{state.active=Number(e.target.value);saveState();render()});
$('#spoilerSelect').addEventListener('change',e=>{profile().spoiler=e.target.value;saveState();renderQuests();renderMap()});
$('#saveButton').addEventListener('click',pickOrUpdateSave);$('#syncAgain').addEventListener('click',pickOrUpdateSave);
$('#saveInput').addEventListener('change',e=>{if(e.target.files[0])handleSave(e.target.files[0]);e.target.value=''});
$('#closeGuidance').addEventListener('click',()=>$('#guidancePanel').classList.add('hidden'));
$('#questSearch').addEventListener('input',renderQuests);$('#unfinishedOnly').addEventListener('change',renderQuests);$('#relevantOnly').addEventListener('change',renderQuests);
$('#glossarySearch').addEventListener('input',renderGlossary);
$('#sessionTime').addEventListener('change',e=>{profile().sessionMinutes=Number(e.target.value)||90;saveState();renderSession();syncOverlay()});
$('#exportState').addEventListener('click',exportTracker);$('#importStateButton').addEventListener('click',()=>$('#importStateInput').click());$('#importStateInput').addEventListener('change',e=>{if(e.target.files[0])importTracker(e.target.files[0]);e.target.value=''});
$('#sendMagicLink').addEventListener('click',async()=>{try{const email=$('#cloudEmail').value.trim();if(!email)throw new Error('Enter an email address.');await sendMagicLink(email);cloudMessage('Sign-in link sent. Open it in this browser.')}catch(e){cloudMessage(e.message,true)}});
$('#cloudSignOut').addEventListener('click',async()=>{await signOut();remoteStates=[];renderCloud()});
$('#createCampaign').addEventListener('click',async()=>{try{const name=$('#campaignName').value.trim();if(!name)throw new Error('Name the campaign first.');await createCampaign(name,profile().name,profile().mode==='Explorer'?'explorer':'guide');cloudMessage('Campaign created.');await renderCloud()}catch(e){cloudMessage(e.message,true)}});
$('#joinCampaign').addEventListener('click',async()=>{try{const code=$('#inviteCode').value.trim();if(!code)throw new Error('Enter an invite code.');await joinCampaign(code,profile().name,profile().mode==='Explorer'?'explorer':'guide');cloudMessage('Campaign joined.');await renderCloud()}catch(e){cloudMessage(e.message,true)}});
$('#campaignSelect').addEventListener('change',e=>{setCampaign(e.target.value);void renderCloud()});
$('#pushCloud').addEventListener('click',async()=>{try{await pushProfile(profile());cloudMessage('Your derived profile is synced.');await renderCloud()}catch(e){cloudMessage(e.message,true)}});$('#refreshCloud').addEventListener('click',()=>renderCloud());

document.addEventListener('click',e=>{
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
  if(e.target.closest('[data-pin-overlay]')){if(window.guidanceDesktop?.isDesktop){syncOverlay();void window.guidanceDesktop.toggleOverlay('map')}return}
  const journey=e.target.closest('[data-journey-id]');if(journey){awaitJourneyLoad(journey.dataset.journeyId);return}
  const q=e.target.closest('[data-open-quest]');if(q){openQuest(q.dataset.openQuest)}
});
document.addEventListener('error',e=>{const img=e.target.closest?.('img[data-npc-image]');if(!img)return;const fallback=document.createElement('span');fallback.className=img.classList.contains('npc-thumb')?'npc-fallback':'npc-fallback portrait-fallback';fallback.textContent=img.dataset.initials||'?';img.replaceWith(fallback)},true);
document.addEventListener('change',e=>{
  if(e.target.matches('[data-ledger]')){profile().ledger[e.target.dataset.ledger]=e.target.checked;if(!e.target.checked)delete profile().ledger[e.target.dataset.ledger];saveState();renderLedger();return}
  if(e.target.matches('[data-quest]')){const id=e.target.dataset.quest,step=Number(e.target.dataset.step),set=new Set(profile().quest[id]??[]);e.target.checked?set.add(step):set.delete(step);profile().quest[id]=[...set].sort((a,b)=>a-b);saveState();renderQuests();renderChecks();return}
  if(e.target.matches('[data-profile-name]')){const i=Number(e.target.dataset.profileName);state.profiles[i].name=e.target.value.trim()||`Profile ${i+1}`;saveState();renderProfiles();return}
  if(e.target.matches('[data-profile-mode]')){const i=Number(e.target.dataset.profileMode),mode=e.target.value;state.profiles[i].mode=MODES.has(mode)?mode:state.profiles[i].mode;saveState();renderProfiles();return}
  if(e.target.matches('[data-profile-play]')){const i=Number(e.target.dataset.profilePlay);state.profiles[i].playMode=e.target.value==='single'?'single':'seamless';saveState();renderProfiles();return}
  if(e.target.matches('[data-profile-role]')){const i=Number(e.target.dataset.profileRole);state.profiles[i].role=e.target.value==='host'?'host':'joiner';saveState();renderProfiles()}
});

async function awaitJourneyLoad(id){try{await loadJourney(id);$('#journeyDialog')?.close();journeyDialogResolve?.();journeyDialogResolve=null}catch(error){alert(error.message)}}

function openQuest(id){activateView('quests');$('#questSearch').value='';renderQuests();requestAnimationFrame(()=>{const card=$(`[data-quest-card="${CSS.escape(id)}"]`);if(card){card.open=true;card.scrollIntoView({behavior:'smooth',block:'start'})}})}

async function updateDesktopSettings(patch){
  if(!window.guidanceDesktop?.isDesktop)return;
  desktopSettings=await window.guidanceDesktop.setSettings(patch);profile().playMode=desktopSettings.playMode;profile().role=desktopSettings.multiplayerRole;saveState();renderDesktop();syncOverlay();
}

async function initDesktop(){
  if(!window.guidanceDesktop?.isDesktop)return;
  desktopSettings=await window.guidanceDesktop.getSettings();
  await chooseJourneyOnLaunch();
  desktopSettings=await window.guidanceDesktop.getSettings();profile().playMode=desktopSettings.playMode;profile().role=desktopSettings.multiplayerRole;saveState();
  const games=await window.guidanceDesktop.discoverGames().catch(()=>({}));
  supplementalKnowledge=await window.guidanceDesktop.knowledgeCatalog().catch(()=>[]);
  renderKnowledgeStatus(await window.guidanceDesktop.knowledgeStatus().catch(()=>null));
  window.guidanceDesktop.onKnowledge(status=>{renderKnowledgeStatus(status);void window.guidanceDesktop.knowledgeCatalog().then(items=>{supplementalKnowledge=items;renderKnowledgeSearch()})});
  $('#gamePathStatus').textContent=games?.gameDir?`Detected: ${games.gameDir}${games.seamless?' · Seamless launcher found':' · Seamless launcher not auto-detected'}`:'Steam Elden Ring install was not auto-detected; you can still choose launchers manually in a later build or launch the game normally.';
  window.guidanceDesktop.onSave(payload=>{
    pendingSave={slots:payload.slots??[]};
    const selected=payload.selected??payload.slots?.[0];
    if(selected){if(Number.isInteger(desktopSettings?.selectedSlot)&&selected.slot!==desktopSettings.selectedSlot){const wanted=payload.slots.find(slot=>slot.slot===desktopSettings.selectedSlot);if(wanted)applyCharacter(wanted,{changedKeys:payload.diff?.changed??[]});else applyCharacter(selected,{changedKeys:payload.diff?.changed??[]})}else applyCharacter(selected,{changedKeys:payload.diff?.changed??[]})}
    renderDesktop();
  });
  window.guidanceDesktop.onGame(({running})=>{desktopGameRunning=Boolean(running);syncOverlay();$('#gamePathStatus').textContent=`${running?'Elden Ring is running.':'Elden Ring is not running.'} ${games?.gameDir?`Install: ${games.gameDir}`:''}`});
  window.guidanceDesktop.onUpdate(update=>{const text={checking:'Checking for updates…',available:`Version ${update.version} is available.`,current:'Guidance of Grace is up to date.',downloading:`Downloading… ${update.percent??0}%`,ready:`Version ${update.version} is ready to install.`,dev:'Update checks run after the app is packaged.',error:`Update error: ${update.message??'unknown error'}`}[update.state]??update.message??update.state;$('#updateStatus').textContent=text;$('#installUpdate').classList.toggle('hidden',update.state!=='ready')});
  window.guidanceDesktop.onOverlayAction(action=>{if(action?.type==='quest'){mainWindowFocus();openQuest(action.id)}else if(action?.type==='quest-map'){mainWindowFocus();locateQuest(action.id)}else if(action?.type==='map-target'){mainWindowFocus();if(overlayMapTarget)locateTarget(overlayMapTarget)}});
  await window.guidanceDesktop.readSave().catch(()=>{});render();
}
function mainWindowFocus(){void window.guidanceDesktop?.showMain()}

for(const [id,key] of [['#desktopPlayMode','playMode'],['#desktopRole','multiplayerRole'],['#overlayHotkey','overlayHotkey'],['#mapOverlayHotkey','mapOverlayHotkey']])$(id).addEventListener('change',e=>void updateDesktopSettings({[key]:e.target.value}));
for(const key of ['overlayEnabled','autoShowWarnings','autoShowAreaNpcs','wakeWithGame','closeAfterGame','keepRunningInBackground','startWithWindows','checkForUpdates','autoDownloadUpdates','knowledgeAutoUpdate'])$(`#${key}`).addEventListener('change',e=>void updateDesktopSettings({[key]:e.target.checked}));
$('#desktopSlot').addEventListener('change',e=>{const slot=Number(e.target.value);if(Number.isInteger(slot)){void updateDesktopSettings({selectedSlot:slot});const c=pendingSave?.slots?.find(x=>x.slot===slot);if(c)applyCharacter(c)}});
$('#scaduLevel').addEventListener('change',e=>{if(Number.isInteger(profile().character?.scaduLevel))return;const value=e.target.value===''?null:Number(e.target.value);profile().scaduLevel=Number.isInteger(value)&&value>=0&&value<=20?value:null;saveState();renderHome();renderStory();syncOverlay()});
$('#chooseDesktopSave').addEventListener('click',async()=>{const chosen=await window.guidanceDesktop?.chooseSave();if(chosen){desktopSettings=await window.guidanceDesktop.getSettings();renderDesktop()}});
$('#refreshDesktopSave').addEventListener('click',()=>window.guidanceDesktop?.readSave());
$('#previewOverlay').addEventListener('click',()=>window.guidanceDesktop?.toggleOverlay('guide'));
$('#previewMapOverlay').addEventListener('click',()=>window.guidanceDesktop?.toggleOverlay('map'));
$('#chooseSeamless').addEventListener('click',async()=>{if(window.guidanceDesktop){await window.guidanceDesktop.chooseGame('seamless');desktopSettings=await window.guidanceDesktop.getSettings();renderDesktop()}});
$('#chooseVanilla').addEventListener('click',async()=>{if(window.guidanceDesktop){await window.guidanceDesktop.chooseGame('vanilla');desktopSettings=await window.guidanceDesktop.getSettings();renderDesktop()}});
$('#launchSeamless').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.launchGame('seamless').catch(error=>alert(error.message))});
$('#launchVanilla').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.launchGame('vanilla').catch(error=>alert(error.message))});
$('#shortcutSeamless').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.createLauncherShortcut('seamless').then(path=>alert(`Created ${path}`)).catch(error=>alert(error.message))});
$('#shortcutVanilla').addEventListener('click',()=>{if(window.guidanceDesktop)window.guidanceDesktop.createLauncherShortcut('vanilla').then(path=>alert(`Created ${path}`)).catch(error=>alert(error.message))});
$('#checkUpdates').addEventListener('click',async()=>{const result=await window.guidanceDesktop?.checkUpdates();if(result?.state)$('#updateStatus').textContent=result.message??result.state});
$('#installUpdate').addEventListener('click',()=>window.guidanceDesktop?.installUpdate());
$('#checkKnowledge').addEventListener('click',async()=>{if(!window.guidanceDesktop)return;$('#knowledgeStatus').textContent='Refreshing licensed knowledge sources…';const status=await window.guidanceDesktop.updateKnowledge();supplementalKnowledge=await window.guidanceDesktop.knowledgeCatalog();renderKnowledgeSearch();renderKnowledgeStatus(status)});
$('#openGameMovies').addEventListener('click',()=>window.guidanceDesktop?.openGameMovies().catch(error=>alert(error.message)));
$('#importKnowledge').addEventListener('click',async()=>{const result=await window.guidanceDesktop?.importKnowledge();if(result){supplementalKnowledge=await window.guidanceDesktop.knowledgeCatalog();renderKnowledgeSearch();alert(`Imported ${result.records} searchable game-data records.`)}});
$('#journeySelect').addEventListener('change',e=>void awaitJourneyLoad(e.target.value));
$('#newSingleJourney').addEventListener('click',()=>void createJourney('single'));
$('#newSeamlessJourney').addEventListener('click',()=>void createJourney('seamless'));
$('#journeyCreateSingle').addEventListener('click',()=>void createJourney('single').then(()=>{journeyDialogResolve?.();journeyDialogResolve=null}));
$('#journeyCreateSeamless').addEventListener('click',()=>void createJourney('seamless').then(()=>{journeyDialogResolve?.();journeyDialogResolve=null}));
$('#importJourney').addEventListener('click',async()=>{const j=await window.guidanceDesktop?.importJourney();if(j){await refreshJourneys();await loadJourney(j.id)}});
$('#exportJourney').addEventListener('click',()=>activeJourneyId&&window.guidanceDesktop?.exportJourney(activeJourneyId));
$('#knowledgeSearch').addEventListener('input',renderKnowledgeSearch);
$('#showAllKnowledge').addEventListener('change',e=>{profile().showAll=e.target.checked;saveState();render()});

consumeAuthRedirect();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
void initDesktop();
