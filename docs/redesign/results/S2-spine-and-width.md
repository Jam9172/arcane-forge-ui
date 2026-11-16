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

## Check

**PASS.** Checked by a second agent that did not write the code, on `batch/S2-spine-and-width` at `e999c74`, against the brief, bible sections 3, 5.1, 7, 9, 11 and 12, and the page itself. Nothing was fixed. `overhaul` has moved on since the batch was cut (merge base `1f070de`, `overhaul` now at `92b7649` with P1 merged), so the diff was taken with three dots as asked. The problems found are listed at the end; none of them fails the batch.

### (a) Files

`git diff --name-only overhaul...HEAD` lists `css/stage.css`, `docs/redesign/changes/S2-spine-and-width.md`, `docs/redesign/results/S2-spine-and-width.md`, `stage.js` and `tests/browser/stage-spine.mjs`. Those are exactly the five files under "You own". `index.js`, `style.css` and `css/tokens.css` are untouched, as is S1's `tests/browser/stage-column.mjs`. `git merge-tree` of this branch with the current `overhaul` merges with no conflict. **Pass.**

### (b) Commands

- `node tests/browser/stage-spine.mjs`: 52 ok, 0 FAIL, exit 0.
- `node tests/browser/stage-spine.mjs phone`: 12 ok, 0 FAIL, exit 0.
- `node tests/run.mjs stage`: stage-column (35), stage-column phone (10), stage-spine (52), stage-spine phone (12); "4 passed, 0 failed".
- `node tests/run.mjs`: foundation (18), foundation phone (15), harness (8), harness phone (8), stage-column (35), stage-column phone (10), stage-spine (52), stage-spine phone (12); "8 passed, 0 failed".

Every line and count matches the output the builder pasted above. As an extra, the tree this branch makes when merged with the current `overhaul` was extracted outside the repository and the whole suite run from it: "12 passed, 0 failed" (it adds menu-frame 49/5 and modes-bar 47/50). **Pass.**

### (c) The diff, item by item

Brief, Build:

1. **The spine.** `spineElement()` makes one `div#forge-spine` with `role="separator"`, `aria-orientation="vertical"`, `tabindex="0"`, `aria-label="Chat width"`, `aria-valuemin="35"`, `aria-valuemax="70"`, and `apply()` sets `aria-valuenow`. The `::before` line is 1px of `--forge-bar-line` (the test compares the resolved colour), and the grab area is 11px with `cursor: col-resize`. **Pass.**
2. **Dragging.** `pointerdown`, `pointermove`, `pointerup`, `pointercancel` and `lostpointercapture` are on the spine, with `setPointerCapture`. `forge-dragging` goes on `body` at the press and comes off at the release. The CSS turns off selection for `body` and everything in it while the class is there. `moveDrag` sets `--forge-stage-chat` live. `endDrag` rounds the value, keeps it within 35 to 70 (`chatShare`) and saves it. `endDrag` sets `drag` to null before anything else, so the `lostpointercapture` that follows a `pointerup` does nothing. **Pass.**
3. **Keys.** `SPINE_KEYS`: Left +1, Right -1, Home 70, End 35. A `dblclick` sets 46. Keys with Alt, Ctrl or Meta are left alone. **Pass.**
4. **Setting.** `settingsHtml` adds a `forge-ui-range` row "Chat width" with an `<output>` showing the percentage, `min="35" max="70" step="1"`, under the existing `<h4>Layout</h4>`. It is `disabled` unless the layout is Stage, and the layout select switches that at once. `lookKeys` is `{ stageChat: { type: 'number', min: 35, max: 70 } }`. **Pass** (see problem 3 for how faint "greyed out" is).
5. **Clamp.** The width is still the bible 5.1 `clamp(var(--forge-chat-min), Nvw, calc(100vw - var(--forge-stage-min)))`. The drag and the keys only change N. At 1040 by 700 the test drags to both ends: the stage stops at 320px and the column at 480px. At 1001 by 700 the column is 480px with the spine on its edge. **Pass.**
6. **Only while the stage is active.** `apply()` adds the spine only in the active branch and removes it in the other, with `forge-dragging` and the drag in progress. **Pass.**

Brief, Leave alone: `--sheldWidth` stays `50vw` and `power_user.chat_width` stays 50 throughout. The test checks this, and so did every snapshot in (d). **Pass.**

Brief, Test: all seven steps are in `tests/browser/stage-spine.mjs` with the tolerances the brief gives (2px, 3px, 2px). Step 1 reads "sits on `#sheld`'s left edge" as the spine's middle, and checks the line separately (within 1px). The brief says "Desktop only", but bible 12 asks every feature test to run at phone size. The builder followed the bible, added the `[phone]` Usage line and said so. That is correct: the bible wins. **Pass.**

