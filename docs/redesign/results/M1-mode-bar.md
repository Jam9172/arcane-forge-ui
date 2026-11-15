# M1-mode-bar

## Built

- `modes.js`:
  - `defaults = { modes: false, modesActive: '' }`. `lookKeys` stays `{}`, because neither key goes in a look file (bible section 7).
  - `settingsHtml` returns a "Message box" section with one checkbox, "Do, Say, Story and See buttons above the message box". `bindSettings` saves it.
  - `apply(s)`: when `s.enabled && s.modes`, `body` gets `forge-modes` and `#forge-modes` is placed inside `#send_form`, directly before `#nonQRFormItems`. If another row ends up between the two, the next apply moves the bar back. Otherwise the class and the element are removed and SillyTavern's placeholder is restored.
  - The bar is a `role="radiogroup"` labelled "How to send". It holds four `<button type="button" role="radio">`: Do, Say, Story and See. Each has `aria-checked`, the title from the brief, and an 18px line icon built with DOM calls on a 24 by 24 grid.
  - A click selects a mode, and a second click on the same mode clears it. The choice is written to `modesActive` and saved with SillyTavern's `saveSettingsDebounced`.
  - Left and Right move the focus between the buttons and wrap round at the ends. Space and Enter are the buttons' own click. The selected button is the group's one Tab stop; with nothing selected, Do is.
  - Placeholder: while a mode is selected, the message box asks "What do you do?", "What do you say?", "What happens next?" or "What do you look at?". With no mode selected, SillyTavern's own placeholder comes back.
- `css/modes.css`: the look from bible section 5.3, built from tokens. Every selector starts with `body.forge-ui.forge-modes`.
  - The track: `--forge-inset` fill, `--forge-border` line, `--forge-radius-pill` corners.
  - The buttons: `--forge-control` tall, `--forge-radius-md` corners, `--forge-muted` text. Hover is `--forge-text`. Selected is an `--forge-ember` fill with `--forge-bg` text at weight 700.
  - Desktop: the bar is as wide as its buttons and sits at the left. Phone (1000px wide or less): it spans the form and the four buttons share the width.
- `tests/browser/modes-bar.mjs`: the brief's ten steps, plus the extra checks listed under "Choices".

## Test output

The final run, on the committed code from `4a2f173`:

