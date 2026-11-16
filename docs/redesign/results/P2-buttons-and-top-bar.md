# P2-buttons-and-top-bar

## Built

- `menu.js`:
  - `defaults` gains `menuButtons: true`. `lookKeys` stays `{}` (bible section 7: the key does not go in the look file).
  - The Menus section gains a second checkbox, "Two round buttons in place of the top bar" (`#forge-ui-menu-buttons`), after the panel's. While the panel is off it is `disabled` and its label has a `title` saying it needs "Menus open in one centred panel". Ticking or unticking the panel's checkbox enables or greys it at once.
  - `apply(s)` ends with `setButtons(active && s.menuButtons)`, where `active` is P1's (main switch, `menuPanel`, desktop). On: `body.forge-menu-buttons`, and `#forge-menu-buttons` inserted just before `#forge-menu`. Off: both removed.
  - `#forge-menu-buttons` holds two real `<button type="button">`s, Characters (`.forge-menu-round-characters`) then Menu (`.forge-menu-round-menu`). Each has an `aria-label`, a `title` and an inline SVG line icon built with DOM calls. Menu also holds the dot (`span.forge-menu-dot`, `aria-hidden`, `hidden` while connected).
  - Characters calls P1's `openSection('rightNavHolder')`, which clicks that drawer's own `.drawer-toggle`. Menu calls `openSection(menuTarget())`. `menuTarget()` reads `menuLast` when clicked and uses it only if it is the id of a `#top-settings-holder > .drawer` in the page and is not `rightNavHolder`. Otherwise it uses `ai-config-button`.
  - The dot follows SillyTavern's plug icon, `#API-status-top` (see "How the connection state is read"). P1's one observer on `#top-settings-holder` already sees class changes on that icon, so its callback now also calls `syncDot()` when a record's target is `#API-status-top`. There is no second observer and no polling. While the dot shows, Menu's `aria-label` and `title` read "Menu (not connected to an API)".
- `css/menu.css`, all under `body.forge-ui.forge-menu-buttons`:
  - `--topBarBlockSize: 0px` on `body`, as a rule rather than an inline style, so it goes with the class.
  - `#top-bar { display: none }`.
  - `#top-settings-holder { pointer-events: none }`. With the variable at 0 its own height is 0.
  - `#top-settings-holder > .drawer > .drawer-toggle { display: none }`.
  - `#top-settings-holder > .drawer > .drawer-content { pointer-events: auto }`, so the menus still take clicks in the panel.
  - The buttons, as bible section 5.2: fixed, `--forge-space-3` from the top and right, `--forge-space-2` apart, `--forge-round` square, `--forge-radius-pill`, `--forge-card` with a 1px `--forge-border` line, `--forge-brass` icon, on `--forge-z-buttons`. The dot is 8px, `--forge-danger`, at the Menu button's top right.
- `tests/browser/menu-buttons.mjs`: the brief's ten steps, plus the extra checks listed under "Test output".
- `tests/browser/menu-frame.mjs`: one line changed. See the first item under "Choices the bible did not cover".

### What uses `--topBarBlockSize`

Found by reading SillyTavern's source (`../SillyTavern/public`), and by listing every rule in the sandbox page's stylesheets that mentions the variable. The page listing is what showed the third-party rules. Nothing in SillyTavern's scripts reads the variable.

