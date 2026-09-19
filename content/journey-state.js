// One local character per journey. Preserve older extra profiles for recovery,
// but never treat them as live remote players or merge their progress.
export function localPlayerState(raw) {
  if (raw?.player && typeof raw.player === 'object') return raw.player;
  const profiles = Array.isArray(raw?.profiles) ? raw.profiles : [];
  const active = Number.isInteger(raw?.active) && raw.active >= 0 && raw.active < profiles.length ? raw.active : 0;
  return profiles[active] ?? {};
}

export function migrateJourneyState(raw, cleanPlayer, fallback) {
  const legacyProfiles = Array.isArray(raw?.legacyProfiles) ? raw.legacyProfiles :
    Array.isArray(raw?.profiles) ? raw.profiles.filter((_, index) => index !== (raw.active ?? 0)) : [];
  return {
    version: 4,
    player: cleanPlayer(localPlayerState(raw), fallback),
    ...(legacyProfiles.length ? { legacyProfiles } : {}),
  };
}