```
$ node tests/browser/modes-bar.mjs
ok   off: no #forge-modes and no forge-modes class
ok   on: #forge-modes and body.forge-modes are there
ok   four buttons whose text is Do, Say, Story, See, in that order (Do, Say, Story, See)
ok   a radio group labelled "How to send" of type="button" role="radio" buttons (radiogroup, How to send)
ok   each button has its title (Do: what you do | Say: what you say out loud | Story: what happens next, as narration | See: look at something)
ok   each button has an 18px line icon on a 24 by 24 grid (0 0 24 24|18x18|none|1.8px|true)
ok   nothing is selected at first (false,false,false,false)
ok   the bar is inside #send_form and its next element sibling is #nonQRFormItems
ok   with Quick Reply's bar at the start of #send_form, the bar is still right before #nonQRFormItems (stand-in)
ok   on screen, Quick Reply's bar is above ours (ours at 809, Quick Reply ends at 801, its order 1)
ok   a row added after ours goes above it on the next apply
ok   the bar's bottom edge is above the message box and within 16px of it (8px)
ok   every button is at least 36px tall (36, 36, 36, 36)
ok   the bar is as wide as its buttons and sits at the left (bar 322px at 9px in)
ok   the labels are at least 4.5 to 1 against the track, selected or not (7.68 and 5.82)
ok   a click on Do checks Do and only Do (true,false,false,false)
ok   the setting is "do" ("do")
ok   the selected button is bold on an ember fill (700, rgb(232, 98, 44))
ok   the message box asks "What do you do?" (What do you do?)
ok   the choice is saved
ok   a second click on Do clears it (false,false,false,false)
ok   the setting is "" ("")
ok   the message box has SillyTavern's own placeholder again (Not connected to API!)
ok   with Say selected, a re-apply keeps Say selected (false,true,false,false)
ok   the message box asks "What do you say?" (What do you say?)
ok   a placeholder SillyTavern writes while a mode is picked gives way to ours (What do you say?)
ok   clearing the mode gives back what SillyTavern wrote last (Written by SillyTavern)
ok   the selected button is the one Tab stop (say)
ok   Right moves to the next button (story)
ok   Left moves back (do)
ok   Left from Do goes round to See (see)
ok   Space picks the focused mode (false,false,false,true)
ok   Enter on the selected mode clears it (false,false,false,false)
ok   the arrow keys stop at the bar, so they swipe nothing (0 reached the page)
ok   with nothing selected, Do is the Tab stop
ok   off again: the element and the class are gone
ok   the placeholder is what it was before the bar was turned on (Not connected to API!)
ok   the message box row is where it was (send_form > file_form + #nonQRFormItems)
ok   the choice is kept for next time
ok   off, nothing of ours rewrites the placeholder (Written by SillyTavern)
ok   main switch off with the modes on: no bar and no class
ok   main switch off: the placeholder is SillyTavern's (Not connected to API!)
ok   the settings have a Message box section between Panels and Keyboard (Text, Panels, Message box, Keyboard, Colours, Share)
ok   its checkbox reads "Do, Say, Story and See buttons above the message box", unticked (Message box: Do, Say, Story and See buttons above the message box)
ok   ticking it turns the bar on and saves the switch
ok   unticking it takes the bar away
ok   no script errors

$ node tests/browser/modes-bar.mjs phone
ok   off: no #forge-modes and no forge-modes class
ok   on: #forge-modes and body.forge-modes are there
ok   four buttons whose text is Do, Say, Story, See, in that order (Do, Say, Story, See)
ok   a radio group labelled "How to send" of type="button" role="radio" buttons (radiogroup, How to send)
ok   each button has its title (Do: what you do | Say: what you say out loud | Story: what happens next, as narration | See: look at something)
ok   each button has an 18px line icon on a 24 by 24 grid (0 0 24 24|18x18|none|1.8px|true)
ok   nothing is selected at first (false,false,false,false)
ok   the bar is inside #send_form and its next element sibling is #nonQRFormItems
ok   with Quick Reply's bar at the start of #send_form, the bar is still right before #nonQRFormItems (stand-in)
ok   on screen, Quick Reply's bar is above ours (ours at 700, Quick Reply ends at 692, its order 1)
ok   a row added after ours goes above it on the next apply
ok   the bar's bottom edge is above the message box and within 16px of it (8px)
ok   every button is at least 44px tall (44, 44, 44, 44)
ok   the bar is not wider than #send_form (bar 372px, form 390px)
ok   the bar spans the form (within 16px of each side) (9px and 9px)
ok   the four buttons share the width (88, 88, 88, 88)
ok   the page has no sideways scroll
ok   the labels are at least 4.5 to 1 against the track, selected or not (7.68 and 5.82)
ok   a click on Do checks Do and only Do (true,false,false,false)
ok   the setting is "do" ("do")
ok   the selected button is bold on an ember fill (700, rgb(232, 98, 44))
ok   the message box asks "What do you do?" (What do you do?)
ok   the choice is saved
ok   a second click on Do clears it (false,false,false,false)
ok   the setting is "" ("")
ok   the message box has SillyTavern's own placeholder again (Not connected to API!)
ok   with Say selected, a re-apply keeps Say selected (false,true,false,false)
ok   the message box asks "What do you say?" (What do you say?)
ok   a placeholder SillyTavern writes while a mode is picked gives way to ours (What do you say?)
ok   clearing the mode gives back what SillyTavern wrote last (Written by SillyTavern)
ok   the selected button is the one Tab stop (say)
ok   Right moves to the next button (story)
ok   Left moves back (do)
ok   Left from Do goes round to See (see)
ok   Space picks the focused mode (false,false,false,true)
ok   Enter on the selected mode clears it (false,false,false,false)
ok   the arrow keys stop at the bar, so they swipe nothing (0 reached the page)
ok   with nothing selected, Do is the Tab stop
ok   off again: the element and the class are gone
ok   the placeholder is what it was before the bar was turned on (Not connected to API!)
ok   the message box row is where it was (send_form > file_form + #nonQRFormItems)
ok   the choice is kept for next time
ok   off, nothing of ours rewrites the placeholder (Written by SillyTavern)
ok   main switch off with the modes on: no bar and no class
ok   main switch off: the placeholder is SillyTavern's (Not connected to API!)
ok   the settings have a Message box section between Panels and Keyboard (Text, Panels, Message box, Keyboard, Colours, Share)
ok   its checkbox reads "Do, Say, Story and See buttons above the message box", unticked (Message box: Do, Say, Story and See buttons above the message box)
ok   ticking it turns the bar on and saves the switch
ok   unticking it takes the bar away
ok   no script errors

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 13s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       modes-bar  47 checks, 19s
ok       modes-bar phone  50 checks, 19s

6 passed, 0 failed
```

