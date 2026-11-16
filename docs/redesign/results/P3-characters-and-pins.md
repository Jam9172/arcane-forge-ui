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

## Check

**FAIL.** Checked on `batch/P3-characters-and-pins` at `15fd9ec`, against `overhaul...HEAD` (merge base `427c2a7`). `overhaul` has since moved on to `90344ea` (S3 merged); `git merge-tree` shows the branch still merges into it without conflicts.

One problem makes it FAIL (problem 1 below): **a page that loads at 1000px or less while pins are recorded loses them for good.** `repin` clicks SillyTavern's pin checkboxes before SillyTavern has bound its handlers to them, then empties `menuPins` anyway. SillyTavern's own pin setting is left off, and nothing can put it back. Everything else holds up.

### (a) Only owned files changed

`git diff --name-only overhaul...HEAD` lists five files: `css/menu.css`, `docs/redesign/changes/P3-characters-and-pins.md`, `docs/redesign/results/P3-characters-and-pins.md`, `menu.js` and `tests/browser/menu-characters.mjs`. All five are on the brief's "You own" list. The diff and the commit message hold no personal details. The commit message is the brief's. Met.

### (b) The commands

- `node tests/browser/menu-characters.mjs`: 47 ok, 0 FAIL.
- `node tests/browser/menu-characters.mjs phone`: 7 ok, 0 FAIL.
- `node tests/run.mjs menu`: 6 passed, 0 failed.
- `node tests/run.mjs`: 16 passed, 0 failed (foundation, harness, menu-buttons, menu-characters, menu-frame, modes-bar, stage-column and stage-spine, each on desktop and phone).

Met. The tests pass, but they do not try a page load, which is where problem 1 is.

### (c) The brief, the "Done when" list, and bible sections 3 and 9

Brief, Build:

1. **Pins.** Not met in full; see problem 1.
   - `defaults` gains `menuPins: {}`, and `lookKeys` stays `{}`, as section 7 asks.
   - When the panel turns on, `unpin` records each checked box and clicks it. When the panel turns off, `turnOff` takes the frame and the class away first, then `repin` clicks each recorded box that is unchecked.
   - Recording merges instead of overwriting, so a second activation never loses an entry. That meets the brief's intent; see choices, below.
   - The locks are hidden under `body.forge-ui.forge-menu`.
   - In a live page, all four ways the panel can stop work (see (d)). On a page load at 1000px or less they do not.
2. **Characters section.** `#right-nav-panel` is placed by P1's rule, and the test shows its tabs, search and list inside the content area. A list longer than its box scrolls inside it, and the page does not scroll. Met.
3. **What opens from it.** `#character_popup` and a `callGenericPopup` dialog are on top. I checked the builder's account of SillyTavern's lift against SillyTavern's `style.css`: the three selectors and the 3005 to 4005 layers are as stated. The frame goes up with it only when the open menu is not a side panel, so the window Characters opens stays above the frame. Met.
4. **Floating panels.** With the panel on and a menu open, I tried all 32 rules from `css/menu.css` against all 329 elements of `#completion_prompt_manager_popup`, `#floatingPrompt`, `#cfgConfig` and `#logprobsViewer`. None matched. The lift rule styles only our frame. Met.

Test steps 1 to 8 are all there. The phone variant follows bible section 12 over the brief's "Desktop only", which is right, because the bible wins. Step 8 uses the real Advanced definitions button on the Forge Tester character the helper selected. Names in the list are counted, never read.

Done when:

- **The commands pass:** yes, see (b).
- **The result file says what happens to the pins in each of the three ways:** there is a table. Its row "The window drops to 1000px or less" holds only for a window that narrows in a live page. The table says nothing about a page that starts at that size with pins recorded, and that is where they are lost. Partly met.
- **Only the "You own" files changed:** yes, see (a).

Bible section 3:

