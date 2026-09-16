const step=(label,area,clue,detail=clue)=>({label,area,clue,detail});

export const DLC_REGIONS = [
  { id:'gravesite', name:'Gravesite Plain', mapLayer:'shadow', x:38, y:78, clue:'The first open region of the Realm of Shadow.', when:f=>f.dlcEntry },
  { id:'belurat', name:'Belurat', mapLayer:'shadow', x:25, y:66, clue:'Tower settlement west of the first crossroads.', when:f=>f.dlcBelurat||f.dancingLionDefeated },
  { id:'ensis', name:'Castle Ensis', mapLayer:'shadow', x:52, y:68, clue:'The fortified route toward Scadu Altus.', when:f=>f.dlcEnsis||f.rellanaDefeated },
  { id:'scadu-altus', name:'Scadu Altus', mapLayer:'shadow', x:55, y:48, clue:'Central highlands where the followers begin to diverge.', when:f=>f.dlcScaduAltus||f.rellanaDefeated },
  { id:'shadow-keep', name:'Shadow Keep', mapLayer:'shadow', x:49, y:35, clue:'Messmer’s fortress and the DLC’s main NPC convergence point.', when:f=>f.dlcShadowKeep },
  { id:'cerulean', name:'Cerulean Coast', mapLayer:'shadow', x:39, y:91, clue:'Southern coast leading toward the Fissure and St. Trina.', when:f=>f.dlcCerulean },
  { id:'jagged', name:'Jagged Peak', mapLayer:'shadow', x:82, y:62, clue:'Dragon route culminating in Bayle.', when:f=>f.dlcJaggedPeak||f.bayleDefeated },
  { id:'rauh', name:'Ancient Ruins of Rauh', mapLayer:'shadow', x:24, y:35, clue:'Ancient western ruins leading to the Church of the Bud.', when:f=>f.dlcRauh||f.rominaDefeated },
  { id:'abyss', name:'Abyssal Woods', mapLayer:'shadow', x:67, y:83, clue:'Hidden optional region below Shadow Keep.', when:f=>f.dlcAbyss||f.midraDefeated },
  { id:'enir', name:'Enir-Ilim', mapLayer:'shadow', x:32, y:22, clue:'Final tower beyond the Sealing Tree.', when:f=>f.dlcEnirIlim||f.consortDefeated },
];

