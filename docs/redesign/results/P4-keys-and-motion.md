# P4-keys-and-motion

## Built

- `menu.js`:
  - **One key listener, only while the frame is shown.** `onKey` is added to `document.body` (`keydown`, bubbling) when the frame goes from hidden to shown, and removed when it hides, when the panel turns off for any reason (its switch, the main switch, the window at 1000px or less) and on Reset. Nothing is ever added to `document` or `window`, and nothing of ours listens for keys while the panel is closed. (After the check there are two, both on `body` and with the same lifetime: `noteTab` in the capture phase as well. See "Fixes after the check".)
  - **Roles** were already there from P1: the panel is `role="dialog"`, `aria-modal="true"`, `aria-labelledby="forge-menu-title"`, and the nav is `<nav aria-label="Menus">`. Unchanged; the test checks them.
  - **Opening** (the frame goes from hidden to shown): `syncMotion` sets the motion class first (below), the element that has the focus is noted (`findAgain`, below), the frame is shown, the listener is added, and the focus moves to the nav button with `aria-current="page"`. A change of section while the frame is shown is not an opening: the focus stays where it is, which after a nav button is pressed is that button, now current.
  - **Tab** (and Shift+Tab, and Alt+Tab): the panel moves the focus itself. On each press it lists the tab stops afresh: the frame's buttons (the nav in order, then the close button), then the open menu's controls in page order (`tabStops`, `isTabStop`), and focuses the next or previous one, going round from the last to the first and back (`nextStop`). It calls `preventDefault()` so the browser does not move the focus as well.
  - **Escape** closes the panel with `closeMenu()` (P1's: the open drawer's own `.drawer-toggle`), then `preventDefault()` and `stopPropagation()`. It is left alone when something inside the panel has already dealt with it (`defaultPrevented`; SillyTavern's autocomplete and Select2 also stop the key before it reaches `body`), while composing text, and with Ctrl, Cmd or Alt held. While a window is open over the panel, Escape belongs to that window:
    - an open, drawn `<dialog>` (SillyTavern's popups, or another extension's) closes itself; `onKey` stops the key there, so that SillyTavern's own Escape handler on `document` does not also close the menu behind it (see the choices; after the check, only for a dialog that is not one of SillyTavern's popups);
    - SillyTavern's older windows, `#dialogue_popup`, `#select_chat_popup` and `#character_popup` (the advanced definitions), are closed by SillyTavern's own Escape handler, so the key is let through to it.
  - **Closing** (`hide`, the one place the frame is hidden): the listener is removed and, if the focus went with the frame or the menu, it goes back to what had it when the frame opened.
  - **Motion:** `syncMotion` reads SillyTavern's Reduced Motion setting where bible section 4 names it, `SillyTavern.getContext().powerUserSettings.reduced_motion`, on every `apply` and at every opening, and toggles `forge-menu-still` on `#forge-menu`.
  - **The pin wait** (`pinsReady`, the loose end from P3's second check): it now listens for `APP_READY` as well as `APP_INITIALIZED`, with one function, and whichever is heard first answers and removes both. See "The pin wait" below.
- `css/menu.css`:
  - **Motion:** the backdrop has `transition: opacity var(--forge-fast) ease-out`, and the panel `opacity` and `transform` over the same. An `@starting-style` block gives the backdrop `opacity: 0` and the panel `opacity: 0; transform: scale(0.98)`, which is where they start each time the frame stops being hidden. `#forge-menu.forge-menu-still` sets `--forge-fast: 0ms`, the same thing `css/tokens.css` does for the system setting, so with either reduced motion setting there is no transition at all.
  - **The current section keeps its fill while focused:** its selector gained `.forge-menu-nav >` (see the choices). No focus style was added: the focus ring is Forge's existing one.
- `tests/browser/menu-keys.mjs`: the brief's ten steps, extras, and a phone variant.
- `tests/browser/menu-characters.mjs`: one more page load at the end of the desktop run, for the pin wait.

### The pin wait

SillyTavern's emitter (`lib/eventemitter.js`) copies its list of listeners when `emit` starts, awaits them one by one, and remembers the event for listeners added later (`APP_INITIALIZED` and `APP_READY` are both such events, `scripts/events.js`) only once the last one has finished. A listener added in between is called by neither. `firstLoadInit` (`script.js`) emits `APP_INITIALIZED` right after `initRossMods`, awaits it, hides the loading screen, and only then emits `APP_READY`. So for any moment at which `pinsReady` first asks:

- before the `APP_INITIALIZED` emit starts: the `APP_INITIALIZED` listener is in the copied list and is called;
- during it: `APP_READY` has not started yet, so the `APP_READY` listener is in its list and is called;
- after it: `APP_INITIALIZED` is remembered, and `on()` calls the listener at once.

The first call answers, removes the function from both events, and applies the panel again if the answer came later. Nothing stays registered. In the case P3's checker found, the pins are put away at `APP_READY`: after the slow listener has finished and SillyTavern's loading screen has faded (up to 500ms more). Waiting on `APP_READY` alone was not an option, for the reason P3 gave: SillyTavern reopens pinned panels that were open 300ms after `initRossMods`. Other ways were looked at and not taken: checking whether SillyTavern's click handler is bound to the pin boxes (jQuery internals), or reading the emitter's remembered events (its private state).

The new check loads the page with a stand-in listener put first in SillyTavern's `APP_INITIALIZED` list, which switches the panel on and then takes a second, with Characters pinned by SillyTavern's own saved setting. With `overhaul`'s `menu.js` it fails as P3's checker described (4 of the 6 new lines FAIL: the pin stays pinned, nothing is recorded, no click, and our listener is still registered after the load). With this batch's `menu.js` all six pass.

### Tab in the test browser (WebKit)

What I found, with scratch scripts against the sandbox (Playwright 1.64.1, its WebKit reports Safari 27.2):

- Plain Tab skips buttons and links, as Safari does with "Press Tab to highlight each item on a webpage" off. With the panel open and the focus on the Menu round button, a native Tab went to the page itself (`body`), then to the AI response menu's preset `<select>`, a `<summary>`, then number fields. The nav buttons and the close button were never reached.
- Alt+Tab (Option+Tab, WebKit's "Tab to every control" for one press) does stop at buttons.
- The setting that changes this is the system's keyboard navigation setting. It was not touched.

What I did: the panel moves the focus itself on Tab, as described under "Built", so in WebKit plain Tab reaches every control in the panel, buttons and links included, and the test simply presses Tab and Shift+Tab. This is also what makes the panel usable by keyboard in TauriTavern on a Mac, whose WebKit view skips buttons on Tab the same way: without it, Tab could not reach the nav there. Alt+Tab is treated like Tab inside the panel. Against `overhaul`'s code, the same 60 Tabs left the panel at the first press (to `body`, later to the chat's message buttons).

## Test output

```
$ node tests/browser/menu-keys.mjs
ok   before: SillyTavern's Escape closes Settings, opened from its icon by keyboard ({"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"})
ok   1. Menu by keyboard opens the frame on AI response (left-nav-panel)
ok   1. the focus is on the nav button with aria-current="page", AI response's ({"inFrame":true,"inMenu":false,"name":"button.forge-menu-section","current":"page","section":"AI response"})
ok   1. focused, the current section keeps its --forge-ember fill, inside the existing focus ring ({"ember":true,"ring":true})
ok   1. one key listener of ours is in place, on body ({"live":1,"where":["body"]})
ok   2. the panel has role="dialog" and aria-modal="true", and its aria-labelledby names the section ({"role":"dialog","modal":"true","title":"AI response","nav":"Menus","navHolds":9})
ok   2. the nav is a <nav> with aria-label="Menus" that holds the section buttons ({"role":"dialog","modal":"true","title":"AI response","nav":"Menus","navHolds":9})
ok   3. 60 Tabs: the focus is always inside #forge-menu or the open menu ({"frame":8,"menu":52})
ok   3. Tab stops at the frame's buttons and then at the menu's controls (buttons too, in WebKit) ({"frame":8,"menu":52})
ok   3. 10 Shift+Tabs: the same (none outside)
ok   3. Shift+Tab on the first nav button goes round to the open menu, and Tab comes back to it (div#new_oai_preset.menu_button.menu_button_icon then button.forge-menu-section)
ok   3. Tab from the last nav button reaches the close button (button.forge-menu-close)
ok   a nav button by keyboard changes the section, and the focus stays on it, now current (WorldInfo {"inFrame":true,"inMenu":false,"name":"button.forge-menu-section","current":"page","section":"Lorebooks"})
ok   4. Escape closes the frame
ok   4. the focus is back on the Menu round button (button.forge-menu-round.forge-menu-round-menu)
ok   4. no key listener of ours is left ({"live":0,"where":["body"]})
ok   5. Characters by keyboard opens the Characters section
ok   5. Escape: the frame is closed and the focus is on the Characters round button (button.forge-menu-round.forge-menu-round-characters)
ok   6. the stand-in dialog is open over the panel
ok   6. Escape closes the dialog
ok   6. and the panel is still open, on the same section (WorldInfo then WorldInfo)
ok   6. Escape again closes the panel, and the focus is back on Menu (button.forge-menu-round.forge-menu-round-menu)
ok   a SillyTavern popup opens over the panel
ok   a SillyTavern popup: Escape closes it, and the panel stays open (WorldInfo)
ok   a SillyTavern popup: then Escape closes the panel (button.forge-menu-round.forge-menu-round-menu)
ok   the advanced definitions window opens over the Characters section
ok   the advanced definitions window: Escape closes it (SillyTavern's own Escape), and Characters stays open in the frame (right-nav-panel)
ok   the advanced definitions window: then Escape closes the panel
ok   7. with the panel closed, Escape clicks no .drawer-toggle (0 clicks)
ok   7. and Escape and Tab reach document untouched, with no key listener of ours in place (Escape false, Escape false, Escape false, Escape false, Tab false, Tab false; {"live":0,"where":["body"]})
ok   7. no menu opened
ok   8. open: the backdrop's and the panel's transition-duration is 0.16s ([["0.16s"],["0.16s","0.16s"]])
ok   8. opening fades the backdrop in, and fades the panel in while it grows from 0.98; nothing else in the frame or the menu moves (forge-menu-backdrop opacity from 0, forge-menu-panel opacity from 0, forge-menu-panel transform from scale(0.98))
ok   8. reduced motion (the system's): the transition-duration is 0s ([["0s"],["0s","0s"]])
ok   8. reduced motion (the system's): opening moves nothing
ok   9. SillyTavern's Reduced Motion on: the transition-duration is 0s ([["0s"],["0s","0s"]])
ok   9. SillyTavern's Reduced Motion on: opening moves nothing
ok   9. switched back: 0.16s again ([["0.16s"],["0.16s","0.16s"]], was false)
ok   10. buttons off: the Settings icon by keyboard opens the frame, with the focus on Settings in the nav ({"inFrame":true,"inMenu":false,"name":"button.forge-menu-section","current":"page","section":"Settings"})
ok   10. Escape: the frame is closed and the focus is back on that icon (div.drawer-icon.fa-solid)
ok   main switch: the frame is open, with its key listener
ok   main switch off: nothing of the panel, and no key listener of ours ( {"live":0,"where":["body"]})
ok   off: nothing of the panel is in the page
ok   off: Escape on Settings does what it did before the panel was on ({"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"} vs {"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"})
ok   off: no key listener of ours, and none was ever put on document or window ({"live":0,"where":["body"]})
ok   no script errors

$ node tests/browser/menu-keys.mjs phone
ok   phone: no #forge-menu and no forge-menu class
ok   phone: with the panel on, Escape on Settings does what it does with it off ({"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"} vs {"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"})
ok   phone: no key listener of ours was ever added ({"live":0,"where":[]})
ok   no script errors

$ node tests/run.mjs menu
ok       menu-buttons  55 checks, 31s
ok       menu-buttons phone  4 checks, 11s
ok       menu-characters  63 checks, 79s
ok       menu-characters phone  11 checks, 24s
ok       menu-frame  49 checks, 25s
ok       menu-frame phone  5 checks, 14s
ok       menu-keys  46 checks, 41s
ok       menu-keys phone  4 checks, 14s

8 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 13s
ok       foundation phone  15 checks, 12s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       menu-buttons  55 checks, 31s
ok       menu-buttons phone  4 checks, 11s
ok       menu-characters  63 checks, 79s
ok       menu-characters phone  11 checks, 24s
ok       menu-frame  49 checks, 24s
ok       menu-frame phone  5 checks, 14s
ok       menu-keys  46 checks, 41s
ok       menu-keys phone  4 checks, 14s
ok       modes-bar  47 checks, 18s
ok       modes-bar phone  50 checks, 18s
ok       modes-send  70 checks, 32s
ok       stage-column  35 checks, 18s
ok       stage-column phone  10 checks, 13s
ok       stage-content  64 checks, 23s
ok       stage-content phone  22 checks, 16s
ok       stage-spine  52 checks, 22s
ok       stage-spine phone  12 checks, 14s

21 passed, 0 failed
```

`menu-characters.mjs` now has 63 checks on desktop (57 before). The six new lines, from that run:

```
ok   slow APP_INITIALIZED: the stand-in switched the panel on while SillyTavern was handing the event out, and the panel began to wait then ({"slow":"done","during":["app_initialized","app_ready"],"left":[]})
ok   slow APP_INITIALIZED: the Characters pin is put away all the same (box off, panel not pinned, SillyTavern's setting off) ({"checked":false,"pinned":false,"setting":"false"})
ok   slow APP_INITIALIZED: menuPins records it ({"rm_button_panel_pin":true})
ok   slow APP_INITIALIZED: its box was clicked once, after SillyTavern bound its handler ([{"id":"rm_button_panel_pin","bound":true}])
ok   slow APP_INITIALIZED: nothing of menu.js still waits on APP_INITIALIZED or APP_READY ({"slow":"done","during":["app_initialized","app_ready"],"left":[]})
ok   slow APP_INITIALIZED, then panel off: the pin is back and menuPins is empty ({"checked":true,"pinned":true,"setting":"true"} {})
```

The same six with `overhaul`'s `menu.js` put in for one run (put back afterwards):

```
ok   slow APP_INITIALIZED: the stand-in switched the panel on while SillyTavern was handing the event out, and the panel began to wait then ({"slow":"done","during":["app_initialized"],"left":["app_initialized"]})
FAIL slow APP_INITIALIZED: the Characters pin is put away all the same (box off, panel not pinned, SillyTavern's setting off) ({"checked":true,"pinned":true,"setting":"true"})
FAIL slow APP_INITIALIZED: menuPins records it ({})
FAIL slow APP_INITIALIZED: its box was clicked once, after SillyTavern bound its handler ([])
FAIL slow APP_INITIALIZED: nothing of menu.js still waits on APP_INITIALIZED or APP_READY ({"slow":"done","during":["app_initialized"],"left":["app_initialized"]})
ok   slow APP_INITIALIZED, then panel off: the pin is back and menuPins is empty ({"checked":true,"pinned":true,"setting":"true"} {})
```

And `menu-keys.mjs` with `overhaul`'s `menu.js` and `css/menu.css` put in for one run (put back afterwards): 30 ok, 16 FAIL. Among the fails: the focus stays on the Menu button when the frame opens; Tab leaves the panel at the first press; Escape leaves the focus nowhere; the plain `<dialog>` takes the menu behind it with it; the transition-duration is 0s; there is no key listener of ours.

## Choices the bible did not cover

- **The tab stops** (`isTabStop`): elements matching `a[href]`, `area[href]`, `button`, `input` (not hidden), `select`, `textarea`, `summary`, `iframe`, `audio`/`video` with controls, `contenteditable` and `[tabindex]`, that have `tabIndex` 0 or more, are not `:disabled` or inside `[inert]`, are drawn (they have a box and `visibility: visible`), and, for a named radio group, only its checked radio (or its first, when none is checked). Positive `tabindex` order is not followed; SillyTavern's `index.html` has no positive `tabindex`. Elements Select2 hides keep their `tabindex="-1"`, so they are skipped.
- **The order:** the frame first (the nav, then the close button), then the open menu. In the page the menu comes before the frame; the frame first follows how it reads: the list on the left, the head, then the content.
- **Focus on something Tab does not stop at** (a `tabindex="-1"` element, the title) counts from where it is: Tab goes to the next stop after it in the same order. **Focus nowhere** (`body`): Tab goes to the first stop, Shift+Tab to the last. **Focus outside both parts**, for example in a Select2 dropdown or a window over the panel: `onKey` does not touch Tab, so that control keeps its own. (After the check, a round button or a top bar icon counts as nowhere, and a Tab that ends nowhere is put back: see "Fixes after the check".)
- **Escape is spent when it closes the panel.** Without `stopPropagation()`, SillyTavern's own Escape handler (`processHotkeys` in `RossAscends-mods.js`, on `document`) would run after ours in the same press and close the next thing on its list: a floating panel such as Author's Note, the delete-messages bar, and so on. So while the panel is open, SillyTavern's own Escape shortcuts (stop generating, close the message editor, cancel deleting messages, close floating panels) wait for the next press. The panel is modal and covers all of them. With the panel closed, nothing of this runs.
- **Escape with a `<dialog>` over the panel goes no further than `body`.** (After the check, this holds only for a dialog that is not one of SillyTavern's popups: see "Fixes after the check".) The brief's stand-in is a plain `<dialog>`. SillyTavern's Escape handler stands back only for its own popups (`Popup.util.isPopupOpen()`), so for any other dialog it would close the menu behind it too. A scratch run with that one line taken out showed it: Escape closed the stand-in dialog and the AI response menu behind it. With the line, the menu stays open. The dialog's own handling is untouched: its own listeners run before ours, and the browser's closing is the key's default action, which is not prevented. For SillyTavern's own popups this also keeps `script.js`'s Escape (stop generating, message editor) from acting behind the popup while the panel is open.
- **SillyTavern's older windows are left to SillyTavern** even in the one case where the panel is above one: with the advanced definitions window open, opening Lorebooks from the nav lifts the frame over it (P3). Escape then closes the window first (SillyTavern's own order), and the next Escape closes the panel.
- **Shift+Escape closes the panel; Ctrl, Cmd or Alt with Escape is left alone,** as are Ctrl+Tab and Cmd+Tab (the browser's and the system's).
- **What "whatever opened the panel" is:** the element that had the focus when the frame opened. It is kept as a way to find it again (`findAgain`), not as the element (bible section 9): its id; our round button by its class; a top bar icon or toggle by its drawer's id. A control inside a menu is not kept (that menu is hidden once it closes), nor is anything else. **Corrected after the check:** this said that after a click on a round button the focus goes back to what had it before (the message box, for example). It did not: in WebKit the press on a button takes the focus away to nowhere and the button does not take it, so nothing was kept and the focus ended on `body`. Now, when what had the focus cannot be found again, the panel keeps the control that opens the section instead (`openerOf`), so after a click the focus goes back to the round button or top bar icon that was clicked.
- **The focus goes back only if it went with the frame:** it is nowhere, in the frame, or in a menu that is no longer drawn. If it was moved somewhere on purpose before the frame closed (a top bar icon clicked while the buttons are off, say), it stays there.
- **The focus moves into the panel at every opening,** whatever opened it: the round buttons, the top bar, another extension, a command, or ticking the switch while a menu is open. The panel is a modal dialog, and that is where its keys work.
- **Closing does not animate.** The brief and the bible describe the opening. SillyTavern's menu disappears at once when it closes, and a frame fading out behind a menu that has already gone would be a second kind of motion. It also keeps P1's hide timing as it was.
- **The backdrop and the panel animate, not `#forge-menu`.** Opacity below 1 on `#forge-menu` (which has no position or layer of its own) would make it one layer at the page's level while it faded. A scratch check confirmed it: with `opacity: 0.5` on `#forge-menu`, a point near the panel's top edge, over the chat column, was `#sheld`, not the panel. The two parts have layers of their own, so their opacity changes nothing in the order.
- **The open menu does not fade.** It is SillyTavern's own and "nothing else moves", so for the 160ms of the fade the menu's content shows over a panel that is still coming in. The test checks that, on opening, the only transitions started in the frame and the open menu are those three.
- **`@starting-style`** gives the start of the fade, because the frame goes from `hidden` (`display: none`) to shown. The test browser supports it. A browser without it shows the frame at once, with no fade, which is harmless.
- **SillyTavern's Reduced Motion is read in `menu.js`,** at every `apply` and every opening, so a change made while the panel was closed counts at the next opening. Ticking it inside the panel (it is in the Settings section) counts from the next opening.
- **The page differs from the bible here:** bible section 4 says SillyTavern's Reduced Motion "puts no class on body". In SillyTavern 1.19.0, `switchReducedMotion` (`scripts/power-user.js`) does toggle `reduced-motion` on `body`. It is not used: the bible names the value, the brief's test sets only the value, and TauriTavern's page was not checked for the class.
- **The current section's selector gained `.forge-menu-nav >`.** SillyTavern's `scripts/dynamic-styles.js` copies every `:hover` rule that has no focus rule of its own into a `:focus-visible` rule. Now that the current section has the focus when the frame opens, the copy of P1's hover rule (same weight, later in the page) beat the current section's ember fill: the focused current section was drawn with the hover colour. The extra class makes the current section's rule weigh more. It adds no focus style, and the focus ring is Forge's own (`style.css`); the test checks both.
- **The older windows listed are SillyTavern's own,** in the order its Escape handler takes them: `#dialogue_popup`, `#select_chat_popup`, `#character_popup`. "Open" means drawn (`display` not `none`).
- **The test has a phone variant.** The brief says "Desktop only"; bible section 12 asks every feature test to run at phone size, and the bible wins (as in P2 and P3). On a phone the panel is never active, so the test checks that SillyTavern's Escape on a menu does exactly what it does with the panel off, and that no key listener of ours was ever added.
- **How the test sees our key listeners:** it wraps `EventTarget.prototype.addEventListener` and `removeEventListener` in the page after it loads, and notes every key listener whose call comes from `menu.js` (by the call stack), where it was added, and whether it is still in place.
- **Extras in the test:** the current section keeps its ember fill and shows the existing focus ring; exactly one key listener of ours, on `body`, while open, and none after closing; Shift+Tab on the first stop goes round to the menu and Tab comes back; Tab from the last nav button reaches the close button; a change of section by keyboard keeps the focus on the pressed button; a SillyTavern popup (`callGenericPopup`) and the advanced definitions window each take Escape and leave the panel open, and the next Escape closes the panel; with the panel closed, Escape and Tab reach `document` with `defaultPrevented` false and propagation not stopped; opening starts exactly three transitions (the backdrop's opacity from 0, the panel's opacity from 0 and transform from `scale(0.98)`), and none under either reduced motion setting; the main switch off with the frame open takes the listener away; with the panel off, SillyTavern's Escape on its Settings menu does what it did before the panel was ever on.
- **`tests/browser/menu-characters.mjs` is not on the brief's "You own" list.** The lead asked for the pin check there, and bible section 9 gives lane P every `tests/browser/menu-*.mjs`. Only the header comment and one load at the end of the desktop run were added; P3's checks are unchanged.

### Also checked, with scratch scripts outside the repository

- **Select2 in a menu:** in Lorebooks, Escape in the active-worlds box's open dropdown closes the dropdown and leaves the panel open (Select2 keeps the key to itself). Tab there is Select2's own.
- **Crossing 1000px with the frame open:** at 900px the frame is gone and no key listener of ours is left; back at 1440px the frame is there again with one.
- **Five applies with the frame open:** one frame, one key listener.
- **Mouse:** opening with a click on Menu moves the focus to the current section; closing with a click on the backdrop leaves the focus nowhere (in WebKit the clicked button never had it). (After the check, closing gives it to the button that was clicked.)
- **The fade itself:** sampled every 30ms after opening, the backdrop's and the panel's opacity went 0, 0.34, 0.60, 0.80, 0.95, 1.00 and the panel's scale 0.98 to 1.00.

## Asked of other files

- `css/tokens.css` (I1): a token for the panel's starting scale, such as `--forge-menu-grow: 0.98` (bible section 4's figure), would take the one raw number this batch adds out of `css/menu.css`. The `0ms` for SillyTavern's Reduced Motion is the same value `tokens.css` uses for the system setting.

