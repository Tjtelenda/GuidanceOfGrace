# Work handoff — Guidance of Grace V4

Finish and release the existing project. **Do not redesign it into a generic checklist.**

## Product outcome

A Windows-first offline Elden Ring companion for Single Player or Seamless Co-op. It reads the player's save continuously, keeps future content spoiler-gated, warns before progression/quest lockouts, provides an interactive hotkey overlay, and works well as a second-monitor tracker for a new Souls player.

## Source and fixture

```text
/mnt/data/elden-ring-companion
/mnt/data/ER0000.co2   # read-only acceptance fixture; never modify
```

## V4 features that must be preserved

- Single Player (`.sl2`) and Seamless (`.co2`) modes.
- Seamless Story Host vs Joiner coordination.
- Joiner warning: Seamless synchronizes NPC talk/progression; Story Host should initiate important dialogue first.
- Read-only auto-discovery/watching and final post-exit read.
- Ctrl+Shift+G interactive overlay; NPC cards open the full NPC tracker.
- Second-monitor NPC checklist + **What's already happened** history.
- Future steps obscured as **Veiled by grace**.
- Current-only NPC visibility in Explorer mode.
- **Major challenge ahead** by default; boss name only in Full Guide.
- Folded optional **Tarnished insight** weakness/tip/edge card.
- **Mending Paths** ending helper and path-aware priority/conflict warnings.
- **What should we do tonight?** with 30/60/90/120/180 minute budgets and estimates.
- Save-gated story/glossary/theory/video sections.
- Full base-game + Shadow of the Erdtree hand-authored NPC/transition data currently in source.
- Save-parsed Scadutree and Revered Spirit Ash blessing levels; manual Scadutree is fallback only.
- Journey Ledger full encounter UI and catalog sync pipeline.

## Exact real-save blessing acceptance

The V4 browser parser must continue to produce:

```text
ScarletThot  Scadutree 10 / Revered Spirit Ash 5
Bonk-naza    Scadutree 0  / Revered Spirit Ash 0
A Mohg Us    Scadutree 0  / Revered Spirit Ash 0
```

Do not replace this with a guessed fixed absolute offset. The parser locates PlayerGameData dynamically.

## Existing real-save regressions

- ScarletThot remains the high-level/endgame character.
- Bonk-naza remains early/Stormveil and does not get the Secluded Cell warning.
- A Mohg Us has Secluded Cell and gets the Stormveil pre-boss warning.
- Early characters do not see later Ranni/Seluvis/Dung Eater threads merely because they exist.
- No code path writes the game save.

## Mandatory completion work

1. Read current source/tests/docs before editing.
2. Run the user's Ponytail workflow at ultra intensity before implementation **if Work exposes it**. Do not invent a result if unavailable.
3. On a Windows-capable environment:

   ```powershell
   npm install
   npm test -- C:\path\to\ER0000.co2
   npm start
   ```

4. Verify the installed `@zebbedaja/er-save-parser` desktop path returns the same character/event/blessing behavior as the dependency-free acceptance parser.
5. Run `node scripts/sync-boss-catalog.mjs`; inspect/commit the generated catalog and preserve BuLEEto's MIT attribution. Confirm Journey Ledger counts all base+DLC boss/sub-boss encounters intended by the upstream catalog and that save-confirmed entries auto-check through `eventIds`.
6. Audit caves, catacombs, tunnels, hero graves, evergaols, field bosses, legacy dungeons, base game, and all Shadow of the Erdtree encounter groups. Add a game-install/local-extraction pipeline for non-boss POIs/map art rather than redistributing copyrighted assets.
7. Verify all hand-authored NPC quest gates/lockouts against current game data/community sources, especially DLC branch points.
8. Test Single Player and Seamless separately.
9. Test Seamless Story Host/Joiner UI around story NPCs. Joiner must get the dialogue coordination warning; Single Player must not.
10. Visually test second-monitor layout and fogged future quest rows.
11. Test Mending Paths: parallel normal paths, Frenzied Flame pre-door conflict warning, Frenzy override, Needle reversal state.
12. Test all session time budgets and activity estimates.
13. Test overlay click-through, focus restoration, edge-triggered notifications, and hotkey over a running game.
14. Test process lifecycle, combined launchers, auto-wake, close-after-game, and final read.
15. Build NSIS: `npm run dist:win`.
16. Create private `Tjtelenda/guidance-of-grace` if it still does not exist. Push this source; never commit a user `.co2/.sl2/.bak`.
17. Validate tagged GitHub Actions release + `electron-updater` feed. The temporary source handoff may be in `Tjtelenda/Telenda-Household` / `handoff/guidance-of-grace-v4`; do not use the household repo as the production updater feed.
18. Run final Ponytail review if available, apply behavior-preserving reductions, rerun proof, and report exact commands/results.

## Security boundaries

Do not add save writes, process-memory reads/writes, DLL injection, graphics hooks, EAC bypasses, normal-operation admin requirements, or privileged cloud keys in the renderer.

## Release honesty

Do not label Journey Ledger “exhaustive” until the full boss catalog has been generated and the non-boss POI/dungeon audit is complete. Do not claim a quest dialogue line is confirmed from a generic world flag when the save only supports inference.
