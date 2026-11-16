# S3-stage-content

## Built

- `stage.js`:
  - `defaults` gains `stagePlate: true`, `stageSprite: true`, `stageShade: 0`. `lookKeys` gains `stagePlate` and `stageSprite` (`boolean`) and `stageShade` (`number`, 0 to 60).
  - **The Layout section** gains, after Chat width: the checkboxes "Name on the stage" (`#forge-ui-stage-plate`) and "Character sprite on the stage, when it has one" (`#forge-ui-stage-sprite`), and the range "Darken the stage art" (`#forge-ui-stage-shade`, 0 to 60, step 1, shown as a percentage in an `<output>`). All three are `disabled` while the layout is Classic, like Chat width, and the layout select switches all four at once. Each saves its key through `save()`.
  - **`apply(s)`**, while the stage is active:
    - keeps a `div.forge-stage-shade` as the first child of `#forge-stage` while Darken is above 0, with `--forge-stage-shade: N%` set on it. At 0 there is no shade.
    - keeps a `div.forge-stage-plate` in `#forge-stage` while Name on the stage is on, and sets its text. With the setting off there is no plate.
    - puts `forge-stage-sprite` on `body` while the sprite setting is on. `css/stage.css` does the placing.
    - listens to SillyTavern's `CHAT_CHANGED` with one function while the plate is on, and removes it when the plate is off, the layout is Classic, the window is 1000px or less, or the main switch is off.
  - **`setPlateText(text)`** is exported, as the brief asks. It sets the plate's `textContent`. An empty name hides the plate (`hidden`). It does nothing while there is no plate.
  - **The plate's name** comes from `SillyTavern.getContext()`: nothing when `chatId` is empty (no chat open), the group's `name` when `groupId` is set, otherwise `characters[characterId].name`.
- `css/stage.css`:
  - `#forge-stage` keeps its box but no longer has a layer of its own (no `z-index`), so the shade and the plate inside it can each sit at their own height.
  - **The shade:** covers `#forge-stage`, `background: rgb(0 0 0 / var(--forge-stage-shade))`, `z-index: -1`. It comes after `#bg1` in the page, so it darkens the art and nothing drawn over it.
  - **The plate:** `--forge-space-5` from the stage's left and bottom edges. It uses the heading font at 28px, weight 700, `--forge-brass` on `--forge-card`, a 1px `--forge-border` line, `--forge-radius-md` corners and 10px 16px padding. It is never wider than the stage less its margins, and a long name wraps. `z-index: 3`, one above the sprite.
  - **The sprite** (`body.forge-ui.forge-stage.forge-stage-sprite #expression-holder`): the bottom is at the bottom of the window and the middle at the stage's middle (`left` at half the stage, `translateX(-50%)`). It is never taller than 92% of the stage, never wider than the stage, and the picture inside is scaled down to fit (`img.expression`). There are seven `!important`s, one each for the inline `top`, `right`, `bottom`, `left`, `margin`, `width` and `height` that SillyTavern's MovingUI writes on the holder. Each has a comment naming the inline property it beats.
  - **The options button** (`body.forge-ui.forge-stage #leftSendForm`): `padding-left: var(--forge-space-2)` in place of SillyTavern's 2px. See "Choices".
- `tests/browser/stage-content.mjs`: the brief's six steps, the options-button check, and the checks listed under "Choices", at desktop and phone size.
- `docs/redesign/changes/S3-stage-content.md`: the brief's changelog line.

## Test output

