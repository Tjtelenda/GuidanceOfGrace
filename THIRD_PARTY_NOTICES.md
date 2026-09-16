# Third-party notices

Guidance of Grace is an unofficial fan companion and is not affiliated with FromSoftware or Bandai Namco Entertainment.

## @zebbedaja/er-save-parser

MIT License. Runtime dependency/reference for Elden Ring save parsing and event/map data. Preserve its MIT notice when distributed.

## BuLEEto/ER_Boss_Kill_Checklist

MIT License. The release pipeline may vendor transformed boss/event-flag definitions from `bosses.json`. Preserve its copyright and MIT notice alongside the generated data.

The bundled 207-encounter snapshot is present, including 42 DLC encounters. Full license: [content/licenses/ER_Boss_Kill_Checklist.txt](content/licenses/ER_Boss_Kill_Checklist.txt), copyright (c) 2026 haxenabled.net. Encounter identities are event IDs; repeated boss names are intentional.

## mhogeveen/er-quest-tracker

MIT License. Reviewed as a quest-organization reference. No substantial source code is currently vendored.

## CyberGiant7/Elden-Ring-Automatic-Checklist

MIT License. Reviewed as an automatic-checklist reference. No substantial source code is currently vendored.

## oisis/EldenRing-SaveForge

GPL-3.0. Consulted as a save-format research source for factual PlayerGameData offsets, including DLC blessing fields. Guidance of Grace does **not** vendor or adapt SaveForge source code; do not copy GPL code into this project without intentionally changing the project's licensing strategy.

## Map projects

`egormagurin/EldenRingMap` and `jw-ofs/elden-ring-map` were reviewed for feature/data architecture. Their licenses and asset provenance must be verified before code/assets are copied. Current Guidance of Grace source does not vendor their map tiles.

On this computer only, `egormagurin/EldenRingMap` commit `48f42e570ada1dd28717d7ce56aaeb92ee14521b` was used as a local extraction tool. The reviewed repository had no standalone redistribution license file. Its code, Python dependencies, decoded game data and tiles are excluded from this repository and installer. Only the independently authored JSON adapter and local-runner interface are distributed. Do not distribute `.local-tools` or the user's knowledge/maps cache.

ERDB (`EldenRingDatabase/erdb`, MIT) was evaluated as an alternative structured-data generator. It requires an unpacked input workflow. No ERDB code or assets are copied here. The chosen local extractor can read installed archives directly without unpacking into the game folder.

## Elden Ring / Shadow of the Erdtree assets

Elden Ring, Shadow of the Erdtree, characters, names, maps, icons, screenshots, and related game assets belong to their respective rights holders. Release builds should prefer local extraction from a user's legally installed game for any copyrighted map/icon material rather than redistributing it.

## External community imagery/video

Remote NPC portraits and story-video links are optional references and are not bundled as user-owned assets. Before a public release, review every vendored image individually for permission/license; fallback UI must remain functional if images are removed.

Remote portraits default to OFF. Initials are rendered offline. Enabling the optional portrait setting requests the linked community images; it does not cache or redistribute them. Videos remain links and metadata. The gold companion icon is original geometric artwork created for this application.

## Runtime dependencies

Electron and electron-updater are MIT licensed; Electron includes Chromium and its accompanying third-party notices. The installer retains Electron/Chromium license files and packaged dependency notices. `@zebbedaja/er-save-parser` is pinned to 0.1.13. Local Python extraction tools are not runtime dependencies of the packaged application.