## Not done

Nothing in the brief. Not tried: TauriTavern itself (the brief asks for no stand-in), Safari with "Press Tab to highlight each item" on, and a screen reader.

## Check

**FAIL.** Checked on `batch/P4-keys-and-motion` at `766f2db`, against `overhaul...HEAD` (merge base `c428dc2`, which is still the tip of `overhaul`).

Two problems make it FAIL (problems 1 and 2 below):

1. **Shift+Tab leaves the panel from the Lorebooks section.** The brief's step 3 and bible section 11 say Tab stays inside.
2. **When the panel is opened with the mouse, closing it does not give the focus back.** In WebKit the focus ends on `body`. The brief's step 5 says the focus goes back to the round button or top bar icon that opened the panel. The result file also says something different from what happens.

Everything else holds up: the roles, the opening focus, Escape, the keyboard focus return, the listener's lifetime, motion under both reduced motion settings, and the pin wait.

### (a) Only owned files changed

`git diff --name-only overhaul...HEAD`: `css/menu.css`, `docs/redesign/changes/P4-keys-and-motion.md`, `docs/redesign/results/P4-keys-and-motion.md`, `menu.js`, `tests/browser/menu-keys.mjs`, `tests/browser/menu-characters.mjs`. All are on the brief's list except `menu-characters.mjs`. Bible section 9 gives lane P every `tests/browser/menu-*.mjs`, and the bible wins. The lead asked for that change. P3's checks in that file are untouched: the diff only adds one header line and one block at the end of the desktop run. **Pass.**

