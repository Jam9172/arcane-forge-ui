# Arcane Forge UI redesign: the bible

The rules and measurements every batch builds to. When a brief and this file disagree, this file wins; say so in your result file.

Contents: [1 What we are building](#1-what-we-are-building) · [2 Decisions](#2-decisions-already-made) · [3 House rules](#3-house-rules) · [4 The look](#4-the-look) · [5 Screens](#5-screens) · [6 Send modes](#6-send-modes-behaviour) · [7 Settings](#7-settings) · [8 The page we live in](#8-the-page-we-live-in) · [9 Code](#9-code) · [10 Neighbours](#10-neighbours) · [11 Access](#11-access) · [12 Tests](#12-tests) · [13 Words](#13-words) · [14 Not now](#14-not-now)

## 1. What we are building

Arcane Forge UI today restyles SillyTavern. The redesign also rearranges it:

- **Stage layout (desktop):** art on the left, the chat as one column on the right.
- **Menu panel (desktop):** every SillyTavern menu opens in one centred panel with a section list. The row of icons across the top becomes two round buttons.
- **Send modes (everywhere):** four buttons right above the message box, Do, Say, Story and See, that shape what you type before it is sent.
- **Phone:** SillyTavern's own phone bar stays, in Forge colours. Phones get the send modes and nothing structural.

Out of scope: anything that belongs to RPG Companion (its panel, trackers, Cast, thoughts). Nothing in this redesign draws, moves or restyles RPG Companion's parts. It only has to keep working beside them (section 10).

## 2. Decisions already made

The owner chose these on 2026-11-15. They are not open for re-litigation.

| # | Decision |
|---|---|
| D1 | Build it as a branch of Arcane Forge UI named `overhaul`. Not a fork of the app, not a new app. |
| D2 | Desktop layout: Stage. |
| D3 | Menus open in one centred panel. |
| D4 | Phone keeps SillyTavern's own top bar. |
| D5 | Do, Say, Story and See buttons right above the message box. |
| D6 | No RPG Companion elements. This is a redesign of Arcane Forge UI only. |

Defaults chosen without the owner, because a run cannot stop to ask. Build to them; they are listed for the owner in `PLAN.md`:

| # | Default |
|---|---|
| A1 | Every new feature is off until its switch is turned on. Off must be exactly today's look. |
| A2 | No send mode is selected at first. Clicking the selected mode again clears it. |
| A3 | Actions are written in the second person ("You open the door."). First person is a setting. |
| A4 | Story goes in as narration (a narrator message), then the AI replies. |
| A5 | See asks for a description. A picture, through SillyTavern's Image Generation, is a setting. |
| A6 | The stage shows the background art, a name plate, and the character's sprite when it has one. |

## 3. House rules

1. **Native controls stay underneath.** We move, hide and restyle SillyTavern's own elements and click its own buttons. We never rebuild a setting, copy a control, or keep our own copy of SillyTavern's state.
2. **One switch back.** Each feature has its own switch. With a switch off, that feature leaves no element, class, listener, inline style or changed SillyTavern setting behind.
3. **Every look choice gets a setting,** added in the same batch as the look. Text is large by default (17px body).
4. **Phone and TauriTavern count.** A batch is not done until its test passes at phone size and with the TauriTavern stand-in where the brief says so.
5. **One list of values.** Colours, sizes, spacing and layers come from the tokens in section 4. No raw hex, no magic numbers in feature CSS.
6. **Stay in your lane.** Edit only the files your brief lists (section 9). If you need a change in someone else's file, write it in your result file instead of making it.
7. **Small and plain.** The simplest thing that meets the brief. No frameworks, no build step, no new dependencies in the extension itself.

## 4. The look

### Colours (existing, in `style.css` under `body.forge-ui`)

The owner picks seven colours in settings; everything else is mixed from them. Use the mixed names, never the raw hex.

| Token | What it is for |
|---|---|
| `--forge-bg` | page background, text on ember |
| `--forge-card` | panels, messages, plates |
| `--forge-inset` | wells: inputs, the mode bar's track |
| `--forge-border` | default 1px lines |
| `--forge-bar-line` | stronger brass line (panel edge, spine) |
| `--forge-active` | hovered or current row |
| `--forge-text`, `--forge-soft`, `--forge-muted`, `--forge-dim` | text, from strongest to weakest |
| `--forge-brass` | headings, icons, names |
| `--forge-ember` | the one accent: selected, primary, focus ring |
| `--forge-danger` | delete, warnings, the "not connected" dot |
| `--forge-panel-fill`, `--forge-drawer-fill` | large surfaces (they honour the Panel and Drawer opacity settings) |
| `--forge-heading`, `--forge-body-font` | Cinzel and Alegreya Sans by default; both are settings |

### New tokens (`css/tokens.css`, under `body.forge-ui`)

```css
--forge-space-1: 4px;  --forge-space-2: 8px;  --forge-space-3: 12px; --forge-space-4: 16px;
--forge-space-5: 24px; --forge-space-6: 32px; --forge-space-7: 48px;
--forge-radius-sm: 6px; --forge-radius-md: 10px; --forge-radius-lg: 14px; --forge-radius-pill: 999px;
--forge-control: 36px;            /* height of buttons and rows; 44px on touch screens and phones */
--forge-round: 40px;              /* the round buttons; 44px on touch screens */
--forge-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
--forge-fast: 160ms;              /* every transition; 0ms under reduced motion */
--forge-stage-min: 320px;         /* the stage never gets narrower than this */
--forge-chat-min: 480px;          /* nor the chat column than this */
--forge-menu-w: min(1100px, calc(100vw - 96px));
--forge-menu-h: min(780px, calc(100dvh - 96px));
--forge-menu-nav: 220px;
--forge-menu-head: 56px;
/* Layers. SillyTavern's top bar holder is 3005 and its popups 9999; these sit between the chat and those. */
--forge-z-buttons: 3002; --forge-z-backdrop: 3003; --forge-z-frame: 3004;
```

`--forge-control` and `--forge-round` become 44px under `@media (pointer: coarse), (max-width: 1000px)`.

### Type

| Use | Font | Size | Weight |
|---|---|---|---|
| Body, controls | `--forge-body-font` | `--mainFontSize` (17px by default) | 400, 700 for the selected mode |
| Panel and section titles | `--forge-heading` | 1.15em | 700 |
| Name plate | `--forge-heading` | 28px | 700 |
| Small labels (never smaller) | `--forge-body-font` | 0.82em | 700, letter-spacing 0.06em, upper case |

### Shape and lines

- Corners: controls `--forge-radius-sm`, cards and the mode bar's buttons `--forge-radius-md`, the menu panel `--forge-radius-lg`, round buttons and the mode bar's track `--forge-radius-pill`.
- Lines are 1px. Default `--forge-border`; the menu panel's outer edge and the spine use `--forge-bar-line`.
- Shapes are flat fills. No gradients in new work except the existing `--forge-panel-fill`. No glows, no left-border accent strips.
- Only the menu panel casts a shadow (`--forge-shadow`).

### Icons

Line icons in the style of the message box icons Forge UI already has: 24 by 24 viewBox, `fill: none`, `stroke: currentColor`, stroke width 1.8, round caps and joins, drawn at 18px. Inline SVG built with DOM calls. No emoji, no icon fonts for new icons.

### Motion

Opacity and a 0.98 to 1 scale on the menu panel, over `--forge-fast`, ease-out. Nothing else animates. Under `@media (prefers-reduced-motion: reduce)`, and when SillyTavern's own Reduced Motion setting is on (`SillyTavern.getContext().powerUserSettings.reduced_motion`; it puts no class on `body`), `--forge-fast` is 0ms.

## 5. Screens

### 5.1 Desktop stage (window wider than 1000px, layout = Stage)

```
+---------------------------------------+-+------------------------------+
|                                       | |                  (o)  (o)    |  <- two round buttons (5.2)
|                                       |s|  Mira                        |
|               STAGE                   |p|  Mira wipes the bar. ...     |
|        the background art,            |i|                              |
|        centred on this area           |n|  You                         |
|                                       |e|  You open the door.          |
|  +---------------+                    | |                              |
|  | Name plate    |                    | |  [ Do | Say | Story | See ]  |
|  +---------------+                    | |  [ message box        send ] |
+---------------------------------------+-+------------------------------+
```

- **Chat column** (`#sheld`): docked to the right edge, full height below whatever top bar is showing. Width `clamp(var(--forge-chat-min), W, calc(100vw - var(--forge-stage-min)))`, where W is the Chat width setting as a share of the window (46% by default, 35 to 70).
- **Stage:** everything to the left of the chat column. The background art (`#bg1`, and `#bg_custom` when a chat has its own) is sized to the stage, so the art is centred on the stage and not on the window. Behind the chat column is plain `--forge-bg`.
- **`#forge-stage`:** one element we add over the stage (`aria-hidden="true"`, `pointer-events: none`). It holds the shade and the name plate.
- **Shade:** a flat black layer over the art at the Darken setting (0 to 60%, 0 by default).
- **Name plate:** bottom left of the stage, `--forge-space-5` in from both edges. The character's name (the group's name in a group chat) in the heading font, 28px, `--forge-brass`, on a `--forge-card` plate with a `--forge-border` line, `--forge-radius-md`, padding 10px 16px. Hidden when no chat is open. Set with `textContent`.
- **Sprite:** when the setting is on and SillyTavern's Character Expressions shows a sprite (`#expression-wrapper`), that same element is placed on the stage: bottom centre, at most 92% of the stage's height, never over the chat column. SillyTavern writes inline positions on it, so this is one of the places `!important` is allowed. With no sprite, nothing is drawn.
- **Spine:** the chat column's left edge. A 1px `--forge-bar-line` line with an 11px wide grab area (`cursor: col-resize`). Dragging it changes the chat width live and saves on release. Double-click resets to 46%. It is a `role="separator"` with `aria-orientation="vertical"`, `tabindex="0"`, `aria-valuenow/min/max` and `aria-label="Chat width"`; Left and Right move it by 1%, Home and End go to the limits.
- **Top bar:** stage on its own leaves SillyTavern's top bar in place and starts the chat column below it. The menu panel's buttons (5.2) are what remove the bar.

