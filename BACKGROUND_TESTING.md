# Background testing report

## Scope

These tests run without opening the companion, registering global shortcuts, scanning actual game processes, contacting update servers or reading the player's save. Filesystem tests use disposable fixtures under the Windows temporary directory. They do not prove the installed UI works.

## Commands and results

| Command | Result |
| --- | --- |
| `node tests/test-simulations.mjs` | 13 simulation scenarios pass |
| `npm test` | Includes the simulation suite alongside the five existing suites |

## New scenarios

| Area | Simulated condition | Required result |
| --- | --- | --- |
| Game exit | Duplicate stopped notifications | Keep one final read and close only afterward |
| Quick restart | Game returns before delayed read | Cancel obsolete final read |
| Restart during read | New session starts before parsing finishes | Do not close the new session |
| Process detection | Repeated identical process lists | Emit only start/stop transitions |
| Companion storage | Active JSON corrupted after a valid backup | Recover the previous valid copy |
| Companion storage | Invalid replacement data | Reject it and retain valid data |
| Save safety | `.sl2`, `.co2`, `.bak` write targets, including uppercase | Reject before creating a file |
| Journey import | Path traversal and unsupported format version | Reject without creating a journey |
| Save discovery | Synthetic solo/co-op saves mixed with backups and journeys | Discover only the two game saves |
| Journey switch | Old parse finishes after monitoring stops | Discard stale character results |
| Catalog validation | Duplicate IDs, bad coordinates, invalid schema/date/tags | Reject malformed data |
| Update concurrency | Two callers request an update | Share one network operation |
| Update trust | Response reports another source URL | Reject it and use the bundled catalog |

Several storage and catalog checks are grouped into one scenario, so the table has more rows than the scenario count.

## Fix found during simulation work

Duplicate stopped notifications previously cleared the pending game-exit timer without replacing it. The lifecycle handler now ignores unchanged state. It also accepts an injected scheduler so restart races can be tested without waiting for real gameplay or wall-clock delays.

## What still requires installed testing

Fresh installed/native-window acceptance remains separate from synthetic tests.
Verify character choice, journey isolation, search, maps, persistence and update
checks with disposable companion data before relying on a new installation.
No overlay or global hotkeys are present. Real-save/gameplay testing was not
repeated for 0.6.1. Optional imported catalogs are not bundled and their coverage
is not guaranteed; see [LOCAL_KNOWLEDGE.md](LOCAL_KNOWLEDGE.md).
