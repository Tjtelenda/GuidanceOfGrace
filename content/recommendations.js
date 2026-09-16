export const AREA_RECOMMENDATIONS = [
  { id:'limgrave', match:/Limgrave|Stormhill|Mistwood|Weeping Peninsula|Castle Morne/i, name:'Limgrave / Weeping Peninsula', min:1, max:40, note:'New players usually have the best time learning here before forcing Stormveil.' },
  { id:'stormveil', match:/Stormveil/i, name:'Stormveil Castle', min:30, max:45, note:'Weapon upgrade level and Vigor matter more than a few character levels.' },
  { id:'liurnia', match:/Liurnia|Raya Lucaria|Caria Manor|Bellum/i, name:'Liurnia of the Lakes', min:40, max:70, note:'Liurnia is broad; the academy is usually a mid-50s objective.' },
  { id:'caelid', match:/Caelid|Redmane|Sellia/i, name:'Caelid', min:60, max:90, note:'Western Caelid is much friendlier than Dragonbarrow.' },
  { id:'dragonbarrow', match:/Dragonbarrow|Bestial Sanctum/i, name:"Greyoll's Dragonbarrow", min:90, max:115, note:'This subregion is tuned notably higher than most of Caelid.' },
  { id:'altus', match:/Altus|Shaded Castle|Windmill/i, name:'Altus Plateau', min:80, max:105, note:'A natural midgame region once two Great Runes or an alternate route opens the capital path.' },
  { id:'gelmir', match:/Mt\. Gelmir|Volcano Manor|Prison Town/i, name:'Mt. Gelmir / Volcano Manor', min:80, max:110, note:'Optional, dense with NPC progression and easy-to-miss contract interactions.' },
  { id:'leyndell', match:/Leyndell|Capital|Elden Throne/i, name:'Leyndell', min:90, max:120, note:'A major story threshold; finish NPC business before late-game capital changes.' },
  { id:'underground', match:/Siofra|Ainsel|Nokron|Nokstella|Deeproot|Lake of Rot/i, name:'Underground', min:60, max:115, note:'Difficulty varies sharply by subarea and by how far Ranni/Fia progression has opened the route.' },
  { id:'mountaintops', match:/Mountaintops|Zamor|Flame Peak|Forbidden Lands/i, name:'Mountaintops of the Giants', min:110, max:135, note:'Enemy damage spikes here. 50–60 Vigor is a common comfort target.' },
  { id:'snowfield', match:/Consecrated Snowfield|Ordina/i, name:'Consecrated Snowfield', min:120, max:150, note:'Late optional region with hard-hitting enemies.' },
  { id:'haligtree', match:/Haligtree|Elphael/i, name:"Miquella's Haligtree / Elphael", min:130, max:160, note:'One of the hardest base-game areas.' },
  { id:'farum', match:/Farum Azula|Dragon Temple|Great Bridge/i, name:'Crumbling Farum Azula', min:120, max:150, note:'Late-game area; the boss beyond the Great Bridge changes Leyndell.' },
  { id:'mohgwyn', match:/Mohgwyn|Dynasty Mausoleum|Cocoon of the Empyrean/i, name:'Mohgwyn Palace', min:120, max:150, note:'Mohg is the DLC gate alongside Radahn. Level 150 is a common comfortable DLC starting point.' },
  { id:'gravesite', match:/Gravesite Plain|Belurat|Three-Path Cross|Main Gate Cross/i, name:'Gravesite Plain / Belurat', min:140, max:170, scaduMin:0, scaduMax:4, note:'In the DLC, Scadutree Blessing matters more than rune level once your build is established.' },
  { id:'ensis', match:/Castle Ensis|Rellana/i, name:'Castle Ensis', min:145, max:175, scaduMin:3, scaduMax:6, note:'If Rellana feels oppressive, explore for Scadutree Fragments rather than grinding ordinary levels.' },
  { id:'scadu-altus', match:/Scadu Altus|Highroad Cross|Moorth|Bonny/i, name:'Scadu Altus', min:150, max:180, scaduMin:5, scaduMax:9, note:'Approaching Shadow Keep also advances most followers of Miquella.' },
  { id:'shadow-keep', match:/Shadow Keep|Storehouse|Dark Chamber/i, name:'Shadow Keep', min:150, max:185, scaduMin:8, scaduMax:12, note:'Large branching legacy dungeon. NPC quest order matters here.' },
  { id:'cerulean', match:/Cerulean Coast|Stone Coffin Fissure|Garden of Deep Purple/i, name:'Cerulean Coast / Fissure', min:150, max:185, scaduMin:7, scaduMax:11, note:'Thiollier and St. Trina become central here.' },
  { id:'jagged', match:/Jagged Peak|Dragon Communion|Bayle/i, name:'Jagged Peak', min:155, max:190, scaduMin:10, scaduMax:14, note:'Bayle is tuned as a late DLC optional superboss; community guidance commonly suggests Scadutree 12+.' },
  { id:'rauh', match:/Rauh|Church of the Bud/i, name:'Ancient Ruins of Rauh', min:155, max:190, scaduMin:9, scaduMax:13, note:'The Sealing Tree after Romina is the DLC’s major NPC point of no return.' },
  { id:'abyss', match:/Abyssal Woods|Midra/i, name:'Abyssal Woods', min:155, max:190, scaduMin:12, scaduMax:15, note:'Optional late-DLC branch.' },
  { id:'enir', match:/Enir-Ilim|Cleansing Chamber|Divine Gate|Consort of Miquella/i, name:'Enir-Ilim', min:165, max:200, scaduMin:15, scaduMax:20, note:'Final DLC region. Blessing level is a far better difficulty predictor than rune level.' },
];

