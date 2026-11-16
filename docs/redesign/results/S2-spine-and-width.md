# S2-spine-and-width

## Built

- `stage.js`:
  - `lookKeys = { stageChat: { type: 'number', min: 35, max: 70 } }`.
  - **The Layout section** gains the range "Chat width" (`#forge-ui-stage-chat`, 35 to 70, step 1). It shows its value as a percentage in an `<output>` beside the label, in the same markup as the screen's other ranges. It is `disabled` while the layout is Classic. Choosing a layout in the select switches that at once. Moving the range saves `stageChat` through `save()`.
  - **`apply(s)`**, when the stage is active, also appends one `#forge-spine` to `body` and sets its `aria-valuenow` to the setting. When the stage is not active, it removes the spine, takes `forge-dragging` off `body`, and forgets any drag in progress.
  - **`#forge-spine`** is a `div` with `role="separator"`, `aria-orientation="vertical"`, `tabindex="0"`, `aria-label="Chat width"`, `aria-valuemin="35"`, `aria-valuemax="70"` and `aria-valuenow`.
  - **Dragging** uses pointer events and `setPointerCapture`. While dragging, `body` has `forge-dragging` and `--forge-stage-chat` follows the pointer live. `pointerup` rounds the width to a whole percent within 35 to 70 and saves it. A `pointercancel`, or a lost capture with no `pointerup`, puts the saved width back. A press with no movement saves nothing.
  - **Keys:** Left +1, Right -1, Home 70, End 35. A double-click gives 46. Every change from the spine is saved and moves the settings range and its percentage too.
- `css/stage.css`: four new rules, each starting `body.forge-ui.forge-stage`:
  - **The spine:** 11px wide, from the top bar to the bottom of the window, centred on the column's left edge. It has `cursor: col-resize` and `touch-action: none`, and it shares the column's layer.
  - **The line:** a 1px `--forge-bar-line` line (`::before`) on the column's first pixel.
  - **Touch screens:** under `(pointer: coarse)` the grab area is `--forge-control` (44px) wide.
  - **While dragging:** `body.forge-dragging` and everything in it get no text selection, no picture dragging and the resize pointer.
- `tests/browser/stage-spine.mjs`: the brief's seven steps plus the checks listed under "Choices", at desktop and phone size.
- `docs/redesign/changes/S2-spine-and-width.md`: the brief's changelog line.

## Test output