A screenshot of the message box at both sizes, taken from a scratch script outside the repository with the Forge Tester chat, showed the bar under RPG Companion's row of plot buttons and right above the message box. Say was shown bold on ember, and the placeholder read "What do you say?".

## Choices the bible did not cover

- **Visual order in `#send_form`.** `#send_form` is a wrapping flex row that places its rows by `order`. Quick Reply's bar has `order: 1` and `#nonQRFormItems` has `order: 25`. A bar left at the default `0` would be drawn above Quick Reply's bar, even though it comes after it in the page. The bar therefore has `order: 24`, which keeps it the row right above the message box whatever order the rows were added in. The test checks this with Quick Reply's own stylesheet loaded (the stand-in picks up its `order: 1`). In the sandbox, RPG Companion's row of plot buttons also sits above the bar.
- **Spacing** (all from tokens):
  - The bar has `--forge-space-2` round all four sides, so it does not touch the form's border, and `--forge-space-1` padding inside the track.
  - There is `--forge-space-1` between buttons and `--forge-space-2` between each icon and its label.
  - Buttons have `--forge-space-3` padding at each side on a desktop and `--forge-space-1` on a phone, so the four fit a 390px screen.
- **Icons:** a lightning bolt for Do, a speech bubble for Say, an open book for Story and an eye for See. Each is one path, drawn to bible section 4.
- **Raw values left in `css/modes.css`, because no token covers them:**
  - `18px` and the 1.8 stroke for the icons (bible section 4).
  - The `1px` line.
  - `order: 24` (explained above).
- **Keys:**
  - Left and Right wrap round the ends, as in the usual radio group pattern.
  - Left and Right with a modifier key are left alone.
  - Only Left and Right move the focus (bible section 5.3 names no others).
  - The keys stop at the bar: SillyTavern's own Left and Right, which listen on `document`, swipe the last message when the message box is empty and no input has focus. The test checks that no arrow key reaches `document`.
- **One Tab stop for the group** (the selected button, or Do with nothing selected). The arrows move the focus without selecting, as the bible says, so Tab out and back returns to the selected one.
- **How a click saves.** `apply(s)` has no `save`, so a click reads the live settings through `SillyTavern.getContext().extensionSettings.arcaneForgeUi` and calls `saveSettingsDebounced()`. This means `modes.js` repeats index.js's settings key. Reading the live object (not the `s` from the last apply) keeps a click right after Reset writing to the saved object. A click updates only the bar and the placeholder; it does not re-run the whole extension's apply.
- **A click does not move the focus to the message box.** On a phone that would open the keyboard.
- **`modesActive` is kept** when the bar is turned off, so the same mode is selected when it is turned on again.
- **Placeholder (kept; it held up in testing):**
  - SillyTavern rewrites `#send_textarea`'s `placeholder` whenever the connection comes or goes (`RA_checkOnlineStatus`). It does this after load too, so a mode that was saved selected would lose its question within a second of every reload.
  - While a mode is selected, one `MutationObserver` watches only that attribute on `#send_textarea` (not `#chat`). When SillyTavern writes, the observer keeps SillyTavern's text, to give back later, and puts ours back.
  - When the mode is cleared or the bar is turned off, the observer is disconnected and SillyTavern's last text is restored.
  - What is kept is a string, not an element. The question also replaces "Not connected to API!" while a mode is selected; the bible makes no exception for that.