Brief, Done when:

- **The commands pass.** See (b). **Pass.**
- **Only the files under "You own" changed.** See (a). **Pass.**

The changelog line is the brief's, word for word. The commit message is "Let the stage's chat edge be dragged". **Pass.**

Bible section 3:

1. **Native controls underneath.** Nothing native is copied or rebuilt. Chat width is Forge's own setting (bible 7). SillyTavern's Chat Width is not touched. **Pass.**
2. **One switch back.** The spine's listeners are all on the spine itself, so they leave with it. There is no listener on `document` or `window`. `apply()` removes the spine, `forge-dragging` and `--forge-stage-chat`. See (d) for the snapshots. **Pass.**
3. **Every look choice gets a setting.** The width is the setting. The line's colour comes from `--forge-bar-line`, which follows the colour settings. The grab sizes are invisible and come from bible 5.1 and 11. No hover look was added. **Pass.**
4. **Phone counts.** The phone run passes, and the brief asks for no TauriTavern stand-in. **Pass.**
5. **One list of values.** There is no hex. The colour and the 44px touch width come from tokens. Raw `z-index: 30`, `11px`, `1px`, `5px` and `6px` remain (problem 1). **Pass, with a note**, as S1's `z-index: -1` was.
6. **Stay in your lane.** See (a). The builder wrote what it needs from `css/tokens.css`, `index.js` and `style.css` under "Asked of other files" instead of editing them. **Pass.**
7. **Small and plain.** About 140 lines of JS and 4 CSS rules, with no dependency. **Pass.**

Bible section 9:

- **Ownership.** Only lane S's files and this batch's two docs. **Pass.**
- **Feature contract.** The module exports exactly `id`, `defaults`, `lookKeys`, `settingsHtml`, `bindSettings` and `apply`. `apply` is still the only place the spine is added or removed. A second apply keeps one spine (tested). Between calls the module keeps only `drag`, which holds numbers. The drag handler changes only the live width and the transient `forge-dragging` class, and `apply` takes both away. The spine saves through `SillyTavern.getContext()` and re-runs only stage's own `apply`, because it has no `save()` of its own. Nothing else reads `stageChat`, so this is acceptable. **Pass.**
- **Shared names.** The module uses `body.forge-stage`, `--forge-stage-chat`, `#forge-stage`, `#forge-spine`, and its own `forge-dragging`, which has the `forge-` prefix and is the brief's own name. **Pass.**
- **Rules for the code.**
  - Every selector starts with `body.forge-ui.forge-stage`, including `body.forge-ui.forge-stage.forge-dragging *` and the one inside `@media (pointer: coarse)`.
  - There is no `!important`, `transform`, `filter` or `contain` on `#sheld`.
  - There is no `innerHTML` with outside text: the percentage is a number, written with `textContent` or into the settings template.
  - No network, no `localStorage`, no `MutationObserver`. No SillyTavern setting changes. No element is held across calls. New ids start with `forge-`.

  **Pass.**

