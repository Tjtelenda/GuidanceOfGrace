# Build and verification record

## Canonical source

- Canonical V5 archive SHA-256: `2cfcd0caabb1911dc4866d634e06121066ff563b62f88c6e66ca55d7a2f73e6c`.
- Attached archive used because the named archive was not in Downloads. Project root: `guidance-of-grace-v5`.
- All 51 entries in the archive's `SOURCE_MANIFEST.txt` verified before edits. That manifest describes the original archive, not the modified release.
- Obsolete V4 chunked handoff was not used.
- Original source retained in Git commit `3af9e82`.

## Completed proof on this PC

- Windows 11; production build tooling Node 24.19.0; Electron 44.3.0; electron-builder 26.16.1.
- Original four test modules passed before implementation (Windows test-runner URL conversion fixed; assertions unchanged).
- `npm test`: all five suites pass, including the added V5 suite.
- `node --check app.js` and `node --check desktop/main.js`: pass.
- `node tests/test-save-parser.mjs ..\elden-ring-work\backup-20260915-011419\76561198409539987\ER0000.co2`: original historical real-save assertions pass.
- `node tests/test-local-save.mjs C:\Users\trent\AppData\Roaming\EldenRing\76561198409539987\ER0000.co2`: both parsers agree, all 207 encounter event addresses resolve, hash unchanged.
- Current save at that check: ScarletThot Lv433, blessings 10/5; Bonk-naza Lv11, 0/0; A Mohg Us Lv61, 0/0. The older fixture retains Lv23 and is tested separately.
- Current-save hash at that check: `95f5823a11d071864fdcad0c198b6c04b5492c4d102712fe07290f0b9bce3197`. Gameplay after this test will naturally change it.
- Trusted encounter network update succeeded: 207 records, content version `ba0fd97e989d7b19c9d338106d98aaeb6bdf7fa0859a88aedef1fffc6c88e14e`.
- Local extraction/import: 14,481 indexed records; three local map layers extracted with zero failed tiles. Coverage limitations are in LOCAL_KNOWLEDGE.md.
- NSIS builds 0.5.0 and 0.5.1 succeeded, and both installers ran with exit code 0.
- Installed path: `%LOCALAPPDATA%\Programs\Guidance of Grace\Guidance of Grace.exe`.
- Start Menu shortcut verified: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Guidance of Grace.lnk`.
- Packaged launch and journey chooser visually verified. `appInfo` confirmed the installed `resources\app.asar` path, not a development copy.

## Acceptance still in progress — not a completion claim

The installed acceptance script exposed a character-chooser timeout after adding imported marker flags. Source now caches the event lookup table and skips unsupported imported flag blocks instead of failing the character parse. These changes, plus subsequent spoiler/lifecycle refinements, are newer than the installed 0.5.1 build and still require rebuild/reinstallation and rerunning installed acceptance.

The user is playing Elden Ring and explicitly requested background work only. The companion is closed. No visible launches, hotkey tests, new game extraction, live-save reads or heavy installer builds are being run during that restriction. Final installed search/journey/map/overlay/persistence/update checks and final installer hash remain pending.

Ponytail was not available among installed tools/skills/workflows. A manual full-diff review is being performed; no Ponytail review is claimed.