### 5.2 Menu panel (window wider than 1000px, menu panel on)

```
            +----------------+--------------------------------------+
            |  Characters    |  AI response                    (x)  |  <- head, 56px
            |  AI response * |--------------------------------------|
            |  Connection    |                                      |
            |  Formatting    |   SillyTavern's own drawer,          |
            |  Lorebooks     |   placed here and scrolling here     |
            |  Personas      |                                      |
            |  Backgrounds   |                                      |
            |  Extensions    |                                      |
            |  Settings      |                                      |
            +----------------+--------------------------------------+
               nav, 220px        over a dimmed page (55% black)
```

- **Frame** (`#forge-menu`): a backdrop and a panel. The panel is centred, `--forge-menu-w` by `--forge-menu-h`, `--forge-card`, a 1px `--forge-bar-line` edge, `--forge-radius-lg`, `--forge-shadow`. It is `role="dialog"`, `aria-modal="true"`, labelled by its title.
- **What goes inside:** SillyTavern's own drawer (`.drawer-content.openDrawer`). It stays where it is in the page and is placed over the frame's content area with `position: fixed` and the geometry tokens. We never move it in the DOM.
- **When the frame shows:** exactly when a top-level drawer inside `#top-settings-holder` is open and not pinned. The frame follows SillyTavern's state (watch class changes on `#top-settings-holder`); it never keeps a state of its own. A drawer opened by anything else, such as another extension or a link, therefore lands in the panel too.
- **Sections:** one nav button per `#top-settings-holder > .drawer`, in this order, with these short labels. A drawer that is not in the table (added by another extension) comes last, labelled with its own icon's `title`.

  | Drawer id | Label | Its content |
  |---|---|---|
  | `rightNavHolder` | Characters | `#right-nav-panel` |
  | `ai-config-button` | AI response | `#left-nav-panel` |
  | `sys-settings-button` | Connection | `#rm_api_block` |
  | `advanced-formatting-button` | Formatting | `#AdvancedFormatting` |
  | `WI-SP-button` | Lorebooks | `#WorldInfo` |
  | `persona-management-button` | Personas | `#PersonaManagement` |
  | `backgrounds-button` | Backgrounds | `#Backgrounds` |
  | `extensions-settings-button` | Extensions | `#rm_extensions_block` |
  | `user-settings-button` | Settings | `#user-settings-block` |

  Each nav button is `--forge-control` tall, has the drawer's Forge icon and the label, a `title` taken from the native icon's `title` (so it is translated), and `aria-current="page"` when its drawer is open. Current: `--forge-ember` fill with `--forge-bg` text. Hover: `--forge-active`.
