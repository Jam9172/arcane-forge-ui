# 00-foundation: features plug in without touching shared files

Wave 0 · size M · needs nothing · read bible sections 3, 4, 7 and 9 first

## Goal

After this batch, a lane can add its whole feature by editing only its own `.js`, its own `.css` and its own tests. Nothing changes on screen.

## You own

`index.js`, `style.css` (only the four lines you add at its top), `css/tokens.css`, `css/stage.css`, `css/menu.css`, `css/modes.css`, `stage.js`, `menu.js`, `modes.js`, `tests/browser/foundation.mjs`.

## Build

1. **`css/tokens.css`:** the new tokens from bible section 4, under `body.forge-ui`, with the 44px override for touch screens and phones and the 0ms override for reduced motion.
2. **`css/stage.css`, `css/menu.css`, `css/modes.css`:** a header comment each, saying what the file is for and that every rule in it starts with `body.forge-ui.forge-<feature>`. No rules yet.
3. **`style.css`:** four `@import url("css/….css");` lines at the very top, tokens first. Change nothing else in the file.
4. **`stage.js`, `menu.js`, `modes.js`:** the feature contract from bible section 9, with their real `id`, empty `defaults` and `lookKeys`, `settingsHtml` returning `''`, and `bindSettings` and `apply` doing nothing.
5. **`index.js`:**
   - Import the three and keep them in `const FEATURES = [stage, menu, modes];`.
   - `settings()` also fills in missing keys from every feature's `defaults`.
   - `apply()` ends by calling every feature's `apply(s)`. Features decide for themselves whether they are active.
   - The settings screen shows every feature's `settingsHtml(s)` between the Panels and Keyboard sections, and `bindSettings` calls every feature's `bindSettings($root, s, save)`.
   - Export look writes every key named in every feature's `lookKeys`. Import look accepts them through one validator for the five types in the contract and ignores anything invalid, the way it already does for its own keys.
   - The existing Reset button also puts feature settings back to their defaults.
   - `document.addEventListener('arcane-forge-ui:apply', apply)`, so a test can ask for a re-apply.
   - `apply()` runs again whenever `matchMedia('(min-width: 1001px)')` changes.

## Leave alone

Every existing rule in `style.css`, `aiTab.js`, `deleteMode.js`, the fonts, the manifest, the changelog. No new setting appears on screen in this batch.

## Test: `tests/browser/foundation.mjs`

Give it the line `// Usage: node tests/browser/foundation.mjs [phone]` so it runs at both sizes.

1. The four CSS files were served from this checkout (`served` in the helper).
2. `--forge-space-4` on `body` computes to `16px`; `--forge-control` to `36px` on desktop and `44px` on the phone.
3. Classic is untouched: `#top-bar` is on screen; on desktop `#sheld` is centred (its left and right gaps differ by 2px at most); none of `#forge-stage`, `#forge-spine`, `#forge-menu`, `#forge-menu-buttons`, `#forge-modes` exists; `body` has none of the `forge-stage`, `forge-menu`, `forge-menu-buttons`, `forge-modes` classes.
4. `setForge(page, { enabled: false })` removes `forge-ui` from `body`, and `{ enabled: true }` puts it back. This proves the re-apply event.
5. Opened, the Arcane Forge UI settings still show their Text, Panels, Keyboard, Colours and Share headings.
6. The three feature modules load and each exports `id`, `defaults`, `lookKeys`, `settingsHtml`, `bindSettings` and `apply`.

## Check

```bash
node tests/browser/foundation.mjs
node tests/browser/foundation.mjs phone
node tests/run.mjs
```

## Done when

- All three commands pass.
- `git diff --stat` against `overhaul` shows only the files under "You own", and the only change to `style.css` is the four added lines.
- A feature can be added to the settings screen, the look file and Reset by editing its own module alone. Say in the result file how you confirmed that.

## Changelog line

None. Nothing changes for the person using it.

## Commit message

`Let features plug in through one list`