```
$ node tests/browser/stage-content.mjs
ok   classic: none of the stage content in the page
     (the sprite is Character Expressions' own, given a picture)
ok   classic: the sprite is at its inline position ({"left":40,"top":60,"right":340,"bottom":560,"width":300,"height":500})
ok   the plate says Forge Tester (Forge Tester)
ok   it lies inside #forge-stage ({"left":24,"top":820.40625,"right":256.265625,"bottom":876,"width":232.265625,"height":55.59375})
ok   it is 24px in from the stage's left and bottom edges (24.0px, 24.0px)
ok   its font is the heading font (Cinzel, Times New Roman, serif)
ok   it is 28px, bold, brass on a card plate (28px, 700, rgb(217, 163, 91), rgb(30, 16, 13))
ok   with a 1px border line, 10px corners and 10px 16px padding (1px solid color(srgb 0.283231 0.104753 0.071576), 10px, 10px 16px 10px 16px)
ok   one chat-changed listener of ours (29 then 30)
ok   the plate function shows a name with markup in it as that text (<img src=x onerror=alert(1)><b>Mira</b>)
ok   and the plate holds no element (0 elements, 0 dialogs)
ok   on chat-changed the plate shows the open chat again (Forge Tester)
ok   in a group chat it shows the group's name (Test Group)
ok   with no chat open the plate is hidden
ok   and it comes back with the chat
ok   stagePlate false: no plate on screen (null)
ok   and no chat-changed listener of ours (29 then 29)
ok   stagePlate true again: the plate is back
ok   stageShade 40: the shade layer is black at 0.4 (rgba(0, 0, 0, 0.4))
ok   it covers the stage ({"left":0,"top":0,"right":777.59375,"bottom":900,"width":777.59375,"height":900})
ok   stageShade 0: no shade is drawn
ok   stageSprite true: the sprite lies inside the stage ({"left":181.796875,"top":72,"right":595.796875,"bottom":900,"width":414,"height":828} in {"left":0,"top":0,"right":777.59375,"bottom":900,"width":777.59375,"height":900})
ok   its bottom is the stage's bottom (900px, 900px, stage 900px)
ok   it is centred on the stage (388.8px, stage 388.8px)
ok   a tall picture is scaled to 92% of the stage's height, not cut off (414.0 by 828.0px, 92% is 828.0px)
ok   it does not overlap #sheld (sprite ends 595.8px, column starts 777.6px)
ok   the plate is drawn over the sprite (forge-stage-plate)
ok   the sprite is drawn over the shade, and the shade over the art (expression-image > expression-holder > expression-wrapper > body > forge-stage-shade > bg1)
ok   a wide picture stays inside the stage and off the chat column ({"left":-0.203125,"top":770.40625,"right":777.390625,"bottom":900,"width":777.59375,"height":129.59375})
ok   at 1040 by 700 it stays inside the stage and off the chat column ({"left":0,"top":600,"right":560,"bottom":700,"width":560,"height":100} in {"left":0,"top":0,"right":560,"bottom":700,"width":560,"height":700})
ok   stageSprite false: its inline position counts again ({"left":40,"top":60,"right":340,"bottom":560,"width":300,"height":500})
ok   and the sprite is exactly as SillyTavern has it with the layout Classic ({"display":"flex","visibility":"visible","position":"absolute","top":"60px","right":"1100px","bottom":"340px","left":"40px","width":"300px","height":"500px","max-width":"810px","max-height":"810px","margin":"0px","transform":"none"})
ok   stageSprite true again: back on the stage
ok   the spine stops short of the options button (spine ends 783.6px, button starts 786.6px)
ok   the options button's left edge takes presses (options_button, options_button, options_button, options_button, options_button)
ok   a click 1px inside its left edge opens the options menu
ok   at 900px wide there is no plate, shade or placed sprite
ok   and the sprite is as SillyTavern has it with the layout Classic ({"display":"flex","visibility":"hidden","position":"absolute","top":"60px","right":"1100px","bottom":"340px","left":"40px","width":"300px","height":"500px","max-width":"630px","max-height":"630px","margin":"0px","transform":"none"} then {"display":"flex","visibility":"hidden","position":"absolute","top":"60px","right":"1100px","bottom":"340px","left":"40px","width":"300px","height":"500px","max-width":"630px","max-height":"630px","margin":"0px","transform":"none"})
ok   at 1440px wide again they are back (#forge-stage, .forge-stage-plate, .forge-stage-shade, body.forge-stage-sprite)
ok   main switch off: none of the stage content in the page
ok   and the sprite is as SillyTavern has it with the layout Classic, with no listener of ours ({"display":"flex","visibility":"visible","position":"absolute","top":"60px","right":"1100px","bottom":"340px","left":"40px","width":"300px","height":"500px","max-width":"810px","max-height":"810px","margin":"0px","transform":"none"})
ok   layout back to Classic: no plate, no shade, no placed sprite
ok   the sprite is back at its inline position ({"left":40,"top":60,"right":340,"bottom":560,"width":300,"height":500})
ok   no chat-changed listener of ours is left (29 then 29)
ok   Character Expressions' sprite has its own style and picture back ({"wrapper":true,"holder":"display:none;","src":""} then {"wrapper":true,"holder":"display:none;","src":""})
ok   stagePlate, stageSprite and stageShade are look keys ({"stageChat":{"type":"number","min":35,"max":70},"stagePlate":{"type":"boolean"},"stageSprite":{"type":"boolean"},"stageShade":{"type":"number","min":0,"max":60}})
ok   by default the plate and the sprite are on and the art is not darkened ({"layout":"classic","stageChat":46,"stagePlate":true,"stageSprite":true,"stageShade":0})
ok   Layout has "Name on the stage", ticked ({"label":"Name on the stage","disabled":true,"checked":true})
ok   and "Character sprite on the stage, when it has one", ticked ({"label":"Character sprite on the stage, when it has one","disabled":true,"checked":true})
ok   and the range "Darken the stage art", 0 to 60, shown as a percentage ({"label":"Darken the stage art","disabled":true,"range":"0 to 60, 0%"})
ok   all three come after Chat width, under Layout (true, Layout)
ok   all three are greyed out while the layout is Classic
ok   choosing Stage makes all three usable
ok   unticking Name on the stage saves stagePlate false
ok   and takes the plate away
ok   ticking it again saves stagePlate true
ok   unticking the sprite saves stageSprite false
ok   and the sprite is no longer placed
ok   setting Darken to 30 saves stageShade 30 and shows 30% (30, 0 to 60, 30%)
ok   and the shade is black at 0.3 (rgba(0, 0, 0, 0.3))
ok   layout back to Classic: all three are greyed out again
ok   and none of the stage content is in the page
ok   no chat-changed listener of ours is left (29 then 29)
ok   no script errors

$ node tests/browser/stage-content.mjs phone
ok   classic: none of the stage content in the page
     (the sprite is Character Expressions' own, given a picture)
ok   a phone with layout Stage has no plate, shade or placed sprite
ok   and the sprite is as SillyTavern has it with the layout Classic ({"display":"flex","visibility":"hidden","position":"absolute","top":"60px","right":"1100px","bottom":"340px","left":"40px","width":"300px","height":"500px","max-width":"720px","max-height":"720px","margin":"0px","transform":"none"})
ok   and no chat-changed listener of ours (29 then 29)
ok   Character Expressions' sprite has its own style and picture back ({"wrapper":true,"holder":"display:none;","src":""} then {"wrapper":true,"holder":"display:none;","src":""})
ok   stagePlate, stageSprite and stageShade are look keys ({"stageChat":{"type":"number","min":35,"max":70},"stagePlate":{"type":"boolean"},"stageSprite":{"type":"boolean"},"stageShade":{"type":"number","min":0,"max":60}})
ok   by default the plate and the sprite are on and the art is not darkened ({"layout":"classic","stageChat":46,"stagePlate":true,"stageSprite":true,"stageShade":0})
ok   Layout has "Name on the stage", ticked ({"label":"Name on the stage","disabled":true,"checked":true})
ok   and "Character sprite on the stage, when it has one", ticked ({"label":"Character sprite on the stage, when it has one","disabled":true,"checked":true})
ok   and the range "Darken the stage art", 0 to 60, shown as a percentage ({"label":"Darken the stage art","disabled":true,"range":"0 to 60, 0%"})
ok   all three come after Chat width, under Layout (true, Layout)
ok   all three are greyed out while the layout is Classic
ok   choosing Stage makes all three usable
ok   unticking Name on the stage saves stagePlate false
ok   ticking it again saves stagePlate true
ok   unticking the sprite saves stageSprite false
ok   setting Darken to 30 saves stageShade 30 and shows 30% (30, 0 to 60, 30%)
ok   on a phone they change nothing on the page
ok   layout back to Classic: all three are greyed out again
ok   and none of the stage content is in the page
ok   no chat-changed listener of ours is left (29 then 29)
ok   no script errors

$ node tests/run.mjs stage
ok       stage-column  35 checks, 20s
ok       stage-column phone  10 checks, 14s
ok       stage-content  64 checks, 25s
ok       stage-content phone  22 checks, 17s
ok       stage-spine  52 checks, 23s
ok       stage-spine phone  12 checks, 15s

6 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 13s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       menu-frame  49 checks, 26s
ok       menu-frame phone  5 checks, 15s
ok       modes-bar  47 checks, 19s
ok       modes-bar phone  50 checks, 19s
ok       stage-column  35 checks, 20s
ok       stage-column phone  10 checks, 14s
ok       stage-content  64 checks, 25s
ok       stage-content phone  22 checks, 17s
ok       stage-spine  52 checks, 23s
ok       stage-spine phone  12 checks, 15s

14 passed, 0 failed
```

