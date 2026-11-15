# 00-foundation

## Built

- `css/tokens.css`: every new token from bible section 4 under `body.forge-ui`; `--forge-control` and `--forge-round` become 44px under `(pointer: coarse), (max-width: 1000px)`; `--forge-fast` becomes 0ms under `prefers-reduced-motion: reduce`.
- `css/stage.css`, `css/menu.css`, `css/modes.css`: a header comment each, no rules.
- `style.css`: four `@import` lines at the very top, tokens first. Nothing else changed (`git diff --stat` shows 4 insertions).
- `stage.js`, `menu.js`, `modes.js`: the feature contract with their real `id`, empty `defaults` and `lookKeys`, `settingsHtml` returning `''`, and `bindSettings` and `apply` doing nothing. Each has a header comment that restates the contract.
- `index.js`:
  - `const FEATURES = [stage, menu, modes];`
  - `settings()` fills in missing keys from every feature's `defaults`.
  - `apply()` ends by calling every feature's `apply(s)`.
  - The settings screen shows every feature's `settingsHtml(s)` between Panels and Keyboard; `bindSettings` calls every feature's `bindSettings($root, s, save)`.
  - Export look writes every key in every feature's `lookKeys`; Import look takes them through one validator, `validLookValue(rule, value)`, for `enum`, `number`, `boolean`, `string` and `strings`.
  - Reset also puts feature settings back to their defaults.
  - `arcane-forge-ui:apply` on `document`, and the `(min-width: 1001px)` media query, both run `apply()` again.
- `tests/browser/foundation.mjs`: the six checks from the brief, plus a few more (see below).

## Test output

```
$ node tests/browser/foundation.mjs
ok   the four feature stylesheets were served from this checkout (all four)
ok   --forge-space-4 is 16px (16px)
ok   --forge-control is 36px (36px)
ok   --forge-round is 40px (40px)
ok   --forge-fast is 160ms (160ms)
ok   --forge-fast is 0ms with reduced motion (0ms)
ok   the top bar is on screen
ok   the chat column is centred (left gap 360px, right gap 360px)
ok   none of the features is in the page
ok   stage.js exports the feature contract
ok   menu.js exports the feature contract
ok   modes.js exports the feature contract
ok   switched off, body loses forge-ui
ok   switched on again, body has forge-ui
ok   narrowing the window past 1000px applies the settings
ok   widening it again applies them again
ok   the settings show Text, Panels, Keyboard, Colours and Share, in that order (Text, Panels, Keyboard, Colours, Share)
ok   no script errors

$ node tests/browser/foundation.mjs phone
ok   the four feature stylesheets were served from this checkout (all four)
ok   --forge-space-4 is 16px (16px)
ok   --forge-control is 44px (44px)
ok   --forge-round is 44px (44px)
ok   --forge-fast is 160ms (160ms)
ok   --forge-fast is 0ms with reduced motion (0ms)
ok   the top bar is on screen
ok   none of the features is in the page
ok   stage.js exports the feature contract
ok   menu.js exports the feature contract
ok   modes.js exports the feature contract
ok   switched off, body loses forge-ui
ok   switched on again, body has forge-ui
ok   the settings show Text, Panels, Keyboard, Colours and Share, in that order (Text, Panels, Keyboard, Colours, Share)
ok   no script errors

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 14s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 12s

4 passed, 0 failed
```

### How "a feature plugs in through its own module alone" was confirmed

`modes.js` was replaced for one run by a probe that had a default and a look key of each of the five types, one more default that is not a look key, an `<h4>Probe</h4>` section with a checkbox, a `bindSettings` that saves the checkbox, and an `apply` that records its calls and sets a class on `body`. A scratch test (outside the repository) then checked, with no other file changed:

- the probe's defaults were filled into the settings, and its `apply` ran on load;
- the settings screen read `Text, Panels, Probe, Keyboard, Colours, Share`;
- ticking the probe's checkbox saved the value and re-applied;
- Export look wrote all five look keys and left out the one that is not a look key;
- Import look took valid values (a number above the range was clamped to `max`), merged `strings` per key, ignored keys `strings` does not name, and ignored the key that is not a look key;
- a second Import with a wrong type for every key changed nothing;
- the settings screen was redrawn with the imported value;
- Reset put every probe key back to its default, and the probe's `apply` was first called with `enabled: false` and its old settings, then with the defaults.

All 12 checks passed with no script error. `modes.js` was then put back and compared byte for byte with the stub.

