# M3-story-and-see

## Built

- `modes.js`:
  - **Settings.** `defaults` gains `modesStoryAs: 'narration'` and `modesSeeAs: 'describe'`, and `lookKeys` gains both as enums (`narration` / `message`, `describe` / `picture`). The Message box section gains two selects after "Tidy what I type": "Story goes in as" (narration / my own message) and "See asks for" (a description / a picture). Like the other controls there, they are greyed out (`disabled`) while the modes are off.
  - **`transform` for Story and See.** Story gets tidy rule 1 only (trim), and nothing with tidy off. See follows rule 3 and the end mark, like Do, with the template `You look at {{input}}` (or `I …`, or the owner's own See wording). An empty or blank box with See gives `You look around.` (or `I look around.`). Do and Say give exactly what they gave before.
  - **Story as narration.** When the send is caught (the same three catches as M2: Enter in the box, a click or tap on the send button, Enter on the send button), Story with "narration" takes the send over:
    1. The key or click is stopped before SillyTavern's own handlers see it.
    2. The message box is emptied, with an `input` event.
    3. A narrator message is added with SillyTavern's own `sendNarratorMessage` from `scripts/slash-commands.js`, the code behind `/sys`.
    4. A normal reply starts the way `/trigger` does: once SillyTavern is not generating (waiting up to 10 seconds), `Generate('normal')`.

    Nothing is taken over while SillyTavern is generating, when no chat is open, or when SillyTavern itself would refuse a send from the box (a swipe under way, or commands typed in the box still running). In those cases Story is sent as your own message, which SillyTavern then sends or refuses as usual.
  - **Story as my own message:** a plain send of the trimmed text.
  - **See as a description:** a plain send of `transform`'s text, an empty box included.
  - **See as a picture:** if Image Generation's `imagine` command is registered (`SillyTavern.getContext().SlashCommandParser.commands.imagine`), the send is stopped, the box is emptied, and the command runs with the typed text (how, below). If it is not registered, one toast says "See needs SillyTavern's Image Generation. Sending a description request instead.", and the description form is sent.
  - **Off.** Turning the modes off (or the main switch) removes the listeners as before, and also clears the new "Story still being added" flag. Nothing else of this batch stays in the page.
- `tests/browser/modes-story-see.mjs`: the brief's eight steps (steps 3 and 8 changed, see "Brief steps changed"), at desktop and phone size, plus the extra checks under "Choices".
- `tests/browser/modes-send.mjs`, the two fixes this batch was given:
  - `settle()` now waits on a plain check. `script.js` is put on a global once, and the predicate reads it.
  - It has the `[phone]` usage line, and taps instead of clicking on the phone. Every check holds at phone size, so none is skipped.
  - Two of its checks had to follow this batch. "Story and See come back unchanged for now" is now "a mode that is not one of the four comes back unchanged". The `lookKeys` check compares only M2's three keys; the new test checks M3's two.
- `css/modes.css`: unchanged. This batch adds no look.

### How the typed text is passed to `imagine`, and why that is safe

`modes.js` looks the command up in SillyTavern's own registry and calls its callback directly. The text is the command's unnamed argument, and the named arguments are an empty object:

```js
const imagine = context.SlashCommandParser?.commands?.imagine;
await imagine.callback({}, typed);
```

That is what SillyTavern's command runner (`SlashCommandClosure.executeStep`) does after it has parsed a command line: `executor.command.callback(args, value)`. The difference is that the text never goes through a command line, so:

- no parser reads it: `|` cannot end the command or start `/echo`, `{:` cannot open a closure, `name=` at the start cannot set an argument, and quotes are not taken off;
- no macro step reads it: `{{user}}`, `{{pipe}}`, `{{var::…}}` and `{{trim}}` stay as typed, and `\{` keeps its backslash.

What `imagine` does with the text afterwards is its own business. In free mode it uses the text as the prompt, and a text that is exactly one of its trigger words (`you`, `me`, `scene`, `last`, `face`, `background`, `raw_last`) picks that mode, as `/imagine you` does. It does not fill macros in the text.

**Why not `executeSlashCommandsWithOptions`.** The brief's step 8 expects the text to go through it in a form that cannot run as a command. I tried that in the sandbox first. A scratch script, outside the repository and using only the Forge Tester chat, registered a page-only recorder command and ran two forms of the text through it. The page uses SillyTavern's new macro engine, which is on by default.

- **Escaped:** `/probe ` plus the text with `\`, `|`, `{` and `}` escaped.
  - `a door | /echo x {{user}}` arrived whole.
  - `a {{trim}} b` arrived as `a  b`. The engine unescapes `\{\{trim\}\}` back to `{{trim}}` and then removes it in a later step.
  - `x=1 the door` arrived as `the door`, because `x=1` became a named argument.
  - `"quoted" door` arrived as `quoted door`.
- **Through a scope macro:** `/probe {{forgesee}}`, with the text as a macro in the scope passed in.
  - `{{trim}}` was dropped the same way.
  - `a \{ b` arrived as `a { b`.

More escaping rules could cover the named argument and the quotes. `{{trim}}` cannot be covered at all, and the right escaping would differ between the new macro engine and the old one, which is a SillyTavern setting. So the direct call is the only way I found that gets every text through whole.

## Test output

The brief's three check commands, on the code as committed:

```
$ node tests/browser/modes-story-see.mjs
ok   Story, You: "The rain stops." gives "The rain stops." ("The rain stops.")
ok   Story, I: "The rain stops." gives "The rain stops." ("The rain stops.")
ok   See, You: "the door" gives "You look at the door." ("You look at the door.")
ok   See, I: "the door" gives "I look at the door." ("I look at the door.")
ok   See, You: "" gives "You look around." ("You look around.")
ok   See, I: "" gives "I look around." ("I look around.")
ok   Story: the ends are trimmed, nothing else (no full stop, a line break inside kept) ("The rain stops,\nand the wind drops")
ok   Story with tidy off: sent as typed ("  the rain stops ")
ok   See: the first letter goes lower case ("You look at the old door.")
ok   See: two capitals at the start are kept ("You look at NASA logo.")
ok   See: text that starts with "you" gets no You or I in front ("You look at the door.")
ok   See: an end mark that is there stays ("You look at the door?")
ok   See with tidy off: the wording only ("You look at the door")
ok   See uses the owner's own wording ("*studies the door.*")
ok   See with nothing typed (or only spaces) looks around, with tidy off and with an own wording too (["You look around.","You look around.","You look around."])
ok   Story, Enter: the first message added is a narrator message reading "The rain stops." ({"user":false,"type":"narrator","mes":"The rain stops."})
ok   no user message with that text was added ([])
ok   the message box is empty ("")
ok   then a normal reply was asked for (answered in the page) and came after the narration (1 asked, started: normal, 2 added)
ok   (the helper's held list shows no generate call, as the seed answers it first)
ok   Story, send button: narration "The wind drops.", then a reply (["narrator","reply"])
ok   a second Enter while the narration is being saved starts no second reply (2 added, 1 asked, started: normal)
ok   while SillyTavern is generating, Story adds nothing and leaves the box as typed ("The rain stops.")
ok   Story: a send clicked by a script goes in as typed, as a user message (["The rain stops."])
ok   with no chat open, Story is not narrated (sent as your own message) (["The rain stops."])
ok   Story as "my own message": the newest user message is "The rain stops." (trimmed), no narration (["The rain stops."])
ok   See, Enter: the newest user message is "You look at the door." (["You look at the door."])
ok   See with an empty box, Enter: the newest user message is "You look around." (["You look around."])
ok   See with an empty box, send button: "You look around." too (["You look around."])
ok   See in the I voice: "I look at the door." (["I look at the door."])
(the sandbox has the imagine command)
ok   See as a picture without imagine: one toast says so (1 toasts)
ok   and the description form is sent (["You look at the door."])
ok   See as a picture: imagine ran once, with the whole typed text as its argument ([{"value":"a door | /echo x {{user}}","args":[]}])
ok   the text reached it without a command line: nothing was parsed, so /echo did not run and {{user}} stayed as typed (0 command lines run, args [])
ok   no message was added, no reply was asked for, and the box is empty (0 added, 0 replies, box "")
ok   no toast about Image Generation
ok   so are a named argument, quotes, a closure, {{trim}} and a backslash (["x=1 the door","\"quoted\" door","{: /echo hi :} door","a {{trim}} b","a \\{ b"])
ok   the send button asks for a picture the same way ([{"value":"the old door","args":[]}])
ok   See as a picture with an empty box: no picture is asked for; "You look around." is sent (["You look around."])
ok   the Message box section has "Story goes in as": narration / my own message (Message box: Story goes in as (narration=narration, message=my own message))
ok   and "See asks for": a description / a picture (See asks for (describe=a description, picture=a picture))
ok   with the modes off, both are greyed out (disabled)
ok   ticking the modes on makes them usable
ok   choosing "my own message" and "a picture" sets both
ok   and saves them
ok   lookKeys: modesStoryAs (narration or message), modesSeeAs (describe or picture) ({"modesStoryAs":{"type":"enum","values":["narration","message"]},"modesSeeAs":{"type":"enum","values":["describe","picture"]}})
ok   the defaults are narration and a description ({"modesStoryAs":"narration","modesSeeAs":"describe"})
ok   Import look sets both, and the redrawn settings show them (narration, describe)
ok   a look file with other values changes neither
ok   modes off: no bar and no class
ok   modes off with Story saved: sent as typed, as a user message, no narration (["The rain stops."])
ok   modes off with See as a picture saved: no picture asked for, sent as typed (["the door"])
ok   main switch off with the modes on: no bar, and Story is sent as typed (["The rain stops."])
ok   no script errors

$ node tests/run.mjs modes
ok       modes-bar  47 checks, 18s
ok       modes-bar phone  50 checks, 18s
ok       modes-send  70 checks, 41s
ok       modes-send phone  70 checks, 41s
ok       modes-story-see  54 checks, 60s
ok       modes-story-see phone  54 checks, 59s

6 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 13s
ok       foundation phone  15 checks, 12s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 10s
ok       menu-buttons  55 checks, 31s
ok       menu-buttons phone  4 checks, 11s
ok       menu-frame  49 checks, 24s
ok       menu-frame phone  5 checks, 14s
ok       modes-bar  47 checks, 18s
ok       modes-bar phone  50 checks, 18s
ok       modes-send  70 checks, 41s
ok       modes-send phone  70 checks, 41s
ok       modes-story-see  54 checks, 60s
ok       modes-story-see phone  54 checks, 60s
ok       stage-column  35 checks, 19s
ok       stage-column phone  10 checks, 13s
ok       stage-content  64 checks, 23s
ok       stage-content phone  22 checks, 16s
ok       stage-spine  52 checks, 22s
ok       stage-spine phone  12 checks, 14s

20 passed, 0 failed
```

**The new test against the old code.** `modes-story-see.mjs` was run with `modes.js` as it is on `overhaul`, then mine was put back. This was before the double-Enter check was added. It gave 12 ok and 30 FAIL, exit 1. It failed on every Story and See transform, the narration, the See sends, the picture steps and the settings. It then stopped with a timeout at the missing "Story goes in as" select.

**The double-Enter check against the code without its guard.** The same test, with only the "Story still being added" guard taken out of `modes.js`, failed that one check: "3 added, 2 asked, started: normal,normal". So the guard is what keeps the second reply out.

## Brief steps changed

- **Step 3** ("the helper's `held` list has a path containing `/generate`"). The sandbox's seed answers every generate call inside the page with a 500, so the helper's route never sees one, and this step cannot pass as written. The test answers generate calls in the page with a made-up reply instead, as `modes-send.mjs` does. It then checks that:
  - exactly one reply was asked for that way;
  - SillyTavern's own `GENERATION_STARTED` event fired once, with the type `normal` (dry runs, which only count tokens, are left out);
  - the reply came after the narration.

  It also prints a check that `held` shows no generate call, so the reason stays visible.
- **Step 8** ("Replace `executeSlashCommandsWithOptions` on the context … with a function that records its argument"). `modes.js` does not run `imagine` through `executeSlashCommandsWithOptions`; the reason is under "How the typed text is passed". So the test puts its recorder where `modes.js` looks, as step 7 asks for hiding the command: `SillyTavern.getContext()` is wrapped for the step, and the context it returns has an `imagine` that records what it is given and makes no picture. The same wrapper also puts in the brief's recording stand-in for `executeSlashCommandsWithOptions`. The test checks that:
  - `imagine` was called once, with exactly `a door | /echo x {{user}}`;
  - its named arguments were empty;
  - no command line was run (the stand-in for `executeSlashCommandsWithOptions` was called 0 times);
  - no toast showed `/echo`'s output;
  - no message was added, and no reply was asked for;
  - the box is empty.

  It also sends five texts that a command line could not carry whole (the probe above), and each one arrives as typed. The real `getContext` is put back after each step. SillyTavern itself is never changed.
- **Step 7.** `imagine` is registered in the sandbox, so the test hides it for the step by wrapping the same lookup, as the brief says.

## Choices the bible did not cover

**Story**

- **The box is emptied before the narrator message, not after.** `sendNarratorMessage` waits for the chat to save, so the text would otherwise stay in the box for a moment, and a second Enter in that moment would add the narration twice.
- **While a Story is still being added, other sends are held back.** The box is empty by then, so a second Enter or a double tap would reach SillyTavern's own empty-box send, and that starts a reply of its own. The Story's reply would then follow it, giving two replies; the test shows this happening without the guard. So from Enter until `sendNarratorMessage` has finished, a send caught from the box or the send button is stopped. The flag is cleared in a `finally` block, and again when the modes turn off. After that, SillyTavern's own generating flag guards the reply.
- **"The way `/trigger` does".** I copied what matters from `triggerGenerationCallback`: wait (up to 10 seconds, every 100 ms) until SillyTavern is not generating, then `Generate('normal')`. In a group chat that lets the group pick who answers, as `/trigger` with no argument does. Three things were left out:
  - `/trigger` empties the box again, so that its own `/trigger` text is not sent; ours is already empty.
  - Its 100 ms pause before `Generate`.
  - Its warning toast when the wait runs out. Ours gives up quietly; the narration is already in the chat.
- **"No chat is open"** means SillyTavern's `getCurrentChatId()` gives nothing. Story is then not taken over, and the send goes on as your own message. The same goes when SillyTavern would refuse a send from the box (`swipeState` not `none`, or `isExecutingCommandsFromChatInput`). Those are `sendTextareaMessage`'s own checks; SillyTavern then refuses the send with its own message.
- **If `sendNarratorMessage` fails,** the error goes to the console, and the typed text goes back in the box if the box is still empty. No reply is started.
- **`sendNarratorMessage` is loaded with a dynamic `import()`,** as M2 loads `shouldSendOnEnter`. A SillyTavern without it then only loses Story as narration (Story goes in as your own message), not the whole extension.
- **The narrator's name** is SillyTavern's own (the chat's narrator name or its default), because `sendNarratorMessage` gets no `name`. The message goes through SillyTavern's own macro filling, as with `/sys`, so `{{user}}` typed in a Story is filled. With tidy off the text is not trimmed here, but `sendNarratorMessage` trims it itself.

**See**

- **See with an empty box, set to a picture,** sends the description form, `You look around.`. `imagine` aborts on an empty prompt, and choosing a picture mode for it (`scene`, say) would be our own invention.
- **The empty-box sentence is always `You look around.` or `I look around.`,** with tidy off and with an own See wording too. It is our own sentence, and an own wording needs something typed for `{{input}}`.
- **The fallback toast shows once per send** that falls back. A send that does not go through leaves the description in the box, and the next Enter sends it as it is (M2's never-twice rule) without a second toast.
- **Without an open chat, or when SillyTavern would refuse a send,** See as a picture sends the description form, without the toast.
- **The picture path passes the text as typed,** not tidied. `imagine` trims it itself.
- **`imagine` is called without waiting for it in the send.** The send is stopped and the box emptied at once. Errors from it go to the console; `imagine` shows its own toasts, such as "Image generation is not available" when no image source is set up.

**Settings**

- **The two selects come after "Tidy what I type" and before the Advanced fold,** in the order of bible section 7. A value that is not one of the two falls back to the default, as the voice does.

**The tests**

- **modes-story-see.mjs extras beyond the brief's steps:**
  - more tidy cases for Story and See;
  - Story from the send button;
  - the double Enter;
  - Story while generating;
  - Story clicked by a script;
  - Story with no chat open (a stand-in for `getCurrentChatId`);
  - See in the I voice, and See with an empty box from the button;
  - five texts a command line could not carry whole;
  - See as a picture from the button, and with an empty box;
  - the settings: labels, greyed out and back, saving;
  - `defaults` and `lookKeys`, Import look with good and bad values;
  - modes off and the main switch off.
- **Where the test reads.** It reads only the messages its own sends added (`chat.slice(before)`). The slow chat save for the double-Enter check is a `fetch` wrapper in the page, removed straight after.
- **modes-send.mjs, phone run.** Every check holds at 390 by 800 with touch, and taps work for the mode buttons, the send button and the settings. `settle()` now really waits, so the `/echo test` send, which adds no message, is given 2 seconds rather than 8.

## Asked of other files

- **`tests/browser/_harness.mjs` (the lead).** The two requests in M2's result file still stand:
  - a shared `fakeReplies(page)` helper that answers generate calls in the page and counts them, since this batch copied that answer from `modes-send.mjs` once more;
  - a second, later click on RPG Companion's "Got it" notice.
- **`docs/redesign/batches/M3-story-and-see.md` (the lead),** if the brief is reused: step 3 cannot pass against this sandbox, and step 8 names a route that cannot carry every text whole (see above).

## Not done

- Nothing from the brief.
- Not tried:
  - a real picture, since no image generation may run in a test (the sandbox has the `imagine` command, but whether an image source is set up was not looked at);
  - group chats, since only the Forge Tester chat may be opened;
  - real TauriTavern (its expanded editor still hides the bar, from M2, so neither Story nor See applies to a send made from there);
  - the fallback when `sendNarratorMessage` cannot be loaded, since making SillyTavern's `slash-commands.js` fail to load would break SillyTavern itself.

## Check

**FAIL.** Checked on `batch/M3-story-and-see` at `c186ea6`. The batch was cut from `overhaul` at `a7bf109`. `overhaul` has since moved to `c428dc2` (P3 merged). That merge changes only `menu.js`, `css/menu.css`, `tests/browser/menu-characters.mjs` and P3's documents, none of this batch's files, and `git merge-tree` with it merges without a conflict.

One problem makes it FAIL: problem 1 below. With See set to a picture, a second Enter or tap while the picture is being made sends "You look around." and asks the model for a reply. Everything else checked out, apart from the smaller problems listed at the end.

### (a) Files

- `git diff --name-only overhaul...HEAD` lists 5 files: `docs/redesign/changes/M3-story-and-see.md`, `docs/redesign/results/M3-story-and-see.md`, `modes.js`, `tests/browser/modes-send.mjs` and `tests/browser/modes-story-see.mjs`.
- Four are under "You own". `tests/browser/modes-send.mjs` is not, but the lead asked for its two fixes and bible section 9 gives lane M every `tests/browser/modes-*.mjs`. `css/modes.css` is unchanged.
- The changes file holds the brief's changelog line word for word. The commit message is the brief's.
- The diff and the commit hold no names, user names or local folder paths.

### (b) Commands

- `node tests/browser/modes-story-see.mjs`: 54 ok, exit 0.
- `node tests/run.mjs modes`: `6 passed, 0 failed` (modes-bar, modes-send and modes-story-see, each at both sizes).
- `node tests/run.mjs`: `20 passed, 0 failed`.

### (c) Done when, the brief, and bible sections 3, 6 and 9

**Done when:**

- **The commands pass.** Yes, see (b).
- **The result file says exactly how the typed text is passed to `imagine` and why that is safe.** Mostly. It says exactly how: `imagine.callback({}, typed)`, found at `SillyTavern.getContext().SlashCommandParser.commands.imagine`. That matches `SlashCommandClosure.executeStep`, which calls `executor.command.callback(args, value)` after parsing. The reason it is safe holds: no parser or macro step of ours sees the text. But one sentence is wrong, see problem 3.
- **Only the files under "You own" changed.** Yes, with the lead's one allowed exception, see (a).

**The brief's build steps:**

1. **Settings.** `defaults` and `lookKeys` have `modesStoryAs` (`narration` / `message`) and `modesSeeAs` (`describe` / `picture`), with the types and defaults of bible section 7. The Message box section has "Story goes in as" (narration / my own message) and "See asks for" (a description / a picture). Both are greyed out while the modes are off. A value that is not one of the two falls back to the default. The test checks all of this, and an Import look round trip with good and bad values.
2. **Story as narration.** The send is stopped in the capture phase, and the box is emptied with an `input` event. A narrator message is then added with SillyTavern's own `sendNarratorMessage`, the code behind `/sys`. Then it waits until `isGenerating()` is false (the same `is_send_press` and `is_group_generating` as `/trigger`) and calls `Generate('normal')`. Nothing is taken over while generating or with no chat open. See problems 2 and 4 for what was left out of "the way `/trigger` does".
3. **Story as my own message.** A plain send of the trimmed text.
4. **See as a description.** `transform` follows rule 3 and the end mark, as Do does. An empty box gives `You look around.` or `I look around.`.
5. **See as a picture.** The send is stopped, the box is emptied, and `imagine`'s callback gets the typed text. Without the command there is one toast with the brief's words, and the description form is sent.
6. **Off.** Turning off removes the listeners and the bar, and clears `storyPending`, see (d).

**The two brief test steps the builder changed:**

- **Step 3 (`held` should show `/generate`).** The change is justified. The sandbox's `forge-seed.js` (`blockRealGeneration`) answers `/api/backends/*/generate` inside the page with a 500, so the helper's route never sees a generate call. The test's replacement counts the replies in the page and checks one `GENERATION_STARTED` of type `normal` after the narration. That proves the same thing.
- **Step 8 (a recorder for `executeSlashCommandsWithOptions`).** The change is justified, judged against bible section 6: "run that command with the text passed so that no part of it can be read as a command". Calling the registered command's own callback with the text as its unnamed argument runs that command, and no command line is ever built. The test also keeps the brief's recorder for `executeSlashCommandsWithOptions` and checks that it was called 0 times. My own hostile texts, through a stand-in `imagine` (the real one never ran), each arrived once, exactly as typed, with no named arguments, and with the box emptied and nothing added: `a door | /echo PWN {{user}}`, `{{setvar::k::v}} door`, `door {{pipe}} \| x`, `name=evil door`, `{: /echo IN :}()` and ``` `code` <b>bold</b> ```. No command line ran, no `/echo` toast appeared, and the variable `k` was not set. This was the same at phone size.

**Bible section 6, Story and See in every setting.** I checked these myself, with scratch scripts outside the repository run through the test helper. Only the Forge Tester chat was open. Replies were answered in the page and `imagine` was always a stand-in. Only the messages the scripts made were read.

- **A `/` command with Story or See picked** is left to SillyTavern: `/echo …` with Story, with See as a description, with See as a picture, and after three leading spaces. Each ran as a command. Nothing was added, and `imagine` was not called.
- **Tidy off.** Story `  The sun sets.  ` became the narration `The sun sets.` (`sendNarratorMessage` trims). Story as my own message gave a user message `The moon rises.`. See with the own wording `*studies {{input}}*` gave `*studies the door*`.
- **An own See wording, the I voice, and an empty box.** `I look around.`, as the result file says.
- **See as a picture with an own wording and tidy off.** `imagine` got `  The Door  ` as typed. That is what bible section 6 asks ("run that command with the text").
- **An empty box.** See gives `You look around.`. Story is left to SillyTavern, which starts a reply as it does with no mode.
- **Story with `The rain | /echo PWN2 {{user}}`** gave one narration. `/echo` did not run, and `{{user}}` was filled by SillyTavern, as `/sys` does. That fits "SillyTavern's own macros … are left in for SillyTavern to fill".
- **A double Enter, and a double tap on the phone.**
  - Story: one narration, one reply, at both sizes. The `storyPending` guard works.
  - See as a description: one message and two replies on the desktop. The same happens with no mode picked and with the modes off (`plain words` gives one message and two replies). That is SillyTavern's own double send, not this batch's.
  - See as a picture: `imagine` once, then a user message `You look around.` and a reply, at both sizes. This is problem 1.

**The builder's other choices, judged against the bible:**

- Emptying the box before the narrator message, and holding sends back while a Story is added: sound. The double-Enter probe confirms both.
- "No chat is open" read as `getCurrentChatId()`, with Story then sent as your own message: an acceptable reading of the brief's "do nothing". It matches bible section 6's "Do nothing while SillyTavern is generating", which also means leaving the send to SillyTavern.
- See as a picture with an empty box sends `You look around.`: this follows the bible's table. But because nothing is held back while `imagine` runs, it is also what turns a second Enter into a message, see problem 1.
- The empty-box sentence is the same with tidy off and with an own wording: acceptable. It is not a template, and an own wording needs `{{input}}`.
- One fallback toast per send that falls back, and the typed text passed to `imagine` untidied: both match bible section 6.

**Bible section 3:**

1. **Native controls stay underneath.** It uses SillyTavern's own `sendNarratorMessage`, `Generate`, `isGenerating`, `swipeState` and `isExecutingCommandsFromChatInput`, and Image Generation's own command. `storyPending` is our own flag, not a copy of SillyTavern's state.
2. **One switch back.** See (d).
3. **Every look choice gets a setting.** No look was added. The two new behaviours each have a setting.
4. **Phone.** The test passes at phone size. My probes behave the same on the phone, problem 1 included.
5. **Tokens.** No CSS.
6. **Stay in your lane.** See (a).
7. **Small and plain.** `slash-commands.js` is loaded with a dynamic `import()`, as M2 loads `RossAscends-mods.js`. Nothing new is added.

**Bible section 9:**

- **The contract.** `modes.js` exports the six contract names, plus M2's `transform`. `apply()` is safe to repeat.
- **The rules for the code.** Selects are built from fixed word lists, and the toast is a fixed string. No `innerHTML` with typed text, no `localStorage`, no `MutationObserver`, and no element is held across calls. New ids start with `forge-ui-modes-`, like M2's. No SillyTavern setting is changed: `imagine` gets `{}`, so `applyCommandArguments` changes nothing.

**`tests/browser/modes-send.mjs`, on its merits.** The changes are sound.

- `settle()` now waits on a plain predicate, and `script.js` is put on a global once.
- The `[phone]` usage line adds the phone run that bible section 12 asks for: 70 checks at both sizes.
- The two checks that had to change follow M3 correctly. The old "Story and See come back unchanged" would now be false, and the `lookKeys` check now compares only M2's keys.
- The 2-second wait for `/echo test` is enough for a check that no message comes.

### (d) Trying to break it

- **Off.** With the modes off and Story or See saved, Story went in as typed, as a user message, and See as a picture asked for no picture. The same with the main switch off: an empty Enter was SillyTavern's own. Each time there was no `#forge-modes` and no `forge-modes` class, and the placeholder was SillyTavern's own. Nothing of this batch stayed in the page.
- **Phone, 390 by 800 with touch.** The test passes at phone size. My probes there gave the same results as on the desktop: the hostile texts, commands, tidy off, own wording, double tap for Story, and problem 1 for See as a picture.
- **Problem 1, compared with SillyTavern itself.** On the desktop I typed `/delay 2500` in the box with the modes off, and pressed Enter in the empty box while it ran. Nothing was sent: SillyTavern refuses a send while commands typed in the box are running (`isExecutingCommandsFromChatInput`). On the phone it hides the send button for that time, so the tap only landed once the command was done. Typing `/imagine …` by hand is protected in the same way. With See as a picture and a stand-in `imagine` that takes 2.5 seconds, the same second Enter, or on the phone a tap, gave `You look around.` and a reply straight away.

### Problems

1. **(Makes it FAIL.) See as a picture lets a second send through while the picture is being made.**
   - `askForPicture` empties the box and calls `imagine` without waiting, and nothing holds sends back meanwhile. A second Enter or tap on the now empty box is therefore See with an empty box, and sends `You look around.` and starts a reply: a message the person did not mean, and a model call. This happens with a quick double Enter, with a second Enter 300 ms later, and at any time during the many seconds a real picture takes.
   - SillyTavern holds sends back while a typed `/imagine` runs. This batch already holds sends back for Story (`storyPending`) for the same reason, but not for See as a picture.
   - Seen at desktop size (Enter Enter) and phone size (tap tap): `imagine` was called once, then `You look around.` and one reply were added.
2. **Story sends what is typed while the narration is being added.** The box is emptied before `sendNarratorMessage`, but not again just before `Generate('normal')`, which `/trigger` does. `Generate` sends whatever is in the box at that moment as a user message, unshaped, and runs it first if it starts with `/`. With the chat save held back 1.5 seconds in the page, `half typed` (no Enter) went in as a user message between the narration and the reply, at both sizes. The result file's "ours is already empty" is only true if nothing is typed meanwhile. The time this takes is short in practice (the save, plus `Generate`'s ping), so this alone would not fail the batch, but it should be fixed in the same round.
3. **The result file says of `imagine`, "It does not fill macros in the text." That is wrong.** Image Generation's `sendGenerationRequest` (`scripts/extensions/stable-diffusion/index.js`) runs `substituteParams` on the prefixed prompt. So `{{user}}`, and macros such as `{{setvar::…}}`, typed with See as a picture are filled by `imagine` itself when a picture is really made, just as for `/imagine` typed by hand. The way this batch passes the text is still safe, since nothing of ours reads it (the comment on `askForPicture` says "on the way", which is right), but the sentence should say what `imagine` does. On its own this would not fail the batch.
4. **The reply after a Story gives up quietly** when SillyTavern is still generating after 10 seconds, where `/trigger` shows a warning toast. The narration is in the chat with no reply and no word why. Minor.
5. **One test line is misworded.** The check "(the helper's held list shows no generate call, as the seed answers it first)" tests the sandbox, not the code. In this test it is the test's own in-page stand-in that answers first, not the seed. Minor.
