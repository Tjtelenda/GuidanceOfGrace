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

## Release completed

0.6.0 is installed, acceptance-tested and published at https://github.com/Tjtelenda/GuidanceOfGrace/releases/tag/v0.6.0. The installed updater reports this release as current. See BUILD_VERIFICATION.md for exact proof, paths and hash. Disposable named acceptance journeys were archived outside application data; existing other journeys were retained.

Keep future work scoped to the second-screen companion. Remaining limitations: direct Bink 2 playback, unresolved local item lots, broader quest-by-quest factual review and manual long-session/game-exit testing. There is no live remote-player tracking. Do not reintroduce the overlay or global hotkeys.
