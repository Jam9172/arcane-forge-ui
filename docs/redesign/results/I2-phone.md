# I2-phone

Built by the lead in its own checkout, without helper agents (the owner's choice for wave 2). There was no independent check.

## Built

- **The bar spans the form on a phone.** It had 8px side margins; on phones it now has none, so it is as wide as `#send_form`'s inner width (388px of 390), with four equal 87.5px buttons, 44px tall. The labels fit beside their icons at 390px at the default size and at Phone chat text 150%, so the icons stay.
- **Landscape.** In a phone-width window under 420px tall the bar is one 36px row (new token `--forge-bar-short`), so the chat keeps its room (206px above the form at 844 by 390).
- `tests/browser/phone.mjs`: the brief's eight steps.

Already right, and now tested: the bar is above the message box; nothing scrolls sideways; SillyTavern's own top bar and its full-width drawers are untouched on a phone; the two TauriTavern habits change nothing and no message shows an outline; the bar does not move with Compact messages on phones on or off; a desktop window narrowed past 1000px with a menu open in the panel loses the frame and gives SillyTavern's own drawer back, with the message box still on screen.

## Test output

```
$ node tests/browser/phone.mjs
ok   390 by 800: the bar is above the message box
ok   390 by 800: it is as wide as the form's inner width (2px)
ok   390 by 800: four buttons, each at least 44px tall and equal in width (1px)
ok   390 by 800: no label is cut off
ok   390 by 800: no sideways scroll
ok   with Phone chat text at 150%: (the same five)
ok   SillyTavern's top bar is on screen
ok   tapping its user-settings icon opens SillyTavern's own drawer, full width, and no panel of ours
ok   like TauriTavern: (the same five)
ok   like TauriTavern: no message has an outline after a tap and an arrow key
ok   the bar is in the same place with Compact messages on phones on and off
ok   844 by 390: the bar is one row
ok   and it is 36px tall, the window being under 420px
ok   and the chat above the form is at least 120px tall
ok   844 by 390: no sideways scroll
ok   narrowed to 390 by 800 with a menu open in the panel: no frame and no forge-menu class
ok   and the page is usable: the message box is on screen
ok   no script errors
```

`node tests/run.mjs modes together`: 8 passed, 0 failed. The full suite is recorded in `STATUS.md` with the merge.

## Choices the bible did not cover

- **Safe areas.** SillyTavern pads `#sheld` by `env(safe-area-inset-left/right)` (`css/mobile-styles.css`, for the installed app), and the bar is inside the form inside `#sheld`, so it keeps clear of a notch exactly as SillyTavern's own form does. No rule of ours was needed.
- **TauriTavern's expanded message editor.** M2 read its public source: its Send hands the text straight to SillyTavern's send code, so the modes cannot shape what is sent from it. While it is open (`#tt-chat-input-editor[open]`, a `<dialog>` on `body`) the bar is hidden, so a picked mode does not look as if it applies, and the editor sends plainly. This batch keeps that choice; the brief allows it.
- **The short landscape bar has no inner padding**, so its buttons are 34px tall inside the 36px row: below the 44px touch target, which the brief's 36px row cannot hold. Portrait phones keep 44px.

## For the owner: what a test cannot show on a real phone

- The bar with the on-screen keyboard up (WebKit's test window has no keyboard).
- The bar beside a real notch and home bar (the test window has no safe areas).
- A real tap with a thumb on the 34px landscape buttons.
- TauriTavern itself, and its expanded editor.

## Asked of other files

None.

## Not done

Nothing in the brief.