1. **Native controls stay underneath.** Pins change only through SillyTavern's own checkboxes. Its handlers do the class and storage work. The locks are hidden, not removed. Met.
2. **One switch back.** Not met in one case (problem 1). Otherwise, turning the panel off leaves nothing of ours (see (d)).
3. **Every look choice gets a setting.** Hiding the locks and lifting the frame are behaviour, not look. Met.
4. **Phone.** The phone run passes in a live page. A load at phone size with pins recorded loses them (problem 1). Not met.
5. **One list of values.** `--forge-menu-lift: 1000` is a raw layer figure in feature CSS (problem 3). The builder asked I1 for a token, which is the route house rule 6 gives. Accepted as a note.
6. **Stay in your lane.** Met.
7. **Small and plain.** About 50 lines added to `menu.js`, no new observer or listener. P1's observer is reused. Met.

Bible section 9:

- **Contract.** Unchanged in shape; `apply` decides active or not. The observer's `unpin` acts only while the panel is active. Met.
- **Selectors.** Every rule line in `css/menu.css` starts `body.forge-ui.forge-menu`; I listed every selector and none does not. Met.
- **`!important`, `innerHTML`, network, `localStorage`.** None added. Met.
- **Observers.** Still one, on `#top-settings-holder` (class changes). Met.
- **"Never change SillyTavern's own settings, except the pins in 5.2, which are put back."** In a live page they are always put back. After a load at 1000px or less they are not (problem 1). Not met.
- **Nothing held across calls.** Pins are looked up by id each time. Met.

The builder's choices, judged against the bible:

- **Recording merges instead of overwriting.** Accepted: no recorded pin is ever lost, which is what "never record twice" protects.
- **The observer puts away pins that turn up late.** Accepted, and now proven for real. I loaded the page with SillyTavern's saved settings still pinning Characters. The settings were changed in that page only; see (d). SillyTavern pinned it in `initRossMods` with its handler bound, and the observer then unpinned and recorded it. Turning the panel off put it back, and the save that would have been made had `NavLockOn` `true` and `menuPins` `{}`.
- **A panel that was open is pinned again but not opened again.** Within what the brief asks; see problem 2.
- **How the locks are hidden.** Accepted. While on, the three locks are gone; when off, they are shown again (test).
- **The lift, and SillyTavern's leftovers.** The lift is accepted. The note that SillyTavern's cross leaves the `open` class is true: my snapshot after the cross shows it. That class is SillyTavern's own, not ours.
- **A press in the advanced definitions window closes Characters.** True; I reproduced it. A press on the window's text closes Characters and hides the frame, while the window stays open and usable. This is SillyTavern's behaviour for an unpinned panel. Accepted as a note for the owner (problem 4).

### (d) Trying to break it

Scratch scripts outside the repository, against the sandbox, with the Forge Tester chat only. They follow the harness's rules: every save is held, no model is called, and other hosts are refused. They also read each held settings save for its pin fields only, which shows what would have been saved. For the two load cases, the settings the page loaded were changed in that page only. Nothing was written to the sandbox.

- **Every way the panel can stop, in a live page.** I pinned all three panels by hand and left them open, then took the panel off in each way:
  - its switch through `apply`;
  - its switch ticked and unticked by hand in the Extensions section inside the panel;
  - the main switch;
  - the window at 1000px;
  - Reset.

  In every case each pin came back exactly: the checkbox, `pinnedOpen`, the drawer icon's `drawerPinnedOpen`, and SillyTavern's `NavLockOn`, `LNavLockOn` and `WINavLockOn`. `menuPins` was `{}`. The last held save had all three `...LockOn` `true` and `menuPins` `{}`, the same as before the panel was on. The only difference was the open state (problem 2).
- **What reaches the sandbox.** Nothing. A fresh load after all my runs and the full test suite shows the same pin state the sandbox started with: no box checked, `menuPins` `{}`, `menuPanel` `false`, and the same six pin and opened values in SillyTavern's account storage.
- **Off leaves nothing behind.** I took a snapshot with the panel off, covering:
  - `html`, `body`, `#top-bar`, `#top-settings-holder`, `#sheld`, `#chat`, `#form_sheld` and `#send_form`;
  - every drawer, toggle, content and icon;
  - the three pin blocks, labels and boxes, and the four floating panels;
  - `body`'s children, every `forge-` id, and `--forge-menu-lift` on `body`.

  Then I used the panel: a pin, Characters, Advanced definitions, and Lorebooks over it, with the lift at `1000`. After turning it off, the second snapshot matches the first apart from `#character_popup`'s `open` class and inline `display: none; opacity: 0`. SillyTavern leaves both there itself when its cross closes the window.