export const DLC_QUESTS = [
  {id:'leda',name:'Needle Knight Leda',area:'Gravesite Plain → Enir-Ilim',regions:['gravesite','scadu-altus','shadow-keep','enir'],priority:'major',dlc:true,hint:'She begins as the clearest spokesperson for Miquella’s followers. Her priorities change once the charm breaks.',steps:[
    step('Met Leda and the followers','Gravesite Plain','Speak at the early crosses and exhaust everyone before pushing far north.'),
    step('Checked on her after the charm broke','Highroad Cross','Approaching Shadow Keep breaks Miquella’s Great Rune and advances the entire group.'),
    step('Resolved her suspicion of the Hornsent','Shadow Keep','Summon signs tied to Leda and the Hornsent appear during Shadow Keep progression; this choice affects rewards and later allies.'),
    step('Resolved her suspicion of Ansbach','Shadow Keep Storehouse','A later pair of signs can make you support Leda or Ansbach.'),
    step('Reached the followers’ confrontation','Enir-Ilim','Your earlier choices determine who stands with or against you.')],saveEvidence:[['dlcEntry','The Realm of Shadow is accessible.'],['dlcShadowKeep','The charm-breaking threshold has been crossed.'],['dlcEnirIlim','The followers’ final confrontation is now in reach.']]},
  {id:'ansbach',name:'Sir Ansbach',area:'Gravesite Plain → Shadow Keep',regions:['gravesite','shadow-keep','enir'],priority:'major',dlc:true,hint:'A former Pureblood Knight is trying to understand what Miquella did to his lord.',steps:[
    step('Met Ansbach','Main Gate Cross','Talk with him near the Belurat approach and revisit after new Miquella crosses are found.'),
    step('Found him in the Storehouse','Shadow Keep','After the charm breaks he moves to the first floor of the Specimen Storehouse.'),
    step('Found the Secret Rite Scroll','Shadow Keep','A scroll on a higher floor answers a question he is researching.'),
    step('Handled Freyja’s question before finishing Ansbach’s hand-in','Shadow Keep','For the widest path, speak with Freyja and Ansbach in the Storehouse before handing over every key item.'),
    step('Chose whether to aid Ansbach against Leda','Shadow Keep','A gold/red summon-sign decision determines whether he can survive to aid you later.'),
    step('Reached his endgame role','Enir-Ilim','If kept alive and his research completed, he can stand with you in the final stretch.')],saveEvidence:[['dlcShadowKeep','Ansbach should have moved to the Storehouse after the charm broke.'],['dlcEnirIlim','The final follower sequence is active.']]},
  {id:'freyja',name:'Redmane Freyja',area:'Gravesite Plain → Shadow Keep',regions:['gravesite','shadow-keep','enir'],priority:'major',dlc:true,hint:'Her questions about Radahn become much more important once she reaches the Storehouse.',steps:[
    step('Met Freyja','Three-Path Cross','Exhaust her early dialogue while the followers are still charmed.'),
    step('Checked on her after the charm broke','Scadu Altus','Her independent thoughts become clearer after Miquella’s Great Rune breaks.'),
    step('Found her in the Storehouse','Shadow Keep','She waits on an upper floor looking for an answer about Radahn.'),
    step('Carried information between Freyja and Ansbach','Shadow Keep','Their research intersects; order matters if you want the full exchange and rewards.'),
    step('Saw where her loyalty led','Enir-Ilim','Her final role depends on whether her question was answered.')],saveEvidence:[['dlcShadowKeep','Freyja’s Storehouse phase can be active.'],['radahn','Radahn’s base-game defeat is a prerequisite for entering the DLC and central to her story.']]},
  {id:'hornsent-dlc',name:'Hornsent',area:'Gravesite Plain → Shadow Keep',regions:['gravesite','scadu-altus','shadow-keep'],priority:'major',dlc:true,hint:'His grief and desire for revenge become central once the charm breaks.',steps:[
    step('Met the Hornsent follower','Three-Path Cross','Speak with him and read the map he provides.'),
    step('Checked on him after the charm broke','Highroad Cross','His hostility toward Messmer becomes much more direct.'),
    step('Resolved Leda’s move against him','Shadow Keep','A summon-sign choice can support the Hornsent or Leda.'),
    step('Decided whether to involve him with Messmer','Shadow Keep','His summon sign inside the Messmer arena advances his revenge story without increasing the boss’s health.'),
    step('Checked his aftermath','Scadu Altus / Rauh','Depending on earlier choices he can reappear later with a very different role.')],saveEvidence:[['dlcScaduAltus','The charm-breaking stage is close or active.'],['messmerDefeated','Messmer is defeated; Hornsent’s pre-Messmer interactions may now be gone.']]},
  {id:'moore-dlc',name:'Moore',area:'Main Gate Cross → Scadu Altus',regions:['gravesite','scadu-altus'],priority:'major',dlc:true,hint:'The quiet merchant’s Forager Brood relationships matter more than his shop suggests.',steps:[
    step('Met Moore','Main Gate Cross','Talk to the merchant beside Ansbach.'),
    step('Interacted with the Forager Brood','Realm of Shadow','Do not attack the non-hostile brood members; several provide cookbooks and one affects Moore.'),
    step('Delivered Black Syrup toward Thiollier’s thread','Main Gate Cross → Pillar Path Cross','Moore can provide an item that opens an optional branch for Thiollier and the Dragon Communion Priestess.'),
    step('Answered Moore after the charm broke','Scadu Altus','His question after Miquella’s charm ends has major consequences for where he appears later.')],saveEvidence:[['dlcEntry','Moore can be encountered at Main Gate Cross.'],['dlcShadowKeep','His post-charm decision should now be available if not already resolved.']]},
  {id:'thiollier',name:'Thiollier & St. Trina',area:'Pillar Path Cross → Stone Coffin Fissure',regions:['gravesite','cerulean','enir'],priority:'major',dlc:true,hint:'A poison specialist is searching for St. Trina. The deepest part of the southern coast is where that story becomes important.',steps:[
    step('Met Thiollier','Pillar Path Cross','Find him southeast of Castle Ensis and exhaust his dialogue.'),
    step('Handled Moore’s Black Syrup branch','Pillar Path Cross','Delivering Black Syrup can produce Thiollier’s Concoction, which has a separate use in the dragon quest.'),
    step('Returned after the charm broke','Pillar Path Cross','He reveals where he intends to go once the charm is gone.'),
    step('Reached St. Trina','Stone Coffin Fissure','The Fissure opens after the Great Rune/charm event. Defeat its boss and continue downward.'),
    step('Repeated St. Trina’s message until it changed','Garden of Deep Purple','This sequence requires persistence; one interaction is not enough.'),
    step('Told Thiollier what St. Trina said','Garden of Deep Purple','Continue talking/resting until his response changes and his quest resolves.'),
    step('Reached his final role','Enir-Ilim','Completing the St. Trina sequence can make him available in the final battles.')],saveEvidence:[['dlcCerulean','The southern/Fissure branch has been reached.'],['putrescentDefeated','The boss guarding St. Trina is defeated.'],['dlcEnirIlim','Thiollier’s final summon opportunity is in reach.']]},
  {id:'dane-dlc',name:'Dryleaf Dane',area:'Scadu Altus → Enir-Ilim',regions:['scadu-altus','enir'],priority:'side',dlc:true,hint:'A silent monk expects a gesture rather than a conversation.',steps:[
    step('Found the Monk’s Missive and gesture','Highroad Cross','Read the nearby message after entering Scadu Altus.'),
    step('Challenged Dane correctly','Moorth Ruins','Use the gesture from the missive in front of him.'),
    step('Reached his later role','Enir-Ilim','His allegiance places him in the followers’ final confrontation.')],saveEvidence:[['dlcScaduAltus','Dane’s challenge can be completed now.'],['dlcEnirIlim','His final encounter is available.']]},
  {id:'ymir',name:'Count Ymir & Swordhand of Night Jolán',area:'Cathedral of Manus Metyr',regions:['scadu-altus','cerulean'],priority:'major',dlc:true,hint:'A cathedral in eastern Scadu Altus begins one of the DLC’s biggest lore threads.',steps:[
    step('Met Count Ymir and Jolán','Cathedral of Manus Metyr','Speak to both and accept the first map/instructions.'),
    step('Rang the first finger bell','Southern Ruins','Follow Ymir’s map to a hidden Finger Ruins area.'),
    step('Returned for the second map','Cathedral','Revisit the cathedral after each bell; dialogue and Jolán’s state update.'),
    step('Rang the second finger bell','Northern Ruins','The second route requires deeper Scadu Altus/Shadow Keep access.'),
    step('Investigated the cathedral throne','Cathedral','After both maps, the cathedral itself changes when Ymir is absent.'),
    step('Defeated Metyr and resolved Ymir/Jolán','Finger Birthing Grounds / Cathedral','Return after Metyr for the final confrontation and Jolán choice.')],saveEvidence:[['dlcScaduAltus','The cathedral region is accessible.'],['metyrDefeated','Metyr is defeated; the final cathedral/Jolán resolution should be available.']]},
  {id:'igon',name:'Igon',area:'Pillar Path → Jagged Peak',regions:['gravesite','jagged'],priority:'major',dlc:true,hint:'The loud wounded man on the road is not background flavor. His story belongs on Jagged Peak.',steps:[
    step('Met Igon','Pillar Path','Listen for shouting on the road south of Pillar Path Waypoint.'),
    step('Opened the route through Dragon’s Pit','Dragon’s Pit','Defeat the Ancient Dragon-Man and exit toward Jagged Peak.'),
    step('Found Igon after the drake fight','Jagged Peak','After the pair of drakes, speak to him until he gives his Furled Finger.'),
    step('Summoned Igon against Bayle','Jagged Peak Summit','His sign appears inside Bayle’s arena after the fight starts.'),
    step('Returned for his aftermath','Jagged Peak','Return to where he last sat after Bayle is dead.')],saveEvidence:[['dlcJaggedPeak','Jagged Peak is reached.'],['bayleDefeated','Bayle is defeated; Igon’s aftermath can be collected.']]},
  {id:'priestess',name:'Dragon Communion Priestess',area:'Grand Altar of Dragon Communion',regions:['jagged'],priority:'major',dlc:true,hint:'At the Grand Altar, a priestess offers a second angle on the Bayle hunt and an optional Thiollier-related branch.',steps:[
    step('Joined communion with the Priestess','Grand Altar','Speak to her and accept the blessing before Bayle.'),
    step('Decided whether to use Thiollier’s Concoction','Grand Altar at night','This optional choice changes her ending rewards.'),
    step('Defeated Bayle','Jagged Peak Summit','The quest resolves after Bayle regardless of whether the concoction branch was used.'),
    step('Returned to the altar','Grand Altar','Collect or receive the outcome tied to your earlier choice.')],saveEvidence:[['dlcJaggedPeak','The Grand Altar route is accessible.'],['bayleDefeated','Bayle is defeated; return to the altar.']]},
  {id:'grandam',name:'Hornsent Grandam',area:'Belurat',regions:['belurat','shadow-keep'],priority:'side',dlc:true,hint:'An elderly Hornsent in Belurat has extra dialogue and rewards tied to the Dancing Lion and Messmer.',steps:[
    step('Found the Grandam','Belurat','A locked room in the settlement can be opened with a key found in Belurat.'),
    step('Returned after the Dancing Lion','Belurat','The boss outcome changes her dialogue and reward sequence.'),
    step('Checked on her before defeating Messmer','Belurat','Her Messmer-related dialogue/reward should be handled before that boss is resolved.')],saveEvidence:[['dlcBelurat','Belurat is accessible.'],['dancingLionDefeated','The Dancing Lion is defeated.'],['messmerDefeated','Messmer is defeated; her pre-Messmer step may be missed.']]},
  {id:'queelign',name:'Fire Knight Queelign',area:'Belurat → Shadow Keep',regions:['belurat','scadu-altus','shadow-keep'],priority:'side',dlc:true,hint:'A recurring invader leaves behind a key that leads to a final choice.',steps:[
    step('Defeated Queelign’s first invasion','Belurat','One invasion occurs in the tower settlement.'),
    step('Defeated his later invasion','Scadu Altus','A second invasion occurs around the Church of the Crusade.'),
    step('Used the Prayer Room Key','Shadow Keep district','The invasions provide access to a room where Queelign can be found physically.'),
    step('Chose which iris to use','Prayer Room','The Iris of Grace and Iris of Occultation produce different rewards.')],saveEvidence:[['dlcScaduAltus','Both invasion regions are accessible.'],['dlcShadowKeep','The Prayer Room resolution can now be reached.']]},
];

