# P2-buttons-and-top-bar: two round buttons replace the top bar

Lane P · size M · needs `P1-menu-frame` · read bible sections 4, 5.2, 7 and 8 first

## Goal

With the menu panel on, the row of icons across the top is gone. Two round buttons at the top right open the panel: one for characters, one for everything else.

## You own

`menu.js`, `css/menu.css`, `tests/browser/menu-buttons.mjs`, `docs/redesign/results/P2-buttons-and-top-bar.md`, `docs/redesign/changes/P2-buttons-and-top-bar.md`.

## Build

1. **Setting:** add `menuButtons: true` to `defaults`. In the Menus section add the checkbox "Two round buttons in place of the top bar", greyed out while the menu panel is off.
2. **The buttons,** as bible section 5.2: `#forge-menu-buttons`, fixed at the top right, holding two real `<button>`s, Characters then Menu, with `aria-label`s and `title`s. They exist only when the menu panel is active and `menuButtons` is on; then `body` also has `forge-menu-buttons`.
3. **Characters** clicks `#rightNavHolder`'s `.drawer-toggle`. **Menu** clicks the toggle of the drawer named in `s.menuLast`, falling back to `ai-config-button` if that drawer is not in the page.
4. **Hiding the top bar** under `body.forge-menu-buttons`: `#top-bar` and every `.drawer-toggle` in `#top-settings-holder` are not shown, and the holder takes no space and catches no clicks, while the menus inside it still show and work in the panel. Give the space back by setting `--topBarBlockSize` to `0px` on `body`; check what else in SillyTavern uses that variable and note anything surprising.
5. **The "not connected" dot:** while SillyTavern has no API connection, Menu shows an 8px `--forge-danger` dot. Find out how SillyTavern marks that state in the page and follow it; do not poll.
6. With `menuButtons` off, the top bar stays as it was and the panel from `P1` keeps working.

## Leave alone

Pinned panels (`P3`). Escape and focus (`P4`). The chat's own padding under the buttons is `I1-together`'s job, because it depends on the layout; do not style `#chat` here.

## Test: `tests/browser/menu-buttons.mjs`

Desktop only (phones never get the buttons; step 9 checks that).

1. Menu panel on, buttons on: `#top-bar` is not shown, no `.drawer-toggle` in `#top-settings-holder` is shown, and `body` has `forge-menu-buttons`.
2. Two buttons at the top right: each at least 40px wide and tall, the right one within 16px of the window's top and right edges, 8px apart (2px tolerance).
3. `#sheld` starts at the top of the window (1px).
4. Click Menu: the frame opens on AI response (`#left-nav-panel` is open). Switch to Lorebooks, close, click Menu again: it opens on Lorebooks.
5. Click Characters: the frame opens with `#right-nav-panel`. Close, click Menu: it opens on Lorebooks, not Characters.
6. Set `menuLast` to an id that is not in the page: Menu opens AI response.
7. Put SillyTavern in its "not connected" state the way the page marks it: the dot is visible on Menu. Mark it connected: no dot.
8. `menuButtons: false`: `#top-bar` and the toggles are back where they were (compare with their boxes before step 1), the buttons are gone, and a top-bar icon still opens its menu in the panel.
9. Phone size with both settings on: no `#forge-menu-buttons`, and SillyTavern's top bar is on screen.
10. Menu panel off: `--topBarBlockSize` on `body` is back to SillyTavern's value and nothing of ours remains.

## Check

```bash
node tests/browser/menu-buttons.mjs
node tests/run.mjs menu
node tests/run.mjs
```

## Done when

- The commands pass.
- The result file lists what you found using `--topBarBlockSize` and how the connection state is read.
- Only the files under "You own" changed.

## Changelog line

`Menu panel: the row of icons across the top is replaced by **two round buttons** at the top right, one for your characters and one for every other menu. A red dot on the menu button means there is no API connection. Turn the buttons off under Menus to keep the top bar.`

## Commit message

`Replace the top bar with two round buttons`
