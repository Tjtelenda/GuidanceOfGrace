# Feature audit — V4

This audit is scoped to the product goal: let a new Elden Ring player discover naturally while an attentive companion prevents meaningful misses, keeps the group story in order, and gives experienced friends optional second-screen context.

## Included

- Single Player and Seamless Co-op modes.
- Story Host / Joiner coordination in Seamless.
- Read-only automatic `.sl2` / `.co2` save watching.
- Per-character local profiles.
- Parsed Rune Level, Scadutree Blessing, and Revered Spirit Ash Blessing.
- Conservative host/joiner evidence confidence.
- Global-hotkey interactive overlay.
- Edge-triggered progression-risk warnings.
- Current-area NPC suggestions with click-through to full tracker.
- Second-monitor NPC checklist/history layout.
- Fogged **Veiled by grace** future checkpoints.
- Low / Balanced / Full Guide spoiler modes.
- Save-gated NPC visibility.
- Save-gated story beats, glossary, theory, and videos.
- Mending Paths ending helper with selected-path prioritization/conflict warnings.
- Optional folded **Tarnished insight** boss weakness/tip/edge guidance.
- Quest-item ownership evidence where verified.
- Rune-level and DLC blessing readiness guidance.
- Time-budgeted **What should we do tonight?** planning.
- Journey Ledger completion UI.
- MIT full-boss catalog sync pipeline.
- Windows game/process lifecycle and combined launcher scaffolding.
- Final post-exit save read.
- GitHub Releases update scaffold and manual update button.
- Tracker export/import and optional cloud scaffold; cloud is never required.

## Important implementation choices

### Story Host instead of everyone advancing NPCs

Seamless synchronizes NPC talk events and progression. For a story-first group, Joiner mode warns players to let the designated Story Host initiate story dialogue. This minimizes the chance that a joiner advances the shared talk state before the new player hears the earlier dialogue.

### Separate overlay instead of injected overlay

The overlay is an always-on-top transparent Electron window. No process-memory reads, DLL injection, graphics hooks, or anti-cheat bypasses are used.

### Save checkpoints instead of fake live boss-fog telemetry

The app reacts to reliable save-visible signals such as pre-boss graces, region arrivals, and world-state flags. It never claims to know an exact live action the save cannot represent.

### Parsed blessing levels

V4 no longer relies on manual Scadutree entry as the normal path. It locates PlayerGameData dynamically and reads Scadutree/Revered Spirit blessing values from verified save fields. Manual Scadutree input remains a fallback only.

### Ending helper is advisory only

Mending Paths changes companion prioritization and warnings, never the save. Most ending questlines may coexist. Frenzied Flame is modeled as the exceptional ending-state lock until reversed.

## Not included by design

- Save writing or automatic quest repair.
- ReadProcessMemory / WriteProcessMemory.
- DLL or DirectX injection.
- EAC bypasses.
- Admin privileges for normal operation.
- Claims of exact NPC dialogue state from weak/generic flags.
- Automatic opening of spoiler-heavy lore content before its save gate.
- Redistribution of copyrighted map art from another project without permission.

## Not yet release-proven

- Electron runtime and overlay on an actual Windows gaming desktop.
- NSIS installer.
- GitHub updater against a real `guidance-of-grace` Releases feed.
- Vendored exhaustive Journey Ledger catalog: the sync script is implemented but this container cannot reach `raw.githubusercontent.com`.
- Full non-boss POI/dungeon/map marker extraction from the installed game.
- Every quest permutation/event flag against live gameplay captures.

Those items are mandatory Work/release acceptance, not optional future polish.
