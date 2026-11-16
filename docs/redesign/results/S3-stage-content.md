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