```
$ node tests/browser/stage-spine.mjs
ok   classic: no spine
ok   the spine is a focusable vertical separator labelled Chat width, 35 to 70, now 46 ({"role":"separator","aria-orientation":"vertical","tabindex":"0","aria-label":"Chat width","aria-valuemin":"35","aria-valuemax":"70","aria-valuenow":"46"})
ok   the spine sits on the chat column's left edge (spine 773 to 784px, column starts 778px)
ok   its 1px line is the column's left edge (line at 777.6px, 1px)
ok   the line is --forge-bar-line (color(srgb 0.85098 0.639216 0.356863 / 0.45), bar line color(srgb 0.85098 0.639216 0.356863 / 0.45))
ok   the grab area is 11px wide (11px)
ok   the spine is as tall as the chat column (spine 35 to 900px, column 35 to 900px)
ok   the spine is on top where it is grabbed, with the resize pointer (forge-spine, col-resize)
ok   the spine does not reach the chat's text (spine ends 783.6px, text starts 858.609375px)
ok   applying the layout again keeps one spine
ok   while dragging, the chat follows the pointer (862.4px, from 662px)
ok   while dragging, body has forge-dragging and no text can be selected (true, none)
ok   after the drag the chat is about 200px wider (864px, from 662px)
ok   the saved Chat width is that width as a whole percent of the window (60, 60.00%)
ok   aria-valuenow follows (60)
ok   letting go takes forge-dragging off body
ok   the drag is saved with the settings (2 saves before, 3 after)
ok   dragged far to the left, the stage stops at 320px (stage 320px, Chat width 70)
ok   and the setting stops at 70 (70)
ok   dragged far to the right, the setting stops at 35 (35)
ok   and the chat is never under 480px (480px, right edge 1040px)
ok   a drag across the chat selects no text
ok   ArrowLeft on the spine: Chat width 47, aria-valuenow follows (47, aria 47)
ok   ArrowLeft on the spine: the chat is 47% wide (677px, 47% is 676.8px)
ok   ArrowRight on the spine: Chat width 46, aria-valuenow follows (46, aria 46)
ok   ArrowRight on the spine: the chat is 46% wide (662px, 46% is 662.4px)
ok   Home on the spine: Chat width 70, aria-valuenow follows (70, aria 70)
ok   Home on the spine: the chat is 70% wide (1008px, 70% is 1008.0px)
ok   End on the spine: Chat width 35, aria-valuenow follows (35, aria 35)
ok   End on the spine: the chat is 35% wide (504px, 35% is 504.0px)
ok   the spine's keys do not reach a key listener on document (none reached it)
ok   the keys did not swipe the last message ({"length":32,"swipe":0} then {"length":32,"swipe":0}, 0 model calls)
ok   a double-click resets Chat width to 46 (46, aria 46)
ok   and the chat is 46% wide again (662px)
ok   turning the layout off during a drag leaves no spine and no forge-dragging
ok   and keeps the saved width (46)
ok   at 900px wide there is no spine
ok   at 1440px wide again the spine is back
ok   main switch off: no spine
ok   main switch on again: the spine is back
ok   stageChat is a look key, a number from 35 to 70 ({"stageChat":{"type":"number","min":35,"max":70}})
ok   the Layout section has the range "Chat width", 35 to 70, shown as a percentage ({"label":"Chat width","shown":"46%","min":"35","max":"70","step":"1","value":"46","disabled":true,"section":"Layout"})
ok   it is greyed out while the layout is Classic
ok   choosing Stage makes it usable
ok   setting it to 60 saves Chat width 60 and shows 60% (60, 60%)
ok   #sheld is 60% of the window (864px, 60% is 864.0px)
ok   the spine says 60 (60)
ok   moving the spine moves the range with it (35, 35%)
ok   layout back to Classic: no #forge-spine, no forge-dragging
ok   the range is greyed out again
ok   SillyTavern's own chat width is untouched ({"sheldWidth":"50vw","chatWidth":50} then {"sheldWidth":"50vw","chatWidth":50})
ok   no script errors

$ node tests/browser/stage-spine.mjs phone
ok   classic: no spine
ok   a phone with layout Stage has no spine
ok   stageChat is a look key, a number from 35 to 70 ({"stageChat":{"type":"number","min":35,"max":70}})
ok   the Layout section has the range "Chat width", 35 to 70, shown as a percentage ({"label":"Chat width","shown":"46%","min":"35","max":"70","step":"1","value":"46","disabled":true,"section":"Layout"})
ok   it is greyed out while the layout is Classic
ok   choosing Stage makes it usable
ok   setting it to 60 saves Chat width 60 and shows 60% (60, 60%)
ok   on a phone it changes nothing on the page
ok   layout back to Classic: no #forge-spine, no forge-dragging
ok   the range is greyed out again
ok   SillyTavern's own chat width is untouched ({"sheldWidth":"50vw","chatWidth":50} then {"sheldWidth":"50vw","chatWidth":50})
ok   no script errors

$ node tests/run.mjs stage
ok       stage-column  35 checks, 18s
ok       stage-column phone  10 checks, 13s
ok       stage-spine  52 checks, 21s
ok       stage-spine phone  12 checks, 14s

4 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 13s
ok       foundation phone  15 checks, 13s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       stage-column  35 checks, 18s
ok       stage-column phone  10 checks, 13s
ok       stage-spine  52 checks, 21s
ok       stage-spine phone  12 checks, 14s

8 passed, 0 failed
```

### Tried outside the test

A scratch script outside the repository, using the same test helper and the Forge Tester chat, tried these:

- **Import look:** `stageChat: 999` becomes 70, through the foundation's validator, which clamps numbers (see "Asked of other files"). A string is ignored. `55` sets 55, moves the spine and the range, and makes the column 55% wide.
- **Reset** with the stage on: the layout goes back to Classic and Chat width to 46. The spine is gone and the range is greyed out.
- **A cancelled drag:** a `pointercancel` in the middle of a mouse drag puts the saved width back (870px live, then 720px, which is 50%).
- **The right mouse button** dragged across the spine changes nothing.
- **A touch screen wide enough for the stage** (1280 by 800, touch emulation, `(pointer: coarse)` true):
  - the grab area is 44px wide and its right edge is still 6px into the column;
  - a 200px mouse drag widens the chat by 200px.
