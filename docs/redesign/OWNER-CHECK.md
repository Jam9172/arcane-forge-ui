# Owner's check: the redesign in TauriTavern

About ten minutes. Install the `overhaul` branch of Arcane Forge UI in TauriTavern, open any chat you like, and go through these in order. Every switch is under Extensions → Arcane Forge UI. Each step says what you should see; if you see something else, note the step number.

## 1. Send modes

1. Under **Message box**, tick "Do, Say, Story and See buttons above the message box". **You should see** a row of four buttons, Do, Say, Story and See, right above the message box, with none picked.
2. Pick **Do**, type `open the door`, press Enter. **You should see** your message as "You open the door." The box asked "What do you do?" while Do was picked.
3. Pick **Say**, type `hello there`, send. **You should see** You say, "Hello there."
4. Pick **Story**, type `The rain stops.`, send. **You should see** "The rain stops." as a narrator message (not yours), then the character's reply.
5. Pick **See**, type `the door`, send. **You should see** "You look at the door." With nothing typed, See sends "You look around."
6. Click the picked button again. **You should see** it un-picked, and the next message goes out exactly as typed.

## 2. Stage layout (desktop)

1. Under **Layout**, set "Forge layout" to **Stage (desktop)**. **You should see** the chat as one column on the right and the background art filling the rest, centred on that area, with the character's name on a plate at the bottom left.
2. Drag the chat column's left edge (the thin brass line). **You should see** the chat widen or narrow as you drag, and stay that way after you let go. Double-click the edge: it goes back to 46%.
3. If the character has an expression sprite, **you should see** it on the stage, never over the chat.

## 3. Menu panel (desktop)

1. Under **Menus**, tick "Menus open in one centred panel (desktop)". **You should see** the top bar's row of icons replaced by two round buttons at the top right.
2. Click the right-hand button. **You should see** a centred panel over a dimmed page, with the menus listed on its left; AI response is open. Click each name in the list in turn: each menu opens inside the panel and scrolls there.
3. Click the left-hand button: your characters open in the panel. Press **Escape**: the panel closes, and the focus is back on the button.
4. If the Menu button has a small red dot, there is no API connection; connect and it goes.

## 4. Everything on, with RPG Companion

1. With all three on, open RPG Companion's side panel at the right. **You should see** the chat column move left to leave it room, nothing of ours drawn over RPG Companion's panel, and RPG Companion working as usual. (Its own panel keeps a small gap at the top, where the round buttons overlap its top edge a little.)
2. Send one message with a mode picked. It works as in section 1.

## 5. Phone or tablet

1. With the same settings, open the app on the phone. **You should see** SillyTavern's own phone top bar and menus exactly as before; no stage, no panel, no round buttons.
2. **You should see** the four mode buttons above the message box, spanning its width, easy to hit with a thumb.
3. Tap the message box so the on-screen keyboard comes up. **You should see** the bar still above the message box and nothing hidden under the keyboard, the notch or the home bar. (No test could show this.)
4. Turn the phone on its side: the bar is a thinner single row and the chat still has room.

## 6. Everything off again

1. Untick the send modes, set Forge layout back to **Classic**, and untick the menu panel. **You should see** the app exactly as it was before you started: the top bar's icons are back, and any panels you had pinned are pinned again.
2. Untick "Use the Arcane Forge look across the whole app". **You should see** your normal SillyTavern theme with nothing of Arcane Forge left.

## Things you may notice (known, and for you to judge)

- **Ctrl+Enter** sends your text as typed, without the mode; Enter and Cmd+Enter use the mode.
- With a mode picked, its question replaces SillyTavern's "Not connected to API!" in the message box.
- Your own wording (Message box → Advanced) is skipped when the text starts with "you" or "I".
- With the menu panel on, panels you had pinned come back **pinned but closed** when you turn it off. If you disable Arcane Forge UI in the extension manager while the panel is on, they come back the next time it runs.
- A maximised Author's Note or CFG window covers the round buttons, and covers Characters and AI response when they open in the panel. Toasts now reach the top edge of the window when the buttons replace the top bar.
- At a small window with RPG Companion's panel open, the stage gets narrower than its usual 320px minimum so the chat can keep its width.
- On a phone held sideways, the mode buttons are 34px tall, under the 44px touch target.
- **Not independently checked:** the last fix to Story (text typed while its reply starts), and all four wave 2 batches (I1 to I4), were built and tested by the lead without a second checker, at your request.

## Choices that are yours

| Choice | Built as |
|---|---|
| Should any of the three be on by default? | all off |
| Actions in second or first person? | second ("You open the door."); a setting |
| Story as narration or as your own message? | narration; a setting |
| See as a description or a picture? | description; a setting |
| What ships to `main`: the code only, or also `docs/redesign`, `tests`, `CLAUDE.md` and `.claude`? | everything stays on the branch |
| How does the phone get it before the merge? | it waits for the merge to `main` |

Merging to `main`, pushing and releasing are yours too; nothing has been pushed.
