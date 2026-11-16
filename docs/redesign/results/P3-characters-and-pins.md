# P3-characters-and-pins

## Built

- `menu.js`:
  - `defaults` gains `menuPins: {}`. `lookKeys` stays `{}` (bible section 7: not in the look file, not shown).
  - **Unpinning.** Each time the panel is applied as active, `unpin(s)` looks at SillyTavern's three pin checkboxes (`#lm_button_panel_pin`, `#rm_button_panel_pin`, `#WI_panel_pin`). For each one that is checked it records `{ <checkbox id>: true }` in `s.menuPins`, saves (`saveSettingsDebounced`), and clicks that checkbox, so SillyTavern's own handler takes `pinnedOpen` off and stores the change. Nothing is clicked or saved when no pin is on, so applying again changes nothing.
  - **Pins that turn up later.** P1's one observer on `#top-settings-holder` (class changes) now also calls `unpin` when a drawer's content has `pinnedOpen`. SillyTavern restores its saved pins in `initRossMods`, which runs after Forge UI has started, so a pin it brings back (for example after a reload that came before the unpin was saved) is put away and recorded too. No new observer or listener.
  - **Pinning again.** Each time the panel is applied as not active, `repin(s)` clicks every recorded checkbox that is not checked, then sets `s.menuPins` to a new `{}` and saves. With nothing recorded it does nothing. Because `apply` runs on every way the panel can stop (below), this is the one place the pins come back.
- `css/menu.css`:
  - The pin controls are hidden under `body.forge-ui.forge-menu`: `#rm_button_panel_pin_div` and `#WI_panel_pin_div` get `display: none`; for AI response the lock (`#lm_button_panel_pin_div > label`) gets `display: none` and its row `visibility: hidden` (see the choices).
  - "Windows over the panel": the backdrop and panel layers become `calc(var(--forge-z-backdrop) + var(--forge-menu-lift, 0))` and `calc(var(--forge-z-frame) + var(--forge-menu-lift, 0))`. `--forge-menu-lift` is `1000` on `body` exactly when SillyTavern's own rule lifts `#top-settings-holder` from 3005 to 4005 (the same three conditions, copied from SillyTavern's `style.css`). So the frame always sits just under its open menu.
- `tests/browser/menu-characters.mjs`: the brief's eight steps, a phone variant, and the extra checks listed under "Test output".
- Nothing was needed for the Characters section's own layout. P1's placement already makes `#right-nav-panel` the content area (390,116 879x723 at 1440 by 900), and its inner blocks (tabs, search, list, editor) fit and scroll inside it. The test proves it.

### What happens to the pins

| When | What happens |
|---|---|
| The menu panel becomes active (switch ticked, Forge UI switched on, window wider than 1000px, page load) | Every pin that is on is recorded in `menuPins` and turned off with its own checkbox. Pins already recorded stay recorded. The three locks are hidden. |
| While active, a pin comes on (SillyTavern restoring its saved pins) | The same: recorded and turned off. |
| **The menu panel switch is unticked** | `repin` clicks each recorded checkbox that is off, so the panels are pinned again (`pinnedOpen`), and `menuPins` becomes `{}`. The locks show again. |
| **Arcane Forge UI's main switch is turned off** | The same, because `apply` then sees `enabled: false`. |
| **The window drops to 1000px or less** | The same, through `index.js`'s media query listener. Widening the window again unpins and records them again. |
| Reset to Forge defaults | `index.js` first applies every feature with `enabled: false` and the old settings, so the pins go back and the copy's `menuPins` is emptied; then `menuPins` is `{}` with the other defaults. |
| A reload while active | The pins were turned off through SillyTavern, which saved that, so they load off; `menuPins` still holds them, and a later switch-off puts them back. |

A panel that is pinned again is not opened again: it comes back pinned in whatever open or closed state it is in at that moment.

## Test output

