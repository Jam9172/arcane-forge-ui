# Status

The lead keeps this file current: one line per batch, changed when a batch starts, passes its check, is merged, or is blocked. Details go in `results/<batch>.md`.

States: `todo`, `doing`, `checked` (a second agent passed it), `merged`, `blocked`.

| Batch | State | Commit on `overhaul` | Note |
|---|---|---|---|
| `00-foundation` | merged | `bc524f3` | Checked PASS. Main switch off still leaves Forge UI's older body classes, inline properties and fonts link (true before this batch); left for integration. |
| `M1-mode-bar` | todo | | |
| `M2-do-and-say` | todo | | |
| `M3-story-and-see` | todo | | |
| `S1-chat-column` | todo | | |
| `S2-spine-and-width` | todo | | |
| `S3-stage-content` | todo | | |
| `P1-menu-frame` | todo | | |
| `P2-buttons-and-top-bar` | todo | | |
| `P3-characters-and-pins` | todo | | |
| `P4-keys-and-motion` | todo | | |
| `I1-together` | todo | | |
| `I2-phone` | todo | | |
| `I3-settings-and-look` | todo | | |
| `I4-sign-off` | todo | | |

## Already in place (2026-11-15)

- Branch `overhaul`, from `main` at `0ee7f67`.
- The test helper `tests/browser/_harness.mjs`, its own test `tests/browser/harness.mjs` and the runner `tests/run.mjs`. Both sizes pass. A second checkout of the repo was shown to test its own files against the one sandbox.
- This package: `HANDOFF.md`, `PLAN.md`, `BIBLE.md`, `batches/`.

## Waiting on the owner

Nothing yet.
