# Changelog

Newest first. The version number is in `manifest.json`. Changes collect under "Unreleased" and ship together in the next release.

## Unreleased

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
