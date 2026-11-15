# P1-menu-frame: menus open in one centred panel

Lane P · size M · needs `00-foundation` · read bible sections 4, 5.2, 7, 8 and 9 first

## Goal

With the menu panel on, on a desktop-sized window, every SillyTavern menu opened from the top bar appears in one centred panel with a list of sections down its left side. The top bar itself stays for now; `P2` replaces it.

## You own

`menu.js`, `css/menu.css`, `tests/browser/menu-frame.mjs`, `docs/redesign/results/P1-menu-frame.md`, `docs/redesign/changes/P1-menu-frame.md`.

## Build

1. **Settings** in `menu.js`: `defaults = { menuPanel: false, menuLast: 'ai-config-button' }`. `settingsHtml` returns a section headed "Menus" with one checkbox, "Menus open in one centred panel (desktop)".
2. **`apply(s)`:** active when `s.enabled && s.menuPanel` and the window is wider than 1000px. Active: `body` gets `forge-menu`, `#forge-menu` exists as the last child of `body`, and class changes on `#top-settings-holder` are watched. Not active: all of it is gone.
3. **The frame,** as bible section 5.2: a backdrop, and a panel holding the nav on the left and a head (title and close button) on the top right. Build it with DOM calls, not HTML strings.
4. **Showing and hiding.** The frame shows exactly when some `#top-settings-holder > .drawer > .drawer-content` has `openDrawer` and not `pinnedOpen`. Work that out from the page each time something changes; keep no state.
5. **The nav:** one button per `#top-settings-holder > .drawer`, in the order and with the labels of the table in bible section 5.2; unknown drawers last, labelled from their icon's `title`. Each button carries the icon the top bar shows for that drawer and a `title` from the native icon. The button for the open drawer has `aria-current="page"`. Rebuild the list when the frame opens, so a drawer another extension added later is included.
6. **Changing section:** a nav button clicks that drawer's own `.drawer-toggle`, unless it is already open. Remember the drawer's id in `s.menuLast` whenever a drawer other than `rightNavHolder` opens.
7. **Placing the menu.** In `css/menu.css`, the open drawer is `position: fixed` over the frame's content area, sized from the geometry tokens, scrolling inside itself. It stays where it is in the DOM. Mind the first trap in bible section 8.
8. **Closing:** the close button and a click on the backdrop each click the open drawer's own `.drawer-toggle`.
9. **Clicks inside the frame** must not reach SillyTavern's "autocloses open drawers" handler: stop `mousedown` and `touchstart` from leaving the frame.

## Leave alone

The top bar and its icons. Pinned panels (`P3`). Escape and focus (`P4`). The floating panels that are also `.drawer-content` but live outside `#top-settings-holder` (bible section 10).

## Test: `tests/browser/menu-frame.mjs`

`// Usage: node tests/browser/menu-frame.mjs [phone]`

Desktop:

1. Off: click `#user-settings-button .drawer-toggle`. `#user-settings-block` is open, there is no `#forge-menu`, and its box is where SillyTavern puts it (record it). Close it again.
2. On: the same click. The frame is visible; its panel is centred in the window (2px each way) and its size matches the tokens.
3. `#user-settings-block` lies inside the panel, to the right of the nav and below the head (2px), and scrolls inside itself (its `scrollHeight` may exceed its height; the page does not scroll).
4. The nav has a button for each of the nine drawers in the bible's table, in that order, with those labels. Exactly one has `aria-current="page"`: Settings.
5. Click the Lorebooks nav button: `#WorldInfo` is open, `#user-settings-block` is closed, the frame is still visible, and `aria-current` moved.
6. A `mousedown` then click on the head, and on an empty part of the nav, closes nothing.
7. A click inside the open menu closes nothing.
8. The close button: no drawer is open and the frame is hidden. Open again and click the backdrop: the same.
9. `menuLast` is `WI-SP-button` after step 5.
10. Add a stand-in `<div class="drawer" id="test-extra-drawer">` with a toggle (icon `title` "Extra") and a `drawer-content closedDrawer` to `#top-settings-holder`, open any menu: the nav ends with a button labelled Extra. Remove the stand-in.
11. Off again: no `#forge-menu`, no `forge-menu` class, and step 1's box is the same as before.

Phone:

12. With `menuPanel: true`: no `forge-menu` class, and a drawer opens the way SillyTavern opens it.

## Check

```bash
node tests/browser/menu-frame.mjs
node tests/browser/menu-frame.mjs phone
node tests/run.mjs
```

## Done when

- The commands pass.
- The result file says how the drawer is placed (the exact CSS) and which elements, if any, had to lose a property to keep `position: fixed` honest.
- Only the files under "You own" changed.

## Changelog line

`New **menu panel** for desktop (off by default; turn it on under Menus): every SillyTavern menu opens in one centred panel, with the menus listed down its left side so you can move between them without closing it.`

## Commit message

`Open menus in one centred panel`
