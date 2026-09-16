# Feature audit — current V5 source

| Area | Implemented | Verification |
|---|---|---|
| Companion safety | Read-only save/game inputs, no memory access or injection | Static tests; real saves unchanged during completed parser tests |
| Journeys | `.grace` autosave/import/export; separate runs and profiles | Storage tests pass; installed round-trip pending |
| Save parsing | Structural PlayerGameData walk, bounded 20/10 blessings, active slots only | Original and current real-save tests pass |
| Imported flags | Unknown blocks remain unconfirmed; lookup table reused | Synthetic regression passes; installed retest pending |
| Watch/lifecycle | Stable writes, debounce, stale-read cancellation, final delayed read and companion-save acknowledgement | Deterministic unit tests; live game behavior not exercised |
| Overlay | External interactive window; configurable guidance/map hotkeys, up to two NPCs | Source/static proof; real hotkey acceptance deferred during gameplay |
| Spoilers | Per-profile Show All, veiled future steps/endings, hidden unconfirmed boss identity | Data tests; complete installed UI proof pending |
| NPCs | 39 grouped threads including 12 DLC threads | Internal consistency verified; manual NPC checklist remains necessary for dialogue choices |
| Risks | 14 transitions including six DLC transitions | Data checks; flags are evidence, not exact live proximity detection |
| Mending Paths | Target priorities, discovered-path gating, Frenzied Flame override/reversal state | Logic reviewed; not every game branch played live |
| Ledger | 207 distinct encounter IDs / 42 DLC, derived dungeon locations, save evidence and manual overrides | Exact counts and all event addresses pass |
| Forge Supply | Four regular and five somber miner bell bearings | Search-chain regression passes |
| Search/data | Curated archive plus 14,481 locally generated records; normalized multiword search | Import/search tests; pickup-level coverage exceptions documented |
| Local map | Requested-target crop from locally extracted image | Extraction complete; installed crop interaction pending |
| Books of Knowledge | Gated story/glossary links, labeled theories, linked videos and movie-folder action | Content tests; installed UI proof pending |
| Session planner | Time budget, NPC windows, ending priority, supply, DLC readiness and local activity estimates | Budget/priority unit test passes |
| Knowledge updates | Trusted URL/identity, schema/checksum validation, atomic previous cache, offline fallback | Live public update and rollback/offline tests pass |
| Application updates | electron-updater with explicit unconfigured state until a real repository exists | No GitHub credentials; no live release available |
| Windows installation | NSIS, tray, Start Menu and desktop shortcut configuration | Installed 0.5.1; newer source still needs reinstall |

## Limits that must remain explicit

- The encounter catalog is complete for its pinned source; it is not an exhaustive pickup catalog.
- Local extraction resolves 3,347 pickup positions and reports unresolved source records. Dictionary entries include variants and are not unique-item counts.
- Dialogue exhaustion, branches, lockouts and co-op propagation sometimes require manual confirmation. Save evidence must not be presented as proof of every NPC conversation.
- The external map cannot place markers inside Elden Ring. It intentionally does not hook the game's input.
- Remote portraits are optional and off by default; offline initials are the fallback. Game images/videos are not redistributed.
- No signing certificate or authenticated GitHub CLI was available. This does not prevent local installation.
- Installed end-to-end acceptance is incomplete while the user requires uninterrupted gameplay.