### (b) The commands

- `node tests/browser/menu-keys.mjs`: 46 ok, exit 0. `node tests/browser/menu-keys.mjs phone`: 4 ok, exit 0.
- `node tests/run.mjs menu`: `8 passed, 0 failed` (menu-buttons 55, menu-characters 63, menu-frame 49, menu-keys 46, and the four phone runs).
- `node tests/run.mjs`: three full runs, and each was cut off from outside the batch. The machine went into sleep over and over during the runs: the system's power log shows "Entering Sleep" and "DarkWake" entries every few minutes. So the runner's 5-minute limit reported waits of 374s to 2008s, and page loads timed out. In some phone runs, RPG Companion's welcome window (`#rpg-welcome-modal`) also took the clicks ("intercepts pointer events"). No check that ran failed in any of the three runs: no indented `FAIL` line in any output. Across the runs these passed at least once: foundation (both), harness (both), menu-buttons (both), menu-characters (both), menu-frame (both, in the menu run), menu-keys (both), modes-bar phone, stage-column phone, stage-content, stage-spine (both). Never reached in a run that was not cut off: modes-bar, modes-send, stage-column, stage-content phone. These are other lanes' tests, and the panel is off by default in them. **Not proven** for the whole suite. This does not decide the verdict; problems 1 and 2 do.

