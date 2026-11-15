# I2-phone: the phone pass

Wave 2 · size S · needs `I1-together` · read bible sections 5.4, 8, 10 and 11 first

## Goal

On a phone or tablet the only new thing is the send modes bar, and it is comfortable to use with a thumb.

## You own

`modes.js`, `css/modes.css`, `css/tokens.css`, `style.css` (phone rules only), `tests/browser/phone.mjs`, and this batch's result and changes files.

## Build

1. **The bar on a phone:** spans the form, four equal buttons, each at least 44px tall, labels on one line at 390px wide with the default text size and at the largest "Phone chat text" setting. If the labels cannot fit beside the icons at the largest size, drop the icons on phones rather than shrinking the text.
2. **Safe areas:** the bar and the message box respect `env(safe-area-inset-left)` and `env(safe-area-inset-right)`, as SillyTavern's own form does.
3. **Landscape** (844 by 390): the bar stays one row and leaves room for the chat. If the window is shorter than 420px, the bar is 36px tall.
4. **Compact phone layout** (the existing "Compact messages on phones" setting) still looks right with the bar present.
5. **TauriTavern's expanded message editor** (classes starting `tt-chat-input`): read its source (`../SillyTavern` does not have it; it is in TauriTavern's repository on GitHub, read-only) and decide what the bar does while it is open. Hiding the bar and sending plainly from the expanded editor is acceptable. Write what you chose and why.
6. **Stage and menu panel** stay off on phones whatever the settings say, including when a desktop window is narrowed past 1000px while a menu is open: the frame goes away and the menu is SillyTavern's own drawer again.

## Leave alone

SillyTavern's phone top bar and drawers: they keep the Forge look they already have. Do not build a bottom bar.

## Test: `tests/browser/phone.mjs`

Runs its own two sizes; no `[phone]` line needed. Open with `openForge({ phone: true })`, then resize for landscape.

1. 390 by 800, modes on: the bar is above the message box, as wide as `#send_form`'s inner width (2px), buttons at least 44px tall and equal in width (1px).
2. No button's text is cut off (`scrollWidth` equals `clientWidth`) at the default size and with `phoneChatScale: 150`.
3. No sideways scroll.
4. SillyTavern's top bar is on screen, and tapping its user-settings icon opens SillyTavern's own drawer, full width, with no `#forge-menu`.
5. With `likeTauriTavern(page)` applied: steps 1 to 3 still hold, and no message has an outline after a tap on it and an arrow key.
6. 844 by 390: the bar is one row; the chat area above the form is at least 120px tall.
7. Desktop size with a menu open in the panel, then resize to 390 by 800: no `#forge-menu`, no `forge-menu` class, and the page is usable (the message box is on screen).
8. `phoneCompact: true` and `false`: the bar's box is the same in both.

## Check

```bash
node tests/browser/phone.mjs
node tests/run.mjs
```

## Done when

- The commands pass.
- The result file states the choice made for TauriTavern's expanded editor.
- The result file lists, for the owner, what a test cannot show on a real phone: the bar with the on-screen keyboard up, and with the phone's own notch and home bar.

## Changelog line

Only if something the person using it would notice changed. Otherwise none.

## Commit message

`Fit the send modes bar to phones`