- **Phone.** The phone variant passes. At 390 by 800 there is no class and no frame, and the Lorebooks pin is left alone.
- **A load while pins are recorded.** The saved settings stood in for a session that ended with the panel on and Characters recorded: `menuPanel` `true`, `menuPins` `{"rm_button_panel_pin":true}` and `NavLockOn` `false`.
  - At 1440 by 900: nothing is clicked at load, the record is kept, and turning the panel off pins Characters again. Correct.
  - At 900px wide (a desktop browser, for example a window snapped to half of a 1920px screen): the pin is lost (problem 1).
  - At phone size: the same.

### Problems found

1. **FAIL: a load at 1000px or less loses the recorded pins for good.** The extension's first `apply` runs while SillyTavern is still loading its settings. That is before `initRossMods` binds its click handlers to the pin checkboxes. When the window is 1000px or less at that moment, `apply` turns the panel off and `repin` runs. Logging the clicks shows `repin` clicking `#rm_button_panel_pin` with no handler bound. So:
   - no `pinnedOpen` is added and SillyTavern's storage is not updated;
   - `menuPins` is emptied and saved regardless;
   - `initRossMods` then sets the box from the saved `NavLockOn` `false`, which unchecks it.

   After the load, the box is unchecked and `#right-nav-panel` is not pinned. The held save carries `NavLockOn` `false` and `menuPins` `{}`, so no later step can put the pin back.

   This breaks:
   - brief Build 1 ("the window drops to phone size: click each recorded checkbox to pin it again");
   - house rule 2 (a changed SillyTavern setting is left behind);
   - bible section 9 (the pins must be put back).

   It is a realistic path. The same settings are opened from a phone browser, or SillyTavern starts in a narrow or half-screen window after the panel was in use. Two things would close it: putting pins back only once SillyTavern is ready (for example after `APP_READY` when called earlier), and forgetting a recorded pin only once its box is really checked. The test should also cover a load at 1000px or less with pins recorded.
2. **Not a FAIL: pinned panels come back closed.** A pinned panel is usually open beside the chat. When the panel turns on, SillyTavern's own unpin handler closes each unpinned panel while another drawer is open. When the panel turns off, the pins come back, but those panels stay closed until clicked.
   - With the switch ticked in the Extensions section, all three panels close.
   - SillyTavern's `NavOpened` and the related values stay `true`, so they reopen on the next load.

   The brief asks only for the checkboxes to be clicked again, and the builder states the choice. Noted for the owner.
3. **Not a FAIL: raw `1000` in `css/menu.css`.** House rule 5 wants a token. The builder asked I1 for `--forge-z-lift`.
4. **Not a FAIL: a press in the advanced definitions window closes Characters.** It hides the frame behind the window. This is SillyTavern's behaviour, unchanged, and the window stays usable. But with pins always off under the panel, someone who used to pin Characters will now meet it.
5. **Not a FAIL: disabling the extension while the panel is on.** If the extension is turned off in SillyTavern's extension manager, no code runs to put the pins back. They stay off, and `menuPins` keeps the record until the extension runs again. This is outside the brief's three ways. Noted for the owner.

## Fixes after the check

Problem 1 of the check is fixed. Problems 2 to 4 are left as they are; problem 5 is under "For the owner" below.

### What failed

A page that loaded at 1000px or less while `menuPins` held recorded pins lost them for good. Extensions start before SillyTavern's `initRossMods` (`RossAscends-mods.js`), which binds the three pin checkboxes' click handlers and then sets each box from the pin SillyTavern saved (`LNavLockOn`, `NavLockOn`, `WINavLockOn`). The first `apply` came before that, so `repin` clicked the boxes with no handler bound, emptied `menuPins` and saved it, and `initRossMods` then unticked the boxes again from SillyTavern's saved settings.

