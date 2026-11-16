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

## Check

**PASS.** Checked on `batch/P2-buttons-and-top-bar` at `8dacf57`, against `overhaul...HEAD` (merge base `92b7649`). `overhaul` has since moved on to `82d2514` (S2 merged; it touched only lane S files and docs). `git merge-tree` shows the branch still merges into it without conflicts.

### (a) Only owned files changed

`git diff --name-only overhaul...HEAD` lists six files. Five are on the brief's "You own" list: `css/menu.css`, `docs/redesign/changes/P2-buttons-and-top-bar.md`, `docs/redesign/results/P2-buttons-and-top-bar.md`, `menu.js` and `tests/browser/menu-buttons.mjs`.

The sixth is `tests/browser/menu-frame.mjs`. The change is one call, `setForge(page, { menuPanel: false })` becoming `setForge(page, { menuPanel: false, menuButtons: false })`, plus a two-line comment. I accept it, for three reasons:

- **Bible section 9 gives the file to lane P.** Its table assigns `tests/browser/menu-*.mjs` to lane P, and the bible says it wins over a brief. House rule 6 points to section 9 for the files.
- **The brief's own check cannot pass without it.** I ran `overhaul`'s unchanged `menu-frame.mjs` against this branch's code, from a scratch copy that imports this checkout's harness. It passes 7 checks, then times out at its first click on a top-bar icon (`page.click: Timeout 30000ms exceeded`). The bible and the brief make `menuButtons` default to `true`, and that hides the icon.
- **P1's test loses no coverage.** It now runs with the top bar, which is the only state it knew before `menuButtons` existed.

The builder states and explains the change in the result file and in the commit body. No personal details are in the diff or the commit message.

### (b) The commands

- `node tests/browser/menu-buttons.mjs`: 55 ok, 0 FAIL.
- `node tests/browser/menu-buttons.mjs phone`: 4 ok, 0 FAIL.
- `node tests/run.mjs menu`: 4 passed, 0 failed.
- `node tests/run.mjs`: 12 passed, 0 failed (foundation, harness, menu-buttons, menu-frame, modes-bar and stage-column, each desktop and phone).

### (c) The brief, the "Done when" list, and bible sections 3 and 9

Brief, Build:

1. **Setting.** `defaults` gains `menuButtons: true`. The Menus section has the checkbox "Two round buttons in place of the top bar" after the panel's. While the panel is off it is `disabled` and its label has a `title`. Ticking the panel enables it at once. `lookKeys` stays `{}`, which matches bible section 7 ("no" in the look file column). Met, with problem 2.
2. **The buttons.** `#forge-menu-buttons` is `position: fixed` at the top right and holds two `<button type="button">`s, Characters then Menu, each with an `aria-label` and a `title`. They are added only from `apply()` and only when `active && s.menuButtons`, where `active` is P1's rule (main switch, `menuPanel`, desktop). `body.forge-menu-buttons` comes and goes in the same call. Met.
3. **The clicks.** Characters calls `openSection('rightNavHolder')`, which clicks that drawer's own `:scope > .drawer-toggle`. Menu calls `openSection(menuTarget())`. `menuTarget()` uses `menuLast` only if it names a `#top-settings-holder > .drawer` in the page and is not `rightNavHolder`; otherwise it uses `ai-config-button`. Refusing `rightNavHolder` follows bible 5.2 ("never Characters"). Met.
4. **Hiding the top bar.** Under `body.forge-ui.forge-menu-buttons`:
   - `--topBarBlockSize: 0px` is set on `body`;
   - `#top-bar` gets `display: none`;
   - the holder gets `pointer-events: none`, and the drawer contents get `pointer-events: auto`;
   - `#top-settings-holder > .drawer > .drawer-toggle` gets `display: none`.

   I checked the `--topBarBlockSize` table against SillyTavern's source (`public/style.css`, `css/popup.css`, `css/promptmanager.css`, `css/mobile-styles.css`, `scripts/extensions/expressions/style.css`). Every line the builder cites is there with the selector they give. No `:root` variable is derived from it (only line 113 defines it), so the `body` override reaches every use. The `#top-bar` surprise is true: SillyTavern sizes it with `height: var(--bottomFormBlockSize)`. Met, with problem 3.
5. **The dot.** It follows `#API-status-top.fa-plug-circle-exclamation`. I confirmed in `RossAscends-mods.js` (`RA_checkOnlineStatus`) that the page swaps `fa-plug` and `fa-plug-circle-exclamation`, and in `index.html` that the icon starts with the exclamation class. The dot is updated from P1's existing observer on `#top-settings-holder` (class changes), plus once when the buttons are built. There is no polling and no second observer. Met.
6. **With `menuButtons` off,** the top bar is back and the panel works from it (test step 8). Met.

Leave alone: nothing pinned, Escape or focus is touched. `#chat` is not styled. Nothing of RPG Companion is selected or styled.

Test: the brief's ten steps are all there and numbered in the check names. Step 9 runs as the `phone` variant. That follows bible section 12 over the brief's "Desktop only", which is right because the bible wins.

Done when:

- The commands pass: yes, see (b).
- The result file lists what uses `--topBarBlockSize` and how the connection state is read: yes, both sections are there and I verified both against the source (above).
- Only the "You own" files changed: all but `menu-frame.mjs`, which bible section 9 allows. See (a).

Bible section 3:

