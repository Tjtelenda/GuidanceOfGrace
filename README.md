# Guidance of Grace

A Windows-first, offline Elden Ring + Shadow of the Erdtree companion. The Electron app reads `.sl2` and Seamless `.co2` saves and keeps its own progress in separate `.grace` journeys.

## Current delivery status

| Item | Status |
| --- | --- |
| Installed application | Version 0.5.1, Start Menu shortcut present |
| Latest source | Includes fixes newer than the installed build |
| Background tests | Six suites, including 11 failure/lifecycle simulations |
| Installed acceptance | In progress; visible testing paused during gameplay |
| GitHub | Local commits ready; account sign-in required |
| Application updates | Feed not configured yet |
| Knowledge updates | Independent validated encounter cache and local imports |

See [BACKGROUND_TESTING.md](BACKGROUND_TESTING.md) for simulation coverage and [GITHUB_SETUP.md](GITHUB_SETUP.md) for the exact remaining GitHub steps.

## Features

- Journey chooser, isolated Single Player/Seamless runs, three local profiles per journey, Story Host/Joiner roles, safe autosave and journey import/export.
- Spoiler-aware NPC checklists, current locations, progression warnings, Mending Paths, Books of Knowledge and timed session suggestions.
- Per-profile Show All, hidden future checkpoints, and optional Whisper of Grace encounter guidance.
- External interactive overlay: Ctrl+Shift+G; pinned map target: Ctrl+Shift+M. Both shortcuts are configurable.
- Read-only stable-save monitoring, optional tray/startup/game lifecycle integration, and launcher discovery.
- 207 bundled encounter records, including 42 DLC encounters; event-driven completion with manual overrides.
- Forge Supply covers all four regular and five somber miner bell bearings.
- Local searchable item/marker imports and independently versioned knowledge updates with validation and rollback.

The locally generated data on this PC adds 14,481 records and map crops. See [LOCAL_KNOWLEDGE.md](LOCAL_KNOWLEDGE.md) for exact categories, provenance, regeneration and coverage limitations. Extracted copyrighted game assets are not shipped in the installer or Git repository.

## Safety boundary

No save writes, memory access, game executable patches, anti-cheat bypass, DLL injection or Seamless modification. The overlay is a normal external window. Game/save inputs are read-only. Companion settings, journeys and knowledge live under `%APPDATA%\Guidance of Grace`.

## Development and verification

Use Node 24 (Electron 44 tooling requires Node >=22.12), then `npm ci` and `node node_modules/electron/install.js` if the Electron binary is absent. Commands:

```text
npm test
node tests/test-save-parser.mjs <original-read-only-fixture.co2>
node tests/test-local-save.mjs <read-only-current-save.co2>
npm run dist:win -- --publish never
```

`tests/acceptance-installed.mjs` tests the installed executable using Playwright's Electron API. Set `PLAYWRIGHT_MODULE` to an existing Playwright `index.mjs`, or install Playwright as a developer tool. It creates disposable companion journeys and never changes game saves. It opens windows and must not run while the user has requested uninterrupted gameplay.

The NSIS installer creates Start Menu and desktop shortcuts. Builds are unsigned unless a signing certificate is supplied; Windows SmartScreen can identify an unsigned installer as unrecognized. No certificate is required to produce a working installer.

App updates use electron-updater when a real release feed is configured. The dedicated private GitHub repository has not been created because `gh auth status` reported no authenticated account. The app reports this explicitly; knowledge updates still work. Never configure the app feed to the obsolete Household handoff.

See [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md) for current installed-test status and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licenses. The original canonical source is preserved in the first Git commit and its original `SOURCE_MANIFEST.txt`.
