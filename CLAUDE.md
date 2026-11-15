# Arcane Forge UI

A SillyTavern extension: the Arcane Forge look across the whole app. Plain ES modules and CSS, no build step. It also runs in TauriTavern, on desktop and phones.

A redesign is under way on the `overhaul` branch. Before changing anything, read `docs/redesign/HANDOFF.md`.

## Rules that always apply

1. Chats are private. Use only the empty "Forge Tester" chat that the test helper opens. Never open, list, search, read or screenshot any other chat, and never look inside SillyTavern's or TauriTavern's data folders.
2. No real model. Tests answer model calls themselves. Never type, read or use an API key.
3. Nothing leaves this machine unless the owner says so: no push, no pull request, nothing published.
4. No personal details in code, comments, commits or documents: no names, no usernames, no folder paths from this machine.
5. Edit only this repository.
6. Everything is scoped to `body.forge-ui`. With the extension's main switch off, nothing of ours is in the page.
7. Every look choice gets a setting. Text is large by default.

## Checking your work

```bash
node tests/run.mjs
```

The sandbox SillyTavern has to be running at http://localhost:8000 first. `tests/browser/_harness.mjs` explains what the tests may and may not do.
