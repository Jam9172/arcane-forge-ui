# P1-menu-frame

## Built

- `menu.js`:
  - `defaults = { menuPanel: false, menuLast: 'ai-config-button' }`, `lookKeys = {}` (neither key goes in the look file, bible section 7).
  - `settingsHtml` adds a "Menus" section with one checkbox, "Menus open in one centred panel (desktop)" (`#forge-ui-menu-panel`); `bindSettings` saves it and re-applies through `index.js`'s `save()`.
  - `apply(s)`: active when `s.enabled && s.menuPanel` and `(min-width: 1001px)` matches. Active: `body.forge-menu`, `#forge-menu` appended as the last child of `body` (built with DOM calls), and one `MutationObserver` on `#top-settings-holder` (class changes, subtree, acting only on records whose target is a `#top-settings-holder > .drawer > .drawer-content`). Not active: the observer is disconnected, a pending hide is cleared, `#forge-menu` is removed and the class is taken off.
  - The frame: `#forge-menu` holds `.forge-menu-backdrop` and `.forge-menu-panel` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="forge-menu-title"`). The panel holds `nav.forge-menu-nav` (`aria-label="Menus"`) and `.forge-menu-head` with `h2#forge-menu-title` and `button.forge-menu-close` (`aria-label="Close"`, an inline SVG cross).
  - Showing: the frame is shown exactly when `#top-settings-holder > .drawer > .drawer-content.openDrawer:not(.pinnedOpen)` exists, worked out from the page on every change. The nav is rebuilt each time the frame goes from hidden to shown (and if the open drawer has no button yet), so drawers added later are listed.
  - The nav: one `button.forge-menu-section` per `#top-settings-holder > .drawer`, the nine from the bible's table first in its order and with its labels, any other drawer after them in page order, labelled with its icon's `title`. Each carries the top bar's icon for that drawer, a `title` from the native icon, and `aria-current="page"` when its drawer is open. The head shows the same label.
  - A nav button clicks its drawer's own `.drawer-toggle` unless that drawer is already open. Each time a drawer other than `rightNavHolder` opens, its id goes into `s.menuLast` (saved with `saveSettingsDebounced`, only when it changes).
  - The close button and a click on the backdrop click the open drawer's own `.drawer-toggle`, then hide the frame at once.
  - `mousedown` and `touchstart` stop at `#forge-menu`, so SillyTavern's "autocloses open drawers" handler on `html` never sees a press inside the frame (backdrop included).
- `css/menu.css`: the frame's look (bible sections 4 and 5.2) and the placement of the open menu, all under `body.forge-ui.forge-menu`.
- `tests/browser/menu-frame.mjs`: the brief's twelve steps, plus a few more (see below).

### How the open menu is placed

The drawer stays inside `#top-settings-holder`; its stacking layer (z-index 3005) is above the frame's (3003 and 3004), so the menu is drawn over the panel. The exact CSS:

```css
body.forge-ui.forge-menu {
    --forge-menu-top: calc((100dvh - var(--forge-menu-h)) / 2);
    --forge-menu-left: calc((100vw - var(--forge-menu-w)) / 2);
}

body.forge-ui.forge-menu #top-settings-holder > .drawer > .drawer-content:not(.pinnedOpen) {
    position: fixed;
    top: calc(var(--forge-menu-top) + var(--forge-menu-head)) !important;
    left: calc(var(--forge-menu-left) + var(--forge-menu-nav)) !important;
    right: auto !important;
    bottom: auto !important;
    width: calc(var(--forge-menu-w) - var(--forge-menu-nav) - 1px) !important;
    height: calc(var(--forge-menu-h) - var(--forge-menu-head) - 1px) !important;
    min-width: 0;
    max-height: none;
    margin: 0 !important;
    border: 0;
    border-radius: 0 0 calc(var(--forge-radius-lg) - 1px) 0;
    background: transparent;
    box-shadow: none;
    resize: none;
    transition: none;
}

body.forge-ui.forge-menu #top-settings-holder > .drawer > .drawer-content:not(.pinnedOpen) > .drag-grabber {
    display: none;
}
```

