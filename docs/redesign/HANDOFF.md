# Handoff: how to run the redesign

Start here. This package was written to be run by Claude with ultracode on, where one lead session spreads the work over helper agents that each start cold. It works just as well one batch at a time.

Read in this order: this file, then `BIBLE.md`, then `PLAN.md`, then the brief for your batch in `batches/`.

## 1. Where things are

| Thing | Where |
|---|---|
| The code | this repository, branch `overhaul` |
| The rules and measurements | `docs/redesign/BIBLE.md` |
| The order of work | `docs/redesign/PLAN.md` |
| One brief per batch | `docs/redesign/batches/<batch>.md` |
| Progress | `docs/redesign/STATUS.md` |
| What each batch did | `docs/redesign/results/<batch>.md` (one per batch, written by the batch) |
| Changelog lines waiting to be folded in | `docs/redesign/changes/<batch>.md` |
| Tests | `tests/browser/*.mjs`, run with `node tests/run.mjs` |
| The sandbox SillyTavern | http://localhost:8000, kept beside this repository in `../SillyTavern` |

Start the session with this repository as its folder. Helper agents get their own copies (worktrees) of the folder the session is in, so it has to be this one.

## 2. Hard rules

These hold for the lead and for every helper. They are also in `CLAUDE.md` at the top of the repository.

1. **Chats are private.** Use only the empty "Forge Tester" chat that the test helper opens. Never open, list, search, read or screenshot any other chat, and never look inside SillyTavern's or TauriTavern's data folders.
2. **No real model.** Tests answer model calls themselves. Never type, read or use an API key.
3. **Nothing leaves this machine.** Do not push, open a pull request, or publish anything. Commit locally only.
4. **No personal details** in code, comments, commits or documents: no names, no usernames, no folder paths from this machine.
5. **Stay in the repository.** Do not edit SillyTavern, TauriTavern, RPG Companion, or anything outside this folder. Reading SillyTavern's source in `../SillyTavern/public` to understand the page is fine.
6. **Build to the bible.** Decisions in its section 2 are settled. Where something is not covered, choose the simplest thing, do it, and write the choice in your result file. Never stop to ask.

## 3. Before a run

- **The sandbox must answer.** `curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/` should print 200. If it does not, the lead starts it (the preview named `sillytavern-sandbox` in `.claude/launch.json`) and waits for 200. Helpers never start or stop it.
- **The test helper must pass:** `node tests/browser/harness.mjs` and `node tests/browser/harness.mjs phone`.
- **Playwright** is found automatically when this repository sits beside a `tools/webkit-test` folder that has it. Otherwise set `FORGE_PLAYWRIGHT_FROM` to a folder with Playwright in its `node_modules`.
- **Permissions.** A helper that hits a permission prompt stops and nobody is there to answer. Before a long run, allow these without asking: `node tests/…`, `git status`, `git diff`, `git log`, `git add`, `git commit`, `git switch`, `git branch`, `git merge`, `git worktree`, and the `curl` line above.

## 4. Running it with ultracode

What follows is the recipe for the lead. Helpers only need their brief.

### One batch, start to finish

1. **Mark it** `doing` in `STATUS.md`.
2. **Build.** One agent, in its own copy of the repository on a branch named `batch/<batch>` cut from the current `overhaul`. Give it exactly this:
   > Read `CLAUDE.md`, `docs/redesign/BIBLE.md` and `docs/redesign/batches/<batch>.md`, in that order. Do what the brief says and nothing else. Edit only the files the brief lists. Run the checks it names. Commit on this branch. Write `docs/redesign/results/<batch>.md`: what you built, the test output, every choice you made that the bible did not cover, and anything you could not do.
3. **Check.** A second agent that did not write the code, in its own copy of that branch. Give it exactly this:
   > Read `CLAUDE.md`, `docs/redesign/BIBLE.md` and `docs/redesign/batches/<batch>.md`. Another agent has done this batch on branch `batch/<batch>`. Check its work; do not fix it. (a) `git diff --name-only overhaul...HEAD` lists only files the brief owns. (b) Run the commands under "Check" in the brief and `node tests/run.mjs`; all pass. (c) Read the diff against the brief's "Done when" list and the bible's sections 3 and 9, one item at a time. (d) Try to break it: turn the feature off and look for anything left behind; try the phone size. Add your verdict to `docs/redesign/results/<batch>.md` under a heading "Check": PASS or FAIL, with the evidence for each item.
4. **On FAIL,** send the verdict back to a building agent, then check again. After two failed rounds mark the batch `blocked` in `STATUS.md` with the reason, and carry on with batches that do not need it.
5. **On PASS,** merge `batch/<batch>` into `overhaul`, run `node tests/run.mjs` on `overhaul`, and mark the batch `merged` with the commit.

### What can run at the same time

- **Wave 0** is one batch, alone.
- **Wave 1:** lanes M, S and P at the same time. Inside a lane, batches go in order, each cut from `overhaul` after the one before it was merged. The lanes own different files (bible section 9), so their merges never conflict. If one does, a batch left its lane: fail it.
- **Wave 2** is four batches, one after another, in the lead's own checkout or in single copies.

Three lanes means at most three agents building or checking at once. Keep it there: they share one sandbox, and each test opens a browser.

### What ultracode changes, as far as could be found out

These points come from third-party write-ups read on 2026-11-15, not from an official page. Check them against your version.

- It is turned on for a session with `/effort ultracode` and is not saved.
- Claude decides by itself when to spread a task over helper agents. Each helper has a clean context, and a helper that changes files works in its own copy.
- Nobody can answer a helper during a run. That is why this package settles every choice in advance.
- There is a limit on how many helpers run at once (16 by default, set with `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`). For this work set it to 4.
- A run can use many more tokens than doing the same work in one conversation. `/workflows` shows what is running.

## 5. What to tell the lead

Any of these is enough. Each resumes from `STATUS.md`, so none of them needs editing.

Everything, as far as it can go without the owner:

> Read `docs/redesign/HANDOFF.md` and carry the redesign forward from `docs/redesign/STATUS.md`, following its recipe. Stop when every batch is merged or blocked, then tell me what is done, what is blocked and why, and what I should try in TauriTavern.

One wave:

> Read `docs/redesign/HANDOFF.md` and run wave 1 from `docs/redesign/STATUS.md`.

One batch:

> Read `docs/redesign/HANDOFF.md` and do batch `M1-mode-bar`, build then check.

A sensible first run is `00-foundation` alone. It is the one batch every lane stands on, and it shows how many helpers a batch really takes before three lanes run at once.

## 6. When something goes wrong

| What | Do |
|---|---|
| The sandbox stops answering | The lead restarts it and reruns the test that failed. Helpers report it and stop. |
| A test fails for a reason outside the batch | Run `node tests/browser/harness.mjs`. If that fails too, the set-up is broken: stop the wave and say so. |
| A brief contradicts the bible | The bible wins. Note it in the result file. |
| A brief needs a file another lane owns | Do not edit it. Describe the change in the result file; `I1-together` picks it up. |
| SillyTavern's page is not as the bible says | Trust the page. Note the difference in the result file and build to what is there. |
| Something would need SillyTavern, TauriTavern or RPG Companion changed | It is out of bounds. Note it and find another way or leave it. |

## 7. The end

The work is finished when `STATUS.md` shows every batch `merged`, `node tests/run.mjs` passes on `overhaul`, and `OWNER-CHECK.md` exists. After that the owner tries it in TauriTavern and decides about defaults, merging and pushing. None of that is yours to do.
