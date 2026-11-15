# P3-characters-and-pins: the character list in the panel, and pinned panels

Lane P · size S · needs `P2-buttons-and-top-bar` · read bible sections 5.2, 8 and 10 first

## Goal

The Characters section works fully inside the panel, and SillyTavern's pinned panels are put away while the menu panel is on and put back when it is turned off.

## You own

`menu.js`, `css/menu.css`, `tests/browser/menu-characters.mjs`, `docs/redesign/results/P3-characters-and-pins.md`, `docs/redesign/changes/P3-characters-and-pins.md`.

## Build

1. **Pins.** SillyTavern has three pin checkboxes: `#lm_button_panel_pin` (AI response), `#rm_button_panel_pin` (Characters) and `#WI_panel_pin` (Lorebooks). A pinned panel has `pinnedOpen` and stays open beside the chat.
   - When the menu panel becomes active: record which of the three are checked in `s.menuPins` (add `menuPins: {}` to `defaults`), then unpin each checked one by clicking its own checkbox, so SillyTavern does the unpinning.
   - While active: the pin controls are hidden.
   - When the menu panel stops being active, including when Arcane Forge UI itself is switched off or the window drops to phone size: click each recorded checkbox to pin it again, and empty `s.menuPins`.
   - Never record twice: if `s.menuPins` already has entries, a second activation leaves them alone.
2. **Characters section.** `#right-nav-panel` holds the character list and the character editor. In the panel it must fill the content area, with its own tabs, search and list working, and the list scrolling inside it.
3. **What opens from it.** The advanced definitions window (`#character_popup`) and SillyTavern's dialogs open above the panel and can be used. SillyTavern has a rule that lifts `#top-settings-holder` while `#character_popup` is open; make sure the frame does not end up above the window it opened.
4. **Floating panels** that share the `drawer-content` class but live outside `#top-settings-holder` (the prompt manager popup, Author's Note, CFG, log probabilities) are not placed, hidden or styled by the menu panel. Check each selector in `css/menu.css` against them.

## Leave alone

SillyTavern's character code. Do not open or select any character in a test other than Forge Tester, which the helper has already selected.

## Test: `tests/browser/menu-characters.mjs`

Desktop only.

1. Menu panel off. Pin the Characters panel by clicking `#rm_button_panel_pin`: `#right-nav-panel` has `pinnedOpen`.
2. Menu panel on: `pinnedOpen` is gone from `#right-nav-panel`, the checkbox is unchecked, `menuPins` records it, and the pin controls are not shown.
3. Re-apply while on: `menuPins` is unchanged.
4. Click the Characters round button: the frame opens, and `#right-nav-panel` and the character list inside it (`#rm_print_characters_block`) lie inside the content area.
5. The frame is closed; menu panel off: `#rm_button_panel_pin` is checked again, `#right-nav-panel` has `pinnedOpen`, and `menuPins` is empty. Unpin it to leave the page as it was.
6. Repeat steps 1, 2 and 5 for `#lm_button_panel_pin` with `#left-nav-panel`.
7. Add a stand-in `<div class="drawer-content" id="test-floating">` directly under `body`, with an inline position: with the menu panel on and a menu open, its box is unchanged. Remove it.
8. With the Characters section open, show `#character_popup` the way SillyTavern does for the selected character, or with a stand-in carrying the same id and classes if that needs a click on a character: the element at its centre point is inside it, not inside the frame.

## Check

```bash
node tests/browser/menu-characters.mjs
node tests/run.mjs menu
node tests/run.mjs
```

## Done when

- The commands pass.
- The result file says what happens to the pins in each of the three ways the menu panel can stop being active.
- Only the files under "You own" changed.

## Changelog line

`Menu panel: your characters open in the panel too. Panels you had pinned beside the chat are unpinned while the menu panel is on and pinned again when you turn it off.`

## Commit message

`Handle the character list and pinned panels in the menu panel`
