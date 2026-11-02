# Changelog

Newest first. The version number is in `manifest.json`. Changes collect under "Unreleased" and ship together in the next release.

## Unreleased

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
