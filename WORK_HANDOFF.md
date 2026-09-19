# Work handoff — 0.6.0

## Current scope

Continue canonical V5; ignore the obsolete V4 chunked handoff. Latest direction: a calm second-screen companion for one local player, no overlay, reduced resource use and useful guidance instead of feature-explanation tiles.

Visible building, installation and acceptance are authorized as of September 19. The earlier background-only restriction no longer applies. The user requested a bounded usage budget and PC shutdown after the night's release work.

## Implemented direction

- One local player per journey; legacy extra profiles retained only for recovery.
- No overlay or global overlay/map hotkeys.
- Shared save reads, unchanged suppression and conditional 10-second process polling.
- Active-view rendering, cached/debounced search and secondary navigation under More.
- Inline local MP4/WebM playback; proprietary .bk2 movies unsupported.
- Public target: [Tjtelenda/GuidanceOfGrace](https://github.com/Tjtelenda/GuidanceOfGrace), main. Authentication available.

## Remaining release work

1. Finish installed 0.6.0 acceptance and fix blockers.
2. Verify binding, NPC-to-map flow, search, Ledger, Books, Show All, persistence and update checks.
3. Confirm only the companion window exists and no global hotkeys are registered.
4. Run final tests, inspect packaged contents and record version, shortcuts, installer hash and results in BUILD_VERIFICATION.md.
5. Commit and publish verified source, installer, blockmap and update metadata. Confirm release availability.
6. Leave the app installed, provide the concise result report, then honor requested shutdown without forcing unrelated applications to discard unsaved work.

Do not claim acceptance or publication before verification. Data remains 207 bundled encounters / 42 DLC plus 14,481 local records with coverage limits. See LOCAL_KNOWLEDGE.md; do not claim exhaustive pickups or redistribute extracted assets.