- **The settings screen** in screenshots: the disabled range is dimmed by SillyTavern's own `input:disabled` rule (`filter: brightness(0.5)`, `cursor: not-allowed`). The enabled range has SillyTavern's normal `brightness(0.75)`.
- **A screenshot of the stage with the spine focused by keyboard:** the existing ember ring is drawn around the spine.

## Choices the bible did not cover

- **The spine sits in `body` beside `#sheld`, not inside it.** Inside `#sheld` would not work, for three reasons:
  - `#sheld` has `overflow-x: hidden`, so a grab area there would be clipped at the column's edge and would have to lie wholly inside the column;
  - the message box's options button starts 3px into the column, so a grab area inside it would cover the button's left 8px;
  - the focus ring would be clipped.

  The spine instead shares `#sheld`'s containing block (both are `position: absolute` in `body`) and uses `top: var(--topBarBlockSize); bottom: 0`. That gives it the column's top and bottom, so it follows the top bar, including when P2 sets `--topBarBlockSize` to 0. It uses `right: calc(var(--forge-stage-chat) - 6px)`, so it follows the column's width.
- **The grab area is centred on the line**, which is the usual splitter shape: 5px over the stage, the 1px line on the column's first pixel, then 5px over the column. The brief's "sits on `#sheld`'s left edge (2px)" is read as the spine's middle (and its line) being on that edge. The test checks both. The spine's own box starts 5px left of the column.
- **Layer: `z-index: 30`,** SillyTavern's own value for `#sheld`. The spine comes after `#sheld` in the page, so it is drawn just above the column and below everything else that is drawn over the chat. That includes the top bar's drawers, RPG Companion's panel (1000) and the menu panel's backdrop (`--forge-z-backdrop`, 3003). This is the same kind of raw value as S1's `-1` (see "Asked of other files").
- **Raw sizes in the spine rules:** 11px and 1px come from bible 5.1. The 5px and 6px offsets follow from them and are commented. No token covers them.
- **Touch screens get a 44px grab area.** Bible 11 asks for touch targets of at least 44px on touch screens, and a touch screen wider than 1000px (a tablet on its side) gets the stage. Under `(pointer: coarse)` the spine is `--forge-control` wide (44px there). The extra width lies over the stage, where there is nothing to tap, so the column's own controls are not covered.
- **A drag moves the edge by as much as the pointer moves, starting from the width on screen.** Grabbing a few pixels off the line does not make the edge jump. At a window so small that the clamp holds, the drag starts from what is shown, so there is no dead zone. The saved value becomes what the drag ended on. A press with no movement saves nothing, so a click, or the first half of a double-click, never changes the setting.
- **A WebKit image drag had to be stopped, in two ways.** In the first runs a leftward drag stopped after one move. Once the chat had widened under the press point, WebKit took the message avatar now at that point for the thing being dragged. It started a native drag of the picture (`dragstart` on an `IMG`), and no pointer events came after that. Two fixes, each of which cures it on its own in WebKit:
  - `startDrag` calls `preventDefault()` on `pointerdown`, so the browser has no mouse press to act on;
  - while `forge-dragging` is on, `-webkit-user-drag: none` covers every element. This guards Chromium-based webviews (TauriTavern on Windows and Android) in case they treat a cancelled `pointerdown` differently.

  A side effect in WebKit: a mouse press on the spine sends no `mousedown`. So it leaves the focus where it was (typing goes on in the message box), and it does not trigger SillyTavern's "close open drawers" `mousedown` handler. A finger's `touchstart` still does.