### (c) The diff, item by item

Brief "Build":

1. **Roles:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="forge-menu-title"`, `<nav aria-label="Menus">`. They come from P1 and are checked by the test's step 2. **Pass.**
2. **Opening moves the focus to the current nav button.** Checked for the round buttons, a top bar icon, and the mouse (probe F: focus on `button.forge-menu-section`). **Pass.**
3. **Tab stays inside.** **FAIL**, see problem 1. Problem 3 is a smaller second hole.
4. **Escape.** It closes the panel through the drawer's own toggle (`closeMenu`). A `<dialog>`, a SillyTavern popup, and `#character_popup` each take Escape first. The listener is on `body` and is added only while the frame is shown; nothing is ever added to `document` or `window`. My wrapper of `addEventListener` saw exactly one key listener from Forge in the whole run, `keydown@body@menu.js`. **Pass.** For the choice on popups, see problem 4.
5. **Closing gives the focus back.** It works by keyboard: Menu, Characters, and the top bar icon with the buttons off (test steps 4, 5 and 10). It does not work by mouse in WebKit. **FAIL**, see problem 2.
6. **Motion.** At opening, the only transitions in the frame and the open menu are the backdrop's opacity from 0, the panel's opacity from 0, and its transform from `scale(0.98)`, over 0.16s ease-out. Probe E listed every element in `#forge-menu`: only `.forge-menu-backdrop` (opacity 0.16s) and `.forge-menu-panel` (opacity and transform 0.16s) have a transition. Reduced motion, the system's way (`emulateMedia`): no element in the frame has any transition. Reduced motion, SillyTavern's way, set two ways: by the value (test step 9), and by ticking SillyTavern's own `#reduced_motion` checkbox inside the panel's Settings section (probe E: `{"was":false,"now":true,"value":true}`). At the next opening, no element in the frame has a transition; unticked again, the fade is back (0.16s). **Pass.** The brief's step 8 reads `#forge-menu`'s own `transition-duration`; the builder reads the backdrop and the panel. I accept this. The builder gives a sound reason: opacity on `#forge-menu`, which has no layer of its own, would flatten the frame under the chat while it fades. The frame as a whole still fades.
7. **No focus styles of our own.** `css/menu.css` has no `:focus` rule. The `.forge-menu-nav >` added to the current section's selector only adds weight. I confirmed the builder's reason in `scripts/dynamic-styles.js`: SillyTavern copies every `:hover` rule into a `:focus-visible` one. **Pass.**

