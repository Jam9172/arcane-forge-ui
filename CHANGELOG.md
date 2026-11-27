# Changelog

Newest first. The version number is in `manifest.json`. Changes collect under "Unreleased" and ship together in the next release.

## Unreleased

- Trackers: **swiping a reply now starts from the values before it**. A new swipe was written from the values of the reply it replaced, so time moved on twice and things from the discarded reply stayed in the inventory. The same is fixed for regenerating or deleting the first reply that stated the trackers (the values go back to not set, or to what you typed), and for another model keeping them, which was given the same wrong starting values.
- Trackers: story text that mentions a "tracker" is no longer cut out of a reply. Only a line that is nothing but the heading ("[Trackers for Name:", "Name's trackers:", "Updated trackers") goes out with the block.
- Trackers: the note is set again as each request starts, so it can no longer go missing (saving a character card in a chat that had only its greeting dropped it, and the trackers stopped updating). Impersonate and background requests (image prompts, summaries) no longer get the instruction to write the block.
- Trackers: a block that was cut off (the reply ran out of length, or you pressed Stop) no longer has its half-written last line read as a value. Earlier blocks in the same reply and an empty code box around a block go out too, and one of several replies from a single request has its block read when you swipe to it.
- Trackers: a branch or checkpoint made from an earlier message opens with that message's values, not the parent chat's latest.
- Trackers kept by another model: opening a chat that has only its greeting no longer sends a request; an answer about a reply you have swiped away is dropped; and when a second reply arrives before the first answer, it is asked about afterwards instead of the first being thrown away.
- Trackers: things with a comma in them stay whole ("1,000 gold coins", "map (torn, stained)"), a stat written as a change ("100 → 85") takes the new number, and "8/10" counts as 80. A stat can no longer be given the name of another stat or of one of the tracker's own lines.
- Trackers: **Tell the story's AI the values** leaves out lists that are empty, and sends nothing while **Ask the AI to keep them up to date** is off, as the note under that box says. In a chat with no character nothing is sent.
- **Reset to Forge defaults** forgets the other model's key together with its address.
- Fixed **Import look** reading an empty or non-number size as the smallest size.
- Lorebook keeper: **your own text is never taken for the Latest note.** Only one line is the note: the line that starts with "Latest: " at the start of an entry's last paragraph. A "Latest:" line among your own lines, an entry that is only such a line, and lines you type right under the note stay yours (lines under the note move up, above it).
- Lorebook keeper: the lorebooks under **Lorebooks it may change** can be ticked in Chrome, Edge and other Chromium browsers, with the mouse, a tap or the keyboard. The list was drawn again each time it got the focus, which swallowed the click.
- Lorebook keeper: **Undo**, **Put back** and a save no longer write to a different entry that took a deleted entry's number. If the entry's title is not the one recorded, nothing is written and it says the entry is no longer in the lorebook.
- Lorebook keeper: an entry's title is shown as plain text in the question Undo asks.
- Lorebook keeper: **Undo** of a Latest note only ever takes the note back; your own text stays, also after the question. Every undo is listed in History with the text it replaced.
- Lorebook keeper: an answer it cannot read (cut off, empty, a refusal) is now a failed check: nothing is changed, it says so, and that part of the story is read again. The request also asks for an answer long enough for the entries it carries, and a block with extra attributes is read.
- Lorebook keeper: a block that only says "No change" is no longer saved as a note or over an entry. A rewrite that lost half of a short entry is refused, a `<text>` wrapper around a rewrite is taken off, "<50%" and ">100" stay in a note, and drafts inside a model's thinking are ignored.
- Lorebook keeper: a long stretch of unread story is read in order, oldest first, as much as one request holds, and the rest at the next check (it used to be skipped and marked as read). **Update now** says when there is more to read.
- Lorebook keeper: **Update now** during a reply leaves the reply that is still being written for later.
- Lorebook keeper: a check that was waiting for its answer saves nothing once the keeper is switched off, and nothing to a lorebook unticked meanwhile.
- Lorebook keeper: a save that fails is reported, is not left in the page's copy of the lorebook, and that part of the story is read again. Undo and Put back say so when the lorebook cannot be read or saved.
- Lorebook keeper: names of two characters (Al, Bo) and names in Chinese, Japanese and Korean text are found, and looking through a large lorebook is much faster.
- Lorebook keeper: the older placeholders `<USER>`, `<BOT>` and `<CHAR>` in an entry are kept as they are when it is rewritten.
- **Import look** no longer takes a Do, Say or See wording that starts with "/": it would have turned everything you sent into a SillyTavern command. Such a wording is never used, wherever it came from; typed into the settings it stays as you typed it, and its box says why it is ignored.
- **See** as a picture: when no picture comes (Image Generation is not set up, or the request fails or is stopped), what you typed is put back in the message box instead of being lost.
- **Story**: words entered right after a Story through an input method (Chinese, Japanese, most phone keyboards), or in a group chat, no longer go out as your own message. They wait in the message box, as plain typing already did.
- **Do**, **Say** and **See**: a message that could not be sent, and that you then edited, is no longer wrapped a second time ("You You open the door") with tidying off or with your own wording.
- Tidying no longer adds a full stop after text that already ends in punctuation of any script, a dash, a colon or a backtick: `你好。` is sent as You say, "你好。"
- **Say** keeps apostrophes at both ends of what you type: 'Evenin', darlin' is no longer sent as "Evenin', darlin."
- **Story** and **See** as a picture, sent with the send button: the cursor goes back to the message box, so a phone's keyboard stays open.
- Profile cards: saving **About** after you had started **Create new character** and gone back no longer makes a new character; it saves to the character you are editing. An edit is no longer lost when you open another chat or character right after closing the card.
- Profile cards and the Three columns profile: macros in a description that change a variable (`{{incvar}}`, `{{setvar}}`) no longer run each time the profile is shown.
- Three columns: what you type in the profile's trackers is no longer interrupted when a message is sent, a reply arrives or settings are saved.
- Three columns: right after you open another character, the previous character's chats can no longer be clicked and opened under the new one.
- Three columns: dragging a slider or a colour in these settings no longer asks SillyTavern for the chat list at every step.
- Three columns: SillyTavern's enlarged picture (Profile cards off) is shown over the columns instead of behind them.
- Menu panel: SillyTavern's colour pickers in User Settings can be reached with Tab. In Three columns, closing the panel gives the focus back to the rail button that opened it.

