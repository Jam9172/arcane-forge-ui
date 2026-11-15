# M1-mode-bar: the Do, Say, Story and See buttons

Lane M · size S · needs `00-foundation` · read bible sections 4, 5.3, 7, 9 and 11 first

## Goal

The four buttons sit right above the message box and remember which one is selected. They do not change what is sent yet; that is `M2` and `M3`.

## You own

`modes.js`, `css/modes.css`, `tests/browser/modes-bar.mjs`, `docs/redesign/results/M1-mode-bar.md`, `docs/redesign/changes/M1-mode-bar.md`.

## Build

1. **Settings** in `modes.js`: `defaults = { modes: false, modesActive: '' }`. `settingsHtml` returns a section headed "Message box" with one checkbox, "Do, Say, Story and See buttons above the message box". `bindSettings` wires it.
2. **`apply(s)`:** active when `s.enabled && s.modes`. Active: `body` gets `forge-modes`, and `#forge-modes` exists inside `#send_form`, immediately before `#nonQRFormItems`. Not active: the class and the element are gone, and the message box's placeholder is SillyTavern's own again.
3. **The bar:** exactly as bible section 5.3. A `role="radiogroup"` with four `role="radio"` buttons in the order Do, Say, Story, See, each with an icon drawn to bible section 4 and a `title`:
   - Do: "Do: what you do"
   - Say: "Say: what you say out loud"
   - Story: "Story: what happens next, as narration"
   - See: "See: look at something"
4. **Selecting:** a click selects that mode; a click on the selected mode clears it. The choice is kept in `s.modesActive` and saved, so it survives a reload. Left and Right move between the buttons.
5. **Placeholder** as in bible section 5.3, if it can be done cleanly.
6. **`css/modes.css`:** the look in bible section 5.3, built only from tokens. Left-aligned and content-wide on desktop; full width with four equal buttons on phones.

## Leave alone

What is sent. Any file outside "You own". Quick Reply's bar and other extensions' rows in `#send_form`.

## Test: `tests/browser/modes-bar.mjs`

`// Usage: node tests/browser/modes-bar.mjs [phone]`

1. Off: no `#forge-modes`, no `forge-modes` class.
2. On (`setForge(page, { modes: true })`): four buttons whose text is Do, Say, Story, See, in that order.
3. The bar is inside `#send_form`, and its next element sibling is `#nonQRFormItems`.
4. Add a stand-in `<div id="qr--bar">` at the start of `#send_form`, re-apply: the bar is still directly before `#nonQRFormItems`. Remove the stand-in.
5. The bar's bottom edge is above the message box's top edge and within 16px of it.
6. Every button is at least 36px tall on desktop and 44px on the phone. On the phone the bar is not wider than `#send_form` and the page has no sideways scroll.
7. Click Do: its `aria-checked` is `true`, the others `false`, and the setting is `'do'`. Click Do again: all `false`, the setting is `''`.
8. With Say selected, re-apply: Say is still selected.
9. Off again: the element and the class are gone, and the message box's `placeholder` equals what it was before step 2.
10. With `enabled: false` and `modes: true`: no bar.

## Check

```bash
node tests/browser/modes-bar.mjs
node tests/browser/modes-bar.mjs phone
node tests/run.mjs
```

## Done when

- The commands pass.
- Only the files under "You own" changed.
- `css/modes.css` has no raw colours or sizes that a token covers, and every selector starts with `body.forge-ui.forge-modes`.

## Changelog line

`New **Do, Say, Story and See** buttons above the message box (off by default; turn them on under Message box). Pick one to shape what you type; pick it again to go back to plain sending.`

## Commit message

`Add the send modes bar`