The panel is placed from the same two figures (`top: var(--forge-menu-top); left: var(--forge-menu-left)`, `--forge-menu-w` by `--forge-menu-h`, `box-sizing: border-box`, a 1px edge). Its grid columns and rows are `calc(var(--forge-menu-nav) - 1px)` and `calc(var(--forge-menu-head) - 1px)`, so the nav ends exactly `--forge-menu-nav` and the head exactly `--forge-menu-head` from the panel's outer edge, where the menu starts. The menu's own overflow is SillyTavern's (`overflow-y: auto` on an open drawer; the AI response and Characters panels scroll in their inner blocks), so it scrolls inside itself.

`!important` is on the place and size only: with MovingUI on, SillyTavern writes a dragged panel's `top`, `left`, `right`, `bottom`, `margin`, `width` and `height` inline (`dragElement` in `RossAscends-mods.js`, `loadMovingUIState` in `power-user.js`). No native `!important` rule touches these drawers' place (the only one, `.drawer-content.maximized`, is for the floating panels outside `#top-settings-holder`), and the native `min-width`/`min-height: 100px !important` on the side panels and `#WorldInfo` is smaller than the content area, so it does no harm.

### Which elements had to lose a property to keep `position: fixed` honest

None. I read the computed `transform`, `filter`, `backdrop-filter`, `contain`, `will-change`, `perspective`, `container-type` and `content-visibility` of every ancestor of the drawers, and of each `.drawer`, in the sandbox: `.drawer`, `#top-settings-holder` and `body` have none of them. The one that does is `<html>`: SillyTavern's own `style.css` gives it `-webkit-transform: translateZ(0)` and `-webkit-perspective: 1000` ("fix for chrome flickering on blurred divs"), which makes `<html>` the containing block for every fixed element in the page, SillyTavern's own side panels included. Because `<html>` is exactly the window (`body` is `100dvh` with `overflow: hidden`, and the root never scrolls), the drawer still lands where the formulas say, and the test measures it there. I left it alone; it is not ours, and removing it would change SillyTavern for everyone.

## Test output

```
$ node tests/browser/menu-frame.mjs
ok   off: the Settings menu opens
ok   off: there is no #forge-menu
ok   off: the menu is where SillyTavern puts it (under the top bar, as wide as it) (menu 360,35 720x831, top bar 360,0 720x35)
ok   off: it closes again
ok   on: body has forge-menu
ok   on: #forge-menu is the last child of body
ok   on: with no menu open the frame is hidden
ok   on: opening Settings shows the frame
ok   on: the panel is centred in the window (left 170, right 170, top 60, bottom 60)
ok   on: the panel is --forge-menu-w by --forge-menu-h (170,60 1100x780, tokens 1100x780)
ok   on: the panel is a modal dialog labelled by its title, which says Settings ({"role":"dialog","modal":"true","title":"Settings"})
ok   on: the nav is --forge-menu-nav wide and the head --forge-menu-head tall (nav 220px, head 56px)
ok   on: the Settings menu starts right of the nav and below the head (menu 390,116 879x723, nav right 390, head bottom 116)
ok   on: the Settings menu ends inside the panel (menu 390,116 879x723, panel 170,60 1100x780)
ok   on: the menu scrolls inside itself and the page does not scroll (overflow auto, 2408px of content in 723px)
ok   on: the menu is still inside #top-settings-holder
ok   on: the nav lists the nine menus in order (Characters, AI response, Connection, Formatting, Lorebooks, Personas, Backgrounds, Extensions, Settings)
ok   on: each nav button has the native icon's title (all nine)
ok   on: each nav button shows the top bar's Forge icon (all nine)
ok   on: exactly one nav button is current: Settings (Settings)
ok   Lorebooks: #WorldInfo is open
ok   Lorebooks: #user-settings-block is closed
ok   Lorebooks: the frame is still shown
ok   Lorebooks: the frame did not hide while the menus changed (0 hide(s))
ok   Lorebooks: aria-current moved to Lorebooks (Lorebooks)
ok   Lorebooks: the head says Lorebooks
ok   menuLast is WI-SP-button after opening Lorebooks (WI-SP-button)
ok   the Lorebooks menu lies in the content area too (390,116 879x723 vs 390,116 879x723)
ok   the head point is on the head (head)
ok   a click on the head closes nothing
ok   the nav point is on an empty part of the nav (nav)
ok   a click on an empty part of the nav closes nothing
ok   the menu point is on the open menu (menu)
ok   a click inside the open menu closes nothing
ok   the close button: no menu is open
ok   the close button: the frame is hidden
ok   reopened: the frame is shown
ok   the backdrop point is on the backdrop
ok   the backdrop: no menu is open
ok   the backdrop: the frame is hidden
ok   a stand-in drawer: the nav ends with a button labelled Extra (Characters, AI response, Connection, Formatting, Lorebooks, Personas, Backgrounds, Extensions, Settings, Extra)
ok   a stand-in drawer: its button shows its own icon
ok   the settings have a Menus section with the panel's checkbox, unticked ({"heading":true,"label":"Menus open in one centred panel (desktop)","checked":false})
ok   ticking it turns the panel on, with the open Extensions menu inside the frame (menuPanel true, menu 390,116 879x723)
ok   unticking it takes the panel away again
ok   main switch off: nothing of the panel is in the page
ok   off again: no #forge-menu and no forge-menu class
ok   off again: the Settings menu is where it was in step 1 (360,35 720x831 vs 360,35 720x831)
ok   no script errors

$ node tests/browser/menu-frame.mjs phone
ok   phone, off: the Settings menu opens (0,35 390x755)
ok   phone, on: no forge-menu class and no #forge-menu
ok   phone, on: the Settings menu opens where SillyTavern puts it (0,35 390x755 vs 0,35 390x755)
ok   phone, on: still nothing of the panel in the page
ok   no script errors

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 13s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       menu-frame  49 checks, 26s
ok       menu-frame phone  5 checks, 14s

6 passed, 0 failed
```