- Trackers: **the story decides**. When a reply states the time, date, place or weather, the trackers now take exactly that, also when it differs from what they said before; time is only worked out when the reply does not state it. This holds for both keepers.
- Trackers kept by another model: new switch **Tell the story's AI the values, so the story goes by them** (off unless you turn it on). The values as they stand go along at the very end of what is sent, with nothing to write back, so a prompt cache is not disturbed.
- Trackers: a heading such as **[Trackers for Name: ]** no longer stays behind in a reply. Some models copied the brackets of the tracker note around their block, and only the block was taken out. Now the heading and brackets go with it, also when they come empty, and the note itself no longer has brackets to copy. With another model keeping the trackers, a block the story's AI writes anyway is taken out and not read.
- Trackers: **another model can keep them up to date**. Under Trackers, set **Kept up to date by** to **Another model, after each reply**, and enter a chat completions URL, the model's ID and an API key. Nothing about the trackers is then added to what the story's AI is sent; after each reply a second, small request goes to that address with the values as they stand and the last few messages (four unless you change it), and its answer moves the trackers on. Any service that speaks the chat completions format works, one on your own machine included. The key is kept on this device only (not in the settings file, not in a look file, not synced) and is not shown again once it is saved; the app's own saved keys are never sent to that address. **Test** tries the connection and **Forget the key** removes the key. A line over the trackers says who keeps them, with a button to ask again, and says so when an update failed. TauriTavern asks once whether that address may be used.

