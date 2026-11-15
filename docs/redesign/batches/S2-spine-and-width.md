# S2-spine-and-width: drag the chat's edge

Lane S · size S · needs `S1-chat-column` · read bible sections 5.1, 7 and 11 first

## Goal

In the stage layout the chat column's left edge can be dragged to make the chat wider or narrower, and the width is also a setting.

## You own

`stage.js`, `css/stage.css`, `tests/browser/stage-spine.mjs`, `docs/redesign/results/S2-spine-and-width.md`, `docs/redesign/changes/S2-spine-and-width.md`.

## Build

1. **The spine:** `#forge-spine`, exactly as bible section 5.1: a `role="separator"` on the chat column's left edge, a 1px `--forge-bar-line` line with an 11px grab area, focusable, with `aria-valuenow`, `aria-valuemin="35"`, `aria-valuemax="70"` and `aria-label="Chat width"`.
2. **Dragging** with pointer events and `setPointerCapture`, so it works with a mouse, a pen and a finger. While dragging, the width follows the pointer live; `body` carries `forge-dragging`, which switches off text selection. On release the value is rounded to a whole percent, kept within 35 to 70, and saved.
3. **Keys:** Left widens the chat by 1%, Right narrows it by 1%, Home and End go to 70 and 35. Double-click resets to 46.
4. **Setting:** a range input "Chat width" (35 to 70, shown as a percentage) in the Layout section, greyed out while the layout is Classic. Add `stageChat` to `lookKeys` as a number from 35 to 70.
5. The clamp from bible section 5.1 always holds: the chat is never under 480px and the stage never under 320px, whatever the percentage says.
6. The spine exists only while the stage layout is active.

## Leave alone

SillyTavern's own Chat Width setting and `--sheldWidth`.

## Test: `tests/browser/stage-spine.mjs`

Desktop only.

1. Stage on: `#forge-spine` sits on `#sheld`'s left edge (2px) and is as tall as `#sheld`.
2. Drag it 200px to the left with the mouse: `#sheld` is about 200px wider (3px), and the saved `stageChat` is that width as a whole percent of the window.
3. Drag it far to the left: the stage stops at 320px. Far to the right: the setting stops at 35 and the chat is never under 480px.
4. Focus the spine and press Left: `stageChat` goes up by 1 and `aria-valuenow` follows. Right: down by 1. Home: 70. End: 35.
5. Double-click: 46.
6. Set the range input in the settings screen to 60: `#sheld` is 60% of the window (2px).
7. Layout back to Classic: no `#forge-spine`, no `forge-dragging` class.

## Check

```bash
node tests/browser/stage-spine.mjs
node tests/run.mjs stage
node tests/run.mjs
```

## Done when

- The commands pass.
- Only the files under "You own" changed.

## Changelog line

`Stage layout: drag the chat's left edge to resize it, or set **Chat width** under Layout. Double-click the edge to reset it.`

## Commit message

`Let the stage's chat edge be dragged`
