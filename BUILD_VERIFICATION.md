# Build verification — desktop V4 / v0.5.0

## Environment and fixture

- Linux container, Node.js 22
- Acceptance save: `/mnt/data/ER0000.co2`
- Backup fixture: `/mnt/data/ER0000.co2.bak`

The acceptance saves were opened read-only. No game-save write path exists in the project.

## Full regression proof

Executed:

```bash
cd /mnt/data/elden-ring-companion
node --check app.js
node --check content/mending-paths.js
node --check desktop/save-monitor.js
node tests/run.mjs
node tests/test-save-parser.mjs /mnt/data/ER0000.co2
```

Result:

```text
PASS: 39 NPC threads, 14 progression warnings, current-thread gating, spoiler data, evidence keys, and map metadata are internally consistent.
PASS: 12 DLC NPC threads, 6 DLC transition warnings, story/glossary, level guidance, videos, and quest-item links are internally coherent.
PASS: single/co-op settings, Story Host rules, host/joiner confidence, game detection, save diffs, readiness, and overlay notification rules.
PASS: required desktop/story/UI surfaces exist; save watching is read-only; no process-memory injection; cloud scaffold uses RLS and no privileged browser credential.
PASS: parsed supplied Seamless save, blessing levels, boss-approach/world-state flags, conservative progression, malformed-file guard, and backup parity.
```

## DLC blessing acceptance

The dynamic PlayerGameData locator and read-only blessing parser returned:

```text
ScarletThot   Scadutree 10 / Revered Spirit Ash 5
Bonk-naza     Scadutree 0  / Revered Spirit Ash 0
A Mohg Us     Scadutree 0  / Revered Spirit Ash 0
```

These assertions are part of `tests/test-save-parser.mjs`.

## V4 behavior explicitly protected

- Single Player and Seamless mode normalization.
- Story Host / Joiner dialogue coordination rule.
- Single Player/Story Host evidence versus cautious Joiner shared-world evidence.
- Two clickable nearby-NPC threads in the overlay.
- Second-monitor NPC tracker and veiled future checkpoints.
- Mending Paths remain hidden until relevant and undiscovered ending paths render as veiled cards.
- Major-challenge naming policy: upcoming boss name is hidden outside Full Guide.
- Optional boss help is folded under a themed disclosure.
- Session time budget and estimates.
- Desktop full active event IDs feed Journey Ledger auto-checks.
- Scadutree/Revered Spirit blessing parsing.
- Original V3 real-save regressions.

## Static trust-boundary proof

Executed scans found:

```text
HTML IDs: 108 unique / 108 total
save-write scan: PASS
process-memory/injection scan: PASS
save files inside project: none
```

The automated static test also verifies context-isolated preload use, Supabase RLS scaffolding, and no privileged cloud credential in renderer code.

## Journey Ledger catalog sync

Attempted:

```bash
node scripts/sync-boss-catalog.mjs
```

The container cannot resolve `raw.githubusercontent.com` and returned `getaddrinfo EAI_AGAIN`, so `content/generated-bosses.js` remains an explicit placeholder in this snapshot. The source pipeline and UI are ready, but Work/CI must run the sync in a networked environment before the release may claim exhaustive boss/sub-boss coverage.

Upstream: `BuLEEto/ER_Boss_Kill_Checklist` (MIT). The separate non-boss POI/dungeon/map audit remains a Work acceptance item and should prefer extracting map/marker data from the user's own game install rather than redistributing FromSoftware assets.

## Electron / Windows packaging limitation

This environment cannot reliably install/resolve npm packages, so it cannot honestly prove:

- Electron rendering on Windows;
- global hotkey behavior over Elden Ring;
- Windows launcher/process discovery;
- live watcher behavior through the installed npm parser package;
- NSIS packaging;
- GitHub Release updater behavior.

Those are explicit Work tasks in `WORK_HANDOFF.md`.

## Final simplification / diff review

Ponytail is not installed or exposed in this session (`command -v ponytail` and a local skill/file search returned nothing), so the requested Ponytail ultra/final-review run cannot be claimed. A manual scope/security/simplification review was performed instead.

The review fixed one root-cause completion bug: normalized desktop saves now expose every active `eventId`, allowing Journey Ledger to auto-check generated encounter flags. It also reduced the overlay from five NPC suggestions to the requested two and corrected Journey Ledger layout/accessibility after adding optional boss disclosures.

No unrelated files, debug breakpoints, game saves, build outputs, or backup copies are included in the project directory.