export const DLC_QUEST_ACCESS = {
  leda:f=>f.dlcEntry,
  ansbach:f=>f.dlcEntry,
  freyja:f=>f.dlcEntry,
  'hornsent-dlc':f=>f.dlcEntry,
  'moore-dlc':f=>f.dlcEntry,
  thiollier:f=>f.dlcEntry,
  'dane-dlc':f=>f.dlcScaduAltus,
  ymir:f=>f.dlcScaduAltus,
  igon:f=>f.dlcEntry,
  priestess:f=>f.dlcJaggedPeak,
  grandam:f=>f.dlcBelurat,
  queelign:f=>f.dlcBelurat||f.dlcScaduAltus,
};

export const DLC_TRANSITION_RISKS = [
  {
    id:'dlc-charm-break',level:'warning',questIds:['leda','ansbach','freyja','hornsent-dlc','moore-dlc','thiollier'],triggerFlags:['dlcScaduAltus','dlcShadowKeep'],outcomeFlag:'dlcShadowKeep',
    when:f=>f.dlcScaduAltus&&!f.dlcShadowKeep,
    title:'Before approaching Shadow Keep',
    text:'I’d make one round of the current Miquella followers before pushing to Shadow Keep. Approaching it breaks Miquella’s Great Rune and charm, which advances nearly every follower into a new phase.',
    aftermath:'Miquella’s Great Rune and charm have broken. Revisit Leda, Hornsent, Ansbach, Freyja, Moore, and Thiollier now; their independent agendas are active.',
  },
  {
    id:'dlc-storehouse-order',level:'warning',questIds:['ansbach','freyja','leda'],triggerFlags:['dlcStorehouse'],
    when:f=>f.dlcStorehouse&&!f.messmerDefeated,
    title:'Do a Storehouse NPC pass before handing everything in',
    text:'Freyja and Ansbach both have research steps in the Specimen Storehouse. Speak to both and find the relevant scroll before completing every hand-in; the order can affect dialogue, rewards, and who reaches Enir-Ilim.',
    aftermath:'The Storehouse decision window has passed or the Shadow Keep story moved forward. Check each thread’s history to see what your save/manual confirmations establish.',
  },
  {
    id:'dlc-messmer',level:'danger',questIds:['hornsent-dlc','grandam','leda'],triggerFlags:['dlcMessmerDoor','messmerDefeated'],outcomeFlag:'messmerDefeated',
    when:f=>f.dlcMessmerDoor&&!f.messmerDefeated,
    title:'Before fighting Messmer',
    text:'I’d check Hornsent, Hornsent Grandam, and Leda before this boss. Hornsent’s revenge path and the Grandam’s Messmer-related interactions are time-sensitive around this fight.',
    aftermath:'Messmer is defeated. Any pre-Messmer Hornsent/Grandam interactions that were not completed may now be unavailable.',
  },
  {
    id:'dlc-st-trina',level:'warning',questIds:['thiollier','moore-dlc','priestess'],triggerFlags:['dlcFissure','putrescentDefeated'],
    when:f=>f.dlcFissure&&!f.putrescentDefeated,
    title:'Before finishing the Fissure',
    text:'If you want every branch, check Thiollier and Moore first. Moore can provide Black Syrup, which leads to Thiollier’s Concoction and an optional Dragon Communion Priestess outcome.',
    aftermath:'The route to St. Trina is open. Thiollier’s story now needs repeated conversations/rests rather than a single interaction.',
  },
  {
    id:'dlc-bayle',level:'warning',questIds:['igon','priestess'],triggerFlags:['dlcBayleDoor','bayleDefeated'],outcomeFlag:'bayleDefeated',
    when:f=>f.dlcBayleDoor&&!f.bayleDefeated,
    title:'Before fighting Bayle',
    text:'Make sure Igon has given you his Furled Finger and check the Dragon Communion Priestess. Igon’s summon sign appears inside the arena after the fight starts; summoning him gives his full story payoff.',
    aftermath:'Bayle is defeated. Return to Igon’s last location and the Grand Altar of Dragon Communion for the quest aftermath and rewards.',
  },
  {
    id:'dlc-sealing-tree',level:'danger',questIds:['leda','ansbach','freyja','hornsent-dlc','moore-dlc','thiollier','dane-dlc'],triggerFlags:['rominaDefeated','dlcEnirIlim'],outcomeFlag:'dlcEnirIlim',always:true,
    when:f=>f.rominaDefeated&&!f.dlcEnirIlim,
    title:'Stop before burning the Sealing Tree',
    text:'This is the DLC’s main point of no return for Miquella’s followers. Finish Leda, Ansbach, Freyja, Hornsent, Moore, Thiollier, and Dane business you care about before using Messmer’s kindling here. Ymir/Jolán, Queelign, and Igon/Priestess are notable exceptions that can still be finished later.',
    aftermath:'The Sealing Tree has been burned and Enir-Ilim is open. Most follower questlines have moved to their final/failed states; the companion now shows their past timeline rather than future steps.',
  },
];
