// Curated quest-item checks. These are intentionally limited to items where
// ownership is useful guidance and the save parser exposes a reliable acquired flag.
export const QUEST_ITEM_LINKS = [
  { key:'irinasLetter', name:"Irina's Letter", questIds:['irina'], region:'weeping', when:f=>f.morneRampartGrace&&!f.godrick, clue:'If you met Irina near the Bridge of Sacrifice, she gives you a letter for her father inside Castle Morne.' },
  { key:'academyKey', name:'Academy Glintstone Key', questIds:['thops'], region:'liurnia', when:f=>f.liurniaGrace&&!f.rennala, clue:'One key opens the academy. A second key inside the academy can be given to Thops.' },
  { key:'fingerslayerBlade', name:'Fingerslayer Blade', questIds:['ranni','seluvis','blaidd'], region:'underground', when:f=>f.radahn&&!f.ainselMainGrace, clue:"The treasure Ranni wants is in Night's Sacred Ground in Nokron. Before handing it over, finish anything you want with Seluvis." },
  { key:'cursemarkDeath', name:'Cursemark of Death', questIds:['fia','ranni'], region:'liurnia', when:f=>f.ainselMainGrace, clue:'Ranni’s path eventually gives access to the inverted Carian Study Hall and an item important to Fia.' },
  { key:'unalloyedNeedle', name:'Unalloyed Gold Needle', questIds:['millicent'], region:'caelid', when:f=>f.caelidGrace&&!f.morgott, clue:'Commander O’Neil in the Aeonia swamp carries the needle Gowry needs for Millicent.' },
  { key:'valkyrieProsthesis', name:"Valkyrie's Prosthesis", questIds:['millicent'], region:'altus', when:f=>f.altusGrace&&!f.morgott, clue:'Look inside the Shaded Castle in northern Altus for the prosthesis Millicent needs.' },
  { key:'haligtreeMedallionLeft', name:'Haligtree Secret Medallion (Left)', questIds:['latenna'], region:'mountaintops', when:f=>f.mountaintopsGrace&&!f.malenia, clue:'The left half is tied to Castle Sol in the Mountaintops.' },
  { key:'haligtreeMedallionRight', name:'Haligtree Secret Medallion (Right)', questIds:['latenna'], region:'liurnia', when:f=>f.liurniaGrace&&!f.malenia, clue:'The right half is hidden in Liurnia and is connected to Albus and Latenna.' },
  { key:'blackSyrup', name:'Black Syrup', questIds:['moore-dlc','thiollier','priestess'], region:'gravesite', when:f=>f.dlcEntry&&!f.dlcShadowKeep, clue:'Ask Moore about the Forager Brood before the follower group changes. The syrup can be passed to Thiollier.' },
  { key:'thiollierConcoction', name:"Thiollier's Concoction", questIds:['thiollier','priestess'], region:'gravesite', when:f=>f.dlcEntry&&!f.bayleDefeated, clue:'Thiollier can make this after receiving Black Syrup. It has an optional use in the Jagged Peak questline.' },
  { key:'secretRiteScroll', name:'Secret Rite Scroll', questIds:['ansbach','freyja'], region:'shadow-keep', when:f=>f.dlcStorehouse&&!f.messmerDefeated, clue:'Search the upper Specimen Storehouse before resolving all of Ansbach and Freyja’s dialogue.' },
  { key:'holeLadenNecklace', name:'Hole-Laden Necklace', questIds:['ymir'], region:'scadu-altus', when:f=>f.dlcScaduAltus&&!f.metyrDefeated, clue:'Ymir’s map-and-bell sequence eventually provides access to the Finger Ruins and the route beneath the cathedral.' },
];

export const questItemsFor = (questId, flags) => QUEST_ITEM_LINKS.filter(item => item.questIds.includes(questId) && item.when(flags));