Step 9 (`menuLast`) is checked straight after step 5, as the brief says, because step 8 opens Settings again and so moves `menuLast` on.

### Also checked, with scratch scripts outside the repository

- **Every section takes the same box.** AI response, Connection, Formatting, Lorebooks, Personas, Backgrounds and Extensions, opened from the nav one after another, each sit at 390,116, 879 by 723 at a 1440 by 900 window, with `overflow-y: auto` and no sideways overflow. (Characters was not opened, to keep other characters' names off the screen; P3 tests it.)
- **The press guard is what the test measures.** With the `mousedown`/`touchstart` listener taken out for one run, steps 6 and 7 failed (SillyTavern closed the menu on the first press on the head). It was put back and the run passed again.
- **Crossing 1000px with a menu open:** at 900px wide the frame and class are gone and SillyTavern's Settings menu stays open in its own place (0,35, 900 by 855); back at 1440px the frame is there again with the menu in it.
- **Closing from the top bar's own icon:** 60ms after the click the menu is closed and the frame still up; 460ms after, the frame is hidden.
- **SillyTavern's animation duration at 0** (what its Reduced Motion setting does): changing section from the nav never hides the frame, because SillyTavern then swaps the menus in one go.
- **Screenshots** at 1440 by 900 of the Settings and Extensions sections, with only the Forge Tester chat behind the backdrop, look as bible section 5.2 draws it. The top bar stays above the backdrop and usable, as the bible's layer numbers put it (3005 over 3003 and 3004); a top bar icon changes the section in the panel. RPG Companion's side panel, at the right of the sandbox, lies under the backdrop (dimmed) while the frame is open; nothing of it is selected or styled.

## Choices the bible did not cover

- **No blink between sections.** When one menu replaces another, SillyTavern closes the open drawer, waits its animation duration (125ms; `await delay(animation_duration)` in `doNavbarIconClick`), then opens the next. Hiding the frame the moment no menu is open would make the backdrop and panel blink off and on at every change of section. So a close that did not come from the frame hides it only after twice SillyTavern's animation duration (read from its `--animation-duration` on `<html>`; 0 with its Reduced Motion setting, when SillyTavern does not wait either), and only if no menu has opened by then. The timer keeps no record of which menu was open; it looks at the page again when it fires. The close button and the backdrop hide the frame at once. The test watches the frame's `hidden` attribute through a change of section and finds no hide.
- **The drawer drops its own surface in the panel.** Forge's `style.css` gives every drawer a gradient fill (`--forge-drawer-fill`), a border, an 8px corner and a large shadow. Inside the panel that drew a second box inside the first, a gradient (bible section 4: flat fills), and a second shadow (only the panel casts one). In the frame the drawer has no border, no shadow and a transparent background, so the panel's flat `--forge-card` shows through; its bottom right corner is rounded to the panel's inner radius so its content cannot poke out of the panel's corner. The Drawer opacity setting therefore has no effect on a menu while it is in the panel.
- **No animation, no dragging, no resizing in the panel.** SillyTavern grows a drawer from height 0 (`transition: height, display` with `@starting-style`). In the panel that would be a second motion besides the one the bible allows (P4's fade and scale), and on closing it would flash the drawer back at its old place for 250ms while it shrank. So the drawer has `transition: none` in the frame. With MovingUI on, the drag handles (`.drag-grabber`) of the AI response, Lorebooks and Characters panels are hidden and `resize` is off, because a drag inside the panel would do nothing visible but would still save a new place for the panel in SillyTavern's settings.
- **The geometry rules cover closed drawers too** (`:not(.pinnedOpen)`, not `.openDrawer`). Closed drawers are `display: none`, so this only means a drawer that is closing is never put back at its own place for a moment.
- **Pinned panels keep their own place** and do not show the frame (they are excluded by `:not(.pinnedOpen)`). P3 deals with them.
- **The nav's icons are the top bar's own.** Forge's `style.css` draws each top bar icon as a mask from a `--forge-top-icon` property on the native `.drawer-icon`. `menu.js` reads that property off the native icon and draws the same mask, so the nav shows exactly what the top bar shows (the plug with the warning mark while there is no connection, for example) without a second copy of the ten icons. A drawer Forge has no icon for (another extension's) gets its own icon's `fa` classes on the nav button, i.e. the same glyph the top bar shows. The close button's cross is a new icon, so it is an inline SVG built with DOM calls (24 by 24, stroke 1.8, round caps and joins, 18px).
- **Titles.** The Backgrounds drawer keeps its title on the `.drawer-toggle`, not on the icon, so the title falls back to the toggle's. A drawer with neither is labelled with its id.
- **Drawers without an id** are found again by their place among the drawers. Such a drawer is never written to `menuLast`, since it has no id to write.
- **A nav button for a drawer that is open but pinned does nothing** ("unless it is already open" read as open, pinned or not), because clicking its toggle would unpin-close it.
- **`aria-owns`.** With `aria-modal="true"`, screen readers treat everything outside the dialog as inert, and the menu is outside it in the page. The panel's `aria-owns` names the open menu (when it has an id), which hands it to the dialog for screen readers without moving it.
- **Look of the nav and head, where the bible gives no value:** nav buttons are `--forge-soft` text on the card, icons `--forge-brass`; hover is `--forge-active` with `--forge-text`; current is `--forge-ember` with `--forge-bg` text and icon. The nav has `--forge-space-3` / `--forge-space-2` padding and `--forge-space-1` between buttons, and a 1px `--forge-border` line on its right; the head has a 1px `--forge-border` line under it and `--forge-space-5` before the title. The close button is a `--forge-control` square with `--forge-radius-sm`, brass, and `--forge-active` on hover. The title is the heading font, 1.15em, 700, brass, cut with an ellipsis if long. No new settings: the bible's settings table has none for these.
- **Raw values in `css/menu.css`:** the backdrop's `rgb(0 0 0 / 55%)` (the bible's "55% black"; there is no token for it), the icons' `18px` and stroke `1.8` (bible section 4, Icons), and `1px` for the panel's edge (bible section 4, Lines). Each has a comment.
- **Extra checks in the test:** the panel's role, `aria-modal` and title; the nav's width and the head's height against the tokens; each nav button's `title` and icon; that the drawer is still inside `#top-settings-holder`; the frame not hiding while the menus change; the Lorebooks menu taking the same box as Settings; a stand-in drawer's own icon; the settings screen's Menus checkbox, ticked while the Extensions menu is open (the menu moves into the panel at once) and unticked again; and Forge UI's main switch off with the panel on.

## Asked of other files

- `css/tokens.css` (integration): a token for the backdrop's dim, such as `--forge-menu-dim: rgb(0 0 0 / 55%)`, would take the one raw colour out of `css/menu.css`.

## Not done

Nothing.