- **Narrow screens:** a label that cannot fit ends in an ellipsis rather than pushing the page sideways. `#form_sheld` sets `white-space: nowrap`.
- **No room is held for the bold label.** On a desktop the bar grows by a couple of pixels when a mode is selected. Holding that room would need a hidden bold copy of each label, which is more than the brief asks.
- **Extra checks in the test, beyond the brief's ten steps:**
  - the radio group's role and label, the titles and the icons;
  - a row put between our bar and the message box is moved above ours on the next apply;
  - on screen, Quick Reply's bar is above ours;
  - text contrast is at least 4.5 to 1, both for the muted labels against the track and for the selected label against ember;
  - the selected button is bold on an ember fill;
  - the click is saved (a settings save follows it);
  - the placeholder survives a SillyTavern rewrite and gives back what SillyTavern wrote last;
  - the keyboard behaviour and the single Tab stop;
  - the message box row is where it was after the bar is turned off;
  - with the bar off, nothing of ours touches the placeholder;
  - the settings section sits between Panels and Keyboard, and its checkbox turns the bar on and off.

## Asked of other files

None.

## Not done

- Nothing from the brief.
- TauriTavern's expanded message editor (`tt-chat-input`, bible section 8) was not looked at. This brief does not change what is sent, so how the modes behave while that editor is open is left to M2.

## Check

**PASS.** Checked on `batch/M1-mode-bar` at `d3d7aef`. The batch was cut from `overhaul` at `9eee05a`. `overhaul` has since moved to `1f070de` (S1-chat-column merged). That merge touched only lane S files and S1's docs, none of this batch's.

### (a) Files

- `git diff --name-only overhaul...HEAD` lists 5 files: `css/modes.css`, `modes.js`, `tests/browser/modes-bar.mjs`, `docs/redesign/results/M1-mode-bar.md` and `docs/redesign/changes/M1-mode-bar.md`. All five are under "You own". Nothing else changed.

### (b) Commands

- `node tests/browser/modes-bar.mjs`: 47 ok, exit 0.
- `node tests/browser/modes-bar.mjs phone`: 50 ok, exit 0.
- `node tests/run.mjs`: `6 passed, 0 failed` (foundation, harness and modes-bar, each at both sizes).
- Extra: a trial merge with today's `overhaul` (`git merge-tree`, exported outside the repository) merges cleanly. Its `node tests/run.mjs` gives `8 passed, 0 failed`, stage-column included.

### (c) Done when, one item at a time

- **The commands pass.** Yes, see (b).
- **Only the files under "You own" changed.** Yes, see (a). The build commit's message is the brief's, "Add the send modes bar".
- **`css/modes.css` has no raw colours or sizes that a token covers.** Yes. It has no hex, `rgb` or named colour. Every colour, space, radius and the control height is a token. The raw values left are `1px` (the line), `18px` and `1.8` (the icon size and stroke, set by bible section 4), `100%`, the `1000px` breakpoint (a media query cannot read a token) and `order: 24`. No token covers any of them.
- **Every selector starts with `body.forge-ui.forge-modes`.** Yes, all 8 rules, the 2 inside the phone media query included.
- **Brief build steps 1 to 6:**
  - `defaults` is `{ modes: false, modesActive: '' }`, and `lookKeys` is `{}`, as bible section 7 says (neither key is a look key).
  - The "Message box" `<h4>` has the one checkbox with the brief's exact label. It sits between Panels and Keyboard.
  - The bar is a `role="radiogroup"` labelled "How to send". It holds four `button type="button" role="radio"` in the order Do, Say, Story, See. Each has its title from the brief, `aria-checked`, and an 18px DOM-built line icon on a 24 by 24 grid (`fill: none`, `currentColor`, 1.8, round caps and joins).
  - A click selects and a second click clears. Left and Right move between the buttons, and Space and Enter select. The placeholder questions match bible section 5.3 word for word.
- **Bible section 3:**
  - Rule 1: no native control is copied or rebuilt. The bar is new; the placeholder is SillyTavern's own attribute, written while a mode is picked and given back after. Keeping SillyTavern's last placeholder text to give back is what section 5.3 asks for, the same as section 5.2's remembered pins. I do not count it as keeping a copy of SillyTavern's state.
  - Rule 2: see (d). With the switch off, no element, class, inline style or placeholder change is left. The listeners live on the bar, and the placeholder watch is disconnected.
  - Rule 3: the one new look gets its switch (`modes`). Section 7 lists no other setting for the bar. The labels use `--mainFontSize`, which measured 17px.
  - Rule 4: the test passes at phone size. The brief asks for no TauriTavern stand-in.
  - Rule 5: see the CSS item above.
  - Rule 6: see (a).
  - Rule 7: 191 lines of plain module, with no dependency.