The first time the two `run.mjs` commands ran, four runs (`stage-content` and `stage-content phone` in the lane run, `foundation` and `menu-frame` in the full run) were cut off by the runner as "no result after 5 minutes". Each took 889 to 1097 seconds, far past the runner's own 5-minute limit, so the machine or the shared sandbox had stalled. The cut-off `stage-content` run had already printed every check as `ok`, through "no script errors", and stopped while closing its browser. Every check that ran in those runs passed. Run again straight after, both commands passed in full (above). Earlier, `stage-spine phone` once failed the same way: it never loaded the page. It passed when run on its own straight after.

### Tried outside the test

A scratch script outside the repository, using the same test helper and the Forge Tester chat, tried these:

- **Import look:**
  - `stageShade: 999` sets 60, through the foundation's validator, which clamps numbers. `stagePlate: "yes"` is ignored and `stageSprite: false` is taken.
  - `stageShade: 37.5` is stored as 37.5. The shade is drawn at 0.38 and the range shows 38%, because the stage rounds it when it reads it. `stagePlate: false` takes the plate away.
  - `stageShade: "20"` (a string) is ignored.
- **Reset** with the stage on: the layout goes back to Classic, `stagePlate` and `stageSprite` to true, and `stageShade` to 0. `#forge-stage` is gone, the three controls are greyed out, and our chat-changed listener is gone (29 listeners, as before the stage).
- **Ten applies in a row** leave one plate, one shade and one listener.
- **Screenshots** of the stage area only (no chat text in them), with a stand-in picture:
  - The plate sits bottom left and is drawn over the sprite's lower left corner.
  - A tall picture stands bottom centre, 828px tall in a 900px window.
  - Darken 30 dims the art but not the sprite.
  - At 1040 by 700 a long name ("Seraphina Valewind of the Ninth Ember Circle") wraps onto two lines inside the stage.
- **A screenshot of the message box's left end** with send modes on: the options button now starts in line with the Do, Say, Story and See bar above it.

## Choices the bible did not cover

- **The plate is drawn over the sprite.** The bible puts both the plate and the sprite at the bottom of the stage. A sprite as wide as the stage covers the plate's corner, and the name is the point of the plate. So `#forge-stage` lost S1's `z-index: -1`, which would have kept everything in it under the sprite. Its two children take their own layers instead:
  - the shade takes `-1`, SillyTavern's own layer for `#bg1`, and comes after the art in the page;
  - the plate takes `3`, one above Character Expressions' holder, which is `2` in SillyTavern's stylesheet.

  Everything else drawn over the stage is far higher: the chat column and spine at 30, RPG Companion's panel at 1000, the top bar's drawers at 3005. The test checks the order: plate over sprite, sprite over shade, shade over art. These are raw layer values (see "Asked of other files").