### What I changed

- `menu.js`:
  - **Pins wait for SillyTavern.** `unpin` and `repin` now record, click and save nothing until SillyTavern emits `APP_INITIALIZED`, which `firstLoadInit` (`script.js`) does right after `initRossMods`. Until then the new `pinsReady()` says no and adds one `eventSource.once` listener, which applies the panel again when the event comes. SillyTavern's event emitter hands `APP_INITIALIZED` and `APP_READY` at once to a listener added after they were emitted (`events.js`), so after start-up `pinsReady` says yes straight away and leaves nothing waiting. The listener is only added when there is pin work to wait for: the panel is active, or pins are recorded. TauriTavern's `script.js` emits the same event after its `initRossMods`.
  - **Why `APP_INITIALIZED` and not `APP_READY`.** Both come after `initRossMods`, but `APP_READY` waits for the loading screen to fade (up to 500ms), and 300ms after `initRossMods` SillyTavern reopens the panels it saved as pinned and open (`OpenNavPanels`). A scratch probe (desktop load, panel on, all three pins saved pinned and open, two runs) logged `initRossMods` setting the pins at about 1440ms, `APP_INITIALIZED` 3ms later, all three unpinned within the next 10ms, and `APP_READY` about 130ms after `initRossMods`. With `APP_INITIALIZED` the pins are off before SillyTavern looks at them again, so nothing opens at load, the same as before the fix.
  - **A pin is forgotten only once SillyTavern has it.** `repin` clicks each recorded box that is not ticked, then keeps in `menuPins` every recorded pin that SillyTavern does not have on. A pin counts as back when its box is ticked and SillyTavern's own setting for it, read from `accountStorage` (the store its click handler writes), is `'true'`. A pin that did not come back stays recorded, and the next time the panel stops being active tries again. It is still a new object, for Reset.
  - `PINS` maps each checkbox to SillyTavern's setting for it. The observer's comment now says that `unpin` waits.
  - On desktop, what a load does is unchanged; only when. Before, the first `apply` found no box ticked, and P1's observer unpinned right after `initRossMods` put SillyTavern's saved pins back. Now the observer's call waits, and the same happens at `APP_INITIALIZED`, a few milliseconds later. Nothing can click before the handlers are bound.