Bible 5.1, 7 and 11 for the spine: live drag, save on release, double-click 46, Left/Right 1%, Home/End limits, `Chat width` in Layout, a look-file key. Tab reaches the spine, and it then shows the existing ember ring (`solid 2px rgb(232, 98, 44)`, offset 2px, from `style.css`'s `[tabindex]:not([tabindex^="-"]):focus-visible` rule). On a touch screen the grab area is 44px. **Pass.**

### Choices in the result file, judged against the bible

- **The spine in `body` beside `#sheld`:** allowed. Bible 9 names `#forge-spine` as an element we add and does not fix where it goes. Measured: as tall as the column (35 to 900px) and centred on its edge at 1001, 1040 and 1440 wide. It puts nothing on `#sheld`.
- **The grab area centred on the line:** fine, and it meets the brief's 2px. Its 6px over the column cover the left 3px of the options button. The result file does not say so (problem 2).
- **`z-index: 30`:** a raw layer (problem 1). The builder asked integration for a token this time. Verified as safe:
  - top-bar drawers that cross the spine are drawn over it (Backgrounds, User Settings and Connection, at 1440 by 900);
  - on the merged tree, the P1 menu panel's backdrop and frame cover it at every height, and a drag where it lies underneath changes nothing;
  - the open options menu (`#options`) is drawn over it.
- **44px under `(pointer: coarse)`:** agrees with bible 11. Verified at 1280 by 800 with touch: 44px wide, line on the column's first pixel, `touch-action: none`, and a tap changes nothing.
- **Cancelling `pointerdown` and `-webkit-user-drag: none` while dragging:** scoped to the drag. A side effect: a mouse press on the spine sends no `mousedown`, so it does not close an open drawer. The builder disclosed this, and it is acceptable.
- **The spine's keys stop at the spine:** needed, because SillyTavern swipes on Left and Right. The test proves no key reaches `document`. Up, Down, PageUp and PageDown do nothing (tried).
- **`aria-valuenow` is the setting:** fine. With a fractional value it disagrees with the width shown (problem 4).
- **The native `disabled` attribute for "greyed out":** meets bible 7 for the control only (problem 3).
- **S1's two nits fixed in passing** (`parseFloat`, `Object.hasOwn`): both are inside owned files and correct.
- **Phone run despite "Desktop only":** correct, the bible wins.

### (d) Trying to break it

Scratch scripts outside the repository used this worktree's own test helper and only the Forge Tester chat. They compared `body`'s classes, `style` attribute, attributes and children; every `forge-` id in the page; `#sheld`'s box, `style` attribute and computed `left`, `right`, `width`, `top`, `height`, `z-index` and `position`; `--forge-stage-chat`; `--sheldWidth`; and SillyTavern's own Chat Width.

- **Classic again after a drag, the keys and a double-click:** identical to the start. **Pass.**
- **Main switch off with Stage chosen:** identical to main switch off from Classic. **Pass.**
- **Main switch off in the middle of a drag**, then the mouse moved on and let go: identical to main switch off from Classic. No save was posted and the width was kept. **Pass.**
- **Window to 900px in the middle of a drag**, then let go: no spine, no `forge-dragging`, no `forge-stage`, no `--forge-stage-chat`, and the width was kept. **Pass.**
- **`apply()` run again in the middle of a drag:** the column snaps back to the setting for a moment, then the drag carries on and saves where it ended (864px, 60). **Pass.**
- **A plain click on the spine:** no save, no change. **Pass.**
- **Phone (390 by 800, touch):** with Stage chosen and Chat width 60, the page is identical to Classic. The Chat width row fits the screen with no sideways scroll, and it is the same size as the Text size range. **Pass.**
- **End of the long desktop run:** one difference from the start. RPG Companion moved its own elements (`#rpg-mobile-toggle`, `#rpg-thought-icon`) to the end of `body`. A control run with the layout left on Classic shows that RPG Companion does this whenever the window crosses 1000px. It is not ours.
- **Screenshots**, cropped to the settings rows and to a strip at the spine (no chat text in them): the line is on the column's edge, the ember ring shows on keyboard focus, and the disabled range is only slightly darker than the usable one.

### Problems found (none fails the batch)

1. **Raw values in `css/stage.css`.** `z-index: 30`, `width: 11px`, the line's `1px`, and the `5px` and `6px` offsets. Bible 3 rule 5 asks for tokens. 11px and 1px are bible 5.1's own measurements, and 30 is SillyTavern's `#sheld` layer, each with a comment. The builder asked for `--forge-z-chat` but not for the spine's sizes. Suggestion for integration: a token such as `--forge-spine-grab: 11px` beside `--forge-z-chat: 30`. Same standing as S1's `-1`.
2. **The spine covers the left 3px of the message box's options button.** At 1440 by 900 the button starts at 780.6px and the spine ends at 783.6px. `elementFromPoint` 1px inside the button gives `forge-spine`. The same holds on a wide touch screen (694.2 against 697.2). A press there does nothing instead of opening the menu. The result file says the spine does not reach the chat's text, but does not mention this. Minor.
3. **"Greyed out" is faint.** Only the slider is dimmed, by SillyTavern's `input:disabled` (`brightness(0.5)`, `cursor: not-allowed`). The label and the percentage keep full text colour. The builder could not style the row from `css/stage.css` while the layout is Classic, and asked I3 for a label rule. That request should be kept.
4. **A fractional Chat width is shown rounded but drawn exact.** A look file can bring `stageChat: 55.5`, because foundation's validator clamps but does not round. The column is then 55.5% wide, while `aria-valuenow` and the range say 56. `apply()` could round. Nit.
5. **The spine is the last stop in Tab order** (119th of 119, after RPG Companion's thoughts button), because it is appended to the end of `body`. It is reachable, and the bible sets no order. Note.
6. **Not tried by either agent:** a real finger or pen drag, TauriTavern itself, MovingUI positions on `#sheld`, and visual novel mode. The builder disclosed all four.
