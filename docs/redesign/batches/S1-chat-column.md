# S1-chat-column: the chat docks right, the art gets the stage

Lane S · size M · needs `00-foundation` · read bible sections 4, 5.1, 7, 8 and 9 first

## Goal

With Forge layout set to Stage on a desktop-sized window, the chat is one column at the right edge and the background art is centred on the area to its left.

## You own

`stage.js`, `css/stage.css`, `tests/browser/stage-column.mjs`, `docs/redesign/results/S1-chat-column.md`, `docs/redesign/changes/S1-chat-column.md`.

## Build

1. **Settings** in `stage.js`: `defaults = { layout: 'classic', stageChat: 46 }`. `settingsHtml` returns a section headed "Layout" with one select, "Forge layout", offering "Classic (SillyTavern's own)" and "Stage (art on the left, chat on the right)", and the note "Desktop only. Phones keep the classic layout."
2. **`apply(s)`:** active when `s.enabled && s.layout === 'stage'` and the window is wider than 1000px. Active: `body` gets `forge-stage`; `--forge-stage-chat` is set on `body` to the clamped width from bible section 5.1, using `s.stageChat`; `#forge-stage` (`aria-hidden="true"`) is appended to `body`. Not active: all three are removed.
3. **`css/stage.css`:**
   - `#sheld` sits at the right edge, `--forge-stage-chat` wide. Read SillyTavern's own rules for `#sheld` first (it is centred with `--sheldWidth`, and its top and height follow `--topBarBlockSize`). Override only the side and the width; keep its top and height formulas so the column still starts below the top bar and ends at the bottom of the window.
   - `#bg1` and `#bg_custom` cover only the stage, so the art is centred on it. Behind the chat column is `--forge-bg`.
   - `#forge-stage` covers the stage, with `pointer-events: none`, above the art and below everything else.
4. The top bar and its drawers are untouched in this batch.

## Leave alone

`--sheldWidth` and SillyTavern's Chat Width setting. The top bar. The phone layout. Everything in `index.js` and `style.css`.

## Test: `tests/browser/stage-column.mjs`

`// Usage: node tests/browser/stage-column.mjs [phone]`

Desktop (1440 by 900):

1. Record the boxes of `#sheld`, `#top-bar`, `#bg1` and `#send_textarea` in the classic layout.
2. `setForge(page, { layout: 'stage' })`: `body` has `forge-stage`.
3. `#sheld`'s right edge is the window's right edge (1px tolerance), and its width is 46% of the window (2px tolerance).
4. `#sheld`'s top is `#top-bar`'s bottom (1px), and its bottom is the window's bottom (1px).
5. `#bg1` starts at the left edge and ends where `#sheld` starts (1px).
6. `#forge-stage` covers the same area as `#bg1` (1px).
7. `#send_textarea` lies inside `#sheld` from left to right.
8. Resize the page to 1040 by 700: the stage is at least 320px wide and the chat at least 480px.
9. Back to `layout: 'classic'`: the four boxes equal step 1 exactly; `#forge-stage` is gone; `body` has no `--forge-stage-chat`.

Phone:

10. With `layout: 'stage'`, `body` has no `forge-stage` and `#sheld`'s box is the same as with `layout: 'classic'`.

## Check

```bash
node tests/browser/stage-column.mjs
node tests/browser/stage-column.mjs phone
node tests/run.mjs
```

## Done when

- The commands pass.
- Opening a top-bar menu in stage layout still works (it opens where SillyTavern puts it). Say in the result file what you saw.
- Only the files under "You own" changed, and every selector in `css/stage.css` starts with `body.forge-ui.forge-stage`.

## Changelog line

`New **Stage** layout for desktop (off by default; choose it under Layout): the chat is one column on the right and the background art gets the rest of the window, centred on its own area.`

## Commit message

`Add the stage layout's chat column`
