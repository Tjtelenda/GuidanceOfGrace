# GitHub publication

## Repository

The authorized public repository is [Tjtelenda/GuidanceOfGrace](https://github.com/Tjtelenda/GuidanceOfGrace), on main. GitHub CLI authentication is available; no additional sign-in is currently required. The obsolete Household handoff is not used or modified.

Version 0.6.0 is published with the tested installer, blockmap, update metadata and SHA-256. Installed live-feed verification passed. The app update provider points to this public repository. Public release downloads do not need a token embedded in the app.

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