- **Black for the shade is `rgb(0 0 0 / …)`.** Black is not one of the theme's colours, and the bible asks for a black layer. P1's backdrop writes its 55% black the same way. The darkness is set as `--forge-stage-shade` on the shade itself, not on `body`, so turning the stage off removes it with the element.
- **No shade element at 0, and no plate element with Name on the stage off.** That is simpler than hiding them, and nothing of an unused option is left in the page. The plate is still `hidden` when there is a plate but no name, which is the "no chat open" case.
- **"No chat open" is `getContext().chatId` being empty.** That is SillyTavern's own value for the open chat. The test does not close the chat to try this. SillyTavern's start screen lists recent chats, and CLAUDE.md rule 1 forbids listing other chats. Instead, the test calls our chat-changed listener while `SillyTavern.getContext` is briefly replaced by a stand-in, for a group chat and for no chat. The real function is put back in a `finally`. The listener is told apart from SillyTavern's own by comparing the listener list before and after the plate comes on, and is called directly, so no other listener runs.
- **`setPlateText` is a seventh export.** Bible 9 says each feature module exports "exactly" the six contract names. The brief asks for this export "so the test can give it a hostile name". `index.js` only reads the six contract names, so the extra export changes nothing there. The bible's "exactly" is read as "this contract and nothing that `index.js` has to know about". The header comment of `stage.js` names it.
- **Refreshed on chat-changed only, as the brief says.** Renaming the open character makes SillyTavern reselect or reload the chat (`renameCharacter` in `script.js`), so `CHAT_CHANGED` fires and the plate follows. Renaming a group fires only `GROUP_UPDATED`, so the plate keeps the old group name until the next chat change or settings change. Not chased.
- **The plate is inside `#forge-stage`, which is `aria-hidden`.** So screen readers skip the name. The chat already says who is speaking, and the bible has `#forge-stage` hidden.
- **Plate sizes.** 28px and the 10px padding are bible 5.1's own measurements and have no token. 16px is `--forge-space-4`. The name is not scaled by Forge's Text size setting, because the bible fixes it at 28px. A name too long for the stage wraps (`overflow-wrap: break-word`, `max-width` the stage less both margins), so it is never cut off and never reaches the chat.
- **Darken is kept to whole percent** when it is read (`shadeShare` rounds). A look file with `37.5` is therefore drawn and shown as 38%, not drawn at 37.5 and shown as 38 (the mismatch S2's check found for Chat width). The range's step is 1, like Chat width's.
- **The sprite is placed by a class on `body`, `forge-stage-sprite`.** The brief says "CSS only", and the setting has to switch the CSS. The class has the `forge-` prefix and only stage's CSS reads it, as with S2's `forge-dragging`.
- **How the sprite is centred.** The holder's `left` is half the stage, and `transform: translateX(-50%)` brings its middle there. Its width and height are `auto`, so it is as big as the picture. The bible's traps forbid `transform` on `#sheld` and `#top-settings-holder` only, not on the holder. Two limits apply:
  - **The holder:** `max-height: 92%` and `max-width: calc(100% - var(--forge-stage-chat))`. Like `#forge-stage`, it is placed against the page, so these are 92% of the stage's height and the stage's width.
  - **The picture:** `max-height: 92vh` and `max-width: calc(100vw - var(--forge-stage-chat))`, the same sizes in window units, because the holder's own height is not fixed. A large picture is therefore scaled down rather than cut off by the holder's `overflow: hidden`. The test checks a 600 by 1200 picture: it is drawn 414 by 828, which is 92% of 900, with its shape kept.
- **`position: absolute` is repeated on the holder** (SillyTavern's own value), so the placing does not depend on Character Expressions' stylesheet having loaded.
- **What the overrides cover.** MovingUI writes `top`, `left`, `margin`, `width` and `height` inline when the sprite is dragged or resized. Its saved places also bring back `right` and `bottom` (`loadMovingUIState` in `power-user.js`). The seven `!important`s beat exactly those. The inline `min-width` and `min-height` that SillyTavern sets for a moment while it swaps one expression for the next are left alone; they never exceed the picture's own size. The inline `display` that SillyTavern uses to show or hide the sprite is left alone too, so "with no sprite, nothing is drawn" stays SillyTavern's decision.
- **While the stage holds the sprite, dragging or resizing it with MovingUI does nothing,** because the overrides win. MovingUI's saved place comes back as soon as the setting, the layout or the main switch is off. The test proves this by giving the holder all seven of MovingUI's inline properties. With the setting off, the holder's computed place and size are then identical to the Classic layout's.
- **The sprite in the test is Character Expressions' own when the extension is in the page,** and in the sandbox it is. That sprite has no picture (the Forge Tester character has none), so the test gives it a data-URI picture and MovingUI-style inline properties, then puts its `style` and `src` back. It checks that they are back. The stand-in the brief describes is built only when `#expression-wrapper` is missing, and is then removed.
- **Where the inline properties go.** The brief's wording can be read as putting the inline `left` and `top` on the `img`. They go on `#expression-holder`, because that is where SillyTavern writes them (`dragElement($('#expression-holder'))`).
- **Below 1000px, SillyTavern's own phone rules hide the sprite** (`visibility: hidden` on `#expression-wrapper` in `mobile-styles.css`). So at 900px and at phone size, the test compares the holder's computed style with the layout Stage chosen against the same with the layout Classic. They match.
- **Character Expressions' fallback emoji** (its "show default" option) is drawn bottom centre too. Our `height: auto !important` and `top: auto !important` also beat SillyTavern's stylesheet rule `#expression-holder:has(.default) { height: 120px; top: 50px }`, while the picture itself stays 120px tall (`#expression-image.default`). Not tried in the page.
- **Visual novel mode in a one-to-one chat** puts `body.waifuMode .expression-holder` rules on the same holder. Our rule is more specific and its position and size properties are `!important`, so the sprite still stands on the stage. Group chats in visual novel mode use `#visual-novel-wrapper`, which this batch does not touch (the brief leaves it to I1).

### The spine and the options button

S2's check found that the spine's grab area reaches 6px into the chat column and took presses on the left 3px of the message box's options button. I measured everything within 6px of the column's edge in the stage layout:

- the send form's 1px border;
- `#leftSendForm`, from 1px, with SillyTavern's own `padding-left: 2px`;
- the options button, from 2.6px.

Messages start 6px in (their margin), and the Do, Say, Story and See bar starts 9px in.

The spine itself was left as it is. S2's test requires the 11px grab area to be centred on the column's edge within 2px, so it has to reach at least 3.5px into the column, and the button started at 2.6px. Changing the spine's hit area would also have shrunk the 11px grab area the bible asks for.

Instead, in the stage layout `#leftSendForm`'s left inset becomes `--forge-space-2` (8px) in place of SillyTavern's 2px. The options button then starts 9px in, 3px clear of the spine, and lines up with the send modes bar above it. The message box gets 6px narrower in the stage layout. The test checks three things:

- the spine ends before the button starts;
- `elementFromPoint` at 0.5, 1, 2, 3 and 4px inside the button's left edge gives the button;
- a real click 1px inside its left edge opens SillyTavern's options menu, which the test then closes.

### Other

- **Greyed out is the native `disabled` attribute**, as with Chat width. S2's request to I3 for a label rule covers these three controls too.
- **The test also runs at phone size.** The brief says "Desktop only", but bible 12 asks every feature test to prove its phone behaviour, and the bible wins (S2 did the same). At phone size the test checks these things:
  - with the layout Stage there is no plate, no shade, no placed sprite and no listener of ours;
  - the sprite's computed style matches the Classic layout's;
  - the three controls are on the settings screen and save their keys;
  - they change nothing on the page.
- **Extra checks in the test**, beyond the brief's steps:
  - the plate's size, weight, colours, line, corners and padding;
  - one listener of ours while the plate is on, and none otherwise (Name on the stage off, Classic, 900px wide, main switch off, phone);
  - the plate follows a chat change, shows a group's name, and is hidden with no chat open;
  - no dialog opened for the hostile name;
  - the shade covers the stage;
  - the sprite is centred, a tall picture is scaled to 92% without being cut off, a wide picture stays on the stage, and the sprite stays on the stage at 1040 by 700;
  - the order of the layers;
  - the options button;
  - the plate, shade and placed sprite go away below 1000px and with the main switch off, and come back;
  - Character Expressions' own sprite gets its style and picture back;
  - the look keys and defaults;
  - the three settings' labels, order, section, ticks and greyed-out state, and that each one saves.

## Asked of other files

- **`css/tokens.css` (integration):**
  - Layer tokens to replace the raw values in `css/stage.css`: the art's layer `-1`, used now by the shade (S1 asked for `--forge-z-stage: -1`), and the plate's `3`, one above Character Expressions' sprite (suggested: `--forge-z-plate: 3`).
  - The plate's 28px and 10px are bible measurements with no token.
  - The 6px the spine reaches into the column (S2's raw value) now also decides the options button's inset. A token such as `--forge-spine-reach: 6px` would tie the two together. Today a comment in each rule names the other.
- **`style.css` (I3, settings-screen rules):** S2's request for a rule that dims the label of a greyed-out setting, and a `title` saying it needs "Forge layout: Stage", now covers Name on the stage, Character sprite and Darken the stage art too.
- **I1:** sprites in visual novel mode for group chats (the brief leaves them to I1), and whether the plate should move up when RPG Companion or another extension puts something in the stage's bottom left corner. The screenshots of the stage showed nothing else there in the sandbox.

## Not done

Nothing from the brief. Not tried:

- **A real Character Expressions sprite.** The Forge Tester character has none, and uploading one would write to the sandbox. The test uses Character Expressions' own elements with a data-URI picture. A real expression swap (SillyTavern's fade from one picture to the next) was not seen on the stage.
- **TauriTavern, MovingUI switched on, and visual novel mode** were not tried in the page. MovingUI's effect on the sprite is covered by giving the holder every inline property MovingUI writes.

## Check

**PASS.** A second agent that did not write the code checked `batch/S3-stage-content` at `51a4959`. It checked the work against the brief, bible sections 3, 5.1, 7, 9, 10, 11 and 12, and the page itself, and fixed nothing. `overhaul` has moved on since the batch was cut: the merge base is `82d2514`, and `overhaul` is now at `427c2a7`, with P2 merged. The diff was therefore taken with three dots. The problems found are listed at the end; none of them fails the batch.

### (a) Files

`git diff --name-only overhaul...HEAD` lists five files:

- `css/stage.css`
- `docs/redesign/changes/S3-stage-content.md`
- `docs/redesign/results/S3-stage-content.md`
- `stage.js`
- `tests/browser/stage-content.mjs`

They are exactly the five files under "You own". `index.js`, `style.css`, `css/tokens.css` and the other lanes' files are untouched. `git merge-tree` of this branch with the current `overhaul` merges with no conflict. **Pass.**

### (b) Commands

| Command | Result |
|---|---|
| `node tests/browser/stage-content.mjs` | 64 ok, 0 FAIL, exit 0 |
| `node tests/browser/stage-content.mjs phone` | 22 ok, 0 FAIL, exit 0 |
| `node tests/run.mjs stage` | "6 passed, 0 failed": stage-column 35/10, stage-content 64/22, stage-spine 52/12 |
| `node tests/run.mjs` | "14 passed, 0 failed": foundation 18/15, harness 8/8, menu-frame 49/5, modes-bar 47/50, stage-column 35/10, stage-content 64/22, stage-spine 52/12 |

Every count matches the builder's pasted output, and nothing was cut off for time in this check.

As an extra, the tree this branch makes when merged with the current `overhaul` was extracted outside the repository, and the whole suite was run from it: "16 passed, 0 failed". That run adds P2's menu-buttons, 55/4. **Pass.**

### (c) The diff, item by item

Brief, Build:

1. **Settings.**
   - `defaults` gains `stagePlate: true`, `stageSprite: true` and `stageShade: 0`.
   - `lookKeys` gains `stagePlate` and `stageSprite` as `boolean`, and `stageShade` as `number`, 0 to 60.
   - The Layout section has the checkboxes "Name on the stage" and "Character sprite on the stage, when it has one", and the range "Darken the stage art" (0 to 60, step 1, with an `<output>` percentage). Each label is word for word bible 7, and they come after Chat width.
   - All three are `disabled` unless the layout is Stage. The layout select switches them together with Chat width (`STAGE_CONTROLS`), and each control saves through `save()`.
   - **Pass.**
2. **Name plate.**
   - `div.forge-stage-plate` lives inside `#forge-stage`.
   - Its text comes from `chatName()`: `''` when `chatId` is empty, the group's `name` when `groupId` is set, otherwise `characters[characterId].name`. It is set only through `setPlateText`, which uses `textContent`.
   - An empty name sets `hidden`.
   - `followChats()` adds one `CHAT_CHANGED` listener while the stage and the plate are both on, and removes it otherwise.
   - `setPlateText` is exported.
   - **Pass** (see problem 1 on the export).
3. **Shade.** `div.forge-stage-shade` is the first child of `#forge-stage`, with `--forge-stage-shade: N%` on itself and `background: rgb(0 0 0 / var(--forge-stage-shade))`. At 0 there is no element. **Pass.**
4. **Sprite.**
   - It is placed by CSS only, through `body.forge-stage-sprite` while `stageSprite` is on.
   - The rule places `#expression-holder` bottom centre, `max-height: 92%` and `max-width` the stage's width, and scales the picture to fit.
   - There are seven `!important`s, each commented with the inline property it beats. They are exactly the seven properties Character Expressions and MovingUI write on the holder: `$('#expression-holder').css({ top, left, right, bottom, height, width, margin })` in SillyTavern's `expressions/index.js`, and `dragElement($('#expression-holder'))`.
   - With the setting off, the class goes and the holder's computed style is identical to the Classic layout's (tested, and checked again in (d)).
   - **Pass** (see problem 3 on wrapper and holder).
5. **Nothing outside the stage layout.**
   - Every new rule starts with `body.forge-ui.forge-stage`.
   - The plate, the shade and the listener exist only in `apply()`'s active branch.
   - `forge-stage-sprite` is toggled with `active && stageSprite`.
   - At 900px, on a phone and with the main switch off, none of it is in the page (tested, and checked again in (d)).
   - **Pass.**

Brief, Test: all six steps are in `tests/browser/stage-content.mjs`, with the brief's 2px tolerances.

- **Step 5:** the test uses Character Expressions' real `#expression-wrapper` when it is in the page, as it is in the sandbox. It gives that sprite a data-URI picture and MovingUI-style inline properties, and checks that both are put back. A stand-in is built only when the wrapper is missing. This is a sound reading of the brief, and it tests the real element.
- **Phone run:** the brief says "Desktop only", but the test also runs at phone size, because bible 12 asks for it. That is correct, since the bible wins.

**Pass.**

Brief, Done when:

- **The commands pass.** See (b). **Pass.**
- **Every `!important` in `css/stage.css` has a comment naming the inline style it beats.** The file has seven `!important` declarations, lines 89 to 95. Each ends with `/* beats MovingUI's inline <property> */`, and the comment over the rule names where those inline styles come from. The eighth match for `!important` is in that comment. **Pass.**
- **Only the files under "You own" changed.** See (a). **Pass.**

The changelog line is the brief's, word for word. The commit message is the brief's ("Put the name plate, shade and sprite on the stage"), with a short body and the Co-Authored-By line. **Pass.**

Bible section 3:

1. **Native controls underneath.** The sprite is Character Expressions' own element, moved by CSS. Nothing is copied. The plate reads the name from `getContext()` each time and keeps no copy of SillyTavern's state. **Pass.**
2. **One switch back.** Each sub-setting leaves nothing when off:
   - plate off: no element and no listener;
   - shade 0: no element;
   - sprite off: no class, and the holder is as in Classic.

   With the layout Classic, or the main switch off, the page is identical to before the stage. See (d). **Pass.**
3. **Every look choice gets a setting.**
   - The plate, the sprite and the darkness each have one.
   - The plate's font, colours, line and corners follow Forge's existing settings and tokens.
   - The `#leftSendForm` inset is a fix that keeps the options button clickable, not a look choice (problem 4).

   **Pass.**
4. **Phone counts.** The phone run passes. The brief asks for no TauriTavern stand-in. **Pass.**
5. **One list of values.**
   - From tokens: `--forge-space-5`, `--forge-space-4`, `--forge-space-2`, `--forge-radius-md`, `--forge-border`, `--forge-card`, `--forge-brass` and `--forge-heading`.
   - Bible 5.1's own measurements: 28px, 10px and 92%.
   - Still raw: `z-index: -1` and `3`, `rgb(0 0 0 / …)` and `line-height: 1.2` (problem 2).

   **Pass, with a note**, as S1's and S2's raw layers were.
6. **Stay in your lane.** See (a). Token and label-rule requests are written under "Asked of other files" instead of being made. **Pass.**
7. **Small and plain.** About 130 lines of JS and 5 CSS rules, with no dependency. **Pass.**

Bible section 9:

- **Ownership.** Only lane S's files and this batch's two docs. **Pass.**
- **Feature contract.**
  - `apply` is still the only place that adds or removes the plate, the shade, the class and the listener.
  - Ten applies in a row leave one plate, one shade and one listener (checked in (d)).
  - The module keeps only `drag` and the `followingChats` boolean between calls.
  - The module has a seventh export (problem 1).

  **Pass, with a note.**
- **Shared names.** `#forge-stage` holds the shade and the plate, as bible 5.1 says. The new classes `forge-stage-shade`, `forge-stage-plate` and `forge-stage-sprite` have the `forge-` prefix. Only stage's own CSS reads them, like S2's `forge-dragging`. **Pass.**
- **Rules for the code.**
  - Every selector starts with `body.forge-ui.forge-stage`.
  - `!important` appears only against SillyTavern's inline styles.
  - There is no `transform`, `filter` or `contain` on `#sheld` or `#top-settings-holder`. The `translateX(-50%)` is on `#expression-holder`, which already has SillyTavern's own `filter`.
  - Names reach the page only through `textContent`. A hostile character name given through a stand-in `getContext()` came out as text, with no element and no script run (checked in (d)).
  - No network, no `localStorage`, no `MutationObserver`, and no SillyTavern setting is changed.
  - No element is held across calls: the plate and the shade are looked up each time.

  **Pass.**

Bible 5.1, 7, 10 and 11 for this batch:

- **The plate** is 24px in from the stage's left and bottom edges, and uses the heading font at 28px, weight 700. It is `--forge-brass` on `--forge-card` with a 1px `--forge-border` line, 10px corners and 10px 16px padding. All of this is measured by the test.
- **Contrast:** brass on card is about 8 to 1.
- **The sprite** stands bottom centre, at most 92% of the stage's height, and never over the chat column.
- **Visual novel mode** in a one-to-one chat (`body.waifuMode`) keeps the sprite on the stage (checked in (d)).
- **The labels, ranges, defaults and look-file flags** match bible 7.

**Pass.**

### Choices in the result file, judged against the bible

- **The plate drawn over the sprite, with `#forge-stage` losing S1's `z-index: -1`.** The bible is silent on the order, and the name staying readable is the point of the plate. The change was verified in the page:
  - the shade at -1 comes after `#bg1` in the page, so it darkens the art only;
  - the sprite (2) is above the shade;
  - the plate (3) is above the sprite and below the column (30) and the top bar (3005).

  A search of SillyTavern's stylesheets for z-index -1 to 5 found only small parts inside drawers and the sprite holder itself, so nothing else top-level sits between them. S1's tests still pass. Accepted. The raw layers are problem 2.
- **Black written as `rgb(0 0 0 / …)`.** The bible asks for a black layer, and black is not a theme colour. P1 writes its backdrop the same way. Accepted.
- **No element at shade 0 or with the plate off.** This is simpler, and it meets bible 3 rule 2 more strictly than hiding would. Accepted.
- **"No chat open" read as an empty `chatId`, and tested through a stand-in context.** SillyTavern's own value. Closing the chat for real would show the recent-chats list, which CLAUDE.md rule 1 forbids. Accepted.
- **`setPlateText` as a seventh export.** See problem 1.
- **Refreshed on chat-changed only.** This is what the brief asks for. A group renamed while its chat is open keeps the old name on the plate until the next chat change. That was disclosed, and it is acceptable (problem 5).
- **The plate inside the `aria-hidden` layer.** Bible 5.1 makes `#forge-stage` hidden and puts the plate in it. Accepted.
- **28px not scaled by Text size.** Bible section 4 fixes the plate at 28px. Accepted.
- **Darken rounded to whole percent.** `importLook`'s validator clamps but does not round, so rounding at read time keeps the drawn and shown values equal. This avoids the mismatch S2's check found (S2's problem 4). Accepted.
- **The sprite switched by a body class.** "CSS only" needs a switch the CSS can read. The class has the `forge-` prefix and is internal to stage, like `forge-dragging`. Accepted.
- **Centring with `transform`, and limits on both the holder and the picture.** Verified in the page:

  | Picture | Drawn |
  |---|---|
  | tall, at 1440 by 900 | 414 by 828 (92% of 900), centred on the stage |
  | wide | fits the stage's width |
  | at 1001 by 700 | 322 by 644, inside a 521px stage |
  | Character Expressions' fallback (`img.default`) | 100 by 120, at the stage's bottom |

  Accepted.
- **MovingUI drags have no effect while the stage holds the sprite.** This follows from the bible's own "bottom centre" rule, and MovingUI's place comes back as soon as the setting is off. Accepted.
- **The test uses Character Expressions' real sprite.** Its `style` and `src` are restored; the test checks this, and so did (d). Accepted.
- **Below 1000px, the comparison is with the Classic layout,** because SillyTavern hides the sprite there. Accepted.
- **The options button.** See below.

### The options button next to the spine

S2's check found that the spine took presses on the left 3px of the message box's options button. In the stage layout, `#leftSendForm`'s 2px left inset is now `--forge-space-2`. Measured in this check at 1440 by 900:

- The spine's grab area ends 6.0px into the column, and the options button starts at 9.0px.
- A 1px sweep of `elementFromPoint` across the column's edge finds:

  | From the column's edge | What takes the press |
  |---|---|
  | up to 5.9px | the spine |
  | 6.9px | `#leftSendForm`'s own padding |
  | 7.9px and on | the button |

- A real click 0.6px inside the button opens SillyTavern's options menu.
- The same holds with send modes on. The button then lines up with the Do, Say, Story and See bar, both at 9px.
- On a touch screen wide enough for the stage (1280 by 800, coarse pointer), the spine is 44px and still ends at 6px, and presses at 0.5 to 4px inside the button reach the button.

A sweep down the whole height of the column found no control of the column under the spine's grab area, with send modes off or on. A control run with the inset forced back to 2px finds `#options_button` 3.0px in, so the sweep would have caught the button.

The change leaves the Classic layout and phones untouched:

- `#leftSendForm` keeps SillyTavern's 2px at 1440 wide in Classic.
- At 390 by 800 it keeps 2px with the layout Stage chosen and send modes on.
- A tap 1px inside the button on the phone opens the options menu.
- The rule's selector needs `body.forge-stage`, which is only set on desktop.

**Pass.**

### (d) Trying to break it

Scratch scripts outside the repository used this worktree's own test helper and only the Forge Tester chat. Each compared these values between states:

- `body`'s `forge` classes and `style` attribute;
- every `forge-` id in the page, apart from the settings screen's `forge-ui-` ids;
- the number of `forge-stage` elements;
- `#expression-holder`'s `style` attribute and its computed `display`, `position`, four sides, size, maximum size, `margin`, `transform` and `z-index`;
- the picture's maximum size;
- `#leftSendForm`'s padding;
- the boxes of `#options_button`, `#send_textarea`, `#sheld` and `#bg1`, and `#sheld`'s `style` attribute;
- the number of `CHAT_CHANGED` listeners.

Results:

- **Each switch off on its own,** with the stage on, the sprite given a picture and MovingUI-style inline properties, and Darken at 40:
  - plate off: no plate, and the listener count is back to 29;
  - shade 0: no shade;
  - sprite off: no class, and the holder's computed style is identical to Classic.

  With all three off, `#forge-stage` is empty. **Pass.**
- **Layout back to Classic:** every value identical to Classic before the stage. **Pass.**
- **Main switch off from a full stage:** identical to main switch off from Classic. **Pass.**
- **At the end,** with the sprite's style and picture put back: identical to the start. **Pass.**
- **The holder's inline `style`** is never changed by us: we only add CSS. **Pass.**
- **Ten applies in a row:** one `#forge-stage`, one plate, one shade, one listener. **Pass.**
- **A hostile character name** (`<img src=x onerror=…><b>Mira</b>`), given through a stand-in `getContext()` and the real `chatName()` path: the plate shows it as text, holds no element, ran nothing and opened no dialog. **Pass.**
- **`body.waifuMode`**, added to the page only:
  - the sprite stays on the stage, 414 by 828, bottom at 900, ending at 595.8px with the column starting at 777.6px;
  - SillyTavern's own visual novel rules move the column down, which is not ours.

  **Pass.**
- **The smallest stage** (1001 by 700) **with a long name:** the plate wraps to three lines inside the stage (24px to 497px of a 521px stage), and the sprite stays inside the stage. **Pass.**
- **Phone (390 by 800, touch):**
  - with the layout Stage, plate and sprite on, and Darken at 40, every value is identical to Classic;
  - there is no sideways scroll with send modes on;
  - widening to 1280 brings the stage in, and narrowing back to 390 gives a page identical to Classic.

  **Pass.**
- **Screenshots** of the stage area only, and of the message box's left end, with no chat text in them:
  - the plate sits bottom left and covers the sprite's lower-left corner;
  - the sprite stands bottom centre, below the top bar;
  - the long name wraps;
  - the options button sits clear of the column's edge.

### Problems found (none fails the batch)

1. **`stage.js` has a seventh export, `setPlateText`.** Bible 9 says each feature module exports "exactly" the six contract names. The brief asks for this export by name, so brief and bible disagree on their face, and HANDOFF says the bible wins. The builder followed the brief, said so, and named the export in the module's header. `index.js` reads only the six names (`FEATURES.map(feature => feature.defaults)` and so on), so the extra export changes nothing there, and the bible's stated purpose ("never needs editing") holds. Not failed: the brief's author asked for the export explicitly for this test.
   - This check shows the hostile-name test can go through a stand-in `getContext()` and `apply()` instead, which would keep the contract exact.
   - Suggestion for integration: either reword bible 9 to allow a test hook, or drop the export and test that way.
2. **Raw values in `css/stage.css`:**
   - `z-index: -1` (shade) and `3` (plate);
   - `rgb(0 0 0 / …)`;
   - `line-height: 1.2` on the plate, which the result file does not mention;
   - 28px, 10px and 92%, which are bible measurements with comments.

   The builder asked integration for layer tokens. Same standing as S1's -1 and S2's 30.
3. **The brief and the bible name `#expression-wrapper`; the CSS places `#expression-holder`.** The holder is what is drawn and is where SillyTavern writes the inline positions. The wrapper is an empty full-window flex box that both layouts leave as it is. Placing the holder is the right reading. The result file explains where the inline properties go, but never says in so many words that the wrapper itself is left alone. Note.
4. **The message box is 6px narrower in the stage layout,** because of the options-button fix. There is no setting for it, and none is needed: it is a fix, not a look choice. It still hangs on S2's raw 6px reach; the builder asked for a shared token. Note.
5. **A group renamed while its chat is open keeps the old name on the plate** until the next chat change. The builder disclosed this. Minor.
6. **Not tried by either agent:**
   - a real Character Expressions sprite and its fade from one picture to the next;
   - MovingUI switched on in SillyTavern's settings;
   - TauriTavern.

   The builder disclosed all three. This check tried `body.waifuMode` and the fallback picture in the page instead.

Outside this batch, for the lead: with Forge UI's main switch off, `body` keeps `forge-ai-hide-help`, `forge-ext-cards`, `forge-icons`, `forge-menu-cards`, `forge-phone-compact`, `forge-swipes-right` and `forge-user-layout`. They come from the existing extension, not from stage. They are the same with and without this batch. Every rule in `style.css` that reads them also needs `body.forge-ui` or `#forge-ai-layout`, which both go with the switch, so they change nothing on screen. CLAUDE.md rule 6 says nothing of ours should be in the page with the main switch off, so integration may want to look at them.
