# GitHub publication

## Repository

The public repository is [Tjtelenda/GuidanceOfGrace](https://github.com/Tjtelenda/GuidanceOfGrace). Version 0.6.0 remains unchanged; 0.6.1 is the authorized next release. Public release downloads do not require a token embedded in the app.

## Continuous verification

The Windows workflow uses Node from `.node-version` (24.19.0), installs the lockfile with `npm ci`, runs all six synthetic suites, and builds the unsigned NSIS installer with `--publish never`. It runs for main pushes, pull requests and manual dispatch. Build jobs have read-only repository permission. For the authorized 0.6.1 release, a separate main-only job verifies checksums, creates a draft at the exact source commit, uploads assets and then publishes. Existing releases are not overwritten; PR runs cannot publish.

The runtime pin contains a historical native watcher assertion on the hosted runner; local Node 24.20 checks passed and did not reproduce it. See [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md) before upgrading. A passing local build is not evidence of a remote CI pass.

## Release checklist

1. Run complete tests and installed acceptance against the final build.
2. Inspect packaged contents: exclude saves, journeys, secrets, caches and extracted game assets.
3. Commit the final source and verification report, then push main.
4. Publish the tested NSIS installer, blockmap and update metadata under the matching version tag.
5. Verify release assets, installer SHA-256 and the installed app's update response.

A build artifact alone is not a published release. A configured provider alone is not end-to-end update verification. Record evidence in [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md).

## Signing and data

- Builds remain unsigned unless a Windows signing certificate is supplied. GitHub authentication does not sign executables; SmartScreen can flag an unsigned installer.
- Never embed tokens in the repository, renderer, installer or journey exports.
- Knowledge updates use their own validated source and cache independently of app releases.
- Locally generated game data and assets are not release assets.
