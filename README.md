# Guidance of Grace

Guidance of Grace is a Windows-first, offline-first, spoiler-light companion for **Elden Ring**, **Shadow of the Erdtree**, vanilla single-player, and **Seamless Co-op**. It is built for a first-time Souls player who wants to explore naturally while the companion quietly prevents meaningful NPC/story misses and gives experienced friends a way to help without backseat-driving.

The desktop app watches the selected `.sl2` or `.co2` save read-only, derives the character's current progression, and feeds the same state into a second-monitor dashboard and an optional global-hotkey overlay.

## Core rules

- **Discovery first.** Give a nudge before an answer.
- **Warn before the irreversible action.** Use save-visible pre-boss graces, area transitions, and world-state flags as synchronization points.
- **Never write to the Elden Ring save.** No save editing, memory injection, DLL hooks, or anti-cheat bypasses.
- **Do not invent certainty.** Save evidence, manual confirmations, and Seamless shared-world evidence are labeled differently.
- **Only show content that is reasonable now.** Future NPCs, story beats, ending paths, and quest steps stay hidden or veiled until progression makes them relevant.
- **One source of truth.** The full app and overlay use the same derived character context.

## Play modes

### Single Player

Single Player prefers `ER0000.sl2`. All progression belongs to that character, so save-derived world evidence can be interpreted directly. Co-op coordination warnings disappear entirely.

### Seamless Co-op

Seamless prefers `ER0000.co2` and adds a story role:

- **Story Host** — the player designated to initiate important NPC conversations and story interactions.
- **Joiner** — receives a prominent reminder around story NPCs to let the Story Host advance dialogue first.

Seamless Co-op synchronizes NPC talk events and progression. For a story-first campaign, Guidance of Grace therefore treats the Story Host as the dialogue driver rather than assuming each player will retain an independent untouched conversation state.

Joiner saves are also interpreted more cautiously when a generic shared-world flag conflicts with stronger personal evidence such as rewards, graces, inventory/acquisition state, or manual confirmations.

## Desktop app and overlay

The Electron desktop shell provides:

- automatic `.sl2` / `.co2` discovery under `%APPDATA%\\EldenRing`;
- per-install character-slot binding and profile state;
- continuous read-only save watching with debounce;
- Elden Ring / Seamless process detection;
- optional run-at-login/background mode;
- optional final save read just after the game closes;
- combined launcher shortcuts for vanilla or Seamless;
- tray/background behavior;
- GitHub Releases updater plumbing and a manual **Check for Updates** action;
- a transparent always-on-top overlay opened with **Ctrl+Shift+G** by default.

The overlay is interactive. Current-area NPC suggestions can be clicked to bring the full app forward on that NPC's tracker page.

Automatic warnings are edge-triggered so one persistent risk does not reopen the overlay on every save write.

## Save parsing

The project reads character name, rune level, current map, last rested grace, event flags, selected item acquisition evidence, Great Runes, story/world-state flags, and DLC progression.

### Shadow Realm blessing levels

Guidance of Grace now parses the two DLC blessing values directly from the save:

- **Scadutree Blessing**
- **Revered Spirit Ash Blessing**

The implementation uses the save's dynamic PlayerGameData marker and reads the documented fields at offsets `-187` and `-186` from that marker. A manual Scadutree value remains only as a fallback if a future patch makes the dynamic marker unavailable.

Real acceptance save result:

```text
ScarletThot   Scadutree 10 / Revered Spirit Ash 5
Bonk-naza     Scadutree 0  / Revered Spirit Ash 0
A Mohg Us     Scadutree 0  / Revered Spirit Ash 0
```

## Guidance instead of spoilers

The home card intentionally says **Major challenge ahead**. The upcoming boss name is revealed only in Full Guide mode. A folded **Tarnished insight** section can optionally reveal a weakness, a field note, and a stronger edge/exploit-style tip where curated data exists.

Area readiness combines rune level, current location/progression, and, in Shadow of the Erdtree, the parsed Scadutree Blessing level.

These are broad comfort ranges, never requirements.

## NPC and side-story tracker

The current hand-authored story set contains **39 NPC threads**, including 12 dedicated Shadow of the Erdtree threads. Explorer mode surfaces only characters whose region/hub/checkpoint is currently reasonable or whose thread has already been manually started.

The tracker is designed for a second monitor. Each NPC card includes:

- checklist progress;
- save-evidence badges;
- **What's already happened** history built from confirmed checklist steps and save/world evidence;
- spoiler-light clue text;
- Low / Balanced / Full Guide reveal levels;
- relevant quest-item clues;
- current Mending Path priority where applicable.

Unreached future checkpoints remain visible only as **Veiled by grace** fogged rows rather than revealing their actual text.

## Before-you-move-on warnings