```
$ node tests/browser/menu-characters.mjs
ok   start: no panel is pinned (none)
ok   1. panel off: the Characters lock pins #right-nav-panel ({"checked":true,"pinned":true})
ok   2. panel on: #right-nav-panel is no longer pinned and its checkbox is off ({"checked":false,"pinned":false})
ok   2. menuPins records it ({"rm_button_panel_pin":true})
ok   2. the frame stays closed (Characters was closed)
ok   2. the three pin controls are not shown in their sections ({"AI response":"gone","Lorebooks":"gone","Characters":"gone"})
ok   3. re-applied: menuPins is unchanged ({"rm_button_panel_pin":true})
ok   a pin SillyTavern sets later is taken off and recorded as well ({"checked":false,"pinned":false} {"rm_button_panel_pin":true,"WI_panel_pin":true})
ok   4. Characters opens the frame with #right-nav-panel
ok   4. #right-nav-panel fills the content area (390,116 879x723 vs {"left":390,"top":116,"right":1269,"bottom":839})
ok   4. the list tab shows the character list (#rm_print_characters_block) inside the content area (395,283 869x551 in {"left":390,"top":116,"right":1269,"bottom":839})
ok   4. the tabs lie inside the content area (395,148 864x27)
ok   4. the search box lies inside the content area (400,214 859x28)
ok   4. searching filters the list, and clearing the search brings it back (7 entries, 0 found, 7 after clearing)
ok   4. a long list scrolls inside its own box, which stays in the content area, and the page does not scroll ({"overflows":true,"scrolled":true,"bottom":834,"pageScrolled":false})
ok   4. the selected character's tab brings its editor back
ok   8. Advanced definitions opens #character_popup, with the Characters section still open behind it
ok   8. the element at the middle of #character_popup is inside it, not in the frame ({"shown":true,"at":"popup","popup":4001,"backdrop":3003,"panel":3004,"holder":3005})
ok   8. the frame and the menus' holder are below it ({"shown":true,"at":"popup","popup":4001,"backdrop":3003,"panel":3004,"holder":3005})
ok   8. Lorebooks opened from the nav meanwhile: frame and menu go over the window together, the frame just under the menu ({"shown":true,"at":"menu WorldInfo","popup":4001,"backdrop":4003,"panel":4004,"holder":4005})
ok   8. back on Characters: the window is on top again ({"shown":true,"at":"popup","popup":4001,"backdrop":3003,"panel":3004,"holder":3005})
ok   8. its own cross closes it, and Characters stays open
ok   a SillyTavern dialog opened over the Characters section is on top
ok   the dialog closes with its own button, and Characters stays open
ok   5. the frame is closed
ok   5. panel off: #rm_button_panel_pin is checked again and #right-nav-panel pinned ({"checked":true,"pinned":true})
ok   5. the Lorebooks pin is back too ({"checked":true,"pinned":true})
ok   5. menuPins is empty ({})
ok   5. the locks are shown again, and unpin both by hand (shown, shown; pinned: none)
ok   6. panel off: the AI response lock pins #left-nav-panel ({"checked":true,"pinned":true})
ok   6. panel on: #left-nav-panel is no longer pinned and its checkbox is off ({"checked":false,"pinned":false})
ok   6. menuPins records it ({"lm_button_panel_pin":true})
ok   6. AI response, which was open, now shows in the frame
ok   6. its lock is not shown there (gone)
ok   6. frame closed, panel off: #lm_button_panel_pin is checked again and #left-nav-panel pinned ({"checked":true,"pinned":true})
ok   6. menuPins is empty ({})
ok   6. the lock is shown again, and unpin it by hand (shown; pinned: none)
ok   window at 1000px: the pin is back and menuPins empty ([{"label":"on","pinned":false,"unpinned":true,"pins":"{\"rm_button_panel_pin\":true}"},{"label":"1000px","pinned":true,"unpinned":false,"pins":"{}"}])
ok   window at 1440px again: unpinned and recorded again ({"label":"1440px","pinned":false,"unpinned":true,"pins":"{\"rm_button_panel_pin\":true}"})
ok   Forge UI switched off: the pin is back and menuPins empty ({"label":"main switch off","pinned":true,"unpinned":false,"pins":"{}"})
ok   Forge UI switched on: unpinned and recorded again ({"label":"main switch on","pinned":false,"unpinned":true,"pins":"{\"rm_button_panel_pin\":true}"})
ok   Reset: the panel is off, the pin is back and menuPins is empty ({"checked":true,"pinned":true} {})
ok   unpinned again by hand, and no menu is open
ok   7. with the panel on and a menu open, the floating stand-in is where it was and looks the same ({"box":[515,140,450,200],"style":["fixed","block","visible","auto","1","rgba(0, 0, 0, 0)","1px","8px","rgba(0, 0, 0, 0.6) 0px 12px 32px 0px, color(srgb 0.85098 0.639216 0.356863 / 0.08) 0px 0px 0px 1px inset","auto","height 0.25s ease-in-out allow-discrete, display 0.25s ease-in-out allow-discrete","0px 475px"]} vs {"box":[515,140,450,200],"style":["fixed","block","visible","auto","1","rgba(0, 0, 0, 0)","1px","8px","rgba(0, 0, 0, 0.6) 0px 12px 32px 0px, color(srgb 0.85098 0.639216 0.356863 / 0.08) 0px 0px 0px 1px inset","auto","height 0.25s ease-in-out allow-discrete, display 0.25s ease-in-out allow-discrete","0px 475px"]})
ok   7. marked open, it does not bring up the frame
ok   end: no panel is pinned and menuPins is empty
ok   no script errors

$ node tests/browser/menu-characters.mjs phone
ok   phone: start: no panel is pinned (none)
ok   phone, panel off: the Lorebooks lock pins #WorldInfo (shown {"checked":true,"pinned":true})
ok   phone: no forge-menu class and no #forge-menu
ok   phone, panel on: the pin stays on and nothing is recorded ({"checked":true,"pinned":true} {})
ok   phone, panel on: the Lorebooks lock is still shown, and unpins it by hand (shown; pinned: none)
ok   phone: menuPins is still empty ({})
ok   no script errors

$ node tests/run.mjs menu
ok       menu-buttons  55 checks, 33s
ok       menu-buttons phone  4 checks, 12s
ok       menu-characters  47 checks, 49s
ok       menu-characters phone  7 checks, 15s
ok       menu-frame  49 checks, 26s
ok       menu-frame phone  5 checks, 15s

6 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 13s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       menu-buttons  55 checks, 32s
ok       menu-buttons phone  4 checks, 11s
ok       menu-characters  47 checks, 48s
ok       menu-characters phone  7 checks, 15s
ok       menu-frame  49 checks, 25s
ok       menu-frame phone  5 checks, 14s
ok       modes-bar  47 checks, 19s
ok       modes-bar phone  50 checks, 19s
ok       stage-column  35 checks, 19s
ok       stage-column phone  10 checks, 14s
ok       stage-spine  52 checks, 23s
ok       stage-spine phone  12 checks, 15s

16 passed, 0 failed
```