- **Changing section:** a nav button clicks that drawer's own `.drawer-toggle`. SillyTavern closes the other drawer itself.
- **Closing:** the close button, a click on the backdrop, and Escape each click the open drawer's own `.drawer-toggle`.
- **Clicks inside the frame must not close the drawer.** SillyTavern closes unpinned drawers on any `touchstart` or `mousedown` that is not inside an `.openDrawer` (the handler on `html` with the comment "This autocloses open drawers" in `script.js`). Stop those two events from leaving the frame.
- **Head:** the section's label in the heading font, and a close button (`aria-label="Close"`).
- **The two round buttons** (`#forge-menu-buttons`): top right of the window, `--forge-space-3` from both edges, `--forge-space-2` apart, each `--forge-round` wide, `--forge-card` with a `--forge-border` line and a `--forge-brass` icon. Left is Characters, right is Menu. Characters opens the Characters section. Menu opens the section that was open last (AI response the first time), never Characters. While SillyTavern has no API connection, Menu carries an 8px `--forge-danger` dot.
- **Top bar:** with the two buttons on, `#top-bar` and every `.drawer-toggle` are hidden and the space they took is given back (`--topBarBlockSize: 0px`). The toggles stay in the page so they can still be clicked from code. With the buttons setting off, the top bar stays and the panel still works.
- **Pinned panels:** SillyTavern can pin the AI response, Characters and Lorebooks panels open beside the chat. That cannot coexist with the panel. When the menu panel turns on, remember which pins were on, unpin them by clicking SillyTavern's own pin controls, and hide those controls. When it turns off, put the pins back the same way.
- **Chat under the buttons:** the chat's scroll area gets enough top padding that the first message is never under the round buttons.

