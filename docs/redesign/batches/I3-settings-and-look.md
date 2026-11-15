# I3-settings-and-look: settings in order, the look file, changelog and README

Wave 2 · size M · needs `I2-phone` · read bible sections 7 and 13 first

## Goal

The new settings read as one tidy set, travel in the look file, and the changelog and README say what is new.

## You own

`index.js`, `stage.js`, `menu.js`, `modes.js` (their settings sections only), `style.css` (rules for the settings screen only), `CHANGELOG.md`, `README.md`, `docs/redesign/changes/` (to empty it), `tests/browser/settings-look.mjs`, and this batch's result file.

## Build

1. **Order and wording.** The Arcane Forge UI settings show three new sections, in this order, between Panels and Keyboard: **Layout**, **Menus**, **Message box**. Labels, defaults and ranges are exactly the table in bible section 7. Fix any that drifted.
2. **Greyed out, not hidden:** a setting that needs another one on is disabled with a `title` saying which one.
3. **Same controls as the rest of the screen:** checkboxes, selects and ranges look and behave like the existing ones, including the live value beside a range.
4. **Look file.** Export look writes every key marked "yes" in the bible's table, and none marked "no". Import look accepts each within its type and range and ignores the rest without failing. The file's `format` and `version` stay as they are, so older look files still import.
5. **Reset** puts every new key back to its default, and the page follows at once.
6. **Changelog.** Move each line from `docs/redesign/changes/*.md` into `CHANGELOG.md` under "Unreleased", newest first, edited so they read as one story: the send modes, the stage layout, the menu panel. Then delete the fragment files.
7. **README:** a short section, "Stage layout, menu panel and send modes", saying what each is, that all three are off by default, and where to turn them on. Keep the existing early beta warning.

## Leave alone

How any feature behaves. The manifest's version: it changes only when the owner releases.

## Test: `tests/browser/settings-look.mjs`

Desktop only.

1. The settings screen has the headings Layout, Menus and Message box, in that order, after Panels and before Keyboard.
2. For every key in the bible's table that has a label: a control with that label exists, changing it changes the setting, and the page follows (one representative check per feature is enough for "the page follows").
3. With the menu panel off, "Two round buttons in place of the top bar" is disabled and has a `title`. With the layout Classic, the four stage settings are disabled.
4. **Export:** click Export look and read the downloaded file (Playwright's download event): it has every "yes" key and no "no" key.
5. **Import:** give `#forge-ui-import-file` a look file with `stageChat: 999`, `modesVoice: "third"`, `stageShade: "dark"`, `modesTemplates: { do: "x".repeat(500) }` and one valid `stageChat: 55` in a second file. The first changes nothing and breaks nothing; the second sets 55.
6. An older look file, with none of the new keys, imports as before.
7. Reset: every new key equals its default from the feature's `defaults`, and none of our elements or classes is in the page.
8. `docs/redesign/changes/` holds no fragment files, and `CHANGELOG.md`'s Unreleased section mentions Do, Say, Story and See, the stage layout and the menu panel.

## Check

```bash
node tests/browser/settings-look.mjs
node tests/run.mjs
```

## Done when

- The commands pass.
- Every label on screen matches the bible's table word for word.

## Changelog line

None of its own; this batch folds in the others.

## Commit message

`Order the new settings and carry them in the look file`
