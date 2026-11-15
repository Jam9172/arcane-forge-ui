# I4-sign-off: run everything once more and hand it to the owner

Wave 2 · size S · needs `I3-settings-and-look` · read `PLAN.md`, `STATUS.md` and every result file first

## Goal

One last full check, and a short list the owner can follow in TauriTavern. No new behaviour.

## You own

`docs/redesign/OWNER-CHECK.md`, `docs/redesign/STATUS.md`, this batch's result file. Code only if a check below fails, and then only the smallest fix, in the file of the feature it belongs to.

## Build

1. **Run everything** on `overhaul`:
   ```bash
   node tests/run.mjs
   ```
   If the folder above this repository has `tools/run-tests.mjs`, run that too from there. It holds the older Arcane Forge UI tests (the delete-messages guard, the focus ring, the "leave out" lists, the swipe arrows), which must still pass with the new features off, which is their default.
2. **Read the whole diff** from `main` to `overhaul` once, as a reviewer:
   - every selector in `css/stage.css`, `css/menu.css` and `css/modes.css` starts with `body.forge-ui.forge-`;
   - every `!important` has its comment;
   - no `innerHTML` receives text from a chat, a character or a group;
   - no network call, no `localStorage`;
   - no name, username or folder path from this machine anywhere in the diff;
   - nothing of RPG Companion's is selected or styled.
3. **Write `OWNER-CHECK.md`:** numbered steps the owner can do in TauriTavern in about ten minutes, in plain words, each with what they should see. Cover, in this order:
   1. switching on the send modes, and one message in each of Do, Say, Story and See;
   2. switching on the Stage layout, dragging the chat's edge, the name on the stage;
   3. switching on the menu panel, opening every menu from the two buttons, Escape;
   4. everything on together with RPG Companion's panel open;
   5. the phone or tablet: the bar above the message box with the on-screen keyboard up, and that nothing else moved;
   6. switching all three off again: the app looks exactly as before.
   End it with the open choices from `PLAN.md` that are the owner's to make.
4. **Update `STATUS.md`:** every batch's state and commit, and under "Waiting on the owner" the checklist and the choices.

## Leave alone

Defaults: every feature stays off by default. The version in the manifest. Pushing, merging to `main`, releasing.

## Check

```bash
node tests/run.mjs
git status --short
git log --oneline main..overhaul
```

## Done when

- Every test passes, here and in the older set if it is present.
- The review in step 2 found nothing, or what it found is fixed and noted.
- `OWNER-CHECK.md` exists and `STATUS.md` is complete.
- The working tree is clean and nothing has been pushed.

## Commit message

`Write the owner's checklist for the redesign`
