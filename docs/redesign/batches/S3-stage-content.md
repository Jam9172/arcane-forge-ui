# S3-stage-content: name plate, shade and sprite

Lane S · size M · needs `S2-spine-and-width` · read bible sections 4, 5.1, 7, 8 and 10 first

## Goal

The stage shows who you are talking to, can be darkened, and carries the character's sprite when SillyTavern shows one.

## You own

`stage.js`, `css/stage.css`, `tests/browser/stage-content.mjs`, `docs/redesign/results/S3-stage-content.md`, `docs/redesign/changes/S3-stage-content.md`.

## Build

1. **Settings:** add `stagePlate: true`, `stageSprite: true`, `stageShade: 0` to `defaults` and `lookKeys`. In the Layout section add the checkboxes "Name on the stage" and "Character sprite on the stage, when it has one", and the range "Darken the stage art" (0 to 60%). All three are greyed out while the layout is Classic.
2. **Name plate** inside `#forge-stage`, as bible section 5.1. Its text is the current character's name, or the group's name in a group chat, set with `textContent`. It is hidden when no chat is open. Refresh it on SillyTavern's chat-changed event. Export the small function that sets the plate's text, so the test can give it a hostile name.
3. **Shade:** a flat black layer over the art inside `#forge-stage`, at `s.stageShade` percent.
4. **Sprite.** When the setting is on and SillyTavern's Character Expressions has put its sprite in the page (`#expression-wrapper`), place that element on the stage: bottom centre, at most 92% of the stage's height, never over the chat column. CSS only. SillyTavern writes inline positions on it, so `!important` is allowed here; comment each use. With the setting off, the sprite is wherever SillyTavern puts it.
5. Nothing of this exists outside the stage layout.

## Leave alone

SillyTavern's expression code and its settings. Visual novel mode for group chats is `I1-together`'s job; do not chase it here.

## Test: `tests/browser/stage-content.mjs`

Desktop only.

1. Stage on: the plate's text is `Forge Tester`, it lies inside `#forge-stage`, 24px from the stage's left and bottom edges (2px), and its font family is the heading font.
2. `stagePlate: false`: no plate on screen.
3. Call the plate function with `<img src=x onerror=alert(1)><b>Mira</b>`: the plate's `textContent` is that string and it contains no element.
4. `stageShade: 40`: the shade layer is black at 0.4. `stageShade: 0`: it is not visible.
5. **Sprite.** If `#expression-wrapper` is not in the page, add a stand-in built like SillyTavern's (`#expression-wrapper` holding `#expression-holder` holding an `img#expression-image` with a data-URI picture and an inline `left` and `top`) and remove it at the end. With `stageSprite: true` its box lies inside the stage, its bottom is the stage's bottom (2px), and it does not overlap `#sheld`. With `stageSprite: false` its inline position is what counts again.
6. Layout back to Classic: no plate, no shade, and the stand-in sprite is back at its inline position.

## Check

```bash
node tests/browser/stage-content.mjs
node tests/run.mjs stage
node tests/run.mjs
```

## Done when

- The commands pass.
- Every `!important` in `css/stage.css` has a comment naming the inline style it beats.
- Only the files under "You own" changed.

## Changelog line

`Stage layout: the stage shows the character's name on a plate, the character's sprite when it has one, and can be darkened with **Darken the stage art**. Each can be turned off under Layout.`

## Commit message

`Put the name plate, shade and sprite on the stage`
