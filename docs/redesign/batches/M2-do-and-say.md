# M2-do-and-say: Do and Say rewrite what you type

Lane M · size M · needs `M1-mode-bar` · read bible sections 6, 7 and 8 first

## Goal

With Do or Say selected, a message typed in the message box is rewritten, as the table in bible section 6 says, before SillyTavern sends it.

## You own

`modes.js`, `css/modes.css`, `tests/browser/modes-send.mjs`, `docs/redesign/results/M2-do-and-say.md`, `docs/redesign/changes/M2-do-and-say.md`.

## Build

1. **A pure function,** exported from `modes.js` so the test can call it: `transform(text, mode, s)` returns the text to send. It implements the tidy rules and templates of bible section 6 for `do` and `say`, in both voices. For `story` and `see` it returns the text unchanged for now.
2. **Catching the send,** as bible section 6 describes: capture-phase listeners for Enter in `#send_textarea` (SillyTavern's own condition, with `shouldSendOnEnter()` imported from `scripts/RossAscends-mods.js`; if that import fails, fall back to "Enter sends unless the screen is a phone") and for a click on `#send_but`. When a mode applies, set the message box's value to `transform(...)`, fire an `input` event on it, and let the event carry on to SillyTavern.
3. **When not to touch it:** no mode selected; empty text; text starting with `/`; SillyTavern is generating; the text is exactly what the last rewrite produced.
4. **Settings:** add `modesVoice: 'second'`, `modesTidy: true` and `modesTemplates: { do: '', say: '', see: '' }` to `defaults` and `lookKeys`. In the Message box section add "Write my actions as: You … / I …" (a select), "Tidy what I type (first letter, full stop, quotes)" (a checkbox), and a closed fold "Advanced: my own wording" with three text fields whose placeholders show the default templates. They are greyed out while the send modes are off.
5. Listeners are added when the feature turns on and removed when it turns off.

## Leave alone

Story and See behaviour (`M3`). Messages sent by scripts, Quick Replies or slash commands. SillyTavern's own send code.

## Test: `tests/browser/modes-send.mjs`

No phone run needed; the logic does not depend on size.

1. **The table.** Import `modes.js` in the page and call `transform` for every Do and Say row of the table in bible section 6, in both voices. Each must match exactly.
2. Tidy off: `open the door` in Do gives `You open the door` (template only).
3. A custom Do template `*{{input}}*` gives `*open the door.*` for `open the door`.
4. **End to end.** `fakeConnection(page)`, turn the modes on, select Do, type `open the door` in `#send_textarea`, press Enter. The newest message in the chat is the user's and its text is `You open the door.`.
5. Select Say, type `hello there`, click `#send_but`: the newest user message is `You say, "Hello there."`.
6. No mode selected, type `open the door`, Enter: the newest user message is `open the door`.
7. Do selected, type `/echo test`, Enter: no user message is added and the text was not rewritten.
8. Modes off: steps 4's input is sent unchanged, and no capture listener of ours is left (send `open the door` and check).
9. First person voice: step 4 gives `I open the door.`.

Read the chat through `SillyTavern.getContext().chat` only for the messages this test typed.

## Check

```bash
node tests/browser/modes-send.mjs
node tests/run.mjs modes
node tests/run.mjs
```

## Done when

- The commands pass, and every row of the bible's table for Do and Say is in the test.
- A message is never rewritten twice, and never while SillyTavern is generating. Say in the result file how you made sure.
- Only the files under "You own" changed.

## Changelog line

`**Do** and **Say** now shape what you type: "open the door" is sent as "You open the door.", and "hello there" as You say, "Hello there." Choose "I" instead of "You", switch the tidying off, or write your own wording under Message box.`

## Commit message

`Rewrite typed messages for Do and Say`