## Choices the bible did not cover

- **A feature that throws does not stop the others.** `apply()` calls each feature inside `try`; an error is thrown again from a `setTimeout`, so it still shows in the console and as a page error in tests. Without this, an error in one feature at load would also stop the AI layout listeners and the delete-mode guard that `index.js` sets up after `apply()`.
- **Import validator rules.** A number must be a real number (a string such as `"7"` is ignored), then it is clamped into range, as Forge UI's own numbers are. A `string` longer than `max` is ignored, not cut, so a template is never cut off half way. `strings` must be an object; each named key that holds a short enough string is merged into the current object, as colours are, and other keys are ignored.
- **Reset turns the features off with their old settings first.** Reset puts every feature key back to its default, switches included (the brief says "feature settings", and the three features are off by default). Just before that, each feature's `apply` gets the current settings with `enabled: false`, so it can undo what only its settings record, such as the menu panel's pins to put back (bible 5.2). Without that, the pins would be lost when `menuPins` went back to `{}`.
- **Key collisions.** If a feature's default uses a key that Forge UI's own defaults already have, Forge UI's value wins.
- **Nested defaults.** `settings()` fills in missing top-level keys only. A feature whose default is an object (such as `modesTemplates`) should read missing inner keys with `??`. Forge UI's own `colors` keeps its inner fill-in.
- **SillyTavern's own Reduced Motion setting** puts no class on `body`, so `tokens.css` handles only the media query. The feature that animates handles the setting (P4's brief asks for it in `menu.js`).
- **Extra checks in the test:** `--forge-round`, `--forge-fast` with and without reduced motion, and, on desktop only, that crossing 1000px applies the settings again (the main switch is changed without the event, then the window is narrowed and widened).

## Asked of other files

None.

## Not done

Nothing.

## Check

**PASS.** Checked on `batch/00-foundation` at `37c1e50`, against `overhaul` at `d0803eb` (`overhaul` has not moved since the batch was cut).

### (a) Files

- `git diff --name-only overhaul...HEAD` lists 11 files: the 10 under "You own" plus `docs/redesign/results/00-foundation.md`, which bible section 9 gives to the batch. Nothing else.
- `style.css`: 4 lines added, 0 removed, all at the very top, tokens first. `aiTab.js`, `deleteMode.js`, `fonts/`, `manifest.json` and `CHANGELOG.md` are untouched.

### (b) Commands

- `node tests/browser/foundation.mjs`: 18 ok, exit 0.
- `node tests/browser/foundation.mjs phone`: 15 ok, exit 0.
- `node tests/run.mjs`: `4 passed, 0 failed` (foundation, foundation phone, harness, harness phone).

### (c) Done when, one item at a time

- **All three commands pass.** Yes, see (b).
- **The diff has only owned files, and `style.css` gains only the four lines.** Yes, see (a).
- **A feature reaches the settings screen, the look file and Reset through its own module alone.** I tested this myself, without relying on the builder's probe. A scratch script outside the repository served a stand-in `modes.js` from memory through a Playwright route, so no file in the checkout changed. The stand-in had one look key of each of the five types, a default that is not a look key, a default that collides with Forge UI's own `aiLayout`, an `<h4>` section with a checkbox, and an `apply` that records each call and toggles `body.forge-modes`. All 25 checks passed at both sizes, with no script error:
  - The stand-in's defaults were filled in on load, and Forge UI's own `aiLayout` won the collision.
  - The headings read `Text, Panels, Probe, Keyboard, Colours, Share`.
  - Ticking the checkbox saved the setting and ran `apply` again. The `arcane-forge-ui:apply` event ran `apply` exactly once.
  - Main switch off: the feature's `apply` received `enabled: false` and removed its class.
  - Export look wrote all five look keys and left out the other keys.
  - Import look accepted an `enum` and a `boolean`, clamped a `number` at both ends, and accepted a `string` within `max`. For `strings` it merged the named keys and dropped unknown and over-long ones. It ignored keys that are not look keys.
  - Import look changed nothing when given wrong types (`"7"`, `"yes"`, an over-long string, a string for `strings`) or `NaN`, an array or `null`.
  - The settings screen was redrawn after import with its controls still wired.
  - Reset put every stand-in key back to its default. It called `apply` first with `enabled: false` and the old values, then with the defaults. It left no class behind, and the redrawn screen saved to the new settings object.