1. **Native controls stay underneath.** Both buttons click SillyTavern's own toggles. The toggles are hidden, not removed. The dot reads the plug icon each time and keeps no copy of the connection state. Met.
2. **One switch back.** Met; see (d).
3. **Every look choice gets a setting.** Section 7 gives the buttons only their switch. Their colours come from tokens that the owner's colour settings drive. The hover is the same as P1's close button. Met.
4. **Phone.** The phone run passes, and the brief asks for no TauriTavern stand-in. Met.
5. **One list of values.** No raw colours. The literals are figures the bible gives: the 18px icon, stroke 1.8, the 8px dot and 1px lines. P1 did the same and passed its check. Met, with problem 4.
6. **Stay in your lane.** Met; see (a).
7. **Small and plain.** About 90 lines in `menu.js`, small functions, no classes, no dependencies. Met.

Bible section 9:

- **Contract.** The six exports are unchanged in shape. `setButtons` is called only from `apply`. Met.
- **Shared names.** `body.forge-menu-buttons` and `#forge-menu-buttons` are used exactly as section 9's table defines them. Every new class starts `forge-menu-`, and the settings id is `forge-ui-menu-buttons`. Met.
- **Selectors.** Every new selector starts `body.forge-ui.forge-menu-buttons`. I listed every rule in the page's stylesheets that names the buttons, and all of them do, including the one SillyTavern generates (see (d)). Met.
- **No `!important`.** None is added. Met.
- **No chat text.** No chat text reaches the page. No network requests, no `localStorage`. No observer on `#chat`. No SillyTavern setting is changed. Met.
- **Nothing kept between calls.** The click handlers hold drawer ids, not elements, and `syncDot` looks the button up each time. Met.

### (d) Trying to break it (scratch scripts outside the repository, against the sandbox, Forge Tester chat only)

All of these passed:

- **Panel off after use.** I opened menus, moved the buttons on and off, changed the connection state and ran five applies, then turned the panel off. I compared the attributes of `html`, `body`, `#top-bar`, `#top-settings-holder`, `#sheld`, `#chat`, `#form_sheld`, `#send_form`, and every drawer, toggle and drawer content with a snapshot taken before the panel was ever on (class lists compared as sets). I also compared `body`'s child list, the computed `--topBarBlockSize`, every `forge-*` id and the holder's `pointer-events`. All were identical. On a first run with ordered class lists, two diffs showed. Both were order only: SillyTavern re-adding `no-connection` to `#send_form` after my status changes, and `index.js` re-adding `forge-ui` after the main-switch test. Neither comes from this batch.
- **Main switch off, then on with the panel off.** Identical to before, apart from `index.js`'s own classes while the switch is off.
- **Buttons switched off with a menu open.** The menu stays open in the frame and the buttons are gone. Switched on again, there is one `#forge-menu-buttons`, placed just before `#forge-menu`, which stays last in `body`.
- **Five `arcane-forge-ui:apply` events:** one `#forge-menu-buttons`.
- **The connection changed while the buttons were away.** It changed once with the buttons off and once with the panel off. In both cases the dot was right as soon as the buttons came back.
- **The buttons' look.** `--forge-card` fill, `--forge-brass` icon, a 1px `--forge-border` line, no shadow, no gradient, no filter. While the panel is open, a click on Menu's spot lands on `.forge-menu-backdrop`, so the buttons are under the backdrop as the layer tokens intend.
- **The holder.** It holds the nine drawers and nothing else. So `#top-settings-holder > .drawer > .drawer-toggle` and "every `.drawer-toggle` in the holder" are the same nine elements today, and the test asserts the broader form.
- **Phone.** At 390 by 800 (touch) with both settings on, there is no `#forge-menu-buttons`, no class, and the top bar is unchanged. Crossing 1000px both ways on desktop removes and restores the buttons (in the test).
- **Screenshots** of the top right at 1440 by 900 match bible 5.2: two round card buttons, the address card and three lines in brass, and the red dot on Menu. In the Stage layout `#sheld` runs from 0 to 900 at the right edge (778,0 662x900).

Not tried: a touch screen wider than 1000px (where `--forge-round` is 44px), TauriTavern itself, and Tab order (WebKit does not stop on buttons by default, as the builder noted).

### Problems found

None of these makes it FAIL.

1. **`tests/browser/menu-frame.mjs` is outside the brief's list.** It is in lane P under bible section 9, the brief's own check needs the change, and it is stated. Accepted; see (a). The brief should have listed it.
2. **Greyed out covers the checkbox only.** The checkbox is `disabled` and shows at `brightness(0.5)` with a not-allowed cursor, but the label text stays at full `--forge-text`. Feature CSS cannot do this, because its selectors all need `body.forge-menu`, which is absent exactly when it should apply. The builder handed it to I3 with a ready rule. I agree.
3. **The space given back reaches past the chat.** The `--topBarBlockSize: 0px` side effects are real and documented:
   - toasts touch the top edge (over the buttons if the user sets toasts to top right);
   - maximised Author's Note and CFG (layer 4000) cover the buttons;
   - RPG Companion's panel keeps a 34.5px gap and the buttons overlap its top edge. My screenshot confirms this.

   None of these is something this batch may fix (bible sections 10 and 14, and the brief leaves the chat's padding to I1). It is listed for I1 in "Asked of other files".
4. **Raw sizes in `css/menu.css`.** `18px`, `1.8` and the `8px` dot are the bible's figures with comments, as in P1. I1 could make the dot a token.
5. **SillyTavern also styles the hover rule as a focus rule.** `scripts/dynamic-styles.js` copies every `:hover` rule into a `:focus-visible` rule in `<style id="dynamic-extension-styles">`. So `.forge-menu-round:focus-visible` gets the hover fill as well as Forge's ember ring. It sits under the same `body.forge-ui.forge-menu-buttons` selector, so nothing of it applies with the feature off. A note, not a fault.
