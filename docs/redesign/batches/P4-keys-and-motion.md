# P4-keys-and-motion: Escape, focus, Tab and motion

Lane P · size S · needs `P3-characters-and-pins` · read bible sections 4 (Motion), 5.2 and 11 first

## Goal

The menu panel behaves like a proper dialog for someone using the keyboard, and it moves only as much as the person has allowed.

## You own

`menu.js`, `css/menu.css`, `tests/browser/menu-keys.mjs`, `docs/redesign/results/P4-keys-and-motion.md`, `docs/redesign/changes/P4-keys-and-motion.md`.

## Build

1. **Roles:** the panel is `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` its title. The nav is a `<nav>` with `aria-label="Menus"`.
2. **Opening** moves the focus to the nav button of the open section.
3. **Tab** stays inside the frame and the open menu, going round from the last focusable thing to the first and back.
4. **Escape** closes the panel, unless a SillyTavern dialog or popup is open on top of it (an open `<dialog>`, or whatever SillyTavern's popups are in the page); then Escape belongs to that. Do not add a key listener on `document` that runs when the panel is closed.
5. **Closing** gives the focus back to whatever opened the panel: one of the round buttons, or the top-bar icon when the buttons are off.
6. **Motion:** the frame fades in and the panel scales from 0.98 to 1, over `--forge-fast`. The backdrop fades. Nothing else moves. With reduced motion (bible section 4, both ways it can be set) there is no transition at all.
7. The focus ring is the existing one. Add no focus styles of your own.

## Leave alone

Keys inside SillyTavern's own menus. Global shortcuts.

## Test: `tests/browser/menu-keys.mjs`

Desktop only.

1. Focus the Menu round button and press Enter: the frame is open and the focused element is the nav button with `aria-current="page"`.
2. The panel has `role="dialog"` and `aria-modal="true"`, and its `aria-labelledby` points at an element whose text is the section's label.
3. Press Tab 60 times, checking after each: the focused element is always inside `#forge-menu` or inside the open menu. Shift+Tab 10 times: the same.
4. Press Escape: the frame is closed and the focused element is the Menu round button.
5. Open with Characters, press Escape: focus is on the Characters round button.
6. Open a menu, then open a stand-in `<dialog>` with `showModal()`, press Escape: the dialog closed and the panel is still open. Press Escape again: the panel closes.
7. With the panel closed, press Escape: nothing of ours runs (no drawer toggles; check that no `.drawer-toggle` received a click by counting clicks with a listener the test adds).
8. Open a menu: the frame's computed `transition-duration` is 0.16s. With `page.emulateMedia({ reducedMotion: 'reduce' })`, re-apply and open again: it is 0s.
9. With SillyTavern's own Reduced Motion setting switched on in the page (set the value the bible names, re-apply): 0s. Switch it back.
10. `menuButtons: false`: open a menu from a top-bar icon with the keyboard, press Escape: focus is back on that icon.

## Check

```bash
node tests/browser/menu-keys.mjs
node tests/run.mjs menu
node tests/run.mjs
```

## Done when

- The commands pass.
- Only the files under "You own" changed.

## Changelog line

`Menu panel: Escape closes it, Tab stays inside it, and the keyboard focus returns to where you opened it from. It fades in, or appears at once if you have reduced motion on.`

## Commit message

`Make the menu panel work by keyboard and respect reduced motion`