### 5.3 Send modes bar (every screen size, send modes on)

```
   [  Do  |  Say  |  Story  |  See  ]
   [ = ] [ message box                      ] [ > ]
```

- **Where:** inside `#send_form`, immediately before `#nonQRFormItems`. That makes it the row nearest the message box, below Quick Reply's bar and other extensions' rows.
- **What:** `#forge-modes`, a `role="radiogroup"` with `aria-label="How to send"`, holding four `<button type="button" role="radio">` in the order Do, Say, Story, See. Each has an 18px icon and its label, `aria-checked`, and a `title` saying what it does.
- **Look:** a `--forge-inset` track with a `--forge-border` line and `--forge-radius-pill`. Buttons are `--forge-control` tall, transparent, `--forge-muted` text. Hover: `--forge-text`. Selected: `--forge-ember` fill, `--forge-bg` text, weight 700. Desktop: the bar is as wide as its content and sits at the left. Phone: it spans the form and the four buttons share the width.
- **Spacing:** `--forge-space-2` between the bar and the message box row.
- **Keys:** Left and Right move between the buttons; Space or Enter selects; selecting the selected one clears it.
- **Placeholder:** while a mode is selected the message box asks "What do you do?", "What do you say?", "What happens next?" or "What do you look at?". With no mode, SillyTavern's own placeholder is back. If this proves fragile, drop it and say so in the result file; it is a nicety.