- **The spine's keys stop at the spine.** SillyTavern's key listener on `document` swipes the last message on Left and Right whenever no text box has the focus. So the spine stops the propagation of the four keys it handles, and calls `preventDefault`. The test proves this with a key listener on `document` that must hear none of them; I confirmed that this check fails when `stopPropagation` is taken out. The other check, "the keys did not swipe the last message", passes either way in this chat. Keys with Alt, Ctrl or Meta are left alone for the browser and SillyTavern.
- **While dragging, every element shows the resize pointer** (`cursor: col-resize` with the no-selection rule), so the pointer does not flicker as it crosses the chat.
- **The spine saves through `SillyTavern.getContext()`.** It reads `extensionSettings.arcaneForgeUi` and calls `saveSettingsDebounced()`, because it lives outside the settings screen and has no `save()` from `index.js`. It looks the settings up on every change, as Reset puts a new object in their place. It then runs only the stage's own `apply`, since nothing else depends on `stageChat`, and updates the range and its percentage if the settings screen is open. The key `arcaneForgeUi` is repeated from `index.js`'s `MODULE`, with a comment.
- **`aria-valuenow` is the setting** (a whole percent), not the share on screen when the clamp holds. During a drag it follows the dragged share live.
- **Greyed out is the native `disabled` attribute.** SillyTavern's own `input:disabled` rule dims the slider and shows a not-allowed pointer. The label is not dimmed: `css/stage.css` may only style `body.forge-ui.forge-stage …`, which does not exist while the layout is Classic. The select's change handler updates `disabled`. As with every other setting on the screen, a change made in code (a test's `setForge`) does not redraw the screen. Import look and Reset redraw it.
- **Two nits from S1's check, fixed in passing** because the code was being rewritten:
  - `stageChat` is read with `Number.parseFloat`, so `null` and `''` now give 46 instead of 35 (S1 problem 2);
  - the layout select checks `Object.hasOwn(LAYOUTS, …)`, so a value such as `toString` is refused (S1 problem 3). SillyTavern itself uses `Object.hasOwn`, so the webviews have it.
- **The test also runs at phone size.** The brief says "Desktop only", but bible 12 says every feature test proves its phone behaviour with a `[phone]` Usage line, and the bible wins. At phone size it checks that there is no spine with layout Stage, and that the Chat width range works on the settings screen but changes nothing on the page.
- **Extra checks in the test**, beyond the brief's steps:
  - the line's position, width and colour;
  - the spine is on top where it is grabbed, with the resize pointer;
  - the spine does not reach the chat's text;
  - a second apply keeps one spine;
  - the drag follows the pointer live and sets `forge-dragging` and no-selection while dragging;
  - a settings save is posted after a drag;
  - a drag across the chat leaves no text selected (only the selection's type is read, never its text);
  - the chat is the right width after each key;
  - the keys never reach `document`;
  - turning the layout off in the middle of a drag leaves no spine and no class, and saves nothing;
  - no spine below 1000px or with the main switch off;
  - `stageChat` is a look key;
  - the range's section, label, limits, percentage and greyed-out state;
  - the range follows the spine;
  - SillyTavern's `--sheldWidth` and its own Chat Width setting are unchanged.
- **Nothing changes on hover** and the spine has no tooltip. The bible gives it neither, and a new hover look would need its own setting.

## Asked of other files

- **`css/tokens.css` (integration):** a layer token for the spine. Its `z-index: 30` is SillyTavern's own value for `#sheld`, just as S1's `#forge-stage` uses `#bg1`'s `-1`. Suggested: `--forge-z-chat: 30` beside S1's suggested `--forge-z-stage: -1`, then use both in `css/stage.css`.
- **`index.js` (I3):** Import look clamps a feature's number into range (foundation's `validLookValue`). So a look file with `stageChat: 999` sets 70; I checked this. I3's test, step 5, expects a file with `stageChat: 999` (along with other bad values) to change nothing. I3 should either make out-of-range feature numbers be ignored, or change that test step. This batch only declares the look key.
- **`style.css` (I3, settings-screen rules):** if a greyed-out setting should also dim its label, a settings-screen rule such as `.arcane-forge-ui-settings label:has(input:disabled)` can do it. I3's brief also asks for a `title` on disabled controls, saying which setting they need ("Forge layout: Stage" here).

## Not done

Nothing from the brief. Not tried:

- **A real finger or pen drag was not tried.** Playwright's WebKit can tap but cannot move a touch or a pen. What was tried is a mouse drag in a touch-emulated window 1280px wide. The code path is the same pointer events and capture for all three.
- **TauriTavern, SillyTavern's MovingUI and visual novel mode (`body.waifuMode`) were not tried.** If MovingUI has put inline `left` and `width` on `#sheld` (S1's note), the column does not dock and the spine does not follow it. In visual novel mode the spine still runs from the top bar to the bottom, whatever height `#sheld` has there. Visual novel mode with the stage is I1's (its brief, item 5).
