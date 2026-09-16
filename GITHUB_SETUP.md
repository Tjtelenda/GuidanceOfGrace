# GitHub publishing status

## Current status

GitHub CLI is authenticated as **Tjtelenda** using Windows credential storage. The source history is published on **main** at [Tjtelenda/GuidanceOfGrace](https://github.com/Tjtelenda/GuidanceOfGrace). The repository was verified empty, changed from public to private as requested, then populated. No source was pushed while it was public.

No further user sign-in is needed for source publishing. The three implementation commits through `65a45e3` were pushed successfully. The obsolete Telenda-Household repository was not modified.

## Publication checklist

1. Complete: verified the authenticated account and repository access.
2. Complete: used the user-specified Tjtelenda/GuidanceOfGrace repository and verified private visibility.
3. Complete: configured the HTTPS origin and pushed local history.
4. Complete: checked tracked files; saves, journeys and local extraction/cache directories are excluded.
5. Configure the application release feed only after the dedicated repository exists.
6. Build and publish the tested installer, blockmap and update metadata as a versioned release.

The existing workflow currently builds and retains an installer artifact. It deliberately does not publish releases before the repository and feed are configured. A successful workflow artifact alone does not provide an automatic update feed.

## Private application updates require separate access

Signing in to GitHub CLI enables source publication; it does not automatically authenticate electron-updater. A private release feed needs authenticated access when the installed application checks or downloads updates. Electron-builder documents its private GitHub provider and `GH_TOKEN` support in the [version 26 update documentation](https://www.electron.build/v26/docs/features/auto-update/).

Before enabling that feed, implement or configure a local main-process credential path with read-only access to this repository's releases. Never embed a token in the installer, renderer, repository, journey export or update metadata. Publishing credentials need write access; the installed application does not.

The source and releases remain private unless the user explicitly approves a different distribution arrangement. No public mirror is authorized by this project request.

## Signing and knowledge updates

- A Windows code-signing certificate is optional for building and installing. Without one, the installer is unsigned and may receive a Windows SmartScreen prompt.
- Signing in to GitHub does not sign the Windows executable.
- Knowledge updates use their separately validated public source and local cache. They do not require access to the private application repository.
- The application currently reports its app-update feed as unconfigured. This is a pending setup item, not proof that app updating works end to end.