export const BOSS_RECOMMENDATIONS = [
  { name:'Margit, the Fell Omen', match:/Margit/i, min:20, max:30 },
  { name:'Godrick the Grafted', match:/Godrick/i, min:30, max:40 },
  { name:'Rennala, Queen of the Full Moon', match:/Rennala/i, min:50, max:65 },
  { name:'Starscourge Radahn', match:/Starscourge Radahn/i, min:70, max:85 },
  { name:'Morgott, the Omen King', match:/Morgott/i, min:90, max:105 },
  { name:'Fire Giant', match:/Fire Giant/i, min:110, max:130 },
  { name:'Maliketh, the Black Blade', match:/Maliketh/i, min:120, max:140 },
  { name:'Mohg, Lord of Blood', match:/Mohg, Lord of Blood/i, min:130, max:155 },
  { name:'Malenia, Blade of Miquella', match:/Malenia/i, min:140, max:170 },
  { name:'Divine Beast Dancing Lion', match:/Dancing Lion/i, min:140, max:175, scaduMin:2, scaduMax:5 },
  { name:'Rellana, Twin Moon Knight', match:/Rellana/i, min:145, max:180, scaduMin:4, scaduMax:7 },
  { name:'Messmer the Impaler', match:/Messmer/i, min:155, max:190, scaduMin:10, scaduMax:14 },
  { name:'Putrescent Knight', match:/Putrescent/i, min:150, max:185, scaduMin:9, scaduMax:13 },
  { name:'Commander Gaius', match:/Commander Gaius/i, min:155, max:190, scaduMin:11, scaduMax:14 },
  { name:'Scadutree Avatar', match:/Scadutree Avatar/i, min:155, max:190, scaduMin:10, scaduMax:13 },
  { name:'Midra, Lord of Frenzied Flame', match:/Midra/i, min:155, max:190, scaduMin:12, scaduMax:15 },
  { name:'Metyr, Mother of Fingers', match:/Metyr/i, min:155, max:190, scaduMin:11, scaduMax:15 },
  { name:'Bayle the Dread', match:/Bayle/i, min:155, max:200, scaduMin:12, scaduMax:16 },
  { name:'Romina, Saint of the Bud', match:/Romina/i, min:155, max:190, scaduMin:12, scaduMax:15 },
  { name:'Radahn, Consort of Miquella', match:/Consort of Miquella/i, min:170, max:200, scaduMin:15, scaduMax:20 },
];

export function recommendationForMap(mapName = '') {
  return AREA_RECOMMENDATIONS.find(entry => entry.match.test(mapName)) ?? null;
}

export const RECOMMENDATION_SOURCES = [
  { label:'Base-game ranges', url:'https://www.reddit.com/r/Eldenring/comments/1cxyvh0/recommended_level_for_bosses/', note:'Community ranges, not hard requirements.' },
  { label:'Shadow of the Erdtree boss / blessing ranges', url:'https://primagames.com/gaming/all-elden-ring-shadow-of-the-erdtree-recommended-level-guide-bosses-and-locations', note:'Used as a sanity check; blessing level is intentionally presented as approximate.' },
  { label:'DLC entry context', url:'https://www.powerpyx.com/elden-ring-shadow-of-the-erdtree-dlc-boss-guide-all-bosses/', note:'Level 150+ is a common DLC starting recommendation.' },
];