| Where | Rule | What 0px does |
|---|---|---|
| SillyTavern `style.css` | `:root` | defines it (`--topBarIconSize` + `--topBarBlockPadding`, 35px in the sandbox). The body rule overrides it for everything inside `body` |
| | `#top-settings-holder { height }` | the holder is 0px tall, so it takes no space |
| | `#sheld { top; height; max-height }` | the chat column starts at the top of the window and is full height |
| | `#chat { max-height }` | the message list may be the window's height less the form |
| | `body #toast-container { margin-top }` | toasts touch the top edge (see below) |
| | `#character_popup { top }`, `#select_chat_popup { max-height }` | these popups start at, or may reach, the top of the window |
| | `.drawer-content { top; max-height }` | a drawer opens at the top. Inside the panel P1's `!important` place wins |
| | `body:not(.movingUI) .drawer-content.maximized { top: … !important }` | a maximised floating panel (Author's Note, CFG) starts at the top |
| | `.fillLeft, .fillRight { max-height }` | pinned side panels may be full height. Forge's own desktop rule already makes them `100dvh` |
| `css/popup.css` (imported) | `.popup #toast-container.toast-top-*` | toasts inside a popup lose the bar's offset |
| `css/promptmanager.css` (imported) | `#completion_prompt_manager_popup { top; height }` | the prompt manager's popup is full height from the top |
| `css/mobile-styles.css` | three rules | inside `@media (max-width: 1000px)`. The buttons never exist there, so these never see 0 |
| Character Expressions `style.css` | `#expression-wrapper`, `#visual-novel-wrapper { height }` | these become `100vh` (S3's area) |
| Forge `style.css` | `body.forge-ui #sheld { height; max-height }` (desktop) | full height |
| RPG Companion `style.css` | `.rpg-panel { top: var(--topBarBlockSize) }` | overridden by its Forge theme (below), so it does not follow |

What surprised me:

1. **The strip is not sized by this variable.** `#top-bar` takes its height from `--bottomFormBlockSize`, not `--topBarBlockSize`. Setting the variable to 0 does not hide it, so it gets `display: none`. Forge's own `style.css` already notes this for the AI response panel's header.
2. **RPG Companion's panel keeps a gap above it.** Its Forge theme places its side panel with `.rpg-panel[data-theme="forge"] { top: var(--bottomFormBlockSize) }` (34.5px in the sandbox), not with `--topBarBlockSize`. With the buttons on, a 34.5px strip of background therefore stays above it at the right edge. The round buttons (12px to 52px from the top) sit in that strip and overlap the top 17px of the panel's edge, above its title. The buttons are on layer 3002 and the panel on 1000, so the buttons are drawn over it. The panel's own controls stay clear of the buttons. Nothing of RPG Companion was selected, styled or moved; this was found by reading the page's computed styles and rules.
3. **Toasts.** With the bar's offset gone, toasts touch the top edge of the window. At SillyTavern's default position (top centre) they are clear of the buttons: a test toast measured 570 to 870px across a 1440px window, and the Menu button still took the click. A user who sets SillyTavern's toast position to top right gets toasts over the buttons for the few seconds they show, because toasts are on a higher layer.
4. **Floating panels.** Without MovingUI, a maximised floating panel now starts at the top of the window. Author's Note and CFG are on layer 4000, above the buttons, so they cover the buttons while maximised. The log probabilities viewer is on layer 3000, below the buttons. If it is dragged to the top right, the buttons sit over it.
5. **SillyTavern's own hidden top bar switch.** `#option_settings` in the options menu hides `#top-bar` and `#top-settings-holder` with inline `display: none` (`script.js`). Used with the panel on, that would hide the menus too, because they live in the holder. SillyTavern ships that option with `displayNone`, so it cannot be reached from the page. Noted only.

### How the connection state is read

SillyTavern shows the state on the top bar's plug icon, `#API-status-top`, which sits inside `#sys-settings-button`'s toggle in `#top-settings-holder`.

- `setOnlineStatus()` (`script.js`) writes the status text into `.online_status_text`.
- A `MutationObserver` in `RossAscends-mods.js` sees that change and runs `RA_checkOnlineStatus` 200ms later (`debounce_timeout.short`).
- `RA_checkOnlineStatus` swaps the icon's `fa-plug` for `fa-plug-circle-exclamation redOverlayGlow` when there is no connection, and back again when there is one. It also puts `no-connection` on `#send_form`.

The page's own HTML starts the icon with `fa-plug-circle-exclamation`, and `online_status` starts as `'no_connection'`, so that class is right from the first paint. `redOverlayGlow` only appears after the first check. Forge's `style.css` also keys its red plug on `fa-plug-circle-exclamation`, so the dot follows `#API-status-top.fa-plug-circle-exclamation`.

The dot does not follow the `ONLINE_STATUS_CHANGED` event, because the brief asks to follow the page. The event also fires only on a change, and before the icon changes. The test changes the state the way SillyTavern does, with `setOnlineStatus('Valid')` and `setOnlineStatus('no_connection')`, then waits for the icon.

## Test output

```
$ node tests/browser/menu-buttons.mjs
ok   before: the top bar and its nine icons are on screen (bar 360,0,720,35, 9 icons, --topBarBlockSize calc(calc(calc(1 * 15px) * 2) + calc(calc(1 * 15px) / 3)))
ok   1. body has forge-menu-buttons
ok   1. #top-bar is not shown (null)
ok   1. no .drawer-toggle in #top-settings-holder is shown (0 of 9 shown)
ok   1. the toggles are still in the page
ok   1. --topBarBlockSize is 0px on body (0px)
ok   1. the holder takes no space and catches no clicks ({"height":0,"events":"none"})
ok   1. a click where the icons were reaches neither the holder nor the bar (0 hit)
ok   1. the buttons come just before #forge-menu, which stays last in body ({"last":"forge-menu","next":"forge-menu"})
ok   1. #forge-menu-buttons holds two real buttons, Characters then Menu, with labels, titles and icons ([{"tag":"BUTTON","type":"button","label":"Characters","title":"Characters","icon":true},{"tag":"BUTTON","type":"button","label":"Menu (not connected to an API)","title":"Menu (not connected to an API)","icon":true}])
ok   2. each button is at least 40px wide and tall (40x40, 40x40)
ok   2. the right one is within 16px of the top and right edges (top 12, right 12)
ok   2. they are 8px apart, side by side (8px)
ok   2. they are round, with a 1px line, on the buttons layer ({"radius":true,"border":"1px","layer":"3002"})
ok   3. #sheld starts at the top of the window (top 0)
ok   4. Menu opens the frame on AI response (left-nav-panel)
ok   4. the menu lies in the frame's content area and takes clicks there ({"left":0,"top":0,"clickable":true})
ok   4. the nav switches to Lorebooks
ok   4. closed: no menu is open and the frame is hidden
ok   4. Menu again opens Lorebooks (WorldInfo)
ok   5. Characters opens the frame with #right-nav-panel (right-nav-panel)
ok   5. the head says Characters
ok   5. menuLast is still Lorebooks (WI-SP-button)
ok   5. Menu opens Lorebooks, not Characters (WorldInfo)
ok   6. menuLast not in the page: Menu opens AI response (left-nav-panel)
ok   6. menuLast set to Characters: Menu still opens AI response (left-nav-panel)
ok   7. connected: the plug icon says so
ok   7. connected: no dot on Menu ({"shown":false,"size":"0x0","red":true,"onButton":false,"name":"Menu"})
ok   7. not connected: the plug icon says so
ok   7. not connected: an 8px --forge-danger dot is on Menu ({"shown":true,"size":"8x8","red":true,"onButton":true,"name":"Menu (not connected to an API)"})
ok   7. not connected: Menu's name says so (Menu (not connected to an API))
ok   7. not connected: no dot on Characters
ok   7. connected again: no dot ({"shown":false,"size":"0x0","red":true,"onButton":false,"name":"Menu"})
ok   at 1000px wide: no buttons, and the top bar is back (; bar 0,0,1000,35)
ok   at 1440px again: the buttons are back and the top bar hidden
ok   8. the buttons are gone
ok   8. #top-bar is back where it was (360,0,720,35 vs 360,0,720,35)
ok   8. every icon is back where it was (9 shown)
ok   8. the chat column starts below the top bar again (360,35,720,865 vs 360,35,720,865)
ok   8. the panel is still on
ok   8. a top bar icon opens its menu in the panel (menu 0px from the nav)
ok   8. closed again
ok   main switch off: nothing of ours, and the top bar is back (; calc(calc(calc(1 * 15px) * 2) + calc(calc(1 * 15px) / 3)))
ok   main switch on again: the buttons are back
ok   10. --topBarBlockSize on body is SillyTavern's value again (calc(calc(calc(1 * 15px) * 2) + calc(calc(1 * 15px) / 3)) vs calc(calc(calc(1 * 15px) * 2) + calc(calc(1 * 15px) / 3)))
ok   10. nothing of ours remains
ok   10. the top bar, its icons and the chat column are where they were
ok   settings: the Menus section has "Two round buttons in place of the top bar", ticked, after the panel's checkbox ({"label":"Two round buttons in place of the top bar","checked":true,"disabled":true,"title":"Needs \"Menus open in one centred panel\" on","afterPanel":true,"inMenus":true})
ok   settings: with the panel off it is greyed out (disabled, with a title naming the panel's switch) ({"label":"Two round buttons in place of the top bar","checked":true,"disabled":true,"title":"Needs \"Menus open in one centred panel\" on","afterPanel":true,"inMenus":true})
ok   settings: ticking the panel enables it and the buttons appear ({"label":"Two round buttons in place of the top bar","checked":true,"disabled":false,"title":"","afterPanel":true,"inMenus":true})
ok   settings: unticking it saves menuButtons false, takes the buttons away and brings the top bar back (menuButtons false)
ok   settings: ticking it again brings the buttons back
ok   settings: unticking the panel greys it out again and leaves nothing of ours ({"label":"Two round buttons in place of the top bar","checked":true,"disabled":true,"title":"Needs \"Menus open in one centred panel\" on","afterPanel":true,"inMenus":true}; )
ok   settings: the Extensions menu closes from its own icon again
ok   no script errors

$ node tests/browser/menu-buttons.mjs phone
ok   9. phone: no #forge-menu-buttons and no forge-menu-buttons class
ok   9. phone: SillyTavern's top bar is on screen (holder 0,0,390,35, 9 icons shown)
ok   9. phone: the top bar is as it was with the settings off (0,0,390,35 vs 0,0,390,35)
ok   no script errors

$ node tests/run.mjs menu
ok       menu-buttons  55 checks, 31s
ok       menu-buttons phone  4 checks, 11s
ok       menu-frame  49 checks, 24s
ok       menu-frame phone  5 checks, 14s

4 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 13s
ok       foundation phone  15 checks, 12s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       menu-buttons  55 checks, 31s
ok       menu-buttons phone  4 checks, 11s
ok       menu-frame  49 checks, 24s
ok       menu-frame phone  5 checks, 14s
ok       modes-bar  47 checks, 18s
ok       modes-bar phone  50 checks, 18s
ok       stage-column  35 checks, 18s
ok       stage-column phone  10 checks, 13s

12 passed, 0 failed
```

The brief's steps are numbered in the check names. Step 9 runs in the phone variant, at a real 390 by 800 touch size; the desktop run also crosses 1000px both ways. The checks without a number are extras:

- the holder catches no clicks where the icons were;
- the DOM order, and the buttons' tags, types, names, titles and icons;
- their shape, line and layer;
- the menu takes clicks in the panel;
- `menuLast` set to `rightNavHolder`;
- the plug icon's class at each state, Menu's name, and no dot on Characters;
- crossing 1000px;
- the main switch;
- the settings screen.

### Also checked, with scratch scripts outside the repository

- **Off with a menu open:** AI response was opened with Menu, then the panel was turned off. The menu stayed open at SillyTavern's own place (0,0 360x900, the same as before the panel was ever on) and closed from its own icon. Afterwards the attributes of `html`, `body`, `#top-bar`, `#top-settings-holder` and every drawer and toggle were the same as before the panel was ever on, apart from the open and close classes.
- **Repeated apply:** five `arcane-forge-ui:apply` events leave one `#forge-menu-buttons` and one `#forge-menu`.
- **Keyboard:** with the focus on Menu, Enter opens a section. In WebKit, Tab does not stop on buttons by default (a browser setting), so Tab order was not tested there. The buttons come before the frame in the page, and Forge's existing ember focus ring rule covers `button`.
- **Characters twice:** a second Characters click while Characters is open (by script; the backdrop covers the button) leaves it open.
- **Stage layout with the buttons:** `#sheld` runs from the top of the window to the bottom at the right edge (778,0 662x900). The buttons sit over its top right corner and nothing covers them.
- **Screenshots** at 1440 by 900, with only the Forge Tester chat open, look as bible section 5.2 draws them: two round card buttons at the top right, with the address card and the three lines in brass and a red dot on Menu. While the panel is open they are dimmed under its backdrop.

## Choices the bible did not cover

- **One line in `tests/browser/menu-frame.mjs`, which the brief does not list.** P1's test turns the panel on and opens menus by clicking the top bar's icons. With `menuButtons` defaulting to `true` (bible section 7, brief item 1), those icons are hidden, so P1's test failed at its first click, and the brief's own check `node tests/run.mjs menu` could not pass. I changed its first `setForge(page, { menuPanel: false })` to `setForge(page, { menuPanel: false, menuButtons: false })` and added a comment saying why. The rest of P1's test is as it was, and it now tests the panel with the top bar, which is brief item 6. Bible section 9 gives lane P every `tests/browser/menu-*.mjs`, but the brief's "You own" list names only `menu-buttons.mjs`, so a checker running `git diff --name-only` will see this file. I judged a one-line change to the same lane's test better than leaving the brief's checks failing.
- **The test has a phone variant.** The brief says "Desktop only (… step 9 checks that)", and bible section 12 asks every feature test to run at phone size through the `[phone]` usage line. The bible wins, so step 9 is the phone run. The desktop run also narrows the window to 1000px and back.
- **Which toggles are hidden:** `#top-settings-holder > .drawer > .drawer-toggle`, the top bar's own icons, rather than every `.drawer-toggle` anywhere inside the holder. A `.drawer-toggle` that another extension puts inside its own menu would therefore still show in the panel. Today the two sets are the same nine elements; the test checks every `.drawer-toggle` in the holder, as the brief words it.
- **Clicks:** the holder has `pointer-events: none` and the drawers' contents `pointer-events: auto`. The holder is 0px tall anyway, so this is a second guard.
- **`--topBarBlockSize: 0px` is a CSS rule on `body`** under the class, not an inline style. It goes with the class, and step 10 checks that no inline value is left.
- **Icons.** Characters uses the address card that the top bar and the panel's nav already show for that section (the same drawing as Forge's `fa-address-card` mask), drawn as an inline SVG at stroke 1.8. Menu is three horizontal lines. Both are 24 by 24 with round caps and joins, drawn at 18px.
- **Names.** The `aria-label` and `title` are "Characters" and "Menu", the bible's words. While there is no connection, Menu's become "Menu (not connected to an API)". The dot is `aria-hidden`, so a screen reader is told about the missing connection in words.
- **Hover:** `--forge-active` fill with `--forge-text`, the same as the panel's close button. The bible gives no hover for these buttons.
- **The dot's place:** `--forge-space-1` from the top and right of the 40px button's box. That puts it on the round edge at the top right, slightly over it. Its 8px size is the bible's figure, written raw with a comment, as P1 did for the 18px icons and the 1.8 stroke.
- **Layer:** the buttons are on `--forge-z-buttons` (3002), below the backdrop (3003), so they are dimmed and cannot be clicked while the panel is open.
- **A button for a section that is already open does nothing** (P1's `openSection` guard), because clicking that drawer's toggle would close it.
- **`menuLast` is used only if it names a drawer in the top bar.** A hand-edited value of `rightNavHolder` or an unknown id falls back to AI response ("never Characters").
- **DOM order:** `#forge-menu-buttons` is inserted just before `#forge-menu`. The buttons then come before the frame in Tab order, and the frame stays the last element of `body`, which P1's test checks.
- **Greyed out:** the checkbox is `disabled`. SillyTavern's own `input:disabled` rule dims it to half brightness with a not-allowed cursor. The label gets a `title`: `Needs "Menus open in one centred panel" on`. The label text is not dimmed. That rule would have to apply exactly when `body.forge-menu` is absent, which feature CSS cannot do, because every rule in it starts with `body.forge-ui.forge-menu…`. It belongs with the settings-screen rules in `style.css` (I3).
- **No new look settings.** The bible's settings table gives these buttons only their switch. Their colours and sizes come from the tokens and the owner's seven colours.

## Asked of other files

- `style.css` (I3, settings-screen rules): dim the label text of a disabled setting, for example `.arcane-forge-ui-settings .checkbox_label:has(input:disabled) { color: var(--forge-dim); }`. Today only the checkbox itself is dimmed.
- I1-together: the chat's top padding under the buttons (left to I1 by the brief). Also for I1: RPG Companion's Forge theme keeps its panel 34.5px down (`top: var(--bottomFormBlockSize)`), so the buttons overlap its top edge (surprise 2 above). Its rules cannot be changed from here.
- `css/tokens.css` (I1): nothing new. The 8px dot could get a token if integration wants every size in `tokens.css`.

## Not done

Nothing in the brief. Out of scope as the brief says: pinned panels (P3), Escape and focus return (P4), and the chat's padding under the buttons (I1).