### 5.4 Phone (window 1000px wide or less)

- No stage, no menu panel, no round buttons, whatever the settings say. SillyTavern's own phone bar and full-screen drawers stay, in the Forge look they already have.
- The send modes bar is the only new thing on a phone.
- Touch targets are at least 44px. Nothing causes sideways scrolling.

## 6. Send modes: behaviour

A mode changes what is sent only when all of these hold: send modes are on, a mode is selected, the message box is not empty (See is the one exception, below), the text does not start with `/` (a SillyTavern command), and the send comes from the message box (Enter by SillyTavern's own rule, or the send button). Text sent by scripts, Quick Replies or commands is never touched.

How to catch the send: listen in the capture phase for the same two things SillyTavern listens for, rewrite the message box's value, fire an `input` event on it, and let SillyTavern's own handler carry on. For Enter, use SillyTavern's own test: `!event.isComposing && !event.shiftKey && !event.ctrlKey && !event.altKey && event.key === 'Enter'` together with `shouldSendOnEnter()` from `scripts/RossAscends-mods.js`. Never rewrite the same text twice (remember the last result). Do nothing while SillyTavern is generating.

### What each mode sends

| Mode | You type | Sent (second person) | Sent (first person) |
|---|---|---|---|
| Do | `open the door` | `You open the door.` | `I open the door.` |
| Do | `Open the door!` | `You open the door!` | `I open the door!` |
| Do | `you open the door` | `You open the door.` | `You open the door.` |
| Do | `I'm leaving` | `I'm leaving.` | `I'm leaving.` |
| Do | `NASA badge out, walk in` | `You NASA badge out, walk in.` | `I NASA badge out, walk in.` |
| Say | `hello there` | `You say, "Hello there."` | `I say, "Hello there."` |
| Say | `"Who goes there?"` | `You say, "Who goes there?"` | `I say, "Who goes there?"` |
| Say | `You say hi` | `You say hi.` | `You say hi.` |
| Story | `The rain stops.` | `The rain stops.` as narration | the same |
| See | `the door` | `You look at the door.` | `I look at the door.` |
| See | (empty) | `You look around.` | `I look around.` |

### The tidy rules (setting "Tidy what I type", on by default)

1. Trim the ends. Line breaks inside the text are kept.
2. **End mark:** if the last character is not one of `. ! ? … " ' ” ’ * ) ] ~`, add a full stop. For Say the end mark goes inside the quotes.
3. **Do and See:** if the text starts with the word `you` or `I` (any case), add no "You" or "I" in front; make the first letter a capital. Otherwise make the first letter lower case, unless the first two characters are both capitals or the first word is `I`.
4. **Say:** remove one pair of quotes wrapped around the whole text (`"…"`, `“…”` or `'…'`), then make the first letter a capital. If the text starts with `you say` or `I say` (any case), leave it as typed apart from rules 1 and 2.
5. **Story:** rule 1 only.

With tidy off, only the template is applied.

### Templates

The second-person defaults are `You {{input}}`, `You say, "{{input}}"` and `You look at {{input}}`; first person swaps `You` for `I`. The owner can replace any of the three in an advanced fold. `{{input}}` is the tidied text. SillyTavern's own macros, such as `{{user}}`, are left in for SillyTavern to fill.

### Story as narration (the default)

Stop the native send. Add a narrator message with SillyTavern's own function (`sendNarratorMessage` in `scripts/slash-commands.js`, the code behind `/sys`), empty the message box, then start a normal reply the way `/trigger` does. With the setting on "my own message", Story is a plain send with rule 1.

### See as a picture (a setting)

If SillyTavern's Image Generation extension has registered its `imagine` command, stop the native send, run that command with the text passed so that no part of it can be read as a command, and empty the message box. If the command is not there, show one toast saying See needs Image Generation, and send the description form instead.

## 7. Settings

All keys live in `extension_settings.arcaneForgeUi`, next to the existing ones. "Look file" means Export look and Import look carry the key.

| Key | Type and range | Default | Label | Section | Look file |
|---|---|---|---|---|---|
| `layout` | `classic` or `stage` | `classic` | Forge layout: Classic / Stage (desktop) | Layout | no |
| `stageChat` | number 35 to 70 | 46 | Chat width | Layout | yes |
| `stagePlate` | boolean | true | Name on the stage | Layout | yes |
| `stageSprite` | boolean | true | Character sprite on the stage, when it has one | Layout | yes |
| `stageShade` | number 0 to 60 | 0 | Darken the stage art | Layout | yes |
| `menuPanel` | boolean | false | Menus open in one centred panel (desktop) | Menus | no |
| `menuButtons` | boolean | true | Two round buttons in place of the top bar | Menus | no |
| `menuLast` | drawer id | `ai-config-button` | (not shown) | | no |
| `menuPins` | object | `{}` | (not shown: the pins to put back) | | no |
| `modes` | boolean | false | Do, Say, Story and See buttons above the message box | Message box | no |
| `modesActive` | `''`, `do`, `say`, `story`, `see` | `''` | (not shown) | | no |
| `modesVoice` | `second` or `first` | `second` | Write my actions as: You … / I … | Message box | yes |
| `modesTidy` | boolean | true | Tidy what I type (first letter, full stop, quotes) | Message box | yes |
| `modesStoryAs` | `narration` or `message` | `narration` | Story goes in as: narration / my own message | Message box | yes |
| `modesSeeAs` | `describe` or `picture` | `describe` | See asks for: a description / a picture | Message box | yes |
| `modesTemplates` | `{ do, say, see }` strings, 200 characters at most | all empty (use the defaults) | Advanced: my own wording | Message box | yes |

Settings that only make sense when another is on are greyed out, not hidden.

## 8. The page we live in

Checked on 2026-11-15 in SillyTavern 1.19.0 and in TauriTavern 2.4.0, whose page has the same ids. Check again before relying on anything not listed here.

| Landmark | What it is |
|---|---|
| `#bg1`, `#bg_custom` | the background art, behind everything |
| `#top-bar` | the strip behind the top icons |
| `#top-settings-holder` | holds the top icons; `position: relative`, as wide as the chat, z-index 3005 |
| `#top-settings-holder > .drawer` | one per menu: a `.drawer-toggle` (the icon) and a `.drawer-content` (the menu) |
| `.drawer-content.openDrawer` / `.closedDrawer` | open or closed; SillyTavern switches the classes in `doNavbarIconClick` (`script.js`) |
| `.pinnedOpen`, `#lm_button_panel_pin`, `#rm_button_panel_pin`, `#WI_panel_pin` | pinned panels and their pin checkboxes (AI response, Characters, Lorebooks) |
| `#sheld` | the chat column: `#chat` (messages) then `#form_sheld` |
| `#form_sheld` | `#dialogue_del_mes` (delete bar), then `#send_form` |
| `#send_form` | Quick Reply's `#qr--bar` and other extensions' rows are prepended here; then `#nonQRFormItems` |
| `#nonQRFormItems` | `#leftSendForm`, `#send_textarea`, `#rightSendForm` (holds `#send_but`) |
| `--sheldWidth`, `--topBarBlockSize` | SillyTavern's chat width and top bar height; many of its rules use them |
| 1000px | SillyTavern's own phone boundary. Ours is the same: `(min-width: 1001px)` is desktop |

Useful functions, all SillyTavern's own:

- `sendTextareaMessage()` and `sendMessageAsUser()` in `script.js`: the send path. `sendMessageAsUser` runs the regex scripts on the text, adds the message, then emits `MESSAGE_SENT`.
- `shouldSendOnEnter()` in `scripts/RossAscends-mods.js`.
- `sendNarratorMessage(args, text)` in `scripts/slash-commands.js`.
- `SillyTavern.getContext()`: `eventSource`, `eventTypes`, `chat`, `name1`, `name2`, `groupId`, `groups`, `extensionSettings`, `saveSettingsDebounced`, `executeSlashCommandsWithOptions`, `SlashCommandParser`, `isMobile`.

Known traps:

- **A fixed element inside a transformed parent is positioned against that parent.** Never put `transform`, `filter`, `backdrop-filter` or `contain` on `#top-settings-holder` or `#sheld`. Another theme lost its drawers this way.
- **TauriTavern parks closed panels:** it hides blocks inside closed drawers and shows them again on opening (`top-settings-panel-parking.js`). Do not cache elements inside drawers, and do not measure a closed drawer.
- **TauriTavern makes every message focusable** (`tabindex="-1"`, `role="group"`) and does not draw off-screen messages (`content-visibility: auto`). Do not add focus styles to messages, and do not depend on off-screen messages having a size. `likeTauriTavern()` in the test helper stands in for both.
- **TauriTavern has its own expanded message editor** (classes starting `tt-chat-input`). Read its source before deciding how the send modes behave while it is open; hiding the bar while it is open is acceptable.
- **SillyTavern writes inline styles** on things it lets the user drag (sprites, floating panels).

## 9. Code

### Files and who owns them

| File | Owner | Notes |
|---|---|---|
| `index.js` | foundation, then the integration batches | the settings store, the feature list, the settings screen, the look file |
| `style.css` | foundation (the four `@import` lines only), then integration | existing rules are not edited by lanes |
| `css/tokens.css` | foundation, then integration | section 4 |
| `modes.js`, `css/modes.css`, `tests/browser/modes-*.mjs` | lane M | |
| `stage.js`, `css/stage.css`, `tests/browser/stage-*.mjs` | lane S | |
| `menu.js`, `css/menu.css`, `tests/browser/menu-*.mjs` | lane P | |
| `docs/redesign/results/<batch>.md`, `docs/redesign/changes/<batch>.md` | the batch | one file each, so nobody collides |
| `aiTab.js`, `deleteMode.js`, `fonts/`, `manifest.json`, `CHANGELOG.md`, `README.md` | nobody until integration | |

### The feature contract

`stage.js`, `menu.js` and `modes.js` each export exactly this. `index.js` holds them in one list and never needs editing to add what a feature does.

```js
export const id = 'modes';
export const defaults = { modes: false, modesActive: '' };   // merged into the settings defaults
export const lookKeys = { modesVoice: { type: 'enum', values: ['second', 'first'] } };
//   also { type: 'number', min, max }, { type: 'boolean' }, { type: 'string', max }, { type: 'strings', keys, max }
export function settingsHtml(s) { return ''; }               // one <h4> section for the settings screen; '' for none
export function bindSettings($root, s, save) {}              // wire that section's controls; call save() after a change
export function apply(s) {}                                  // put the page in the state the settings ask for
```

`apply(s)` is called on load, after every settings change, when the window crosses 1000px, and when a test fires the `arcane-forge-ui:apply` event on `document`. It must be safe to call any number of times, and it is the only place that adds or removes the feature. A feature is active only when `s.enabled` (Forge UI's main switch) and its own switch are on, and for stage and menu only on desktop.

### What features may share

| Name | Set by | Meaning |
|---|---|---|
| `body.forge-stage` | `stage.js` | stage layout is active |
| `body.forge-menu` | `menu.js` | menu panel is active |
| `body.forge-menu-buttons` | `menu.js` | the two buttons are showing and the top bar is hidden |
| `body.forge-modes` | `modes.js` | send modes are active |
| `--forge-stage-chat` | `stage.js`, on `body` | the chat column's width |
| `#forge-stage`, `#forge-spine`, `#forge-menu`, `#forge-menu-buttons`, `#forge-modes` | their feature | the only elements we add |

A feature's CSS may read another feature's class (`body.forge-stage.forge-menu-buttons …`) but never styles another feature's elements.

### Rules for the code

- Plain ES modules, the same style as `deleteMode.js`: small functions, a comment that says why, no classes.
- Every selector in feature CSS starts with `body.forge-ui.forge-<feature>`.
- `!important` only to beat an inline style SillyTavern writes or a native `!important`, with a comment saying which.
- Text from a chat, a character or a group reaches the page through `textContent`, never `innerHTML`.
- No network requests. No `localStorage`. Nothing saved outside `extension_settings.arcaneForgeUi`.
- No `MutationObserver` on `#chat` or its children. Watching class changes on `#top-settings-holder` is fine.
- Never change SillyTavern's own settings, except the pins in 5.2, which are put back.
- Never hold on to an element across calls; look it up when needed.
- New `id`s and classes start with `forge-`.

## 10. Neighbours

- **RPG Companion** may be installed. Do not select, style or move its elements. The one allowance: when its side panel is open at the right, the chat column must not sit under it. Find out how its panel is placed by looking at the page, not by editing it, and write what you found in the result file.
- **Quick Reply** and other extensions prepend rows to `#send_form`. The send modes bar stays the row nearest the message box.
- **Character Expressions** and visual novel mode (`body.waifuMode`): sprites belong on the stage, never over the chat column.
- **Floating panels** (the prompt manager popup, Author's Note, CFG, log probabilities): they are `.drawer-content` too, but live outside `#top-settings-holder`. The menu panel must leave them alone.
- **Other themes:** with Arcane Forge UI's main switch off, nothing of ours is in the page.

## 11. Access

- Everything works by keyboard. The focus ring is the existing ember ring, on what Tab can reach.
- The menu panel takes the focus when it opens, keeps Tab inside itself, and gives the focus back to the button that opened it.
- Text is at least 4.5 to 1 against its background, including muted labels.
- Selected is never shown by colour alone: the selected mode is also bold, the current section is also `aria-current`.
- Touch targets are at least 44px on touch screens and phones.

## 12. Tests

- Every batch adds or extends one test in `tests/browser/`, written with `_harness.mjs`. It prints `ok` or `FAIL` lines through `check()` and ends with `finish()`.
- Every feature test proves three things besides its own checks: off leaves no trace (none of our elements or classes, the landmarks where they were), it behaves at phone size (a line `// Usage: … [phone]` makes the runner run it twice), and no script error happened (`finish()` adds that check).
- Use only the Forge Tester chat the helper opens. Never open another chat, never read chat text beyond what the test itself typed, never take a screenshot of a page showing another chat.
- No test may call a model. The helper answers generate calls and refuses other hosts; do not work around it.
- Run one test: `node tests/browser/<name>.mjs`. Run a lane: `node tests/run.mjs <lane word>`. Run all: `node tests/run.mjs`.

## 13. Words

- Labels are plain English in sentence case, as in section 7. Buttons say what they do.
- The four modes are always written Do, Say, Story, See.
- Changelog lines say what changed for the person using it, in one or two sentences, newest first, under "Unreleased". Lanes write theirs to `docs/redesign/changes/<batch>.md`; integration folds them into `CHANGELOG.md`.
- Commit messages are one plain sentence in the imperative ("Add the send modes bar"), with a short body if needed.

## 14. Not now

Not part of this plan; do not start them: a search across every setting, a bottom tab bar on phones, a portrait card on the stage, new message styles, translations of Forge UI's own labels, anything for RPG Companion.
