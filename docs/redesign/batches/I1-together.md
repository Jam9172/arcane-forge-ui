# I1-together: all three on at once, and beside other extensions

Wave 2 · size M · needs every wave 1 batch merged · read the whole bible, then every file in `docs/redesign/results/`

## Goal

Stage, menu panel and send modes work together, and nothing of ours collides with what other extensions put on the page.

## You own

Everything in the repository except `aiTab.js`, `deleteMode.js`, `fonts/` and `manifest.json`. You are the first batch allowed to touch more than one feature, so keep each change in the file of the feature it belongs to.

## Build

1. **Requests from the lanes.** Read every result file. Each change a lane asked for in a file it did not own is yours to make or to turn down, with the reason in your result file.
2. **The seams.**
   - Stage with the round buttons: the chat column starts at the top of the window, and the chat's scroll area has enough padding at the top that the first message is never under the buttons.
   - Stage without the round buttons: the column starts below the top bar.
   - The spine is never above the menu panel's backdrop, and cannot be dragged while the panel is open.
   - The menu panel is centred on the window, not on the stage.
   - The send modes bar keeps its place and size in the stage's chat column, down to the 480px minimum.
3. **RPG Companion.** Do not select, style or move its elements. The one thing to get right: when its side panel is open at the right edge of the window, the stage's chat column must not sit under it. Look at the sandbox page to see how that panel is placed and how wide it is, then make the chat column leave that room. If RPG Companion is not in the page, nothing changes.
4. **Quick Reply and other rows** in `#send_form`: the send modes bar is still the row nearest the message box.
5. **Sprites.** In the stage layout with visual novel mode on (`body.waifuMode`), sprites stay on the stage and off the chat column.
6. **Main switch.** With Arcane Forge UI's own switch off, none of the three features leaves anything in the page, whatever their switches say.

## Leave alone

RPG Companion's files and elements. SillyTavern's settings. New features: this batch joins what exists.

## Test: `tests/browser/together.mjs`

`// Usage: node tests/browser/together.mjs [phone]`

Desktop, with `layout: 'stage'`, `menuPanel: true`, `menuButtons: true`, `modes: true`:

1. No overlap between: the round buttons and the first message in the chat; the send modes bar and the message box; the spine and the chat's text.
2. `#sheld` starts at the top of the window. With `menuButtons: false` it starts at the top bar's bottom.
3. Open a menu: the panel is centred on the window (2px), and a mouse drag on the spine's position changes no width.
4. If the page has RPG Companion's side panel open at the right: its box and `#sheld`'s box do not overlap. If it is not in the page, print `ok` with "RPG Companion not in the page".
5. With a stand-in `#qr--bar` at the start of `#send_form`: `#forge-modes` is still directly before `#nonQRFormItems`.
6. At 1040 by 700: the chat is at least 480px, the stage at least 320px, and the four mode buttons fit inside the chat column without wrapping.
7. `enabled: false`: no element whose id starts with `forge-`, no `forge-stage`, `forge-menu`, `forge-menu-buttons` or `forge-modes` class, `--topBarBlockSize` and the pins as SillyTavern had them, and the boxes of `#sheld`, `#top-bar` and `#send_textarea` equal to those of a page that never had the features on.

Phone, with the same four settings:

8. No `forge-stage`, `forge-menu` or `forge-menu-buttons`. `forge-modes` is present and the bar is above the message box.
9. No sideways scroll.

## Check

```bash
node tests/browser/together.mjs
node tests/browser/together.mjs phone
node tests/run.mjs
```

## Done when

- The commands pass.
- Every lane request is answered in the result file.
- The result file says how RPG Companion's panel is detected, in one sentence a later reader can check against the page.

## Changelog line

Only if something the person using it would notice changed. Otherwise none.

## Commit message

`Make the stage, menu panel and send modes work together`