## Choices the bible did not cover

- **"Never record twice" is a merge.** The brief says a second activation leaves existing entries alone. `unpin` never removes or overwrites an entry; it only adds a pin that is on now and not yet recorded. In every case the brief describes, this is the same: on a second activation all pins are already off, so nothing is added. It also means a pin that SillyTavern turns on after the first activation is not lost.
- **The observer puts away late pins.** See "Built". The real case (a reload whose unpin had not been saved yet) could not be made to happen in the sandbox without changing its saved settings, so the test does what `initRossMods` does (checks the box and adds `pinnedOpen`) and checks that the pin is turned off and recorded.
- **A pinned panel that was open stays open.** When the panel turns on, SillyTavern's own unpin handler closes the unpinned panel if another menu is open too. That is the usual case, because the switch is in the Extensions menu. If the pinned panel is the only menu open, SillyTavern leaves it open, and it then shows in the frame like any open menu. I left that to SillyTavern rather than closing it, because the frame follows SillyTavern's state. The test checks this for AI response (step 6).
- **How the locks are hidden.** Characters and Lorebooks: the whole lock block goes (`display: none`); nothing depends on its space. AI response: Forge's `style.css` gives `#lm_button_panel_pin_div` the height of that panel's header strip, and the panel's tips and buttons are placed in that strip. Removing the row moved the panel's content up under the strip (measured: the content went from y 151 to 116, under the 35px strip). So only the lock goes (`display: none` on its label), and the row stays as a spacer with `visibility: hidden`, which also stops its native tooltip.
  - I first used `visibility: hidden` for all of AI response's lock. The test then found the lock still drawn while the mouse was over it, until the mouse moved. SillyTavern gives `.right_menu_button` `transition: all` (375ms), and in WebKit the hovered icon kept `visibility: visible`. `display: none` on the label has no such case.