Brief "Done when": the commands pass (see (b): the brief's own commands pass, and the full suite could not finish on this machine), and only owned files changed (see (a)).

Bible section 3:

- **3.1, native controls:** Escape, the close button and the backdrop all click the drawer's own toggle. SillyTavern's Reduced Motion is read where the bible says, never copied. **Pass.**
- **3.2, one switch back:** probe D opened the frame and then turned the panel off three ways: its switch, a 900px window, and the main switch. Each time: the listener was gone (`before 1 left 0`), there was no `#forge-menu`, `#forge-menu-buttons` or `.forge-menu-still`, and an Escape sent afterwards reached `document` with `defaultPrevented` false. With the frame closed, Escape and Tab reach `document` untouched (test step 7). **Pass.**
- **3.3, a setting per look choice:** the fade has no switch of its own. It goes away under either reduced motion setting, and the brief asks for no setting. **Accepted.**
- **3.4, phone:** the phone run passes. The panel is never active there, and Escape on a menu does what it does with the panel off. **Pass.**
- **3.5, tokens:** the motion uses `--forge-fast`. `0.98` is bible section 4's own figure, and the builder suggests a token for it under "Asked of other files". `--forge-fast: 0ms` on `.forge-menu-still` mirrors what `tokens.css` does for the system setting. **Accepted.**
- **3.6, lane:** see (a). **Pass.**
- **3.7, small and plain:** the Tab handling (`tabStops`, `isTabStop`, `nextStop`) is about 60 lines. The reason is real: in WebKit, plain Tab skips buttons. I confirmed that without it the nav cannot be reached. **Pass.**

Bible section 9:

- Every new selector starts with `body.forge-ui.forge-menu`, including those inside `@starting-style`. **Pass.**
- No `!important` added, no network, no `localStorage`, and no `MutationObserver` on `#chat`. **Pass.**
- No SillyTavern setting changed. **Pass.**
- The opener is kept as a selector string (`findAgain`), not as an element. **Pass.**
- The new class is `forge-menu-still`. **Pass.**
- The feature contract is unchanged, and the comments say why. **Pass.**

**The pin wait** (`pinsReady`, `menu-characters.mjs`). I read `lib/eventemitter.js` and `firstLoadInit` in `script.js`, and the builder's account is right. `emit` copies the listener list before it starts. The event is remembered for later listeners only after the last listener finishes. `APP_READY` follows only after that. So listening to both, with whichever is heard first answering and removing both, covers every moment. The new checks fail on `overhaul`'s `menu.js` (the builder showed this) and pass on this branch.

Probe P extended this beyond the test, with real page loads and the same stand-in slow `APP_INITIALIZED` listener:

- Load with all three pins saved on: all three are put away and recorded, and nothing of `menu.js` is still listening to either event.
- Then each way the panel can stop being active, one after another: the panel switch, a 1000px window, the main switch, and Reset to Forge defaults. Each time, all three pins come back exactly: box ticked, panel `pinnedOpen`, SillyTavern's own setting `"true"`, and `menuPins` `{}`. Undoing each way puts all three away and records them again.
- A load where the slow listener switches the panel on and then off again while it runs: every pin stays on, nothing is recorded, and nothing is left waiting.

The change is sound, and every pin still comes back. (A side effect is under problem 5.)

### (d) Trying to break it

Probe A: in each of the nine sections, 120 Tab, 60 Shift+Tab and 10 Alt+Tab, checking the focus after every press. Eight sections never let the focus out. In Lorebooks, Shift+Tab put the focus on `body` 4 times in 60 (problem 1). The other probes and their results are in the problems and in (c) above. Scratch scripts were kept outside the repository. They used only the Forge Tester chat and never pressed Enter on a character.

### Problems

1. **Shift+Tab leaves the panel from Lorebooks' active-worlds box (FAIL).**
   - **Where:** with the focus in the Select2 multi-select's inline search field in Lorebooks (`#WorldInfo textarea.select2-search__field`), Shift+Tab sends the focus to `body`. Shift+Tab from the next stop then lands there again, and it repeats every lap.
   - **Trace (probe WI2):**
     - The key was seen in the capture phase.
     - No bubbling listener on `document` saw it.
     - `menu.js` made no `focus()` call.
     - The field had a `focusout` with no related target, and the focus ended on `body`.
   - **Cause:** Select2 stops the propagation of every key on its inline search, so `onKey` on `body` never sees that Tab. WebKit's own Shift+Tab then finds nothing before the field that it stops at (it skips links and buttons), and takes the focus out of the page. In Safari, and in TauriTavern on a Mac, the focus goes to the browser's own controls or nowhere.
   - **Not covered:** the results' "Tab there is Select2's own" covers the open dropdown, not this field. The test's 10 Shift+Tabs are only in AI response.
   - **Rules broken:** brief Build step 3, bible section 11 ("keeps Tab inside itself"), and the lead's "Tab and Shift+Tab never leave the frame and the open menu".
   - **A possible fix:** guard the focus itself, rather than rely on the key reaching `body`. For example, while the frame is shown, a `focusin`/`focusout` listener on the frame and the open menu could put back focus that went nowhere or outside. The brief's "leave alone: keys inside SillyTavern's own menus" argues against taking Tab from Select2 in the capture phase.
2. **The focus is not given back after opening with the mouse (FAIL).**
   - **What happens (probe F, F2):** with the focus in the message box, clicking Menu moves the focus into the panel, to the current nav button. In WebKit the mousedown on the round button first sends the focus to `body` (F2: `BODY`). So `findAgain(document.activeElement)` records nothing. Closing by Escape, by the close button or by the backdrop leaves the focus on `body` (`textarea#send_textarea -> button.forge-menu-section -> BODY`, all three ways).
   - **What should happen:** the round button that opened the panel should get the focus back. A keyboard user who opened the panel with the mouse and pressed Escape starts again from the top of the page.
   - **Rules broken:** brief step 5 ("whatever opened the panel: one of the round buttons, or the top-bar icon") and bible section 11 ("gives the focus back to the button that opened it").
   - **The result file is wrong here:** it says "after a click on a round button the focus goes back to what had it before (the message box, for example)". Measured, it does not.
   - **A possible fix:** note the round button or toggle that was clicked, not only `document.activeElement`.
3. **With the buttons off, Shift+Tab from a top bar icon clicked while the panel is open leaves the page (minor; part of the same Tab rule).**
   - The top bar sits above the frame (z-index 3005 against 3004), so with the buttons off its icons can be clicked while the panel is open.
   - Probe B2: clicking the AI response icon puts the focus on `div#leftNavDrawerIcon`. Then Shift+Tab goes to `body`, and the next press goes into the menu.
   - Tab forward from the same icon happened to land in the menu (probe B).
   - The cause is the choice "focus outside both parts: `onKey` does not touch Tab". The builder made it for Select2 dropdowns and windows over the panel, but it also covers this case.
4. **Escape on a SillyTavern popup over the open panel no longer reaches SillyTavern's chat-level Escape (judgement call, not counted as FAIL).**
   - Stand-in for generating: `#mes_stop` shown, counting `GENERATION_STOPPED` (probe C).
   - With the panel off, or on but closed, Escape on a SillyTavern popup closes the popup and stops generating in the same press (C2 = C4 = `{"stopped":1}`).
   - With the frame open under the popup, Escape closes the popup, but nothing stops (C6 `{"stopped":0}`). The next Escape closes the panel, and only the third Escape stops.
   - The cause is `event.stopPropagation()` when `dialogOnTop()`. That is needed for a foreign `<dialog>`: SillyTavern's `processHotkeys` would otherwise close the menu behind it (the brief's step 6). It is not needed for SillyTavern's own popups, because `processHotkeys` already stands back while `Popup.util.isPopupOpen()`.
   - The builder chose this on purpose and wrote it down. The lead asked that stop generating keep working whenever the panel is not the thing in front, and here a popup is in front. Stopping the key only for dialogs that are not SillyTavern popups would keep both.
   - Everything else here holds: with the frame closed, all of SillyTavern's Escape uses are exactly as with the panel off (C1 to C4). With the frame open and in front, the first Escape closes only the panel, and the next one stops (C5).
