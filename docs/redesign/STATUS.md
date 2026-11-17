# Status

The lead keeps this file current: one line per batch, changed when a batch starts, passes its check, is merged, or is blocked. Details go in `results/<batch>.md`.

States: `todo`, `doing`, `checked` (a second agent passed it), `merged`, `blocked`.

| Batch | State | Commit on `overhaul` | Note |
|---|---|---|---|
| `00-foundation` | merged | `bc524f3` | Checked PASS. Main switch off still leaves Forge UI's older body classes, inline properties and fonts link (true before this batch); left for integration. |
| `M1-mode-bar` | merged | `6316dc0` | Checked PASS. A mode's question hides "Not connected to API!" in the message box (owner to see). |
| `M2-do-and-say` | merged | `be23891` | Failed the first check (send button by keyboard went out unshaped), fixed, passed the second. For the owner: Ctrl+Enter is sent as typed; own wording is skipped when the text starts with you or I. |
| `M3-story-and-see` | merged | `10b403d` | Failed two checks; a third fix by the lead (`a9368a8`, at the owner's "finish") keeps the box clear until the reply starts. Not checked by anyone who did not write it: worth an independent look. For the owner: Ctrl+Enter is sent as typed (from M2). Lane M done. |
| `S1-chat-column` | merged | `708247d` | Checked PASS. For I1: a layer token for `#forge-stage` (raw `z-index: -1`); RPG Companion panel covers the column. |
| `S2-spine-and-width` | merged | `267290f` | Checked PASS. For I1: tokens for the spine's raw sizes and layer. For I3: Import clamps `stageChat` where I3's test expects it ignored. |
| `S3-stage-content` | merged | `0151f07` | Checked PASS. For I1: `stage.js` exports a seventh name, `setPlateText` (the brief asks for it; bible 9 says exactly six); raw layers and line height. Lane S done. |
| `P1-menu-frame` | merged | `f1b534d` | Checked PASS. For I1: a `--forge-menu-dim` token for the backdrop's raw colour. |
| `P2-buttons-and-top-bar` | merged | `bc7235f` | Checked PASS. For I1: toasts touch the top edge; maximised Author's Note and CFG cover the buttons; the buttons overlap RPG Companion's panel top. |
| `P3-characters-and-pins` | merged | `573150f` | Failed the first check (a load at 1000px or less lost recorded pins), fixed, passed the second. For the owner: pinned panels come back closed; disabling the extension in the manager leaves pins off until it runs again. |
| `P4-keys-and-motion` | merged | `0e20e33` | Failed the first check (Shift+Tab left the panel; focus not given back after a mouse open), fixed, passed the second (checked by the lead, who did not write it). For I1: a token for the 0.98 scale. Lane P done. |
| `I1-together` | merged | `bf08911` | Built and tested by the lead, no independent check. RPG Companion's right panel now gets its room; main switch off leaves nothing; lane tokens added. |
| `I2-phone` | merged | `a40c2fd` | Built and tested by the lead, no independent check. Bar spans the form; 36px in short landscape. |
| `I3-settings-and-look` | todo | | |
| `I4-sign-off` | todo | | |

## Already in place (2026-11-15)

- Branch `overhaul`, from `main` at `0ee7f67`.
- The test helper `tests/browser/_harness.mjs`, its own test `tests/browser/harness.mjs` and the runner `tests/run.mjs`. Both sizes pass. A second checkout of the repo was shown to test its own files against the one sandbox.
- This package: `HANDOFF.md`, `PLAN.md`, `BIBLE.md`, `batches/`.

## Waiting on the owner

- Wave 1 is complete (2026-11-16): every batch is merged and `node tests/run.mjs` passes on `overhaul` (24 runs). M3's third fix has had no independent check. Wave 2 has not started.