The transition engine watches pre-action save checkpoints rather than pretending it sees the exact moment a player enters boss fog.

Base-game examples include Stormveil's final approach, Altus/Radahn Festival activation, Redmane cleanup, Ranni/Seluvis around the Fingerslayer Blade, Volcano Manor before its lord, the Forge world-state transition, the Farum Azula capital transformation, and the Frenzied Flame door.

Shadow of the Erdtree includes the Realm entry, Miquella's charm break / Shadow Keep approach, Storehouse quest ordering, Messmer, St. Trina/Thiollier, Bayle/Igon/Priestess, and the Sealing Tree cleanup point.

When a selected ending path would be affected, the warning becomes path-aware.

## Mending Paths

**Mending Paths** is the ending helper. It stays hidden until ending choices are meaningfully relevant, then reveals paths as the character discovers or unlocks them.

Selecting a path never changes the game. It only changes Guidance of Grace priorities and warnings.

Supported targets:

- Undecided
- Age of Fracture
- Age of the Stars
- Age of Order
- Age of the Duskborn
- Blessing of Despair
- Lord of Frenzied Flame

Most optional ending questlines can be progressed in the same playthrough and chosen at the ending. The major exception is inheriting the **Frenzied Flame**, which temporarily overrides the other ending choices until the separate Miquella's Needle reversal route is completed. Guidance of Grace treats that door as an explicit ending-state warning and tells the player when it conflicts with the selected Mending Path.

## Story, glossary, and theories

The Story section is save-gated and includes:

- unlocked main-story beats;
- Shadow of the Erdtree beats;
- linked character/concept glossary pages;
- optional **Learn more about why this matters…** expansions;
- community interpretation/theory cards visually separated from confirmed facts;
- spoiler-gated external video links.

Future story chapters and glossary concepts do not appear simply because they exist in the database.

## Quest items

Important quest-item acquisition flags are used where reliable. If a currently relevant thread needs an item the save does not show as acquired, the tracker gives a spoiler-controlled clue and can point to its broad map region.

The app does not claim complete arbitrary inventory knowledge when no verified save field exists.

## Journey Ledger — exhaustive completion pipeline

A **Journey Ledger** UI is implemented for all encounter tracking. The release pipeline is designed to vendor the maintained MIT `BuLEEto/ER_Boss_Kill_Checklist` boss catalog, which already contains save event IDs for the full base game and DLC boss list and supports Seamless saves.

Run:

```bash
node scripts/sync-boss-catalog.mjs
```

This produces `content/generated-bosses.js`, after which Journey Ledger can auto-check save-confirmed bosses from the desktop parser’s full active event-ID set and manually track anything without reliable evidence.

The catalog also classifies boss-bearing caves, catacombs, tunnels, hero graves, evergaols, field encounters, legacy dungeons, and DLC encounters. A separate game-install-derived marker pipeline is the intended source for non-boss POIs and map art so the project does not redistribute FromSoftware assets.

**Do not claim exhaustive release coverage until Work/CI has successfully run the catalog sync and the game-install marker/map audit.**

## What should we do tonight?

The session planner asks **How much time do you have?** and supports 30, 60, 90, 120, or 180-minute budgets. Suggestions include approximate duration and are ranked from the character's current region, unfinished current NPCs, Mending Path priority, progression risk, and readiness.

The design goal is three sensible choices, not a wall of tasks.

## Maps and community assets

The app can operate without external imagery. The preferred release approach is to generate map art/icons from the user's own Elden Ring installation where feasible, following the same legal/safety pattern used by open-source live-map projects, rather than bundling copyrighted FromSoftware art.

Remote portraits are optional and fall back to initials if unavailable. Licenses/attribution must be verified before any community-created asset is vendored.

## Updates

The desktop shell supports GitHub Release update checks through `electron-updater`, plus a manual **Check for Updates** button. Until `Tjtelenda/guidance-of-grace` exists and signed/tagged Windows releases are configured, updater behavior is scaffolded rather than production-proven.

## Development

```bash
npm install
npm test -- /path/to/ER0000.co2
npm start
npm run dist:win
```

The current ChatGPT container cannot resolve npm packages, so dependency installation, real Electron rendering, global-hotkey verification, and NSIS packaging remain Windows/Work acceptance tasks.

## Safety boundary

Guidance of Grace must remain:

- read-only toward `.sl2` / `.co2` saves;
- non-injected;
- non-admin for normal use;
- offline-capable for all critical guidance;
- explicit when evidence is inferred rather than confirmed.

See `WORK_HANDOFF.md`, `BUILD_VERIFICATION.md`, `FEATURE_AUDIT.md`, `CONTENT_SOURCES.md`, and `GITHUB_HANDOFF.md` before release work.