5. **A pinned Characters panel that was open, plus a slow `APP_INITIALIZED` listener, opens in the frame at load (minor).**
   - SillyTavern reopens a pinned panel that was open 300ms after `initRossMods`. When the answer only comes at `APP_READY`, the pin is put away after that, so the Characters panel is left open and unpinned.
   - Probe P4: the frame shows Characters at load (`{"frame":true,"open":["right-nav-panel"]}`). In a normal load, the menu-characters test checks that the frame stays closed.
   - The pin is still recorded and comes back when the panel turns off. This only happens with another extension that is slow, so it is a note for the owner.
6. **Checked and true:** SillyTavern 1.19.0's `switchReducedMotion` (`scripts/power-user.js`) does toggle `reduced-motion` on `body`, so bible section 4's "puts no class on body" is out of date. Reading the value, as built, is still right.

### The builder's other choices

- **Escape is spent when it closes the panel:** accepted. The panel is in front (C5).
- **Older windows are left to SillyTavern:** right; the test checks `#character_popup`.
- **Closing does not animate:** accepted; the bible describes only the opening.
- **The open menu does not fade:** consistent with "nothing else moves".
- **`@starting-style`:** fine; without it the frame just appears at once.
- **The focus moves in at every opening:** accepted. It is what makes problem 2 matter.
- **The phone variant:** right, by bible section 12.
- **The tab-stop rules and the order** (the frame first, then the menu): reasonable. The holes are problems 1 and 3.

## Fixes after the check

### What failed

- **Problem 1 (FAIL): Shift+Tab left the panel from Lorebooks' active-worlds box.** Select2 stops every key on its inline search field (`textarea.select2-search__field`), so `onKey` on `body` never saw that Tab. WebKit's own Shift+Tab found nothing before the field that it stops at, and took the focus out of the page (`body`). On the old code the new lap check never came round: in 200 Shift+Tabs the focus went to `body` 11 times, every 18th press, and the next press took it to the menu's last stop, so it never got back to the first nav button.
- **Problem 2 (FAIL): no focus back after opening with the mouse.** In WebKit the press on a round button takes the focus away to nowhere, and the button does not take it. `findAgain(document.activeElement)` got `body` and kept nothing, so closing by Escape, the close button or the backdrop left the focus on `body`. With the buttons off, a click on the edge of a top bar toggle, just below its icon, did the same (the toggle is 33px tall and its icon 29px). A click on the icon itself worked: SillyTavern gives the icon `tabindex="0"`, and WebKit focuses that on a click.
- **Problem 3: with the buttons off, Shift+Tab from a top bar icon clicked while the panel was open left the page.** The icon is outside the frame and the menu, and focus outside both parts kept the page's own Tab.
- **Problem 4: Escape on a SillyTavern popup over the open panel did not reach SillyTavern's own chat-level Escape.** `onKey` stopped the key for every dialog on top, SillyTavern's popups included, so stop generating waited for a third press.

### What changed

**`menu.js`**

