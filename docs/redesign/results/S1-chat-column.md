# S1-chat-column

## Built

- `stage.js`:
  - `defaults = { layout: 'classic', stageChat: 46 }`. `lookKeys` stays empty; S2 adds `stageChat` (its brief, item 4).
  - `settingsHtml` returns a "Layout" section with one select, "Forge layout" (`#forge-ui-layout`), offering "Classic (SillyTavern's own)" and "Stage (art on the left, chat on the right)", and the note "Desktop only. Phones keep the classic layout." The section lands between Panels and Keyboard, where `index.js` puts feature sections.
  - `bindSettings` saves the select's value. A value that is not one of the two becomes `classic`.
  - `apply(s)`: active when `s.enabled`, `s.layout === 'stage'` and `(min-width: 1001px)` matches. Active: `body` gets `forge-stage`, `--forge-stage-chat` is set on `body`, and one `#forge-stage` (`aria-hidden="true"`) is appended to `body` if it is not there yet. Not active: all three are removed. It holds no element between calls.
- `css/stage.css`: three rules, each selector starting `body.forge-ui.forge-stage`.
  - `#sheld`: `left: auto; right: 0; width: var(--forge-stage-chat)`. SillyTavern's top and height formulas, and Forge UI's desktop height rule, are untouched, so the column runs from the bottom of the top bar to the bottom of the window.
  - `#bg1`, `#bg_custom`: as wide as the window less the chat column, with the art sized and centred on that box (`background-attachment: scroll; background-position: center`). Behind the column is the page's own `--forge-bg`.
  - `#forge-stage`: the same box as the art, `pointer-events: none`, on the art's layer and after it in the page.
- `tests/browser/stage-column.mjs`: the brief's ten steps, plus the checks listed under "Choices".
- `docs/redesign/changes/S1-chat-column.md`: the brief's changelog line.

## Test output

```
$ node tests/browser/stage-column.mjs
ok   layout Stage puts forge-stage on body
ok   the chat column's right edge is the window's (1440px of 1440px)
ok   the chat column is 46% of the window (662px, 46% is 662.4px)
ok   the chat column starts at the bottom of the top bar (column top 35px, bar bottom 35px)
ok   the chat column ends at the window's bottom (900px of 900px)
ok   the art starts at the left edge (0px)
ok   the art ends where the chat column starts (art right 778px, column left 778px)
ok   the art is sized and centred on the stage, not the window (scroll, 50% 50%)
ok   no art behind the chat column
ok   #forge-stage covers the same area as the art (0,0 to 778,900, art 0,0 to 778,900)
ok   #forge-stage is in body, aria-hidden and takes no clicks ({"hidden":"true","pointer":"none","parent":"BODY"})
ok   a click on the stage does not land on #forge-stage (expression-wrapper)
ok   the message box lies inside the chat column (855 to 1432px, column 778 to 1440px)
ok   applying the layout again keeps one #forge-stage and the same column (1 layers)
ok   a top-bar menu opens in the stage layout, on top ({"open":true,"box":[360,35,1080,602],"onTop":true})
ok   it opens where it opens in the classic layout (stage 360,35,1080,602, classic 360,35,1080,602)
ok   at 1040 by 700 the stage is at least 320px wide (560px)
ok   at 1040 by 700 the chat column is at least 480px wide (480px)
ok   at 1040 by 700 the chat column still reaches the right edge (1040px)
ok   at 900px wide the stage is off
ok   at 1440px wide again the stage is back
ok   main switch off: none of the stage in the page
ok   main switch on again: the stage is back
ok   classic again: #sheld is where it was (360,35 to 1080,900, before 360,35 to 1080,900)
ok   classic again: #top-bar is where it was (360,0 to 1080,35, before 360,0 to 1080,35)
ok   classic again: #bg1 is where it was (0,0 to 1440,900, before 0,0 to 1440,900)
ok   classic again: #send_textarea is where it was (437,863 to 1072,899, before 437,863 to 1072,899)
ok   classic again: no #forge-stage, no forge-stage class, no --forge-stage-chat on body
ok   the settings have a Layout section between Panels and Keyboard (Text, Panels, Layout, Keyboard, Colours, Share)
ok   Layout has the select "Forge layout", set to Classic (Forge layout: classic)
ok   it offers Classic and Stage, in that order (classic: Classic (SillyTavern's own) | stage: Stage (art on the left, chat on the right))
ok   it carries the note "Desktop only. Phones keep the classic layout." (Desktop only. Phones keep the classic layout.)
ok   choosing Stage there saves it and turns the stage on (layout stage)
ok   choosing Classic there takes the stage off
ok   no script errors

$ node tests/browser/stage-column.mjs phone
ok   a phone with layout Stage has none of the stage in the page
ok   a phone with layout Stage keeps the classic chat column (0,35 to 390,799, classic 0,35 to 390,799)
ok   a phone with layout Stage keeps the classic background (0,0 to 390,800, classic 0,0 to 390,800)
ok   the settings have a Layout section between Panels and Keyboard (Text, Panels, Layout, Keyboard, Colours, Share)
ok   Layout has the select "Forge layout", set to Classic (Forge layout: classic)
ok   it offers Classic and Stage, in that order (classic: Classic (SillyTavern's own) | stage: Stage (art on the left, chat on the right))
ok   it carries the note "Desktop only. Phones keep the classic layout." (Desktop only. Phones keep the classic layout.)
ok   choosing Stage there saves it and leaves the phone classic (layout stage)
ok   choosing Classic there takes the stage off
ok   no script errors

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 13s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       stage-column  35 checks, 19s
ok       stage-column phone  10 checks, 14s

6 passed, 0 failed
```

