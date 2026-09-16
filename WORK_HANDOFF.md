# Guidance of Grace — current work state

The canonical complete V5 source is available and verified. Ignore the obsolete V4 chunked GitHub handoff. Original archive/source history is retained in the initial Git commit.

## Current restriction

The user is actively playing Elden Ring and explicitly selected **Keep working in the background only**. Do not launch visible apps, trigger overlay hotkeys, take focus, run live-game tests, extract game archives, or run heavy builds while this restriction remains. No Guidance of Grace process was running at the last check. Do not change unrelated settings or stop the game.

## Remaining work before declaring completion

1. Finish background source review and narrow regression tests. Commit changes locally; GitHub CLI is unauthenticated, so publication is conditional on future credentials.
2. Once the user allows visible testing, build the latest source (it is ahead of installed 0.5.1), install it, and run `tests/acceptance-installed.mjs` against the installed path.
3. Verify character choice now works with imported marker flags. The initial installed test timed out; lookup-table caching and unsupported-flag handling were added afterward.
4. Complete solo/Seamless isolation, host/joiner/profile switching, Show All, both global hotkeys, clickable NPC/Where/map flow, local map crop, search, Ledger, Books, persistence and update checks.
5. Run the configured local-generation action when gameplay is finished. Existing generated cache is installed; in-app regeneration still needs acceptance proof.
6. Inspect packaged contents for forbidden saves/journeys/assets; hash final installer; verify installed version, shortcuts, clean Git state; leave the app installed and usable.

See BUILD_VERIFICATION.md for completed proof and LOCAL_KNOWLEDGE.md for data counts/limitations. Do not claim the full installed acceptance suite passed yet.
