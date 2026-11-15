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
