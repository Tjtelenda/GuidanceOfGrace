// Estimates are planning aids, not speedrun expectations.
export function planSession({minutes=90,area='your current area',quest=null,risk=false,forge=false,dungeon=false,legacy=false,underReady=false,dlc=false,blessing=null}={}){
  const choices=[];
  if(risk)choices.push({title:'Check the open NPC window',minutes:20,priority:100,text:'Visit the relevant NPCs before the nearby world transition. Leave time to finish their current dialogue.'});
  if(quest)choices.push({title:`Check on ${quest.name}`,minutes:30,priority:quest.endingPriority?90:70,text:quest.hint,questId:quest.id});
  if(forge)choices.push({title:'Explore for Forge Supply',minutes:30,priority:underReady?85:60,text:'Another permanent upgrade-material supply is reachable. Ask for a hint in Forge Supply when you want a direction.'});
  if(dlc&&underReady)choices.push({title:'Strengthen your blessing',minutes:30,priority:80,text:`Explore a reached DLC area for fragments${blessing!=null?` (current blessing ${blessing})`:''}. A small exploration session can improve the next major challenge.`});
  if(dungeon)choices.push({title:'Finish a discovered side dungeon',minutes:40,priority:55,text:'Choose an unfinished cave, tunnel, catacomb or evergaol in the current region. This estimate includes exploration and a few attempts.'});
  if(legacy&&!underReady)choices.push({title:'Explore the current legacy dungeon',minutes:90,priority:45,text:'Reserve a longer session for one substantial section, side rooms and its next checkpoint.'});
  choices.push({title:`Wander ${area}`,minutes:25,priority:30,text:'Choose one nearby landmark and stop after a satisfying discovery. There is no need to clear the entire area.'});
  if(!risk&&!underReady)choices.push({title:'Advance the main thread',minutes:60,priority:35,text:'Follow the current guidance toward the next checkpoint. Check open NPC threads before committing to a major challenge.'});
  return choices.filter(c=>c.minutes<=minutes).sort((a,b)=>b.priority-a.priority).slice(0,3).map(c=>({...c,time:`~${c.minutes} min`}));
}
