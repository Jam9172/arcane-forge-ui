# M3-story-and-see: Story as narration, See as a look or a picture

Lane M · size M · needs `M2-do-and-say` · read bible sections 6, 7 and 8 first

## Goal

Story puts what you type into the chat as narration and lets the AI carry on. See asks what something looks like, or, as a setting, asks SillyTavern's Image Generation for a picture.

## You own

`modes.js`, `css/modes.css`, `tests/browser/modes-story-see.mjs`, `docs/redesign/results/M3-story-and-see.md`, `docs/redesign/changes/M3-story-and-see.md`.

## Build

1. **Settings:** add `modesStoryAs: 'narration'` and `modesSeeAs: 'describe'` to `defaults` and `lookKeys`. In the Message box section add "Story goes in as: narration / my own message" and "See asks for: a description / a picture".
2. **Story as narration.** When Story is selected and the send is caught (the same catch as `M2`): stop the event before SillyTavern's own handler sees it; add a narrator message with SillyTavern's own `sendNarratorMessage` (in `scripts/slash-commands.js`, the code behind `/sys`); empty the message box and fire `input`; then start a normal reply the way SillyTavern's `/trigger` command does (read its code). Do nothing if no chat is open or SillyTavern is generating.
3. **Story as my own message:** a plain send; `transform` returns the trimmed text.
4. **See as a description:** `transform` for `see` as the table and rules in bible section 6. This is the one mode that acts on an empty box: an empty box with See selected sends `You look around.` (or `I look around.`).
5. **See as a picture.** If the `imagine` command is registered (`SillyTavern.getContext().SlashCommandParser`), stop the native send, run that command with the typed text, and empty the box. The text must reach the command whole: nothing in it, such as `|` or `{{`, may be read as a command or a macro. If the command is not registered, show one toast, "See needs SillyTavern's Image Generation. Sending a description request instead.", and send the description form.
6. Everything is undone when the feature turns off.

## Leave alone

Do and Say. SillyTavern's Image Generation extension itself. Never start a real image or text generation in a test.

## Test: `tests/browser/modes-story-see.mjs`

1. `transform` for every Story and See row of the bible's table, in both voices.
2. **Story.** `fakeConnection`, modes on, Story selected, type `The rain stops.`, Enter. The newest message that is not the user's has `extra.type` equal to SillyTavern's narrator type and the text `The rain stops.`. No user message with that text was added. The message box is empty.
3. After step 2 a generate call was made (the helper's `held` list has a path containing `/generate`).
4. Story with the setting on "my own message": the newest user message is `The rain stops.`.
5. **See, description:** type `the door`, Enter: the newest user message is `You look at the door.`.
6. See with an empty box, Enter: the newest user message is `You look around.`.
7. **See, picture, command missing.** If `imagine` is registered in the sandbox, hide it for this step by wrapping the lookup you use, not by changing SillyTavern. A toast with the fallback text appears and the description form is sent.
8. **See, picture, command present.** Replace `executeSlashCommandsWithOptions` on the context, for this test only, with a function that records its argument and does nothing. Type `a door | /echo x {{user}}`, Enter. It was called once; what it received carries the whole typed text in a form that cannot run `/echo` or expand `{{user}}`; no user message was added. Put the original function back.

## Check

```bash
node tests/browser/modes-story-see.mjs
node tests/run.mjs modes
node tests/run.mjs
```

## Done when

- The commands pass.
- The result file says exactly how the typed text is passed to `imagine` and why that is safe.
- Only the files under "You own" changed.

## Changelog line

`**Story** puts what you type into the chat as narration and the AI carries on from it. **See** asks what something looks like ("the door" becomes "You look at the door."), or asks Image Generation for a picture if you choose that under Message box.`

## Commit message

`Add Story as narration and See`