- New **Lorebook keeper** (off by default; turn it on under Lorebook keeper): it keeps the characters in your lorebooks up to date as the story moves. Every few AI replies (10 unless you change it) one extra request goes to your AI with the newest part of the story and the entries of the characters named in it, and the entries that changed are saved. You tick which lorebooks it may change; only an entry's text is ever touched, never its keys, title or settings, and disabled entries and Memory Books' memories are left alone. By default your own text stays as it is and one short **Latest** note is kept under it; **A rewrite of the entry** is the other choice. **What to add** says what belongs in a character's entry (looks, health, relationships, role and place, belongings, goals, skills, what they know): untick what you do not want and add your own in a box, and **See what the AI is told** shows the whole guide. Passing moods, single actions and guesses are never added. Each change has **Undo**, **History** lists them all, a rewritten entry can always be put back to its first text, and **Ask me before saving a change** shows a change before it is saved. In the Three columns profile it shows who was updated and when the next check is, with **Update now**. It reads up to the reply before the newest one, which may still be swiped. No other extension is needed.

- New **Trackers** in the Three columns profile (off by default; turn them on under Trackers): **Time and place** (time, date, location, weather), **Stats** as percent wheels, four to a row, and an **Inventory** (on person, wearing, and things stored by place). They are kept per chat. With **Ask the AI to keep them up to date** on, a short note with the current values goes out with each request and the AI writes them back at the end of its reply; that block is read, taken out of the message and never shown. Deleting or swiping a reply puts the values back to what they were before it. Everything can be changed by hand: click a time or place to type, click a wheel for its slider, the pencil beside a list to edit it, the plus to add a place where things are stored. The stats are yours: add, rename, recolour and remove them (up to 12) under Trackers, where each of the three parts also has its own switch. No other extension is needed for these.

- Profile cards: **About can be edited right in the card**. Click the text and type; it is saved to the character or the persona itself a moment after you stop, and when you leave the box or close the card ("Saved" shows beside the heading, "Not saved" if it could not be). While you edit you see the text as it is stored, `{{char}}` and `{{user}}` included; otherwise the names are filled in. In the profile on the right, the banner and the name now open the card as well as the picture.

