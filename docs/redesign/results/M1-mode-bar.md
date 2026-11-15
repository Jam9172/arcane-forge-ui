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
