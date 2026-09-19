# Feature audit — 0.6.0

Installed acceptance and publication are in progress. Final evidence belongs in [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md).

| Area | Current behavior | Verification or limitation |
| --- | --- | --- |
| Safety | Read-only game/save inputs; overlay and global hotkeys removed | Final package and installed checks required |
| Player model | One local player per journey; solo/Seamless isolation; legacy profile recovery | Remote players are not tracked |
| Save parsing | Structural PlayerGameData locator and bounded blessings | Prior real-save checks passed; malformed-input regressions retained |
| Monitoring | Stable writes, shared reads, unchanged suppression, stale-read cancellation | Deterministic lifecycle tests; live gameplay remains separate verification |
| Performance | Active-view rendering, cached/debounced search, conditional 10-second polling | Installed responsiveness checked during acceptance |
| Navigation | Current guidance first; secondary tools under More | Designed for a second screen with less explanatory clutter |
| Spoilers | Journey-local Show All; hidden future steps and unconfirmed boss identities | Explicit searches and Full Guide can reveal more |
| NPCs and risks | 39 grouped threads including 12 DLC threads | Dialogue and propagated co-op state may need manual confirmation |
| Mending Paths | Discovered paths, priorities and Frenzied Flame override/reversal | Not every branch has been played live |
| Ledger | 207 unique encounters / 42 DLC | Complete for pinned encounter source, not exhaustive item data |
| Forge Supply | Four regular and five somber miner bell bearings | Search-chain regression coverage |
| Search and map | Curated archive plus 14,481 local records and map crops | 3,347 pickup positions; variants and unresolved records documented |
| Books and video | Gated story/glossary, labeled interpretations, inline local MP4/WebM | Synthetic playback tested in 0.5.4; .bk2 unsupported |
| Session planning | Time budget, NPC windows, ending priorities and readiness | Estimates are advisory |
| Knowledge updates | Trusted identity, schema/checksum checks, atomic cache, offline fallback | Rollback and failure simulations |
| App updates | Public GitHub release provider configured | 0.6.0 publication and final feed check pending |
| Windows delivery | NSIS, Start Menu and desktop shortcuts | Installed 0.6.0 acceptance in progress |

## Data boundaries

See [LOCAL_KNOWLEDGE.md](LOCAL_KNOWLEDGE.md) for provenance and extraction exceptions. Dictionary variants are not unique-item counts. Save flags do not prove every conversation or exact player proximity.

Game images/videos are not redistributed. Optional remote portraits default off. No Windows signing certificate is configured; this does not prevent installation.
