# Content and technical sources

Guidance of Grace separates reusable open-source data, factual save-format references, external links, and copyrighted game assets.

## Reusable open-source projects

### zebbedaja/er-save-parser — MIT
Used as the runtime desktop event-flag parser and a cross-check for BND4/SL2 layout, map names, and event IDs.

### BuLEEto/ER_Boss_Kill_Checklist — MIT
Used as the vendored source for the complete boss/sub-boss event-flag catalog. Its project already supports read-only live save watching and Seamless saves. `scripts/sync-boss-catalog.mjs` converts its `bosses.json` into our offline `content/generated-bosses.js` format.

### mhogeveen/er-quest-tracker — MIT
Reviewed as a reference for NPC quest organization. Guidance of Grace uses its own spoiler-gated data model and UI.

### CyberGiant7/Elden-Ring-Automatic-Checklist — MIT
Reviewed for automatic checklist ideas and save-driven completion patterns.

## Technical format reference

### oisis/EldenRing-SaveForge — GPL-3.0
Used only as a **format research/reference source**, not copied into this project. Its documented PlayerGameData layout informs the structural locator. The blessing offsets `-187` (Scadutree) and `-186` (Revered Spirit Ash) were separately checked against local saves and the independent runtime parser; the specification alone is not proof of those offsets. Guidance of Grace contains its own small read-only implementation of those factual offsets.

## Map/live-sync projects reviewed

### egormagurin/EldenRingMap
Useful design precedent for live map sync and, importantly, for generating map data/assets from the user's own Elden Ring installation instead of redistributing copyrighted game art. No standalone redistribution license was confirmed. Selected extraction scripts run only from an ignored local checkout; none are distributed with this app. See LOCAL_KNOWLEDGE.md for the pinned commit, local outputs and coverage limits.

### jw-ofs/elden-ring-map
Reviewed for comprehensive map/marker/quest data organization. License/asset provenance must be verified before reuse; no code is currently copied.

## Seamless Co-op behavior

The current Seamless Co-op documentation states that NPC dialogue/talk events and game progression events are synchronized. Guidance of Grace therefore uses a Story Host/Joiner convention for story-first multiplayer and warns joiners before important NPC interactions.

## Ending rules

Mending Paths follows the game's ending behavior: the normal Elden Lord variants and Ranni path can be unlocked in parallel and selected at the conclusion when their requirements are met. Inheriting the Frenzied Flame is treated separately because it overrides the other endings until removed with Miquella's Needle.

## Community guides, theories, videos, and readiness ranges

These are secondary guidance, never authoritative save state. Theory is labeled as theory. External videos remain external links and are spoiler-gated.

## Copyrighted game assets

Do not commit extracted FromSoftware map tiles, icons, screenshots, or other game assets to this repository or releases unless distribution rights are confirmed. Prefer an install-time/local extractor that builds those assets from the user's own installation.

## Additional projects audited for V4

- **Ghostbroker/elden-ring-progression-tracker — GPL-3.0.** Strong cross-check for scope: 208 bosses, 418 Sites of Grace, base game + Shadow of the Erdtree, and Seamless `.co2` support. Because it is GPL-3.0, no code/data is copied into Guidance of Grace without deliberately accepting GPL obligations.
- **Evendyce/Elden-Ring-Tracker — MIT code / CC BY-NC-SA 4.0 guide content.** Useful reference for spoiler-aware route/checklist UX and stable route IDs. Its guide prose is not copied.
- **egormagurin/EldenRingMap.** Strong reference for locally extracting map art/icons/markers from the user's own Elden Ring installation and live-syncing thousands of markers. No redistribution license was confirmed. Selected extraction scripts were used locally, outside the distributed application; see LOCAL_KNOWLEDGE.md.
- **jw-ofs/elden-ring-map.** Strong reference for map marker density, quest fly-to behavior, and offline map UX. No reusable license was confirmed in the repository view used for this audit, so it is treated as research only.

The preferred release combination is therefore: MIT boss/event catalog from BuLEEto + MIT runtime parser from zebbedaja + our original spoiler/story logic + a locally generated map/POI layer derived from the player's own game install.