### Top-bar menus in the stage layout (the "Done when" item)

A scratch script outside the repository opened and closed each of the nine drawers in `#top-settings-holder`, first in the classic layout and then in the stage layout, at 1440 by 900. It recorded each drawer's box and whether the drawer was on top at its centre. Every drawer opened, was on top, and had the same box in both layouts:

| Drawer | Box in both layouts (left, top, right, bottom) |
|---|---|
| `ai-config-button` | 0, 0, 360, 900 (SillyTavern's left side panel, over the stage) |
| `sys-settings-button` | 360, 35, 1080, 711 |
| `advanced-formatting-button` | 360, 35, 1080, 866 |
| `WI-SP-button` | 360, 35, 1080, 290 |
| `user-settings-button` | 360, 35, 1080, 866 |
| `backgrounds-button` | 360, 35, 1080, 621 |
| `extensions-settings-button` | 360, 35, 1080, 602 |
| `persona-management-button` | 360, 35, 1080, 848 |
| `rightNavHolder` | 1080, 0, 1440, 900 (SillyTavern's right side panel, over the right part of the chat column) |

The centred drawers stay centred on the window, under the top bar, because the top bar and `--sheldWidth` are untouched. In the stage layout they therefore cover part of the stage and the left part of the chat column. A screenshot with the Extensions drawer open showed it drawn over both, readable and on top. The test keeps one of these comparisons (the Extensions drawer).

## Choices the bible did not cover

- **`--forge-stage-chat` holds the clamp, not a pixel value.** `apply` sets it to `clamp(var(--forge-chat-min), 46vw, calc(100vw - var(--forge-stage-min)))`, with `stageChat` in place of 46. CSS then keeps the width right while the window is resized, with no resize listener; `apply` only runs again when the window crosses 1000px, as the contract says. A `stageChat` outside 35 to 70 is clamped into it; one that is not a number gives 46.
- **The art's `background-attachment` becomes `scroll`.** SillyTavern gives `#bg1` `background-attachment: fixed`, which sizes and places the art against the window whatever the element's box. Narrowing `#bg1` alone would only crop art that is still centred on the window, so the stage ties the art to its own box.
- **The art's `background-position` becomes `center`.** This changes only SillyTavern's "Classic" background fitting (its default), which pins the art's top-left corner to the corner of the box. Cover, Contain and Center already centre the art, and Stretch fills the box, so the position makes no difference for those. Done because bible section 5.1 asks for the art centred on the stage.
- **`#forge-stage`'s layer is `z-index: -1`.** The tokens have no layer for "above the art, below everything else". The value is SillyTavern's own for `#bg1`; `#forge-stage` comes after `#bg1` in the page, so it is drawn just above the art and below everything else. It is `position: absolute` in `body` like `#bg1`, so the two always share the same containing block and box.
- **`#bg_custom` is not in this page.** In the sandbox's SillyTavern 1.19.0 no script creates it; only stale CSS names it, and a chat's own background now goes on `#bg1`. The rule still names `#bg_custom`, as the bible and brief say, in case TauriTavern or an older page has it. Here it matches nothing.
- **No media query in `css/stage.css`.** `body.forge-stage` exists only while `(min-width: 1001px)` matches, the same query `index.js` re-applies on. Below that, SillyTavern's own phone rules put `!important` widths on `#sheld` and `#bg1` anyway.
- **Settings markup.** The select's id is `forge-ui-layout`, the prefix the settings screen already uses. The note is a `<small>` tied to the select with `aria-describedby`, so a screen reader reads it with the select.
- **SillyTavern's MovingUI is left alone.** If someone has dragged or resized the chat with MovingUI, SillyTavern writes `left`, `top`, `width` and `height` inline on `#sheld`, and those beat the stage's rule. The stage does not fight them with `!important`, because the brief overrides only the side and the width, and the user placed the chat there themselves. SillyTavern's own MovingUI reset button (User Settings, title "Reset MovingUI panel sizes/locations.") clears those inline values, and the stage can then dock the chat. I did not try MovingUI with the stage on.
- **Visual novel mode keeps its own height.** `body.waifuMode` makes `#sheld` 40% of the window tall at the bottom. The stage changes only the side and the width, so in that mode the column is that short strip at the bottom right. Sprites are S3's.
- **No control for `stageChat` yet.** The width is 46% until S2 adds the "Chat width" range, the spine and the look key. Rule 3 in bible section 3 ("every look choice gets a setting") is met when lane S is done.
- **Extra checks in the test**, beyond the brief's ten steps:
  - the art's attachment and position;
  - no art under the centre of the chat column;
  - `#forge-stage` is in `body`, `aria-hidden`, takes no clicks, and a click on the stage lands on something else;
  - a second apply keeps one `#forge-stage` and the same column;
  - the Extensions drawer opens on top, in the same place as in the classic layout;
  - at 1040 by 700 the column still reaches the right edge;
  - crossing 1000px takes the stage off, and widening puts it back;
  - the main switch takes the stage off, and puts it back;
  - the Layout section, its select, its two options and the note are on the settings screen (both sizes). Choosing Stage there saves `layout` and turns the stage on, or leaves a phone classic. Choosing Classic takes it off.

## Asked of other files

None.

### Seen in the page, for later batches

- **RPG Companion (I1).** In the sandbox, `#rpg-companion-panel` is open with the classes `rpg-panel rpg-position-right`. It is `position: fixed`, 1080 to 1440 by 35 to 900 at 1440 by 900: the strip SillyTavern leaves right of a 50vw chat. In the classic layout it sits beside the chat. In the stage layout it covers the right 360px of the chat column (778 to 1440), and messages run under it. Nothing in this batch selects or moves it; making room for it is I1's (its brief, item 3).
- **Side panels.** SillyTavern's Characters panel (`rightNavHolder`) opens over the right part of the chat column in the stage layout; the AI response panel opens over the stage (see the table above). Pinned panels (`.fillLeft`, `.fillRight`) are sized from `--sheldWidth` as well. I did not check a pinned panel with the stage on. The menu panel (P1 to P3) moves these drawers and unpins the pins while it is on.

## Not done

Nothing.

## Check

**PASS.** Checked by a second agent that did not write the code, on `batch/S1-chat-column` at `2d4fe7e`, against the brief, bible sections 3 and 9, and the page itself. Nothing was fixed. The problems found are listed at the end; none of them fails the batch.

### (a) Files

`git diff --name-only overhaul...HEAD` lists `css/stage.css`, `docs/redesign/changes/S1-chat-column.md`, `docs/redesign/results/S1-chat-column.md`, `stage.js` and `tests/browser/stage-column.mjs`. Those are the five files under "You own". `index.js`, `style.css` and `css/tokens.css` are untouched. **Pass.**

### (b) Commands

The sandbox was down during the first attempt, so nothing loaded. After the lead restarted it, everything was run again, and that run is the one counted:

- `node tests/browser/stage-column.mjs`: 35 ok, 0 FAIL, exit 0.
- `node tests/browser/stage-column.mjs phone`: 10 ok, 0 FAIL, exit 0.
- `node tests/run.mjs`: foundation (18), foundation phone (15), harness (8), harness phone (8), stage-column (35), stage-column phone (10); "6 passed, 0 failed".

Each line matches the output the builder recorded above. **Pass.**

### (c) The diff, item by item

Brief, Build:

1. **Settings.** `defaults` is exactly `{ layout: 'classic', stageChat: 46 }`. `settingsHtml` returns one `<h4>Layout</h4>` section with one select labelled "Forge layout". It offers "Classic (SillyTavern's own)" and "Stage (art on the left, chat on the right)", in that order, with the note in the brief's exact words. The ids are `forge-ui-layout` and `forge-ui-layout-note`, both with the `forge-` prefix. The note uses `<small>`, the same markup as the existing note under Text. The test checks all of this at both sizes. **Pass.**
2. **`apply(s)`.** The layout is active when `s.enabled`, `s.layout === 'stage'` and `(min-width: 1001px)` all hold. That is the bible's desktop query, and `index.js` re-applies on the same one. When active, it adds `body.forge-stage`, sets `--forge-stage-chat` on `body` to the bible 5.1 clamp built from `stageChat`, and appends one `#forge-stage` with `aria-hidden="true"` to `body` if none is there. When not active, it removes all three. It keeps no element between calls. **Pass.**
3. **`css/stage.css`.**
   - `#sheld` sets only `left: auto; right: 0; width: var(--forge-stage-chat)`. In a full computed-style diff, the only `#sheld` properties that change are `left`, `width`, the margins and the origin properties that follow from those two. Its `top`, `height` and `max-height` do not change: at 1440 by 900 the column runs from 35px (the top bar's bottom) to 900px.
   - `#bg1` and `#bg_custom` get `width: calc(100% - var(--forge-stage-chat))`, `background-attachment: scroll` and `background-position: center`. The art box ends exactly where the column begins, at 1001, 1040, 1280, 1440 and 2560 wide.
   - Behind the column: `html` is transparent and `body` paints `rgb(18, 9, 8)`, which is what `--forge-bg` resolves to. `#bg1` is not in the hit stack under the column.
   - `#forge-stage` takes the art's box and `pointer-events: none`. With pointer events briefly turned on for the measurement, `elementsFromPoint` at five points on the stage gives `… > body > #forge-stage > #bg1 > html`. So it is drawn just above the art and below everything else, including `#expression-wrapper` and the top bar.

   **Pass.**
4. **Top bar.** With the stage on, every computed property of `#top-bar` and `#top-settings-holder` is unchanged. The only difference is the inherited `--forge-stage-chat`. **Pass.**

Brief, Leave alone: `--sheldWidth` stays `50vw` with the stage on. Turning the stage on and off posts no settings save. The phone layout is unchanged (see (d)). `index.js` and `style.css` are untouched. **Pass.**

Brief, Test: all ten steps are in `tests/browser/stage-column.mjs`, with the `// Usage: … [phone]` line, plus the extra checks the result file lists. Step 9 compares the four boxes for exact equality. **Pass.**

Brief, Done when:

- **The commands pass.** See (b). **Pass.**
- **A top-bar menu opens in the stage layout.** The test keeps the Extensions drawer comparison. I also opened AI response, Characters, Backgrounds and User Settings in both layouts at 1440 by 900. Each one opened and was on top at its own centre, with the same box in both layouts: 0,0,360,900; 1080,0,1440,900; 360,35,1080,621; 360,35,1080,866. These match the builder's table. The result file says what was seen. **Pass.**
- **Only owned files changed, and every selector in `css/stage.css` starts with `body.forge-ui.forge-stage`.** The file has four selectors, in three rules, and all four start that way. **Pass.**

Changelog line and commit message are word for word the brief's. **Pass.**

Bible section 3:

1. **Native controls underneath.** Nothing is rebuilt or copied. The page's own `#sheld` and `#bg1` are restyled. **Pass.**
2. **One switch back.** No element, class, inline style or SillyTavern setting is left behind. `apply` adds no listener; the only listener is the settings select's `change`, which lives in the settings screen. See (d). **Pass.**
3. **Every look choice gets a setting.** The layout has its select. `stageChat` exists as a setting with no control yet; the S1 brief asks for one select only, and the S2 brief (item 4) adds the "Chat width" range and the look key. Centring SillyTavern's "Classic" background fitting on the stage follows bible 5.1 ("the art is centred on the stage") and is disclosed. **Pass.**
4. **Phone counts.** The phone run passes, and the brief asks for no TauriTavern stand-in. **Pass.**
5. **One list of values.** There is no hex. Sizes come from `--forge-chat-min` and `--forge-stage-min`. One raw layer value remains, `z-index: -1` (problem 1 below). **Pass, with a note.**
6. **Stay in your lane.** See (a). **Pass.**
7. **Small and plain.** About 60 lines of JS and 3 CSS rules, with no new dependencies. **Pass.**

Bible section 9:

- **File ownership.** Only lane S's and this batch's files. **Pass.**
- **Feature contract.** The module exports `id`, `defaults`, `lookKeys`, `settingsHtml`, `bindSettings` and `apply`. `lookKeys` is `{}`; `stageChat` joins it in S2 (that brief, item 4). `apply` can be called any number of times: 30 applies in a row, alternating, leave one `#forge-stage`. It is the only place the layout is added or removed. The layout needs the main switch, its own setting and a desktop window. **Pass.**
- **Shared names.** The module uses only `body.forge-stage`, `--forge-stage-chat` on `body` and `#forge-stage`, and styles no other feature's elements. **Pass.**
- **Rules for the code.** Plain ES module with no classes. No `!important`, `transform`, `filter` or `contain` on `#sheld` or `#top-settings-holder`. No network, no `localStorage`, no `MutationObserver`, and no SillyTavern setting changed. No element is kept between calls, and new ids start with `forge-`. No chat text reaches the page. **Pass.**

### (d) Trying to break it

A scratch script, kept outside the repository and using the same test helper and Forge Tester chat, compared every computed property of `body`, `#sheld`, `#bg1`, `#top-bar`, `#top-settings-holder`, `#chat`, `#form_sheld`, `#send_form` and `#send_textarea`. It also compared `body`'s class set, `style` attribute, attributes and child list, plus `--sheldWidth`. Focus was cleared, and transitions allowed to settle, before each snapshot.

- **Layout Classic again** (after stage on, four drawers opened and closed, Classic): identical to the start in every compared property. **Pass.**
- **Main switch off while Stage is chosen:** identical to main switch off from Classic. **Pass.**
- **Reset with the stage on:** `layout` returns to `classic` and `stageChat` to 46. The stage is gone and the select shows Classic. **Pass.**
- **Window widths:** at 1001 by 700 the column is 480px and the stage 521px. At 1000 by 700 the stage is off and `#forge-stage` is gone. At 1280 by 720 and 2560 by 1440 the column is 46%, meets the art, and reaches the right edge. There is no sideways scroll at any width. **Pass.**
- **Odd `stageChat` values:** 10 gives 35%, 99 gives 70%, `'60'` gives 60%, `'abc'` and `undefined` give 46%. `null` and `''` give 35% (problem 2). **Pass.**
- **Phone (390 by 800, touch):** with Stage chosen, no compared property, class, attribute or child differs from Classic. Turned to 1100 by 390 and back, the page is again identical to Classic. **Pass.**
- **Saves:** the stage posts none. SillyTavern itself posts settings saves when a drawer is clicked or a phone-sized window is resized across 1000px. A control run with the layout left on Classic posted the same saves. **Pass.**
- **Screenshot** of the Forge Tester chat in the stage layout: the column is docked right under the top bar, and the art fills the stage on the left. RPG Companion's open panel covers the right part of the column, as the builder recorded.

### Problems found (none fails the batch)

1. **Raw layer value.** `css/stage.css` has `z-index: -1` on `#forge-stage`. Bible section 3, rule 5 says layers come from the tokens, and there is no token for "the art's layer". The value has to match SillyTavern's own `#bg1` layer, and the file's comment says so. The paint order was verified above. However, the builder should have asked for a token under "Asked of other files" (rule 6) and wrote "None" there. Suggestion for integration: add a token such as `--forge-z-stage: -1` to `css/tokens.css`. Does not fail the batch.
2. **`stageChat` of `null` or `''` gives 35, not 46.** `Number(null)` and `Number('')` are 0, which is then clamped up to 35. Neither value can be reached from the UI, and S2 adds the look-file check for `stageChat`. Nit.
3. **The layout check accepts inherited keys.** `bindSettings` tests `this.value in LAYOUTS`, which also accepts keys such as `toString`. The select only offers the two values, so this cannot be reached. `Object.hasOwn` would close it. Nit.
4. **MovingUI positions win.** If the user has dragged `#sheld` with MovingUI, SillyTavern's inline `left`, `top`, `width` and `height` beat the stage, and the column does not dock. This is disclosed and was not tested by either agent. It is an open risk for later batches, not a brief item.
5. **RPG Companion covers the column.** With its panel open at the right, it covers the right 360px of the column (seen in the screenshot). I1's brief, item 3, owns making room for it. Not this batch's.
6. **Wide touch screens get the stage.** A touch screen wider than 1000px, such as a tablet in landscape (tested at 1100 by 390), gets the stage. This follows the bible's own boundary (`(min-width: 1001px)` is desktop), so it is information, not a fault.