- **Tab, whatever a menu's widgets do with it (problem 1).** A second key listener, `noteTab`, on `body` in the capture phase. It is added and removed with `onKey`, so it exists only while the frame is shown.
  - It changes nothing. For each Tab it notes the focused element and the direction, before anything in the page sees the key, and sets a timer with no delay.
  - When the timer runs, the browser has dealt with the key, and `keepTab` looks where the focus went.
  - If the key's default was prevented, it does nothing. That is `onKey`, which moved the focus itself, or the control: Select2's open dropdown takes Tab to pick a result.
  - Otherwise, if the focus went nowhere, or left the frame and the open menu for somewhere else, it goes on the next stop from where it was, in the order `onKey` uses.
  - Focus that was already outside and stays outside (a dropdown, another extension's window) is left alone. Nothing is done while a window is open over the panel, or once the frame is hidden.
- **Why the check is tied to Tab, not a guard on the focus itself.** The checker suggested `focusin`/`focusout` on the frame and the open menu. Two reasons against it:
  - The focus can leave the frame and the menu on purpose, with no Tab: a click, SillyTavern or another extension focusing something, another extension's own window. A guard on the focus would pull it back in those cases too.
  - A `focusout` alone does not say which way the person went. A focus that went nowhere after Shift+Tab could only be put back on the field it left, and Shift+Tab would then be stuck on that field.
- **Why not take Tab in the capture phase.** The menus' own widgets would lose it: Select2 picks a result with Tab while its dropdown is open, and SillyTavern's autocomplete uses Tab too. The brief leaves keys inside SillyTavern's menus alone, so the capture listener only takes notes. A scratch probe compared Select2 in Lorebooks with the panel off and on: a click on the box, Escape, Shift+Tab with the dropdown closed and with it open, and Escape again. After each, the dropdown, the focus, the menu and the chosen worlds were the same both ways.
- **The focus back after a click (problem 2).** When the frame opens and what has the focus cannot be found again (`findAgain` gives null, as it does for `body`), the panel keeps the control that opens the section instead (`openerOf`):
  - with the buttons on, the Characters round button for Characters and the Menu round button for every other section. Menu never opens Characters and Characters opens nothing else, so this is the button that was clicked;
  - with the buttons off, the section's top bar icon.
  - The rest is as before: closing gives that control the focus only if the focus went with the frame.
  - A side effect: a section opened by code while the focus was nowhere (another extension, a command) now gives the focus to that section's button on closing. Before, it was left on `body`.
- **Shift+Tab from a top bar icon (problem 3).** In `nextStop`, focus on a round button or a top bar toggle or icon (`astray`) now counts as nowhere: Tab goes to the first stop and Shift+Tab to the last, and `onKey` moves the focus there. It did not fall out of the Tab check alone. From the first icon, Shift+Tab ends nowhere, which `keepTab` would catch. From any other icon it goes to the icon before it: outside, but somewhere, so the focus would walk along the top bar first. (A scratch probe with the panel off: the browser's own Shift+Tab from the Lorebooks icon went to the Formatting icon, then Connection, then AI response.)
- **Escape on SillyTavern's popups (problem 4).** `onKey` now stops Escape only when the dialog on top is not one of SillyTavern's popups: `dialogOnTop() && !Popup.util.isPopupOpen()`.
  - `Popup` is imported from SillyTavern's `scripts/popup.js`. `Popup.util.isPopupOpen()` is the very test with which `processHotkeys` stands back.
  - Over one of SillyTavern's popups, the key now goes on as it does with the panel off: the popup closes, `script.js`'s own Escape stops generating in the same press, and `processHotkeys` closes nothing behind it.
  - Over any other `<dialog>`, the key still goes no further than `body`, and the menu behind it stays open (brief step 6). That also keeps `script.js`'s Escape from acting in that press, as before.
- Small: `stopKeys` removes both listeners, from `hide` and `turnOff`. `nowhere` is shared by `nextStop`, `keepTab` and `focusLost`. The header comment and `findAgain`'s comment say what they do now.

**`tests/browser/menu-keys.mjs`.** New checks:

- **Lorebooks:** its active-worlds box is a tab stop. Shift+Tab, then Tab, go round from the first nav button back to it (at most 200 presses), pass through the box, and never leave the frame and the open menu. Each press is followed by a 40ms wait.
- **Mouse:** Menu and Characters, each clicked with the focus in the message box, then closed by Escape, by the close button and by the backdrop (six checks). Each time, the focus is back on the button that was clicked.
- **Buttons off, by mouse:** the Settings icon clicked, then closed by the backdrop: the focus is on the icon. The edge of its toggle below the icon clicked, then closed by the close button: the focus is on the icon.
- **Buttons off, Tab:** a top bar icon clicked while the panel is open, then Shift+Tab four times, and in a second round Tab four times. The focus stays in the frame and the open menu.
- **Generating** (a stand-in: SillyTavern's Stop button shown, `GENERATION_STOPPED` counted):
  - one Escape on a SillyTavern popup over the open panel closes the popup and stops generating, and the panel stays open on the same section;
  - one Escape on another `<dialog>` closes only that dialog: the menu stays open and nothing is stopped;
  - then Escape closes the panel.
- **Changed:** "one key listener of ours is in place, on body" is now "our two key listeners are in place, both on body", and the main switch check counts two.

### Left as they were

- **Problem 5, a note for the owner.** With another extension's slow `APP_INITIALIZED` listener, a pinned Characters panel that was open is put away only at `APP_READY`. By then SillyTavern has reopened it, so it shows in the frame at load. The pin is still recorded and comes back when the panel turns off. Not changed here.
- **Problem 6, kept:** SillyTavern 1.19.0's `switchReducedMotion` does toggle `reduced-motion` on `body`, so bible section 4's "puts no class on body" is out of date. Reading the value, as built, is still right.
- **Focus that code puts behind the panel keeps the page's own Tab, as before.** A scratch probe focused the message box from code with the panel open, and Tab then went to the next control in the page, behind the backdrop. Only code (or a click on something above the frame) can put the focus outside, and a window from another extension can sit above the frame, so Tab from an unknown place outside is not taken.

### Also checked, with scratch scripts outside the repository

- **All nine sections,** as in the check's probe A but with no wait between presses: 120 Tab, 60 Shift+Tab, 10 Alt+Tab and 10 Alt+Shift+Tab each. The focus never left the frame and the open menu; before, it left in Lorebooks.
- **Tab, then Escape at once:** the panel closes and the focus is on Menu. A timer that runs after the frame is hidden does nothing.
- **A click on the panel's title, then Tab:** the click leaves the focus nowhere, and Tab goes to the first stop.
- **Mouse open, a click into the menu, then the backdrop:** the focus is on Menu.
- **Opened by code with the focus nowhere** (the Characters toggle clicked from a script): Escape gives the focus to the Characters round button.

### Not tried

Safari itself and TauriTavern. When WebKit's own Tab leaves the page there, the browser may take the focus to its own controls before the page can act. Whether `focus()` from the page brings it back then was not tried. The test browser leaves the focus on `body`, and from there it is put back.

### The new checks on the old code

The final `menu-keys.mjs`, run with `menu.js` as it was at `da20caa` (the same `menu.js` as `766f2db`, the commit the check looked at). The new and changed checks:

```
FAIL 1. our two key listeners are in place, both on body ({"live":1,"where":["body"]})
ok   Lorebooks: the active-worlds box is a tab stop in the open menu
FAIL Lorebooks: Shift+Tab goes round from the first nav button back to it, through the active-worlds box, and never leaves the frame or the open menu (200 presses, box true; 11 outside: Shift+Tab 18: body.no-blur.drop_target; Shift+Tab 36: body.no-blur.drop_target; Shift+Tab 54: body.no-blur.drop_target)
ok   Lorebooks: Tab goes round from the first nav button back to it, through the active-worlds box, and never leaves the frame or the open menu (28 presses, box true)
FAIL mouse: Menu clicked, then closed by Escape: the focus is back on Menu ({"opened":true,"closed":true,"focus":"body.no-blur.drop_target"})
FAIL mouse: Menu clicked, then closed by the close button: the focus is back on Menu ({"opened":true,"closed":true,"focus":"body.no-blur.drop_target"})
FAIL mouse: Menu clicked, then closed by the backdrop: the focus is back on Menu ({"opened":true,"closed":true,"focus":"body.no-blur.drop_target"})
FAIL mouse: Characters clicked, then closed by Escape: the focus is back on Characters ({"opened":true,"closed":true,"focus":"body.no-blur.drop_target"})
FAIL mouse: Characters clicked, then closed by the close button: the focus is back on Characters ({"opened":true,"closed":true,"focus":"body.no-blur.drop_target"})
FAIL mouse: Characters clicked, then closed by the backdrop: the focus is back on Characters ({"opened":true,"closed":true,"focus":"body.no-blur.drop_target"})
FAIL generating: one Escape on a SillyTavern popup over the panel closes the popup and stops generating, and the panel stays open ({"popup":0,"stopped":0,"frame":true,"menu":"WorldInfo"})
ok   generating: Escape on another <dialog> over the panel closes only that dialog (the menu behind it stays open, nothing is stopped) ({"dialog":false,"stopped":0,"frame":true,"menu":"WorldInfo"})
ok   generating: then Escape closes the panel
ok   buttons off: the Settings icon clicked, then closed by the backdrop: the focus is back on the icon ({"opened":true,"closed":true,"focus":"div.drawer-icon.fa-solid"})
FAIL buttons off: the edge of the Settings toggle clicked, then closed by the close button: the focus is on the icon ({"opened":true,"closed":true,"focus":"body.no-blur.drop_target"})
FAIL buttons off: a top bar icon clicked while the panel is open, then Shift+Tab four times: the focus stays in the frame and the open menu ({"section":"left-nav-panel","onIcon":true}; Shift+Tab 1: body.no-blur.drop_target)
ok   buttons off: a top bar icon clicked while the panel is open, then Tab four times: the focus stays in the frame and the open menu ({"section":"left-nav-panel","onIcon":true}; none outside)
FAIL main switch: the frame is open, with its key listeners ({"live":1,"where":["body"]})

(50 ok and 12 FAIL in all, exit 1. Every other check passed, as before.)
```

The new checks that pass on the old code too are kept for what they guard:

- **The Tab lap through Lorebooks:** the browser's own Tab from the active-worlds box lands on the next stop in the menu. It stays beside the Shift+Tab lap so that both ways are covered. (The line before it only checks that the box is a tab stop, so that the laps mean something.)
- **Tab from a clicked top bar icon:** the browser's own Tab lands in that icon's menu, which comes next in the page. It stays beside the Shift+Tab check.
- **A click on the Settings icon itself:** WebKit focuses the icon on a click, so this worked before. It stays beside the click on the toggle's edge, which did not.
- **Another `<dialog>` over the panel closes only itself, and the next Escape closes the panel:** as before. They guard brief step 6 against the change made for SillyTavern's popups.

### Test output

Final runs, on the code as committed.

```
$ node tests/browser/menu-keys.mjs
ok   before: SillyTavern's Escape closes Settings, opened from its icon by keyboard ({"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"})
ok   1. Menu by keyboard opens the frame on AI response (left-nav-panel)
ok   1. the focus is on the nav button with aria-current="page", AI response's ({"inFrame":true,"inMenu":false,"name":"button.forge-menu-section","current":"page","section":"AI response"})
ok   1. focused, the current section keeps its --forge-ember fill, inside the existing focus ring ({"ember":true,"ring":true})
ok   1. our two key listeners are in place, both on body ({"live":2,"where":["body"]})
ok   2. the panel has role="dialog" and aria-modal="true", and its aria-labelledby names the section ({"role":"dialog","modal":"true","title":"AI response","nav":"Menus","navHolds":9})
ok   2. the nav is a <nav> with aria-label="Menus" that holds the section buttons ({"role":"dialog","modal":"true","title":"AI response","nav":"Menus","navHolds":9})
ok   3. 60 Tabs: the focus is always inside #forge-menu or the open menu ({"frame":8,"menu":52})
ok   3. Tab stops at the frame's buttons and then at the menu's controls (buttons too, in WebKit) ({"frame":8,"menu":52})
ok   3. 10 Shift+Tabs: the same (none outside)
ok   3. Shift+Tab on the first nav button goes round to the open menu, and Tab comes back to it (div#new_oai_preset.menu_button.menu_button_icon then button.forge-menu-section)
ok   3. Tab from the last nav button reaches the close button (button.forge-menu-close)
ok   a nav button by keyboard changes the section, and the focus stays on it, now current (WorldInfo {"inFrame":true,"inMenu":false,"name":"button.forge-menu-section","current":"page","section":"Lorebooks"})
ok   Lorebooks: the active-worlds box is a tab stop in the open menu
ok   Lorebooks: Shift+Tab goes round from the first nav button back to it, through the active-worlds box, and never leaves the frame or the open menu (28 presses, box true)
ok   Lorebooks: Tab goes round from the first nav button back to it, through the active-worlds box, and never leaves the frame or the open menu (28 presses, box true)
ok   4. Escape closes the frame
ok   4. the focus is back on the Menu round button (button.forge-menu-round.forge-menu-round-menu)
ok   4. no key listener of ours is left ({"live":0,"where":["body"]})
ok   5. Characters by keyboard opens the Characters section
ok   5. Escape: the frame is closed and the focus is on the Characters round button (button.forge-menu-round.forge-menu-round-characters)
ok   mouse: Menu clicked, then closed by Escape: the focus is back on Menu ({"opened":true,"closed":true,"focus":"button.forge-menu-round.forge-menu-round-menu"})
ok   mouse: Menu clicked, then closed by the close button: the focus is back on Menu ({"opened":true,"closed":true,"focus":"button.forge-menu-round.forge-menu-round-menu"})
ok   mouse: Menu clicked, then closed by the backdrop: the focus is back on Menu ({"opened":true,"closed":true,"focus":"button.forge-menu-round.forge-menu-round-menu"})
ok   mouse: Characters clicked, then closed by Escape: the focus is back on Characters ({"opened":true,"closed":true,"focus":"button.forge-menu-round.forge-menu-round-characters"})
ok   mouse: Characters clicked, then closed by the close button: the focus is back on Characters ({"opened":true,"closed":true,"focus":"button.forge-menu-round.forge-menu-round-characters"})
ok   mouse: Characters clicked, then closed by the backdrop: the focus is back on Characters ({"opened":true,"closed":true,"focus":"button.forge-menu-round.forge-menu-round-characters"})
ok   6. the stand-in dialog is open over the panel
ok   6. Escape closes the dialog
ok   6. and the panel is still open, on the same section (WorldInfo then WorldInfo)
ok   6. Escape again closes the panel, and the focus is back on Menu (button.forge-menu-round.forge-menu-round-menu)
ok   a SillyTavern popup opens over the panel
ok   a SillyTavern popup: Escape closes it, and the panel stays open (WorldInfo)
ok   a SillyTavern popup: then Escape closes the panel (button.forge-menu-round.forge-menu-round-menu)
ok   generating: one Escape on a SillyTavern popup over the panel closes the popup and stops generating, and the panel stays open ({"popup":0,"stopped":1,"frame":true,"menu":"WorldInfo"})
ok   generating: Escape on another <dialog> over the panel closes only that dialog (the menu behind it stays open, nothing is stopped) ({"dialog":false,"stopped":0,"frame":true,"menu":"WorldInfo"})
ok   generating: then Escape closes the panel
ok   the advanced definitions window opens over the Characters section
ok   the advanced definitions window: Escape closes it (SillyTavern's own Escape), and Characters stays open in the frame (right-nav-panel)
ok   the advanced definitions window: then Escape closes the panel
ok   7. with the panel closed, Escape clicks no .drawer-toggle (0 clicks)
ok   7. and Escape and Tab reach document untouched, with no key listener of ours in place (Escape false, Escape false, Escape false, Escape false, Tab false, Tab false; {"live":0,"where":["body"]})
ok   7. no menu opened
ok   8. open: the backdrop's and the panel's transition-duration is 0.16s ([["0.16s"],["0.16s","0.16s"]])
ok   8. opening fades the backdrop in, and fades the panel in while it grows from 0.98; nothing else in the frame or the menu moves (forge-menu-backdrop opacity from 0, forge-menu-panel opacity from 0, forge-menu-panel transform from scale(0.98))
ok   8. reduced motion (the system's): the transition-duration is 0s ([["0s"],["0s","0s"]])
ok   8. reduced motion (the system's): opening moves nothing
ok   9. SillyTavern's Reduced Motion on: the transition-duration is 0s ([["0s"],["0s","0s"]])
ok   9. SillyTavern's Reduced Motion on: opening moves nothing
ok   9. switched back: 0.16s again ([["0.16s"],["0.16s","0.16s"]], was false)
ok   10. buttons off: the Settings icon by keyboard opens the frame, with the focus on Settings in the nav ({"inFrame":true,"inMenu":false,"name":"button.forge-menu-section","current":"page","section":"Settings"})
ok   10. Escape: the frame is closed and the focus is back on that icon (div.drawer-icon.fa-solid)
ok   buttons off: the Settings icon clicked, then closed by the backdrop: the focus is back on the icon ({"opened":true,"closed":true,"focus":"div.drawer-icon.fa-solid"})
ok   buttons off: the edge of the Settings toggle clicked, then closed by the close button: the focus is on the icon ({"opened":true,"closed":true,"focus":"div.drawer-icon.fa-solid"})
ok   buttons off: a top bar icon clicked while the panel is open, then Shift+Tab four times: the focus stays in the frame and the open menu ({"section":"left-nav-panel","onIcon":true}; none outside)
ok   buttons off: a top bar icon clicked while the panel is open, then Tab four times: the focus stays in the frame and the open menu ({"section":"left-nav-panel","onIcon":true}; none outside)
ok   main switch: the frame is open, with its key listeners ({"live":2,"where":["body"]})
ok   main switch off: nothing of the panel, and no key listener of ours ( {"live":0,"where":["body"]})
ok   off: nothing of the panel is in the page
ok   off: Escape on Settings does what it did before the panel was on ({"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"} vs {"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"})
ok   off: no key listener of ours, and none was ever put on document or window ({"live":0,"where":["body"]})
ok   no script errors

$ node tests/browser/menu-keys.mjs phone
ok   phone: no #forge-menu and no forge-menu class
ok   phone: with the panel on, Escape on Settings does what it does with it off ({"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"} vs {"opened":"user-settings-block","after":"","focus":"div.drawer-icon.fa-solid"})
ok   phone: no key listener of ours was ever added ({"live":0,"where":[]})
ok   no script errors

$ node tests/run.mjs menu
ok       menu-buttons  55 checks, 32s
ok       menu-buttons phone  4 checks, 11s
ok       menu-characters  63 checks, 80s
ok       menu-characters phone  11 checks, 24s
ok       menu-frame  49 checks, 25s
ok       menu-frame phone  5 checks, 14s
ok       menu-keys  62 checks, 64s
ok       menu-keys phone  4 checks, 15s

8 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 14s
ok       harness  8 checks, 12s
ok       harness phone  8 checks, 11s
ok       menu-buttons  55 checks, 33s
ok       menu-buttons phone  4 checks, 11s
ok       menu-characters  63 checks, 83s
ok       menu-characters phone  11 checks, 26s
ok       menu-frame  49 checks, 26s
ok       menu-frame phone  5 checks, 15s
ok       menu-keys  62 checks, 65s
ok       menu-keys phone  4 checks, 15s
ok       modes-bar  47 checks, 19s
ok       modes-bar phone  50 checks, 19s
ok       modes-send  70 checks, 34s
ok       stage-column  35 checks, 20s
ok       stage-column phone  10 checks, 14s
ok       stage-content  64 checks, 25s
ok       stage-content phone  22 checks, 17s
ok       stage-spine  52 checks, 23s
ok       stage-spine phone  12 checks, 15s

21 passed, 0 failed
```

Each run above finished on its own; none was cut off by the runner's time limit.