- **Bible section 9:**
  - The contract holds: `modes.js` exports exactly `id`, `defaults`, `lookKeys`, `settingsHtml`, `bindSettings` and `apply`. `apply` checks `s.enabled && s.modes`, and it alone adds and removes the bar and `body.forge-modes`. A click changes only which mode is picked.
  - The only element added is `#forge-modes`. Its children's classes start with `forge-modes-`. The CSS styles no other feature's elements.
  - There is no `!important`, `innerHTML`, `localStorage` or network request. Labels go in with `textContent`. Everything saved is in `extension_settings.arcaneForgeUi`, through `saveSettingsDebounced`, which bible section 8 lists. No SillyTavern setting is changed.
  - The one `MutationObserver` watches only the `placeholder` attribute of `#send_textarea`, not `#chat`.
  - Functions are small, with comments that say why, and there are no classes.

### (d) Trying to break it

This was a scratch script outside the repository, using the test helper, so only the Forge Tester chat was open, saves were answered locally and no model was called. It ran at 1440px, at phone size (390px, touch) and in a 320px window. Every check passed at every size unless noted.

- **Main switch off directly while Say is picked, then on again with the bar off:** the page matched the snapshot taken before the bar was ever on. The snapshot covered the bar, the class, the inline styles and classes of `#send_form`, `#nonQRFormItems`, `#send_textarea`, `#form_sheld` and both side forms, the placeholder, and `#send_form`'s children in order. A placeholder written afterwards stayed as written, so the watch was gone.
- **Ten applies in a row:** one bar, Say still picked. Turned off after that: the page matched the snapshot again.
- **Reset with the bar on and Say picked:** the bar and the class were gone, the placeholder was SillyTavern's, and `modes` and `modesActive` were back to `false` and `''`.
- **What a click saves:** the settings save after a click on Story carries `modesActive: "story"`.
- **A real reload with See saved:** the page was reloaded with the modes on and `modesActive: 'see'` served in the settings. The bar came back with See picked. "What do you look at?" stayed after SillyTavern wrote its own placeholder on load. Clearing See gave back "Not connected to API!".
- **Crossing the boundary:** at 1000px the bar spans the form (982px in 1000px, no sideways scroll). At 1001px it is content-wide again (323px, at the left).
- **Phone and narrow:** four equal buttons at 390px (88px each) and at 320px (70px each). All are 44px tall, with no sideways scroll, and no label is cut off sideways or vertically, even with Story picked in bold.
- **Look:** the gap to the message box row (`#nonQRFormItems`, not only the textarea) is 8px. Hover gives `--forge-text`, and a hovered selected button keeps `--forge-bg` text. The ember focus ring (2px) shows on a button reached by keyboard. Up and Down do nothing in the bar. A screenshot of the bar alone (no chat area) at both sizes matches bible section 5.3.
- **With S1's stage layout on (the trial merge):** the bar is the row before `#nonQRFormItems`, 9px from the left of the chat column's form, 8px above the message box, with no sideways scroll.

### Problems found (none makes it FAIL)

1. The test's "the choice is saved" only counts that a save request was made. It reads neither what was saved nor the result of a reload. Both work (see (d)), but the test would not catch a save that left `modesActive` out.
2. While a mode is picked, the question replaces SillyTavern's "Not connected to API!" in the message box. The builder says so, and section 5.3 makes no exception. SillyTavern still hides the send button when not connected, so a cue remains. It is a choice for the owner to see.
3. The placeholder watch keeps hold of `#send_textarea` between calls, while a mode is picked (section 9: "Never hold on to an element across calls"). SillyTavern never replaces that element, and the watch is disconnected when the mode is cleared or the bar goes. The risk is small.
4. `order: 24` depends on SillyTavern's `order: 25` on `#nonQRFormItems`. It is commented, and the test's on-screen order check would catch a change.
5. The changelog line ("Pick one to shape what you type") only becomes true with M2. The brief dictates it, so integration should fold it in with M2 and M3.
6. On a desktop the bar grows by 1px when a mode is picked (322px to 323px). The builder says so; it is negligible.
7. Not from this batch: on a page reload in the sandbox, RPG Companion throws `infoBoxData.trim is not a function`, with the modes on or off. It does not happen in the normal test runs.