- Three columns: **profile cards**. Click a picture (in the chat, in the profile on the right, in the list of who is in the chat, or your own beside your persona's name) and a window opens with that character's or persona's picture at full size and their profile beside it: name, tags, description, personality, creator's notes and lorebook for a character; name, description and lorebook for a persona. Click the picture to see the whole of it; Escape, the close button or a click beside the window closes it; **Edit** goes to SillyTavern's own editor. Narration and system messages keep SillyTavern's own picture zoom. Turn it off under Three columns to get that zoom back everywhere.
- A menu no longer freezes after you use one of its drop-downs. SillyTavern's searchable drop-downs (the lorebook pickers in **Lorebooks**, tags and others) stop the menu behind them from scrolling for as long as their list is open, and the ones that pick several things stay open after a pick. Scrolling outside an open list now closes it, so the menu scrolls.
- Three columns: **Author's Note** and **CFG Scale** open as a proper window beside the character rail (they came out as a thin sliver at the left edge).
- **Do** no longer puts "You" or "I" in front of a sentence that already has its own subject: "My leg hurts." and "The door creaks open." are sent as typed (it used to send "I My leg hurts.").
- New **Three columns** layout for desktop (off by default; choose it under Layout). Your characters are a rail down the left edge, most recent first, with the open character's chats beside it and your persona underneath. The story is in the middle as one reading column with roomier text and no boxes round the messages, and the message box is one rounded card under it. The character's profile is on the right: picture, name, tags, the start of the description, the lorebooks in use and who is in the chat. The row of icons across the top is gone; Lorebooks and Menu are at the foot of the rail, and every menu opens in the menu panel. The text fills the middle column; under **Three columns** you can narrow the reading width, hide the profile (also the button at the top right of the chat), and hide each chat's last line in the chat list. Windows narrower than 1280px drop the profile; phones keep the classic layout.
- New **Do, Say, Story and See** buttons right above the message box, on desktop and phones (off by default; turn them on under Message box). Pick one to shape what you type; pick it again to go back to plain sending. **Do** and **Say** tidy and wrap what you type: "open the door" is sent as "You open the door.", and "hello there" as You say, "Hello there." **Story** puts what you type into the chat as narration and the AI carries on from it. **See** asks what something looks like ("the door" becomes "You look at the door."), or asks Image Generation for a picture if you choose that. Under Message box you can write as "I" instead of "You", switch the tidying off, or use your own wording.
- New **Stage** layout for desktop (off by default; choose it under Layout): the chat is one column on the right and the background art gets the rest of the window, centred on its own area, with the character's name on a plate and their sprite when they have one. Drag the chat's left edge to resize it (double-click it to reset), or set **Chat width**; **Darken the stage art** dims the art. If RPG Companion's panel is open at the right, the chat column moves over to leave it room.
- New **menu panel** for desktop (off by default; turn it on under Menus): every SillyTavern menu, your characters included, opens in one centred panel, with the menus listed down its left side so you can move between them without closing it. The row of icons across the top is replaced by **two round buttons** at the top right, one for your characters and one for every other menu; a red dot on the menu button means there is no API connection (turn the buttons off to keep the top bar). Panels you had pinned beside the chat are unpinned while the menu panel is on and pinned again when you turn it off. Escape closes it, Tab stays inside it, the keyboard focus goes back to where you opened it from, and it fades in, or appears at once with reduced motion on.
- With Arcane Forge UI's main switch off, nothing of it is left in the page (some of its classes and colours used to stay behind).
- TauriTavern: clicking a message and then pressing a key no longer puts the ember focus ring around the whole message. TauriTavern makes every message focusable for its own code (not with Tab), and the ring matched anything focusable. The ring is now only for what Tab can land on, plus real controls (buttons, links, checkboxes) however they get the focus.
- TauriTavern: choosing **Delete messages** no longer throws the chat back to the first loaded message. TauriTavern puts the keyboard focus on that message's checkbox when delete mode opens, and some of its webviews (iPhone and iPad among them) scroll to it. The focus now goes to a checkbox that is on screen and the chat is held where it was, until you scroll. Only while Arcane Forge UI is on; SillyTavern itself never jumped.
- Fixed TauriTavern's per-preset "leave out" lists being lost. With the Forge AI layout on, a preset's list is set aside; if you saved or renamed the preset in the meantime, the list never came back when the layout was turned off. It is now written back into the saved preset too, and a renamed preset takes its list along.
- Fixed **Import look** doing nothing, with no message, for a file whose look is empty (`"look": null`). It now says the file is not an Arcane Forge UI look.
- Fixed message text running under the swipe arrows of the last reply (on phones a tap on a word could hit an arrow). The text now ends clear of the arrows and of the counter under them: the last line stops short of them, or they get a line of their own when it is full. With the arrows at both ends on a phone, the text stops above them.
- Phones fit more text: with **Compact messages on phones** (on by default) the avatar shrinks to sit beside the name and the padding is trimmed, so a message's text runs its full width instead of beside an avatar column (about 40% more per line on an iPhone). New **Phone chat text** size under Text (100% by default), used on phones in place of Chat text, so the phone can be smaller than the desktop.

- Personas, Advanced Formatting and World Info get the Forge card layout User Settings has: each column or block is a card and the pill-shaped section bars are brass headings. Styling only, so every control stays where it was. Can be turned off ("Forge cards for Personas, Advanced Formatting and World Info"). API Connections is unchanged.
- Drawers that open over the chat and the RPG panel (the character card and the top bar's menus) are solid now, so the panel and text under them no longer show through. New **Drawer opacity** setting under Panels (100% by default) if you want them see-through again.
- Fixed SillyTavern buttons that are just an icon (the star, book, globe, export and delete buttons on the character card, and others) showing as empty boxes: the heading font reached their icons.
- Both swipe arrows sit together at the bottom right of a message (‹ ›), with the swipe counter centred under them, instead of one at each side. Can be turned off ("Both swipe arrows on the right of the message").
- New Forge icons in the message box: the menu is three bars with diamond studs, the wand is a slim wand with star sparkles, and Send is an ember arrow with a forged head and fletching. They follow your palette colours. Can be turned off ("Forge icons for the message box").
- README: the RPG Companion fork is now called RPG Companion Arcane.

## 0.11.0 (2026-11-02)

- Extensions drawer: each extension is a flat Forge card with a slim accent edge (brass on hover, ember when open), a plain chevron that turns when the card opens, and its settings joined to the header as one card. The order is unchanged. Can be turned off ("Forge cards for the Extensions drawer").

## 0.10.1 (2026-11-02)

- Italics inside coloured dialogue keep the speaker's colour again (for example `<font color=…>"I *told* you"</font>` from RPG Companion's Dialogue Coloring). Italics inside plain quotes keep the quote colour too. Italics in narration are unchanged.

## 0.10.0 (2026-11-02)

- Colour pickers now reach every shade: buttons, borders, the top bar, message tints and overlays are all mixed from your colours, and RPG Companion's Forge panel follows them too.
- New Danger colour picker (delete buttons and warnings).
- Palettes: built-in Ember, Frost, Night and Verdant, plus your own saved palettes.
- Export look / Import look: save colours, fonts, sizes, panels and saved palettes to a file and load them back.
- User Settings in the Forge card layout: cards, brass section titles, switches and roomier rows (can be turned off).
- Gear button in the AI Response header that opens these settings.
- Ember ring around whatever you reach with Tab (can be turned off).
- Fonts are bundled, so the look works offline and nothing loads from Google.
- Every extension title in the Extensions drawer is in the Forge heading font and brass, whatever tag it uses and even when the extension colours its own title (Quick Reply, Story Mode).
- TauriTavern's per-preset "leave out" lists are backed up before the AI tab clears them, and come back when the Forge AI layout is turned off.

## 0.9.1 (2026-11-01)

- README: early beta warning.
- Panel blur is off by default again, so the side panels are see-through like before 0.9.0. The Panel blur slider still turns it on.

## 0.9.0 (2026-11-01): first public release

- Published on GitHub under the MIT licence, with install steps in the README.
- Frosted panels: whatever shows through the side panels, chat and message box is blurred. The Panel blur setting adjusts it (0 turns it off).

## 0.8.2 (2026-11-01)

- The message box and the RPG Companion panel have square corners, so no background shows around them.

## 0.8.1 (2026-11-01)

- The side panels meet the chat column with no gap and run to the bottom of the window.

## 0.8.0 (2026-11-01)

- Side panels, the chat column, the message box and RPG Companion's panel share one fill, so a background image shows through them equally. The Panel opacity setting adjusts it. Messages and cards stay solid.
- Number spinner arrows are tinted brass so they're easy to see.

## 0.7.0 (2026-11-01)

- AI Response tab: a short description under each sampler (can be turned off).
- Setting for whether AI setting names use the heading or body font.

## Before 0.7.0 (2026-11-01)

- The Forge look across the top bar, side panels, chat, inputs and popups.
- Larger default text, with settings for text size, fonts and colours.
- Redrawn top-bar icons. The top bar and panel headers join with no seams.
- AI Response tab redesigned into cards: preset with Import/Export/Save, length and memory, sampling, model features, and folds for Behaviour, Logit bias and Prompts. Turning the layout off, or picking a non-Chat Completion API, puts SillyTavern's own layout back.
- TauriTavern: every parameter is a plain control instead of the Request Parameter Management bar. Note that each preset's "leave out" list is cleared when the preset loads, so the values you see are the values sent.
