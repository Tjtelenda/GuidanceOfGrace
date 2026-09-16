export const ENDING_PATHS = [
  { id:'undecided', name:'Undecided', subtitle:'Keep every path open', questIds:[], description:'Do not prioritize one ending yet. The companion will warn before choices that narrow your options.' },
  { id:'fracture', name:'Age of Fracture', subtitle:'Mend what remains', questIds:[], description:'The baseline Elden Lord path. No side quest is required.' },
  { id:'stars', name:'Age of the Stars', subtitle:'Ranni’s path', questIds:['ranni','blaidd','iji'], description:'Complete Ranni’s long optional story and choose her sign after the final battle.' },
  { id:'order', name:'Age of Order', subtitle:'Goldmask’s path', questIds:['corhyn'], description:'Follow Corhyn and Goldmask until you receive their Mending Rune.' },
  { id:'duskborn', name:'Age of the Duskborn', subtitle:'Fia’s path', questIds:['fia','rogier'], description:'Follow Fia’s story until you receive the Mending Rune of the Death-Prince.' },
  { id:'despair', name:'Blessing of Despair', subtitle:'Dung Eater’s path', questIds:['dung'], description:'Finish the Dung Eater route and obtain the Mending Rune of the Fell Curse.' },
  { id:'frenzy', name:'Lord of Frenzied Flame', subtitle:'The Three Fingers’ path', questIds:['hyetta'], description:'Inherit the Frenzied Flame. This overrides other endings unless it is later removed with Miquella’s Needle.' },
];

export function mendingPathsVisible(flags = {}) {
  const runes = ['godrickRune','radahnRune','morgottRune','rykardRune','mohgRune','maleniaRune','unbornRune'].filter(key=>flags[key]).length;
  return Boolean(flags.eastCapitalGrace || flags.capitalGrace || flags.morgott || runes >= 2);
}

export function pathStatus(path, flags = {}, questState = () => 'unseen') {
  if (path.id === 'undecided') return { state:'open', text:'No ending is being prioritized.' };
  if (path.id === 'fracture') return flags.frenziedFlame && !flags.frenziedNullified
    ? { state:'blocked', text:'Temporarily blocked by the Frenzied Flame.' }
    : { state:'available', text:'The baseline Elden Lord ending remains available once the final choice is reached.' };
  if (path.id === 'order') {
    if (flags.perfectOrderRune) return { state:'ready', text:'Mending Rune of Perfect Order acquired.' };
    return questState('corhyn') !== 'unseen' ? { state:'progress', text:'Corhyn and Goldmask’s route is in progress.' } : { state:'hidden', text:'This path has not been discovered yet.' };
  }
  if (path.id === 'duskborn') {
    if (flags.deathPrinceRune) return { state:'ready', text:'Mending Rune of the Death-Prince acquired.' };
    return ['fia','rogier'].some(id=>questState(id)!=='unseen') ? { state:'progress', text:'Fia’s route is in progress.' } : { state:'hidden', text:'This path has not been discovered yet.' };
  }
  if (path.id === 'despair') {
    if (flags.fellCurseRune) return { state:'ready', text:'Mending Rune of the Fell Curse acquired.' };
    return questState('dung') !== 'unseen' ? { state:'progress', text:'The Dung Eater route is in progress.' } : { state:'hidden', text:'This path has not been discovered yet.' };
  }
  if (path.id === 'stars') {
    if (questState('ranni') === 'complete') return { state:'ready', text:'Ranni’s tracked quest checklist is complete.' };
    return flags.ranniStory || questState('ranni') !== 'unseen' ? { state:'progress', text:'Ranni’s path is active.' } : { state:'hidden', text:'This path has not been discovered yet.' };
  }
  if (path.id === 'frenzy') {
    if (flags.frenziedNullified) return { state:'closed', text:'The Frenzied Flame was removed and cannot be reclaimed this playthrough.' };
    if (flags.frenziedFlame) return { state:'ready', text:'The Frenzied Flame currently overrides every other ending.' };
    return flags.frenziedProscriptionGrace || questState('hyetta') !== 'unseen' ? { state:'progress', text:'A dangerous alternative path has been discovered.' } : { state:'hidden', text:'This path has not been discovered yet.' };
  }
  return { state:'progress', text:'Path state is not yet confirmed.' };
}

export function endingPriority(questId, targetId) {
  const target = ENDING_PATHS.find(path=>path.id===targetId);
  return target?.questIds.includes(questId) ? 2 : 0;
}

export function endingWarning(targetId, flags = {}) {
  if (!targetId || targetId === 'undecided') return null;
  if (targetId !== 'frenzy' && flags.frenziedFlame && !flags.frenziedNullified) {
    return { level:'danger', title:'Your chosen Mending Path is blocked', text:'The Frenzied Flame currently overrides the ending you selected. The reversal route requires Millicent’s quest, Malenia, and Miquella’s Needle.' };
  }
  return null;
}