- **Bible section 3:**
  - Rule 1: no native control is copied or rebuilt.
  - Rule 2: the three stubs add nothing.
  - Rule 3: there is no new look, so no new setting is needed.
  - Rule 4: the test runs at phone size. The brief asks for no TauriTavern stand-in.
  - Rule 5: `css/tokens.css` matches every value in section 4 exactly, including the 44px override under `(pointer: coarse), (max-width: 1000px)` and 0ms under `prefers-reduced-motion`. No token name collides with anything in `style.css`, `aiTab.js` or `deleteMode.js`, and the diff contains no raw hex.
  - Rule 6: see (a).
  - Rule 7: no new dependency or framework.
- **Bible section 9:**
  - Each of the three modules exports exactly the six contract names, with its real `id`.
  - `index.js` holds the modules in `FEATURES = [stage, menu, modes]` and calls every feature's `apply` on load, on save (which covers import and Reset), on the event and on the `(min-width: 1001px)` media query.
  - The diff has no `!important`, `innerHTML` for chat text, `localStorage`, `MutationObserver`, network request or held element.
  - The three feature stylesheets contain only a header comment. With them, the page has exactly three style rules from our imports, all on `body.forge-ui`.
  - No personal details appear in the diff or the commit.

### (d) Trying to break it

- **Nothing changes on screen.** A scratch script recorded the box and 28 computed style properties for each of the roughly 17,400 elements in the page, plus body classes, inline styles, ids and classes starting `forge`, the fonts link and sideways scroll. It ran once for an export of `overhaul` and once for this branch, at desktop and phone size, in four states: on, after opening the settings, main switch off, and on again.
  - The only differences are the 5 elements of one animated background layer, which differ the same way between two runs of `overhaul` alone.
  - The settings screen's headings and controls are identical, so no new setting appears.
  - No page scrolls sideways at either size.
- **Main switch off:** the new tokens compute to empty and none of `#forge-stage`, `#forge-spine`, `#forge-menu`, `#forge-menu-buttons`, `#forge-modes` or the four feature body classes exist. Turned on again, everything matches the first run.
- **Phone size:** `--forge-control` and `--forge-round` are 44px. Every comparison and probe check above also passed at 390 by 800 with touch.
- **A feature that throws:** a stand-in `stage.js` whose `apply` throws did not stop `modes.js` from being applied. The re-apply listener was still installed, and the error still showed as a page error.

### Notes for later batches (none of them fails this one)

- **Leftovers when the main switch is off (already on `overhaul`):** with the main switch off, `body` still carries `forge-user-layout`, `forge-menu-cards`, `forge-ext-cards`, `forge-icons`, `forge-swipes-right`, `forge-phone-compact` and `forge-ai-hide-help`. It also keeps the inline `--forge-*` properties, and the fonts link stays in the page. This is identical on `overhaul` and was not added here, but it does not meet CLAUDE.md rule 6 or bible section 10 ("nothing of ours is in the page"). The new event and media listeners stay registered too, like the existing `eventSource` ones, but do nothing visible. Worth a look in integration.
- **Reset is less guarded than `apply()`:** Reset's first pass (`feature.apply({ ...s, enabled: false })`) is not inside the `try` that `apply()` uses, so a feature that throws there would stop Reset.
- **Import differs slightly between Forge UI's keys and feature keys:** Forge UI's own numbers accept a numeric string (`Number(look[key])`), but feature numbers do not. The builder wrote this down, and it is within the brief's "ignores anything invalid".
- **Reset turns feature switches off:** Reset sets the feature switches (`layout`, `menuPanel`, `modes`) back to off, while it keeps Forge UI's own switches. The brief and I3 ("every new key back to its default") both ask for this, so it is correct as built.
- **SillyTavern's own Reduced Motion setting:** bible section 4 wants `--forge-fast` at 0ms when this setting is on too. `tokens.css` handles only the media query. P4's brief (item 6, test 9) owns the setting, so leaving it to P4 is consistent with the plan.

## After the check

The lead acted on the checker's second note before merging: Reset's first pass now goes through the same guarded `applyFeatures(s)` as `apply()`, so a feature that throws there no longer stops Reset. Nothing else changed. `node tests/run.mjs` passed again (4 passed, 0 failed), and the temporary probe from "Built" passed all 12 checks again, Reset ordering included.

The checker's first note (Forge UI's own classes, inline `--forge-*` properties and the fonts link stay on the page with the main switch off) was already true on `overhaul` before this batch and is left for integration.
