// The exhaustive encounter catalog is vendored from BuLEEto/ER_Boss_Kill_Checklist (MIT).
// scripts/sync-boss-catalog.mjs can refresh it. V5 pins the verified 2026-09-15
// snapshot so the release does not depend on a network call to become complete.
export const COMPLETION_CATALOG_SOURCE = {
  name:'ER Boss Kill Checklist',
  url:'https://github.com/BuLEEto/ER_Boss_Kill_Checklist',
  license:'MIT',
  scope:'207 boss encounters across Elden Ring and Shadow of the Erdtree, including boss-bearing caves, catacombs, tunnels, gaols, evergaols, hero graves, legacy dungeons, field bosses, remembrance bosses and main-story encounters.',
};

export const ACTIVITY_CATEGORIES = [
  ['boss','Bosses & field bosses'],
  ['dungeon','Caves, catacombs, tunnels, gaols & hero graves'],
  ['evergaol','Evergaols'],
  ['legacy','Legacy dungeons'],
  ['poi','Major optional locations'],
];

const LEGACY_REGIONS = /Stormveil|Raya Lucaria|Volcano Manor|Leyndell|Farum Azula|Haligtree|Belurat|Castle Ensis|Shadow Keep|Enir-Ilim/i;
export function classifyBossLocation(place='',region='') {
  if (/Evergaol/i.test(place)) return 'evergaol';
  if (/Cave|Catacomb|Tunnel|Hero.?s Grave|Gaol|Hideaway|Mausoleum/i.test(place)) return 'dungeon';
  if (LEGACY_REGIONS.test(place)||LEGACY_REGIONS.test(region)) return 'legacy';
  return 'boss';
}

export function deriveEncounterLocations(bosses=[]) {
  const grouped=new Map();
  for(const boss of bosses){
    if(!boss.place)continue;
    const key=`${boss.region}::${boss.place}`;
    const current=grouped.get(key)??{id:key,region:boss.region,name:boss.place,type:classifyBossLocation(boss.place,boss.region),dlc:Boolean(boss.dlc),encounters:[]};
    current.encounters.push(boss.name);current.dlc ||= Boolean(boss.dlc);grouped.set(key,current);
  }
  return [...grouped.values()].sort((a,b)=>a.region.localeCompare(b.region)||a.name.localeCompare(b.name));
}
