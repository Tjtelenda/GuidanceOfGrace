# Build and verification — 0.6.0

## Delivery

- Installed executable: `C:\Users\trent\AppData\Local\Programs\Guidance of Grace\Guidance of Grace.exe`.
- Start Menu: `C:\Users\trent\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Guidance of Grace.lnk`.
- Desktop: `C:\Users\trent\OneDrive\Desktop\Guidance of Grace.lnk`.
- Installer: `dist/Guidance of Grace Setup 0.6.0.exe`; retained copy in Downloads.
- SHA-256: `90d8b8a3b0447bf973d914ac3f250281642bf0f361f079415228ea162b8c1a08`.
- Public repository: https://github.com/Tjtelenda/GuidanceOfGrace, branch `main`.
- Release target: https://github.com/Tjtelenda/GuidanceOfGrace/releases/tag/v0.6.0.
- Windows 11, Node 24.19.0, Electron 44.3.0, electron-builder 26.16.1; unsigned NSIS installer. SmartScreen may warn.

## Proof

The installer ran with exit code 0. Installed acceptance confirmed version 0.6.0 and the installed `resources/app.asar` path. Proof JSON and screenshots are local in ignored `acceptance-artifacts/`, because they contain personal save details.

| Command | Result |
| --- | --- |
| `npm test` | PASS: six suites, including 13 failure/lifecycle simulations |
| `node tests/test-local-save.mjs C:\Users\trent\AppData\Roaming\EldenRing\76561198409539987\ER0000.co2` | PASS: both parsers agree, all 207 event addresses resolve; save hash unchanged |
| `node tests/test-save-parser.mjs ..\elden-ring-work\backup-20260915-011419\76561198409539987\ER0000.co2` | PASS: original historical real-save regression |
| `node node_modules/electron-builder/cli.js --win nsis --publish never` | PASS: production NSIS installer |
| `node tests/acceptance-installed.mjs` | PASS: installed application, not development copy |

Acceptance uses `PLAYWRIGHT_MODULE=C:\Users\trent\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright\index.mjs` and Node 24.19.0.

Installed flows: journey chooser; disposable solo and Seamless journeys; Story Host/Joiner and Show All isolation; real save discovery and parsing; Scadutree 10 / Spirit Ash 5 for ScarletThot; smithing stone search and map; NPC search → Where → map → thread; Ledger; Books; export/import through real IPC with deterministic native-dialog responses; synthetic WebM playback inside the app; close/pause; persisted state after restart; missing-character simulation preserves bound character. Exactly one app window and no Ctrl+Shift+G/M global registrations. No renderer errors.

Knowledge network update succeeded. Before first GitHub release, app updater correctly reported unavailable feed and remained usable; live-feed verification is recorded below after publication. Data rollback, malformed-data rejection and offline fallback pass deterministic tests. Game lifecycle/final-read behavior uses simulations; no game process was launched or modified for testing.

Idle sample after acceptance: all four Electron processes reported 0% CPU over the sampled interval. This is a short observation, not a gaming benchmark. Background process polling is optional and disabled when both lifecycle options are off; save notifications are deduplicated and only the visible screen is rendered.

## Content versions and counts

Bundled pinned MIT encounter snapshot: BuLEEto/ER_Boss_Kill_Checklist, verified 2026-09-15. Exactly **207 distinct encounter IDs**, **42 DLC**. Knowledge digest: `ba0fd97e989d7b19c9d338106d98aaeb6bdf7fa0859a88aedef1fffc6c88e14e`.

Bundled search index: 207 encounters, 167 locations, 39 NPC threads, 9 Forge Supply chains, 25 story entries, 64 glossary entries, 12 quest items: **523 records**.

Additional local index: **14,481 records** — 3,347 pickups; 413 graces; 659 map locations; 34 map fragments; 2,341 goods; 4,705 weapon/variant entries; 818 armor entries; 158 accessories; 483 NPC names; 1,007 places; 249 gems; 265 arts; 2 internal magic-table entries (not a spell count). Total searchable records before spoiler filtering: **15,004**. Categories overlap semantically; this is not a count of unique obtainable items.

Local source: egormagurin/EldenRingMap `48f42e570ada1dd28717d7ce56aaeb92ee14521b`; generated 2026-09-15T19:37:28.563Z, installed executable file version 2.7.1.0. Extracted data/maps remain in local application data and are not in GitHub or installer. See LOCAL_KNOWLEDGE.md for coverage gaps and import/generation provenance.

## Limits and review

- Direct `.bk2` game-movie playback is unsupported; supported MP4/WebM/Ogg videos play inside the app. No game videos redistributed.
- Local pickup/drop coverage is substantial, not exhaustive. Some map item lots are unresolved; weapon variants are counted separately.
- Live-game exit timing and long-session performance still benefit from manual gameplay verification; deterministic process/save simulations pass.
- Installed acceptance exercises visible core flows, not every quest branch. Save world flags, especially Seamless propagated flags, remain evidence rather than certainty about completed dialogue.
- Ponytail was unavailable. Full-diff review and an independent bounded review found no release blockers. No overlay implementation remains packaged.
- Packaged ASAR audit: 352 entries; no `.sl2`, `.co2`, `.bak`, `.grace` or overlay HTML/CSS/JS.

## Original source

Canonical archive SHA-256: `2cfcd0caabb1911dc4866d634e06121066ff563b62f88c6e66ca55d7a2f73e6c`. All 51 SOURCE_MANIFEST entries verified before editing. Original source retained in commit `3af9e82`. Obsolete V4 handoff was not used. Original tests passed before implementation.
