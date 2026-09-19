# Guidance of Grace

A Windows-first, offline Elden Ring + Shadow of the Erdtree companion for a second screen. Reads local .sl2 or Seamless .co2 saves and keeps companion progress in .grace journeys.

## Version 0.6.0

One local player, current guidance and lower background overhead. The overlay and global hotkeys are removed. Primary navigation is quieter; secondary tools sit under **More**.

| Delivery | Status |
| --- | --- |
| Source | 0.6.0 second-screen application |
| Installed acceptance | PASS on Windows 11 |
| Public repository | [Tjtelenda/GuidanceOfGrace](https://github.com/Tjtelenda/GuidanceOfGrace) |
| 0.6.0 publication | [Published installer](https://github.com/Tjtelenda/GuidanceOfGrace/releases/tag/v0.6.0) |
| App update provider | Dedicated public repository configured |
| Knowledge updates | Separate validated cache with offline fallback |

See [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md) for current proof.

## Features

- One local character per journey; solo and Seamless runs stay independent. Legacy extra profiles are retained for recovery, not tracked as remote players.
- Relevant NPC threads, locations, progression warnings, Mending Paths and time-budgeted session suggestions.
- Future content hidden by default; deliberate Show All and optional Whisper of Grace details.
- 207 bundled encounters, including 42 DLC encounters, with save evidence and manual confirmations.
- Four regular and five somber miner bell-bearing supply chains.
- Curated archive and local catalog search; map targets stay inside the companion.
- Inline local MP4/WebM playback. Elden Ring .bk2 movies are not supported for inline playback.

Current local generation contains 14,481 records, including dictionary variants and 3,347 pickup positions. This is not exhaustive item coverage. See [LOCAL_KNOWLEDGE.md](LOCAL_KNOWLEDGE.md) for provenance and gaps. Extracted assets are not redistributed.

## Performance and safety

Save reads share in-flight work and suppress unchanged snapshots. Only the active screen is rendered. Search caches normalized records and debounces typing. Optional game-lifecycle detection uses conditional 10-second polling.

Game files and saves are read-only. No overlay, input hooks, memory access, injection, executable patching, anti-cheat bypass or Seamless modification.

## Development

Use Node 24 and run `npm ci`. If necessary, install the Electron binary with `node node_modules/electron/install.js`.

```text
npm test
node tests/test-save-parser.mjs <read-only-fixture.co2>
node tests/test-local-save.mjs <read-only-current-save.co2>
npm run dist:win -- --publish never
```

Installed acceptance uses Playwright's Electron API and disposable companion data. It opens windows and must target the installed executable. NSIS creates Start Menu and desktop shortcuts. Unsigned builds may receive a SmartScreen prompt.

See [GITHUB_SETUP.md](GITHUB_SETUP.md), [FEATURE_AUDIT.md](FEATURE_AUDIT.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The canonical source and manifest are preserved in the initial Git commit.
