# Build and verification â€” 0.6.0 source

## Local review, 2026-09-30

Application baseline: [`c04d03993934816926cf1b1a337b3bfa8c12f017`](https://github.com/Tjtelenda/GuidanceOfGrace/commit/c04d03993934816926cf1b1a337b3bfa8c12f017), plus the 0.6.1 runtime/CI/documentation and licensing changes. Local checks below do not substitute for an exact-commit GitHub Actions result.

Environment: Windows 11, Node 24.19.0, Electron 44.3.0, electron-builder 26.16.1.

| Check | Result |
| --- | --- |
| `npm test` | PASS: six suites, including 13 synthetic failure/lifecycle simulations |
| `npm run dist:win -- --publish never` | PASS: unsigned x64 NSIS installer; not installed or published |
| Official Node 24.20.0: `node tests/run.mjs` | PASS: six suites locally |
| Node 24.20.0: `node tests/test-v5.mjs`, 20 repetitions | PASS: 20/20, including the filesystem watcher fixture |
| Real-save tests, installed UI acceptance, live gameplay | NOT RUN in this review |

## Windows CI runtime decision

The [September 19 release workflow](https://github.com/Tjtelenda/GuidanceOfGrace/actions/runs/35426460026) failed with a native Windows `fs-event.c` assertion (`!_wcsnicmp(filename, dir, dirlen)`) under Node 24.20.0. This was not reproduced locally using the official Node 24.20.0 executable, verified against Node's published SHA-256 checksums. The cause remains unresolved; passing locally does not establish compatibility on the hosted runner.

`.node-version` deliberately pins the previously verified **24.19.0** runtime, shared by setup-node and the documented setup. `package.json` declares the same supported version. This removes an unreviewed runtime upgrade from release builds; it is a containment measure, not a claimed fix to Node/libuv. Revisit the pin after reproducing or verifying a candidate runtime on Windows CI. Electron's embedded application runtime is separate from the build/test Node runtime.

The workflow tests/builds on main pushes, pull requests and manual runs. Build jobs use read-only permission and `--publish never`; a separate main-only release job can publish the explicitly versioned 0.6.1 artifacts after successful checks. Remote check results should be read for the exact commit in GitHub Actions; the local results above do not stand in for hosted-runner validation.

## Published 0.6.0: historical evidence

The existing [0.6.0 release](https://github.com/Tjtelenda/GuidanceOfGrace/releases/tag/v0.6.0) targets source/documentation commit `4096375` (application implementation `e28d3e2`). The prior release report recorded installed acceptance and live updater confirmation on Windows 11 / Node 24.19.0, including disposable journeys, synthetic video playback, read-only save checks and no renderer errors. Those private acceptance artifacts are not distributed, and these installed flows were not repeated in the September 30 review.

Historical installer SHA-256: `90d8b8a3b0447bf973d914ac3f250281642bf0f361f079415228ea162b8c1a08`. This identifies the previously published installer, not a new local build.

## Content and remaining limits

The bundled encounter snapshot contains 207 distinct IDs (42 DLC). The bundled search index has 523 records: 207 encounters, 167 locations, 39 NPC threads, 9 supply chains, 25 story entries, 64 glossary entries and 12 quest items.

Optional imported catalogs and map images are excluded from the source and installer. See [LOCAL_KNOWLEDGE.md](LOCAL_KNOWLEDGE.md) for the generic import format and fresh-install limits.

No live-game timing/performance benchmark, exhaustive quest verification, installer acceptance or proprietary extractor verification was performed for this patch. Native game movies (`.bk2`) remain unsupported. Builds remain unsigned.

## Continued use and feedback

We are improving the application as we use it more. Known limitations above
remain open unless a dated verification entry explicitly says otherwise. Send
bug reports or update suggestions to [tjtelendallc@gmail.com](mailto:tjtelendallc@gmail.com).

## 0.6.1 packaging follow-up

The unsigned Windows x64 NSIS build passed after adding the original-code
MIT file and explicit project/parser/encounter notices to packaged resources.
The Electron and Chromium notice files were retained. The installer was not
run against an existing installation. Hosted checks and release assets must
be verified for the exact 0.6.1 source commit; the historical 0.6.0 hashes above
do not identify this new build.
