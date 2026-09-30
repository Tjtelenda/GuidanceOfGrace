# Guidance of Grace

A Windows desktop companion for Elden Ring and Shadow of the Erdtree. Keep it on a second screen for spoiler-aware guidance, encounter tracking and independent solo/Seamless journeys. Game saves are read-only; progress is stored in companion-owned `.grace` files.

[Download version 0.6.1](https://github.com/Tjtelenda/GuidanceOfGrace/releases/tag/v0.6.1) | [Verification and limitations](BUILD_VERIFICATION.md)

## What a fresh install includes

- 207 bundled encounters (42 DLC), 39 NPC threads, progression warnings and ending guidance.
- Nine miner bell-bearing supply chains, a curated archive, and time-budgeted session suggestions.
- Local `.sl2` and Seamless `.co2` save tracking, manual confirmations and separate journeys. No remote-player tracking.
- Future content hidden by default, with deliberate Show All and optional detailed hints.
- Local MP4/WebM playback; proprietary `.bk2` movies are unsupported.

The bundled search index covers encounters, locations, NPC threads, supply chains, story, glossary and quest items. **Optional imported catalogs and extracted map images are not included.** Generate from installed game requires separately configured external tooling that this repository does not distribute. A fresh install can use the bundled catalog or import a compatible, lawfully obtained index; see [LOCAL_KNOWLEDGE.md](LOCAL_KNOWLEDGE.md). Missing extraction tools do not prevent bundled features from working.

## Try the source

On Windows, install **Node 24.19.0**, the supported build/test runtime recorded in `.node-version`. Other Node patch versions are not currently qualified for release builds; the historical CI failure and reproduction results are documented below.

```powershell
git clone https://github.com/Tjtelenda/GuidanceOfGrace.git
cd GuidanceOfGrace
node --version  # must report v24.19.0
npm ci
npm test
npm start
```

`npm start` opens the companion. Create a journey and select your own save only when you want live tracking. The test suite uses synthetic fixtures and does not require an installed game or real save. If Electron's download was skipped during install, run `node node_modules/electron/install.js`.

To create an unsigned Windows installer without publishing:

```powershell
npm run dist:win -- --publish never
```

The installer appears in `dist/`. Windows may show a SmartScreen warning for unsigned builds. Push/PR CI tests and builds the Windows installer. The authorized main-branch release job publishes 0.6.1 only after those checks pass; PR builds never publish. See [GITHUB_SETUP.md](GITHUB_SETUP.md).

## Design and limits

Save reads share in-flight work and suppress unchanged snapshots. Only the active screen renders. Search normalizes and caches records and debounces typing. Optional lifecycle detection polls at ten-second intervals.

No overlay, global hotkeys, input hooks, memory access, injection, executable patching or anti-cheat modification. Save flags are evidence, not certainty about dialogue completion, particularly in co-op. Not every quest branch, long gameplay session or game-exit timing has been verified. Game art, extracted maps and videos are not redistributed.

[Feature audit](FEATURE_AUDIT.md) | [Background tests](BACKGROUND_TESTING.md) | [Content provenance](CONTENT_SOURCES.md) | [Third-party notices](THIRD_PARTY_NOTICES.md)

## Continued development and feedback

We are continuing to improve Guidance of Grace as we use it more. The limits
above remain: optional extracted catalogs and maps are not bundled, save
flags do not prove every dialogue step, and broader quest coverage, long
sessions, and game-exit timing still need real-use verification. The historical
Windows CI watcher failure was not reproduced locally; the supported Node
24.19.0 pin is containment, not a claim that its root cause is resolved.

Version 0.6.1 packages the supported runtime/CI updates, clearer setup documentation and original-code MIT license. It does not claim new quest coverage or a root-cause repair to the historical Node watcher failure. See [verification](BUILD_VERIFICATION.md) for exact tests and limits.

Send bug reports or update suggestions to
[tjtelendallc@gmail.com](mailto:tjtelendallc@gmail.com). Include your app
version, Windows version, steps to reproduce, and expected versus actual
behavior. Please leave game saves, account identifiers, and private data out
of an initial report.

## License

Original application code is [MIT licensed](LICENSE), copyright 2026 Trent Telenda. Third-party code/data keep their own licenses and notices; game names and assets remain with their rights holders. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
