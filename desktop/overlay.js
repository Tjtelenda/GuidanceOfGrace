const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function render(payload = {}) {
  $('#area').textContent = payload.area || 'Waiting for save…';
  $('#character').textContent = payload.character || '';
  $('#hotkey').textContent = payload.hotkey || 'Ctrl+Shift+G';
  $('#mapHotkey').textContent = payload.mapHotkey ? ` · map ${payload.mapHotkey}` : '';
  document.body.classList.toggle('map-mode', payload.overlayMode === 'map');
  const target=payload.mapTarget, targetSection=$('#mapTargetSection');targetSection.classList.toggle('hidden',!target);if(target){$('#mapTargetName').textContent=target.name||'Pinned guidance';$('#mapTargetLocation').textContent=[target.regionName||target.region,target.location].filter(Boolean).join(' · ');$('#mapTargetHint').textContent=target.hint||'';}
  $('#role').textContent = payload.role || '';
  $('#role').classList.toggle('hidden', !payload.role);
  const readiness = payload.readiness || { state:'unknown', text:'Level unavailable' };
  $('#readiness').textContent = readiness.text;
  $('#readiness').className = `chip ${readiness.state || ''}`;

  const dialogue=payload.dialogue;const dialogueBox=$('#dialogueRule');dialogueBox.classList.toggle('hidden',!dialogue);dialogueBox.className=`warning ${dialogue?.level||'note'}${dialogue?'':' hidden'}`;dialogueBox.innerHTML=dialogue?`<p class="eyebrow">CO-OP DIALOGUE</p><h2>${esc(dialogue.title)}</h2><p>${esc(dialogue.text)}</p>`:'';

  const warnings = payload.warnings || [];
  $('#warnings').innerHTML = warnings.slice(0,3).map(w => `<article class="warning ${esc(w.level)}"><p class="eyebrow">${w.aftermath?'JUST CHANGED':'BEFORE YOU MOVE ON'}</p><h2>${esc(w.title)}</h2><p>${esc(w.text)}</p>${w.questId?`<div><button data-quest="${esc(w.questId)}">Open NPC thread →</button><button data-map-quest="${esc(w.questId)}">Where? ⟡</button></div>`:''}</article>`).join('');

  const npcs = payload.npcs || [];
  $('#npcsSection').classList.toggle('hidden', npcs.length === 0);
  $('#npcs').innerHTML = npcs.slice(0,2).map(n => `<article><strong>${esc(n.name)}</strong><span>${esc(n.hint)}</span>${n.location?`<small>${esc(n.location)}</small>`:''}<div><button data-quest="${esc(n.id)}">Open thread →</button><button data-map-quest="${esc(n.id)}">Where? ⟡</button></div></article>`).join('');

  const suggestions = payload.suggestions || [];
  $('#suggestionsSection').classList.toggle('hidden', suggestions.length === 0);
  $('#suggestions').innerHTML = suggestions.slice(0,3).map(s => `<article><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></article>`).join('');
}

document.addEventListener('click', event => {
  const quest = event.target.closest('[data-quest]');
  if (quest) window.guidanceDesktop?.overlayAction({ type:'quest', id:quest.dataset.quest });
  const mapQuest=event.target.closest('[data-map-quest]');if(mapQuest)window.guidanceDesktop?.overlayAction({type:'quest-map',id:mapQuest.dataset.mapQuest});
});
$('#close').addEventListener('click', () => window.guidanceDesktop?.toggleOverlay());
$('#openApp').addEventListener('click', () => window.guidanceDesktop?.showMain());
$('#openMapTarget').addEventListener('click',()=>window.guidanceDesktop?.overlayAction({type:'map-target'}));
window.guidanceDesktop?.onOverlayPayload(render);
window.guidanceDesktop?.getSettings().then(settings => render({ hotkey:settings.overlayHotkey, mapHotkey:settings.mapOverlayHotkey, role:settings.playMode === 'single' ? 'Single Player' : settings.multiplayerRole === 'host' ? 'Story Host' : 'Joiner' }));
