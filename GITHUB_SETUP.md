# GitHub publishing status

## What is missing

GitHub CLI is installed locally, but `gh auth status` reports no authenticated hosts. The source is committed locally on `main`. No dedicated remote has been created and no source has been pushed to Telenda-Household.

The only user-dependent step is signing in to GitHub as **Tjtelenda** and approving GitHub CLI access. Account passwords and tokens should not be pasted into chat or committed to the project.

When visible interaction is allowed, the agent can initiate:

```powershell
& .\.local-tools\gh\bin\gh.exe auth login --hostname github.com --git-protocol https --web --scopes workflow
```

The user completes GitHub's browser authorization. The `workflow` permission is requested because this project includes a Windows build workflow. GitHub CLI handles the normal repository permissions and credential storage. See the [official login documentation](https://cli.github.com/manual/gh_auth_login).

## Work the agent completes after sign-in

1. Verify the authenticated account and repository access without displaying credentials.
2. Check whether `Tjtelenda/guidance-of-grace` already exists. Create it as **private** if absent; inspect existing history before using an existing repository.
3. Configure that repository as the project remote and push the local history.
4. Verify that saves, journeys, extracted game assets, local caches and secrets are excluded.
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
