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