- **The frame goes up with SillyTavern's lift.** SillyTavern's rule lifts `#top-settings-holder` to 4005 while `#character_popup` is open, while a floating panel is maximised, or while a `.drawer-content.open` exists, but only for a menu that is not a side panel. The frame is not in the holder, so without a change the open menu (4005) would sit above the advanced definitions window (4001) and floating panels (4000), and the frame (3003, 3004) below them. The window would then show through the menu's transparent background. This happened when Lorebooks was opened from the nav while the advanced definitions window was open. Now the frame goes up by the same 1000 (backdrop 4003, panel 4004), so the window sits under the whole panel, or over the whole panel, never between. Characters is a side panel (`fillRight`), so with it open there is no lift and the window it opened stays on top (test step 8). The `1000` is raw, with a comment; see "Asked of other files".
- **What the brief's warning comes to.** "Make sure the frame does not end up above the window it opened" holds without any change for Characters, because SillyTavern's lift skips side panels. The CSS above keeps it true when the frame follows the lift.
- **A press inside the advanced definitions window closes the Characters section behind it.** SillyTavern's "autocloses open drawers" handler lists `#character_cross` among its exceptions but not `#character_popup`, so the first press on the window (not on a text field) closes an unpinned Characters menu, and the frame then hides. The window itself stays open and usable. This is SillyTavern's own behaviour for an unpinned panel. With the menu panel on, Characters is always unpinned, so someone who used to pin it will meet it more often. I left it, because stopping those presses would mean a listener on SillyTavern's own window that also hides them from every other listener. Noted for the owner.
- **SillyTavern's cross leaves the window marked open.** `#character_cross` hides `#character_popup` but does not remove its `open` class (only the Advanced definitions button does). Until the window is next opened and closed with that button, SillyTavern keeps lifting the holder for every non-side-panel menu, and the frame goes up with it. That only puts the panel above floating panels (layer 4000), where SillyTavern puts its own menus in the same state.
- **Keys of `menuPins`.** The checkbox ids, each `true`, for example `{"rm_button_panel_pin":true}`.
- **The test has a phone variant.** The brief says "Desktop only"; bible section 12 asks every feature test to run at phone size, and the bible wins (as in P2). On a phone the panel is never active, so the test pins Lorebooks with the panel on and checks that the pin stays and nothing is recorded. It uses Lorebooks because SillyTavern's own phone CSS hides the AI response and Characters locks at 1000px or less (`css/mobile-styles.css`).
- **Measuring the locks.** WebKit returned stale computed styles for elements inside a closed (`display: none`) drawer after `body`'s classes changed: `matches()` said our rule applied while `getComputedStyle` still gave the old values. So the test measures each lock in its open section (drawn or not, and whether a point on it reaches it), never in a closed drawer.
- **Extras in the test.** A pin set later by SillyTavern; each lock in its open section; tabs and search in the content area; searching for a name that matches nothing empties the list, and clearing it brings back the same count (names are never read); a long list (a tall stand-in entry added for the check, then removed) scrolls inside its own box while the page does not; the selected character's tab brings the editor back; the layer order with Lorebooks opened over the window and back; the window's own cross; a SillyTavern dialog (`callGenericPopup`) is on top and closes with its own button, leaving Characters open; AI response left open in the frame; the window at 1000px and back; the main switch; Reset; the floating stand-in's computed look as well as its box (SillyTavern's own `.drawer-content` rules already widen it to 450px and give it side margins; the check is that nothing changes when the panel is on), and marked `openDrawer` it does not bring up the frame.
- **Floating panels, checked against every rule.** With the panel and buttons on and Lorebooks open, a scratch script took every rule the page has from `css/menu.css` (32) and tried each against every element of the four floating panels (`#completion_prompt_manager_popup`, `#floatingPrompt`, `#cfgConfig`, `#logprobsViewer`, 329 elements): none matched. Outside our own elements and `#top-settings-holder`, the only element any rule matches is `#top-bar` (P2's hiding). The new lift rule only reads `.drawer-content.maximized` and `.drawer-content.open` in `:has()`; it styles nothing but our frame.

## Asked of other files

- `css/tokens.css` (I1): a token for the lift, such as `--forge-z-lift: 1000` ("SillyTavern lifts its menus' holder from 3005 to 4005"), to replace the raw `1000` in `css/menu.css`.
- I1, for the owner: in the panel, Characters and AI response are not lifted (SillyTavern's rule skips side panels, because beside the chat they never meet a centred window). So a maximised Author's Note or CFG (layer 4000) covers them when they open in the panel. P2 already noted that these cover the round buttons.

## Not done

Nothing in the brief. Not tried: TauriTavern itself (the brief asks for no stand-in), and a real reload in which SillyTavern restores a saved pin after Forge UI starts (simulated; see the choices).