- `tests/browser/menu-characters.mjs`: a helper that loads the page again. The settings the page loads stand in for what an earlier session saved: the sandbox's answer to `/api/settings/get` is changed on its way into this page only. Every settings save is answered by the test and kept for the checks, and each click on a pin box is logged with whether SillyTavern's own click handler was bound to it at that moment. After the load the helper waits for `APP_READY`, then makes the harness's own waits and opens the Forge Tester chat the way the harness does. New checks, each at the end of its run:
  - **Desktop, 1440 by 900:** the panel on, nothing recorded, all three pins saved by SillyTavern as pinned and open. Each pin is put away (box off, no `pinnedOpen`, SillyTavern's setting `'false'`); no menu opens and the frame stays closed; `menuPins` records all three; each box is clicked once, after its handler was bound; the last save has the three recorded and off. Turning the panel off then puts all three back and empties `menuPins`.
  - **Desktop, 900 by 900** (a desktop window, not a phone): the panel on, all three recorded, SillyTavern's settings off. Each pin is back (box ticked, `pinnedOpen`, setting `'true'`); `menuPins` is `{}`; every click came after the handler was bound; no settings save forgets a pin SillyTavern still has off, and the last save has all three on and none recorded.
  - **Phone, 390 by 800:** the same as at 900px.
- The result file: this section. The "Check" section above is unchanged.

The "What happens to the pins" table above now also holds for a load: at 1000px or less (or with Forge UI's main switch off), recorded pins are put back as soon as SillyTavern's pin boxes answer clicks and forgotten once they are back; on desktop with the panel on, pins SillyTavern brings back at load are put away and recorded at the same moment. The real reload that "Not done" lists as simulated is now tested.

### The new checks against the old code

The final test, run with `menu.js` as it was at `7e78670` (put back afterwards). Desktop: 54 ok, 3 FAIL. Phone: 8 ok, 3 FAIL. The lines of the new checks:

```
$ node tests/browser/menu-characters.mjs        # old menu.js
ok   load at 1440px with the panel on and three pins SillyTavern saved: each is put away (box off, panel not pinned, SillyTavern's setting off) ({"lm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"rm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"WI_panel_pin":{"checked":false,"pinned":false,"setting":"false"}})
ok   load at 1440px: no menu opens, and the frame stays closed (none open)
ok   load at 1440px: menuPins records all three ({"lm_button_panel_pin":true,"rm_button_panel_pin":true,"WI_panel_pin":true})
ok   load at 1440px: every click on a pin box came after SillyTavern bound its handler, one each ([{"id":"lm_button_panel_pin","bound":true},{"id":"rm_button_panel_pin","bound":true},{"id":"WI_panel_pin","bound":true}])
ok   load at 1440px: the last settings save has the three recorded and off ({"pins":{"lm_button_panel_pin":true,"rm_button_panel_pin":true,"WI_panel_pin":true},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}})
ok   load at 1440px, then panel off: each pin is back and menuPins is empty ({"lm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"rm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"WI_panel_pin":{"checked":true,"pinned":true,"setting":"true"}} {})
FAIL load at 900px with three pins recorded: each pin is back (box ticked, panel pinned, SillyTavern's setting on) ({"lm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"rm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"WI_panel_pin":{"checked":false,"pinned":false,"setting":"false"}})
ok   load at 900px: menuPins is emptied ({})
FAIL load at 900px: every click on a pin box came after SillyTavern bound its handler ([{"id":"lm_button_panel_pin","bound":false},{"id":"rm_button_panel_pin","bound":false},{"id":"WI_panel_pin","bound":false}])
FAIL load at 900px: no settings save forgets a pin SillyTavern still has off, and the last one has them all on and none recorded (2 saves, too soon [{"pins":{},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}},{"pins":{},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}}], last {"pins":{},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}})
ok   no script errors

$ node tests/browser/menu-characters.mjs phone  # old menu.js
FAIL phone: load with three pins recorded: each pin is back (box ticked, panel pinned, SillyTavern's setting on) ({"lm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"rm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"WI_panel_pin":{"checked":false,"pinned":false,"setting":"false"}})
ok   phone: load: menuPins is emptied ({})
FAIL phone: load: every click on a pin box came after SillyTavern bound its handler ([{"id":"lm_button_panel_pin","bound":false},{"id":"rm_button_panel_pin","bound":false},{"id":"WI_panel_pin","bound":false}])
FAIL phone: load: no settings save forgets a pin SillyTavern still has off, and the last one has them all on and none recorded (2 saves, too soon [{"pins":{},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}},{"pins":{},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}}], last {"pins":{},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}})
ok   no script errors
```

The 900px and phone loads fail as the check found: every pin box was clicked before SillyTavern bound its handler, the pins ended off in SillyTavern, and `menuPins` was saved empty while they were off. ("menuPins is emptied" passes there; that is the problem.) The load at 1440px passes on the old code too: there the old first `apply` found no box ticked before `initRossMods`, and P1's observer unpinned right after it, with the handlers bound. Those checks guard the new wait, which must still come before SillyTavern reopens pinned panels.

### Test output

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
ok   load at 1440px with the panel on and three pins SillyTavern saved: each is put away (box off, panel not pinned, SillyTavern's setting off) ({"lm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"rm_button_panel_pin":{"checked":false,"pinned":false,"setting":"false"},"WI_panel_pin":{"checked":false,"pinned":false,"setting":"false"}})
ok   load at 1440px: no menu opens, and the frame stays closed (none open)
ok   load at 1440px: menuPins records all three ({"lm_button_panel_pin":true,"rm_button_panel_pin":true,"WI_panel_pin":true})
ok   load at 1440px: every click on a pin box came after SillyTavern bound its handler, one each ([{"id":"lm_button_panel_pin","bound":true},{"id":"rm_button_panel_pin","bound":true},{"id":"WI_panel_pin","bound":true}])
ok   load at 1440px: the last settings save has the three recorded and off ({"pins":{"lm_button_panel_pin":true,"rm_button_panel_pin":true,"WI_panel_pin":true},"locks":{"lm_button_panel_pin":"false","rm_button_panel_pin":"false","WI_panel_pin":"false"}})
ok   load at 1440px, then panel off: each pin is back and menuPins is empty ({"lm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"rm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"WI_panel_pin":{"checked":true,"pinned":true,"setting":"true"}} {})
ok   load at 900px with three pins recorded: each pin is back (box ticked, panel pinned, SillyTavern's setting on) ({"lm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"rm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"WI_panel_pin":{"checked":true,"pinned":true,"setting":"true"}})
ok   load at 900px: menuPins is emptied ({})
ok   load at 900px: every click on a pin box came after SillyTavern bound its handler ([{"id":"lm_button_panel_pin","bound":true},{"id":"rm_button_panel_pin","bound":true},{"id":"WI_panel_pin","bound":true}])
ok   load at 900px: no settings save forgets a pin SillyTavern still has off, and the last one has them all on and none recorded (2 saves, too soon [], last {"pins":{},"locks":{"lm_button_panel_pin":"true","rm_button_panel_pin":"true","WI_panel_pin":"true"}})
ok   no script errors

$ node tests/browser/menu-characters.mjs phone
ok   phone: start: no panel is pinned (none)
ok   phone, panel off: the Lorebooks lock pins #WorldInfo (shown {"checked":true,"pinned":true})
ok   phone: no forge-menu class and no #forge-menu
ok   phone, panel on: the pin stays on and nothing is recorded ({"checked":true,"pinned":true} {})
ok   phone, panel on: the Lorebooks lock is still shown, and unpins it by hand (shown; pinned: none)
ok   phone: menuPins is still empty ({})
ok   phone: load with three pins recorded: each pin is back (box ticked, panel pinned, SillyTavern's setting on) ({"lm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"rm_button_panel_pin":{"checked":true,"pinned":true,"setting":"true"},"WI_panel_pin":{"checked":true,"pinned":true,"setting":"true"}})
ok   phone: load: menuPins is emptied ({})
ok   phone: load: every click on a pin box came after SillyTavern bound its handler ([{"id":"lm_button_panel_pin","bound":true},{"id":"rm_button_panel_pin","bound":true},{"id":"WI_panel_pin","bound":true}])
ok   phone: load: no settings save forgets a pin SillyTavern still has off, and the last one has them all on and none recorded (2 saves, too soon [], last {"pins":{},"locks":{"lm_button_panel_pin":"true","rm_button_panel_pin":"true","WI_panel_pin":"true"}})
ok   no script errors

$ node tests/run.mjs menu
ok       menu-buttons  55 checks, 31s
ok       menu-buttons phone  4 checks, 11s
ok       menu-characters  57 checks, 68s
ok       menu-characters phone  11 checks, 24s
ok       menu-frame  49 checks, 25s
ok       menu-frame phone  5 checks, 14s

6 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 13s
ok       foundation phone  15 checks, 12s
ok       harness  8 checks, 10s
ok       harness phone  8 checks, 10s
ok       menu-buttons  55 checks, 31s
ok       menu-buttons phone  4 checks, 11s
ok       menu-characters  57 checks, 67s
ok       menu-characters phone  11 checks, 24s
ok       menu-frame  49 checks, 25s
ok       menu-frame phone  5 checks, 14s
ok       modes-bar  47 checks, 18s
ok       modes-bar phone  50 checks, 18s
ok       stage-column  35 checks, 19s
ok       stage-column phone  10 checks, 13s
ok       stage-spine  52 checks, 22s
ok       stage-spine phone  12 checks, 14s

16 passed, 0 failed
```

### For the owner

- Problem 5 of the check is unchanged: if Arcane Forge UI is disabled in SillyTavern's extension manager while the menu panel is on, none of its code runs to put the pins back. They stay off in SillyTavern, and `menuPins` keeps the record until the extension runs again; turning the panel off then, or opening SillyTavern at 1000px or less, puts them back. Without the extension, tick the locks again by hand.
