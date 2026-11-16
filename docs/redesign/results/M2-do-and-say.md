# M2-do-and-say

## Built

- `modes.js`:
  - **`transform(text, mode, s)`**, exported. It applies bible section 6 to `do` and `say`: the tidy rules, the templates and both voices. For `story`, `see` and anything else it returns the text unchanged.
  - **Catching the send.** Two capture-phase listeners on `document`: `keydown` for Enter in `#send_textarea`, and `click` for `#send_but`. Enter uses SillyTavern's own test plus `shouldSendOnEnter()`. When a mode applies, the listener sets the message box to `transform(...)`, fires `input` on it, and lets the event carry on to SillyTavern's own handler. `apply()` adds the listeners when the modes turn on and removes them when they turn off.
  - **When the box is left alone:** no mode is picked; the text is empty or only spaces; the trimmed text starts with `/`; SillyTavern is generating; the text is exactly what the last rewrite produced; the key or click came from a script.
  - **Settings:** `defaults` gains `modesVoice: 'second'`, `modesTidy: true` and `modesTemplates: { do: '', say: '', see: '' }`. `lookKeys` gains all three, with the types bible section 7 gives. The Message box section gains three controls:
    - "Write my actions as", a select with "You …" and "I …";
    - "Tidy what I type (first letter, full stop, quotes)", a checkbox;
    - a closed fold "Advanced: my own wording", with Do, Say and See fields whose placeholders show the default wording in the chosen voice.

    All five controls are disabled while the modes are off, and are switched live when the modes checkbox changes.
  - **The placeholder watch** (M1's check, note 3) no longer stays bound to the element it first found. Every call drops the watch, looks `#send_textarea` up again and watches the box it finds. The watch's callback looks the box up too. See "Choices" for what is still left.
- `css/modes.css`: one rule hides the bar while TauriTavern's expanded message editor is open. The reason is under "Choices".
- `tests/browser/modes-send.mjs`: the brief's nine steps, plus the extra checks under "Choices".

**How a message is never rewritten twice, and never while generating** (the brief asks for this here):

- **Twice.** `modes.js` keeps the last text a rewrite produced, as a string. A box that holds exactly that text is left alone.
  - The case this matters for is a send that does not go through. SillyTavern returns without clearing the box when there is no connection, or while a swipe is being edited. The rewritten text then stays in the box, and the next Enter sends it as it is.
  - The test makes such a send with the connection set to `no_connection`, using a wording (`*{{input}}*`) that would visibly grow if applied again. Enter left `*open the door.*`. A second Enter left the same text and added no message. Once connected, `*open the door.*` was sent as it was.
  - A rewrite that changes nothing writes nothing. Turning the modes off forgets the remembered text.
- **While generating.** Before touching the box, the listener asks SillyTavern's own `isGenerating()` from `script.js`. If that function is missing, it reads the older `is_send_press` flag instead. The test sets SillyTavern's own flag with `setSendButtonState(true)`, and Enter then left the box as typed.

## Test output

Final run, on the code as committed:

```
$ node tests/browser/modes-send.mjs
ok   Do, You: "open the door" gives "You open the door." ("You open the door.")
ok   Do, I: "open the door" gives "I open the door." ("I open the door.")
ok   Do, You: "Open the door!" gives "You open the door!" ("You open the door!")
ok   Do, I: "Open the door!" gives "I open the door!" ("I open the door!")
ok   Do, You: "you open the door" gives "You open the door." ("You open the door.")
ok   Do, I: "you open the door" gives "You open the door." ("You open the door.")
ok   Do, You: "I'm leaving" gives "I'm leaving." ("I'm leaving.")
ok   Do, I: "I'm leaving" gives "I'm leaving." ("I'm leaving.")
ok   Do, You: "NASA badge out, walk in" gives "You NASA badge out, walk in." ("You NASA badge out, walk in.")
ok   Do, I: "NASA badge out, walk in" gives "I NASA badge out, walk in." ("I NASA badge out, walk in.")
ok   Say, You: "hello there" gives "You say, \"Hello there.\"" ("You say, \"Hello there.\"")
ok   Say, I: "hello there" gives "I say, \"Hello there.\"" ("I say, \"Hello there.\"")
ok   Say, You: "\"Who goes there?\"" gives "You say, \"Who goes there?\"" ("You say, \"Who goes there?\"")
ok   Say, I: "\"Who goes there?\"" gives "I say, \"Who goes there?\"" ("I say, \"Who goes there?\"")
ok   Say, You: "You say hi" gives "You say hi." ("You say hi.")
ok   Say, I: "You say hi" gives "You say hi." ("You say hi.")
ok   tidy off: Do "open the door" gives "You open the door" ("You open the door")
ok   tidy off: Say "hello there" gives You say, "hello there" ("You say, \"hello there\"")
ok   a Do wording of *{{input}}* gives "*open the door.*" ("*open the door.*")
ok   the own wording is used in the I voice too ("*open the door.*")
ok   SillyTavern's own macros in the wording are left for SillyTavern ("{{user}}: \"Hello.\"")
ok   a wording without {{input}} is not used (the text would be lost) ("You open the door.")
ok   the ends are trimmed and a line break inside is kept ("You open the door\nslowly.")
ok   Say takes off curly quotes round the whole text ("You say, \"Hi there.\"")
ok   Say takes off single quotes round the whole text ("You say, \"Hi there.\"")
ok   nothing in the text is read as a replacement pattern ("You pay $& go.")
ok   a word that only starts with "I" is not the word I ("You ice the cake.")
ok   Story and See come back unchanged for now (["the door","The rain stops"])
ok   Do, Enter: the newest user message is "You open the door." (["You open the door."])
ok   the message box is empty after the send ("")
ok   the send went on to SillyTavern, which asked for a reply (answered in the page) (1 asked)
ok   Say, send button: the newest user message is You say, "Hello there." (["You say, \"Hello there.\""])
ok   clicking Say again leaves no mode picked
ok   no mode: the newest user message is "open the door" (["open the door"])
ok   Do, "/echo test": no user message is added ([])
ok   and the text was not rewritten before SillyTavern ran it (["/echo test",""])
ok   a send clicked by a script (as Quick Reply does) is not rewritten (["open the door"])
ok   Shift+Enter (a new line) does not rewrite the box ("open the door\n")
ok   with SillyTavern's "send on Enter" off, Enter (a new line) does not rewrite the box ("open the door\n")
ok   while SillyTavern is generating, Enter leaves the box as typed ("open the door")
ok   a send that did not go through leaves the rewrite in the box ("*open the door.*")
ok   pressing Enter again does not rewrite it a second time ("*open the door.*")
ok   once connected, it is sent as it is (["*open the door.*"])
ok   with TauriTavern's expanded editor open, the bar is hidden (stand-in)
ok   closing the editor brings the bar back
ok   I voice, Do, Enter: the newest user message is "I open the door." (["I open the door."])
ok   modes off: the bar is gone and Do is still the saved choice
ok   modes off: "open the door" with Enter is sent unchanged (["open the door"])
ok   modes off: "hello there" with the send button is sent unchanged (["hello there"])
ok   main switch off with the modes on: sent unchanged (["open the door"])
ok   the Message box section has "Write my actions as" with You … and I … (Message box: Write my actions as (second=You …, first=I …))
ok   and "Tidy what I type (first letter, full stop, quotes)", ticked (Tidy what I type (first letter, full stop, quotes))
ok   and a closed fold "Advanced: my own wording" (Advanced: my own wording)
ok   its three fields show the default wording, are empty, and take 200 characters (You {{input}} | You say, "{{input}}" | You look at {{input}})
ok   with the modes off, all five are greyed out (disabled) (true,true,true,true,true)
ok   ticking the modes on makes them usable (false,false,false,false,false)
ok   choosing "I …" saves the I voice and the fields show the I wording (I {{input}} | I say, "{{input}}" | I look at {{input}})
ok   unticking Tidy saves it off
ok   typing a Do wording saves it, and leaves the others empty ({"do":"*{{input}}*","say":"","see":""})
ok   the changes are saved
ok   lookKeys: modesVoice (second or first), modesTidy, modesTemplates (do, say, see; 200 at most) ({"modesVoice":{"type":"enum","values":["second","first"]},"modesTidy":{"type":"boolean"},"modesTemplates":{"type":"strings","keys":["do","say","see"],"max":200}})
ok   Import look sets the voice, the tidying and the Say wording, and keeps the Do wording ({"do":"*{{input}}*","say":"{{user}}: \"{{input}}\"","see":""})
ok   the redrawn settings show what was imported, the wording as plain text (second, true, *{{input}}* | {{user}}: "{{input}}" | )
ok   no script errors

$ node tests/run.mjs modes
ok       modes-bar  47 checks, 18s
ok       modes-bar phone  50 checks, 18s
ok       modes-send  64 checks, 29s

3 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 13s
ok       foundation phone  15 checks, 12s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       modes-bar  47 checks, 18s
ok       modes-bar phone  50 checks, 17s
ok       modes-send  64 checks, 29s
ok       stage-column  35 checks, 18s
ok       stage-column phone  10 checks, 13s

9 passed, 0 failed
```

A scratch script outside the repository also ran at phone size. It used the Forge Tester chat, with replies answered in the page.

- With SillyTavern's "send on Enter" off, which is what "auto" means on a real phone, Enter added a line break and the box was not rewritten.
- A tap on `#send_but` sent "You open the door.".
- The bar was there, and nothing scrolled sideways.
- No script errors.

## Choices the bible did not cover

**Catching the send**

- **Where the listeners sit.** Both are on `document` in the capture phase, so they run before SillyTavern's Enter handler (jQuery, on `document`) and its click handler (on `#send_but`). Neither listener keeps an element: the box and the button are looked up from each event.
- **A send from a script is never touched.** Both listeners require `event.isTrusted`. This is what separates the user's own Enter or click from scripts. Quick Reply, for example, puts its text in the box and calls `#send_but.click()` from code; that is in SillyTavern's `QuickReplySet.js`. The test sends that way, and the text went out unchanged.
- **IME.** An Enter with `keyCode === 229` is skipped, as well as one with `isComposing`. TauriTavern's own Enter handler skips 229, because some WebKit versions send the key that ends an IME composition after `compositionend`. If the box were rewritten on that key, it would change while the user is still typing, and nothing would be sent.
- **Ctrl+Enter is not shaped.** The bible's test excludes `ctrlKey`. SillyTavern also sends on Ctrl+Enter when text is typed and send-on-Enter is on, so a Ctrl+Enter send goes out as typed. Cmd+Enter is shaped, because SillyTavern's own test ignores `metaKey`. This is worth the owner knowing.
- **If `scripts/RossAscends-mods.js` cannot be loaded.** It is loaded with a dynamic `import()`, so a missing file cannot break the module. The fallback treats a window 1000px wide or less as a phone, which is the bible's boundary. The fallback was not exercised: making that import fail in the sandbox would break SillyTavern itself.
- **What counts as a command or as empty.** These follow SillyTavern's own tests. A command is text whose trimmed form starts with `/` (`processCommands` in `script.js`). A box holding only spaces counts as empty.

**What the text becomes**

- **A text that already starts with "you" or "I" gets no wording at all,** the owner's own included. Rule 3 says to put no "You" or "I" in front, and the wording is what supplies them. So with a Do wording of `*{{input}}*`, "you wave" is sent as "You wave.", without the stars. The same goes for Say and "you say …" or "I say …".
- **"you" and "I" as words.** Either one counts when it is followed by something that is not a letter, digit or underscore. So "I'm" and "you're" count, but "Ice", "Isla" and "your" do not.
- **"First letter" means the first character.** A text that starts with `"`, `*` or `(` keeps its next letter as typed. "First two characters are both capitals" is checked with Unicode case.
- **The rule-3 exception "or the first word is I"** can never be reached, because rule 3's first branch already takes those texts. A comment in `modes.js` says so.
- **Say and quotes.** After one pair of quotes comes off, the inside is trimmed again. A pair with nothing inside (`""`) is left as it is.
- **Tidy off means the template and nothing else.** The text is not even trimmed.
- **The owner's own wording:**
  - It replaces the default in both voices.
  - Wording without `{{input}}` is ignored, because it would throw away what was typed; the default is used instead.
  - Every `{{input}}` in it is filled. The filling uses split and join, so `$&` in the text stays as typed.
- **Story and See send as typed in this batch,** even with tidy on, as the brief says.

**Settings**

- **The controls.**
  - The select's options read "You …" and "I …".
  - The fold is a plain `<details>` with no `open` attribute, so it starts closed. A second SillyTavern `inline-drawer` would have matched the `.inline-drawer-toggle` selector that the earlier tests click.
  - The three fields are labelled Do, Say and See, under a short note: "{{input}} is what you typed (tidied, when tidying is on). Leave a box empty to use the wording shown in it."
- **What the fields show.**
  - Their placeholders follow the chosen voice and change when it changes.
  - Their values and placeholders are set through the DOM in `bindSettings`, never written into the HTML, so a saved wording containing `"` or `<` is shown as plain text.
- **Saving.** A wording is saved on every keystroke, as Forge UI's sliders are. Each field also has `maxlength="200"`, and the saved value is cut to 200.
- **Greyed out means `disabled`.** No `title` was added, because I3 brief item 2 sets that wording for every setting at once. The native look only dims the controls themselves. The label text stays bright (see "Asked of other files").

**TauriTavern's expanded message editor**

I read its source, `src/scripts/chat-input-fullscreen-editor.js` and its wiring in `src/scripts/RossAscends-mods.js`, from the project's public repository.

- **How it sends.** It is a modal `<dialog id="tt-chat-input-editor">` that TauriTavern appends to `body`, with its own textarea (CodeMirror when it loads). Its Send button, and Ctrl/Cmd+Enter inside it, copy its text into `#send_textarea` and call SillyTavern's `sendTextareaMessage()` directly. Neither an Enter in `#send_textarea` nor a click on `#send_but` happens.
- **What follows for the modes.** Nothing could be caught there without patching TauriTavern or racing its CodeMirror flush, so the modes do not shape a send made from the editor.
- **The bar steps aside instead.** While the editor is open, the bar is hidden with `body.forge-ui.forge-modes:has(> #tt-chat-input-editor[open]) #forge-modes`, which bible section 8 allows. The `>` means only `body`'s own children are checked, so messages arriving in `#chat` never make the browser look for the editor. The test checks this with a stand-in dialog.
- **Keys inside the editor** are ignored by our listeners, because their target is not `#send_textarea`.
- **Two smaller points.**
  - When the editor opens, it copies the box's placeholder, so an empty editor would ask our question. The editor only offers itself once the box holds three lines, so this should be rare.
  - TauriTavern may turn the box's text into "agent guidance" (`maybeSubmitAgentGuidanceFromComposer`) while one of its agent runs is going. That was not tried, and Do or Say would shape that text too.

**The placeholder watch (M1's check, note 3)**

- **What changed.** Each call disconnects the watch, looks `#send_textarea` up again and watches the box it finds then, so a box that was replaced is picked up by the next call. The callback looks the box up as well. On each call, any write by SillyTavern that the watch had not yet reported is taken as the text to give back.
- **What is left.** Between calls, the browser's observer registration still points at the box while a mode is picked; the module itself keeps no reference.
- **Why it stays.** There is no way to put the question back as quickly as M1's test requires (within 100 ms of SillyTavern's write) without an observer. A timer would be too slow or would run all the time. Watching a wider subtree would include `#chat`, which section 9 forbids.

**The test**

- **Replies are answered in the page.** The sandbox's own test seed (`/forge-seed.js`, outside this repository) wraps `window.fetch` and answers every `/api/backends/*/generate` request with a 500. That keeps the harness's `held` list from ever seeing a generate call, and turns every send into an unhandled "Got response status 500" script error. This happens with the modes off too. The test therefore wraps `fetch` once more and answers those requests with a made-up reply in the page, as the seed's comment suggests ("Tests that need a model reply use their own stand-in"). Nothing reaches a model or the network.
- **Messages read.** After each send, the test reads only the user messages that send added (`chat.slice(before)`).
- **Settings changed for a step and put back.** These were changed in the page only and never saved: SillyTavern's `send_on_enter`, the connection status and `setSendButtonState`.
- **Checks beyond the brief's nine steps:**
  - more tidy cases: trimming with a line break inside, curly and single quotes, `$&`, "Ice";
  - a wording in the I voice, a wording with `{{user}}`, and a wording without `{{input}}`;
  - Story and See unchanged;
  - the send reached SillyTavern's reply step;
  - a send clicked from a script is untouched;
  - Shift+Enter, and Enter with send-on-Enter off;
  - generating;
  - the never-twice case;
  - the TauriTavern stand-in;
  - modes off with the send button, and the main switch off;
  - the settings controls: labels, the closed fold, placeholders in both voices, `maxlength`, greyed out and back, saving;
  - `lookKeys`, and an Import look round trip through the real file input.

## Asked of other files

- **`style.css` (I3).** Greyed-out settings are `disabled`, and SillyTavern only dims the controls themselves. A rule such as `.arcane-forge-ui-settings label:has(:disabled) { opacity: … }` would grey their labels too. It belongs with I3's `title` on every disabled setting.
- **`tests/browser/_harness.mjs` and `docs/redesign/batches/M3-story-and-see.md` (the lead).** Because the sandbox's seed answers generate requests in the page, the harness's `held` list never shows `/generate`, and every send ends in a script error unless the test answers generate itself. M3's test step 3 ("the helper's `held` list has a path containing `/generate`") cannot pass as written. A small `fakeReplies(page)` helper in `_harness.mjs` would save each test from writing its own. The one in `modes-send.mjs` can be lifted as it is.

## Not done

- Nothing from the brief.
- Not tried:
  - the fallback for a missing `shouldSendOnEnter` (see "Choices");
  - real TauriTavern; only the stand-in dialog was tried, and the editor's behaviour comes from reading its source;
  - group chats; only the Forge Tester chat may be opened.

## Check

**FAIL.** Checked on `batch/M2-do-and-say` at `bc8454b`. The batch was cut from `overhaul` at `c2e2808`. `overhaul` has since moved to `bc7235f` (P1, S2 and P2 merged). None of those merges touch this batch's files.

One problem makes it FAIL: problem 1 below. With Do or Say picked, a send made from the keyboard on the send button goes out as typed. Everything else checked out.

### (a) Files

- `git diff --name-only overhaul...HEAD` lists 5 files: `css/modes.css`, `modes.js`, `tests/browser/modes-send.mjs`, `docs/redesign/results/M2-do-and-say.md` and `docs/redesign/changes/M2-do-and-say.md`. All five are under "You own". Nothing else changed.
- The changes file holds the brief's changelog line word for word. The commit message is the brief's.
- The diff and the commit hold no names, user names or local folder paths.

### (b) Commands

- `node tests/browser/modes-send.mjs`: 64 ok, exit 0.
- `node tests/run.mjs modes`: `3 passed, 0 failed` (modes-bar at both sizes, modes-send).
- `node tests/run.mjs`: `9 passed, 0 failed`.
- Extra, a trial merge with today's `overhaul` (`bc7235f`): `git merge-tree` merges cleanly. That tree, exported outside the repository, gives `15 passed, 0 failed` on `node tests/run.mjs`. That run includes menu-frame, menu-buttons and stage-spine at both sizes.

### (c) Done when, and bible sections 3, 6 and 9

**Done when:**

- **The commands pass.** Yes, see (b).
- **Every row of the table for Do and Say is in the test.** Yes. All 5 Do rows and all 3 Say rows are there, each in both voices, compared exactly: 16 checks.
- **Never rewritten twice, and never while generating, and the result file says how.** Yes. The file explains `lastRewrite` and `generating()`, which is SillyTavern's `isGenerating()` with `is_send_press` as a fallback. My probes confirm both (see "Bible section 6" below).
- **Only the files under "You own" changed.** Yes, see (a).

**The brief's build steps:**

1. `transform(text, mode, s)` is exported. It covers Do and Say in both voices, and returns Story and See unchanged.
2. The two listeners are capture-phase listeners on `document`:
   - Enter uses SillyTavern's own test plus `shouldSendOnEnter()`. That function is loaded with a dynamic `import()`, and the fallback treats a window 1000px wide or less as a phone.
   - The other listener catches a click on `#send_but`.
   - Each one sets the value, fires `input` and lets the event carry on.
3. The box is left alone for:
   - no mode picked;
   - empty or blank text;
   - trimmed text starting with `/`, which is `processCommands`' own test in `script.js`;
   - generating;
   - the last rewrite.

   The builder added two more: events that are not trusted, and `keyCode` 229.
4. Settings:
   - `defaults` and `lookKeys` have the three keys, with the types in bible section 7.
   - The labels match: "Write my actions as" (You … / I …), "Tidy what I type (first letter, full stop, quotes)", and a closed fold "Advanced: my own wording".
   - The placeholders show the default wording in the chosen voice.
   - All five controls are disabled while the modes are off.
5. The listeners go on and off with the feature. My probe in (d) watched them being added and removed.

**Bible section 6.** This section is the specification for what is sent. It was checked in the page by my own scratch script, not only by reading the builder's test.

- **The table, end to end.** I typed each of the 8 Do and Say rows into the message box and sent it with Enter, in both voices. All 16 user messages matched the table exactly. Say through the send button in the I voice gave `I say, "Hello there."`.
- **Commands.** Typed `/send open the door` was sent as the command wrote it, and the box never changed before SillyTavern ran it. The same text with leading spaces was not changed either. `executeSlashCommandsWithOptions('/send …')` was sent unchanged.
- **Scripts.** Each of these was sent as typed with Do picked:
  - `#send_but.click()` from code;
  - `sendTextareaMessage()` called directly;
  - a synthetic Enter `keydown` on the box.
- **Quick Reply.** A real Quick Reply was made and run through Quick Reply's own API (`quickReplyApi`) with Do picked. Its text was sent as typed. Saves were answered by the helper.
- **Ctrl+Enter.** SillyTavern sends it, and it went out as typed, as the bible's Enter test (`!event.ctrlKey`) says. Cmd+Enter is shaped, because SillyTavern's own test ignores Meta. The builder says so.
- **While generating.** A reply was held for 4 seconds. Enter during that time left "close the door" as typed, and only the first message went in.
- **Never twice.** I turned tidy off, so that a second pass would show as "You You …", and set the connection to none. Enter, Enter again and a click all left "You open the door" in the box. Once connected, it was sent as it was.
- **Story and See** are still sent as typed. They belong to M3.
- **The send button from the keyboard is not shaped.** This is problem 1.

**Bible section 3:**

1. **Native controls stay underneath.** The box, the send button and SillyTavern's own handlers do the sending. `lastRewrite` is our own memory, not a copy of SillyTavern's state.
2. **One switch back.** See (d).
3. **Every look choice gets a setting.** The only CSS added hides the bar while TauriTavern's editor is open. Bible section 8 allows that behaviour, and it is not a new look.
4. **Phone and TauriTavern.** The brief asks for no phone run. My phone probes pass, and the test covers the editor with a stand-in.
5. **Tokens.** The one new rule is `display: none`.
6. **Stay in your lane.** See (a).
7. **Small and plain.** No dependency. `script.js` is imported statically, as `index.js` already does, and `RossAscends-mods.js` dynamically.

**Bible section 9:**

- **The contract.** `modes.js` exports the six contract names plus `transform`, which the brief asks for "so the test can call it". `index.js` reads only the six, so I do not count the extra export against "exactly this".
- **`apply()`** is safe to repeat: it adds and removes the same two functions. The feature is active only with `enabled` and `modes` both on.
- **The rules for the code:**
  - The one new selector starts with `body.forge-ui.forge-modes`.
  - No `!important` and no `localStorage`.
  - The wording the owner typed reaches the fields through `.value`, never through markup.
  - No network request beyond loading SillyTavern's own module.
  - No `MutationObserver` on `#chat`.
  - No SillyTavern setting is changed.
  - New ids and classes start with `forge-`.
- **"Never hold on to an element across calls."** The listeners look up the box and the button on each event. The placeholder watch's registration on `#send_textarea` still stays while a mode is picked. That was M1's check note 3, and this batch narrows it.

### (d) Trying to break it

Scratch scripts outside the repository, run through the test helper. Only the Forge Tester chat was open, and saves and generate calls were answered in the page. Only messages the scripts typed were read.

**Switched off:**

- **Listeners.** Calls to `document.addEventListener` and `removeEventListener` were recorded:
  - with the modes on: exactly `onSendKey` (keydown, capture) and `onSendClick` (click, capture);
  - with the modes off: none;
  - with the main switch off and the modes on: none.
- **Sends.** After switching off, Enter and the send button both sent the text unchanged.
- **The page.** A snapshot was taken before the modes were ever on and again after turning them off. It covered `body`'s `forge-` classes and inline style, `#send_form`'s children and attributes, every attribute of `#send_textarea` except the inline style that SillyTavern's own height code writes (the placeholder included), and every `forge-` id. Both snapshots were identical. `modes.js` itself writes no inline style.
- **Main switch off.** No class, no bar, and SillyTavern's own placeholder.

**Phone size** (390 by 800, touch):

- A tap on send with Do gave "You open the door.". With Say it gave `You say, "Hello there."`.
- Enter followed SillyTavern's rule. SillyTavern does not see the helper's phone as mobile (send on Enter is "auto", `isMobile()` is false), so Enter sent the message, and it was shaped.
- The bar runs from 9 to 381px in 390px, its four buttons are 44px tall, nothing scrolls sideways, and there were no script errors.
- Switching off at phone size gave the same results as on desktop.

**Other tries:**

- With the TauriTavern stand-in (`likeTauriTavern`), Do still shaped the message.
- **A send that SillyTavern refuses for its own reasons.** I saw this once, in a long probe where a send came while SillyTavern was still busy from earlier steps. The box showed the rewrite but nothing was sent. The next Enter sends it as it is, thanks to the never-twice check. This matches the method bible section 6 prescribes.

### The builder's choices, judged against the bible

- **Requiring `event.isTrusted`.** The aim is right: Quick Reply calls `click()` from code. But it also drops SillyTavern's own keyboard activation of the send button. That is problem 1.
- **These choices follow the bible or SillyTavern:**
  - skipping `keyCode` 229;
  - not shaping Ctrl+Enter, and shaping Cmd+Enter;
  - the fallback when `shouldSendOnEnter()` cannot be loaded;
  - the command test;
  - "you" and "I" as whole words;
  - "first letter" meaning the first character;
  - the exception in rule 3 that can never be reached;
  - Say trimming inside the quotes.
- **Tidy off means the template only, not even trimmed.** That is the literal "only the template is applied", so "you open the door" with tidy off becomes "You you open the door", as the bible asks.
- **Text starting with "you" or "I" gets no wording at all, the owner's own included.** The bible says nothing about the owner's own wording here, and with the default wording the results match the table. But with a wrapping wording such as `*{{input}}*`, "wave" becomes "*wave.*" while "you wave" becomes "You wave." without the stars. A probe confirmed this. It is problem 2.
- **The settings controls.** The `<details>` fold, `disabled` for greyed out, values set through the DOM, saving on every keystroke and `maxlength` 200 are all fine.
- **TauriTavern's editor.** Bible section 8 allows hiding the bar. I could not check the id `tt-chat-input-editor` against TauriTavern's source, because no copy is within reach. If the id is wrong, the bar simply stays, and sends from the editor are left as typed either way.
- **The placeholder watch rework.** It is not in the brief's build steps, but it is in an owned file, it answers M1's check note 3, and modes-bar passes at both sizes. See problem 3.
- **The test answers generate calls in the page.** The sandbox seed's own comment invites this, and nothing reaches a model or another host.
- **The builder's note for the lead is right.** The seed answers generate with a 500 inside the page, so the helper's route never sees `/generate`. As written, M3's test step 3 cannot pass.

### Problems found

1. **The send button used from the keyboard is not shaped. This makes it FAIL.**
   - **What happens.** `#send_but` is a SillyTavern `.interactable` with `tabindex="0"`, and Tab from the message box lands on it. Enter there makes SillyTavern's `scripts/keyboard.js` (`handleGlobalKeyDown`) call `click()` on it from code. That click is not trusted, so `onSendClick` lets it through untouched.
   - **Probe.** With Do picked I typed "open the door", pressed Tab and then Enter. "open the door" was sent. A mouse click on the same button gives "You open the door.".
   - **With send on Enter off.** In SillyTavern, this button is then the keyboard's only way to send. Say with "hello there" went out as "hello there".
   - **Why it fails.** Bible section 6 applies a mode to a send from the send button. Section 11 says everything works by keyboard.
   - **A possible fix, for the builder to judge.** Also shape on a trusted Enter `keydown` whose target is `#send_but`, in the capture phase. Use the same condition as `keyboard.js`: no Alt, Ctrl or Shift. That runs before `keyboard.js` turns the key into a click. Quick Reply's `click()` from code would still be left alone. The test should then press Enter on the focused send button.
2. **For the owner: the owner's wording and text that starts with "you" or "I".** A wording such as `*{{input}}*` is dropped for such text (see the builder's choices above). The bible does not settle this.
3. **Scope.** The placeholder watch rework goes beyond the brief's build steps. It stays within owned files and nothing broke.
4. **A wording without `{{input}}` is ignored silently.** The settings note does not say so.

Only problem 1 makes it FAIL.

## Fixes after the check

### What failed

Check problem 1. With Do or Say picked, a send made from the send button by keyboard went out as typed.

- Tab from the message box lands on `#send_but`. SillyTavern makes it an `.interactable` with `tabindex="0"`.
- Enter there is turned into a `click()` from code by `handleGlobalKeyDown` in SillyTavern's `scripts/keyboard.js`. That click is not trusted, and `onSendClick` skipped untrusted clicks, so the text was not shaped.
- Space there did nothing at all.

### What SillyTavern does

From its source in `public/scripts/keyboard.js`, `public/script.js`, `public/style.css` and `public/index.html`:

- `keyboard.js` listens for `keydown` on `document`, in the bubble phase. For Enter with no Alt, Ctrl or Shift, it walks up from the target to the nearest interactable and calls `click()` on it, unless that has the class `disabled`. It does not look at `isTrusted`, and it does nothing for Space.
- `#send_but` is a `<div>`, so the browser gives it no Space either.
- Quick Reply, commands and scripts send with `#send_but.click()` or `sendTextareaMessage()` from code. No key or click of the person's own (a trusted event) is behind either.

### What changed

**`modes.js`**

- The capture-phase `keydown` listener now also takes a trusted key whose target is the send button (`onSendButtonKey`). It uses `keyboard.js`'s own test: no Alt, Ctrl or Shift, and the button not `.disabled`.
  - **Enter:** the box is shaped right there, before `keyboard.js` turns the key into its click. Ours is a capture listener on `document` and `keyboard.js`'s a bubble listener on `document`, so ours always runs first. The untrusted click that follows is still skipped by `onSendClick`. `lastRewrite` would stop a second rewrite anyway.
  - **Space:** the page is kept from scrolling, the box is shaped, and the button is clicked, which is what `keyboard.js` does for Enter. A held key sends once.
- Left alone, as before: a key fired by a script (not trusted), on the box or on the button; a `#send_but.click()` from code (Quick Reply); commands; a send while SillyTavern is generating.
- Enter in the message box is unchanged. It moved into its own function, `onBoxKey`.
- **Check item 4.** The Advanced wording note now ends "A wording without {{input}} is ignored, and the one shown is used instead."
- **Check item 2** (the owner's wording dropped for text that starts with you or I) is unchanged, for the owner.

**A choice the bible does not cover: Space.** SillyTavern's send button has no Space, so shaping a Space send means making Space send.

- While the send modes are on, Space on the send button sends, with or without a mode picked. That way the button behaves the same whichever mode is picked. Commands are sent too, as typed, as Enter sends them.
- With the send modes off, the listener is gone, and Space does nothing again, as in SillyTavern. The test checks this.
- `docs/redesign/changes/M2-do-and-say.md` has a line for it.

**`tests/browser/modes-send.mjs`.** New checks:

- Do and Say: Tab from the message box to the send button, then Enter, and then Space. Each sends the shaped text (4 checks). Each also checks that Tab put the focus on `#send_but`.
- No mode: Tab, then Space, sends the text as typed.
- An Enter `keydown` fired by a script on the send button is not rewritten. `keyboard.js` still clicks the button, and the text goes out as typed.
- The `#send_but.click()` from code (as Quick Reply does) is still not rewritten. That check was already there and is kept.
- Modes off: Tab, then Enter, sends the text unchanged. Space on the send button sends nothing, as in SillyTavern.
- The note says a wording without `{{input}}` is ignored.

Two changes keep the test steady:

- **The send button after a reply.** SillyTavern's `style.css` hides the send button while `body[data-generating]` is set, and that can outlast `isGenerating()` by a moment. Tab then skipped the button. The wait after a send now also waits for that attribute to clear, and the keyboard sends wait for the button to show.
- **A late welcome notice.** RPG Companion's welcome notice comes up once per fresh browser. While the sandbox was busy with other agents' tests, it came up after the helper had clicked its "Got it" (2.5 seconds after load). It then took the test's mouse clicks: Playwright reported `#rpg-welcome-modal … intercepts pointer events` once, and an earlier run stopped on a click the same way. The test now clicks a showing "Got it" button before each mouse click and each send, found by its text the way the helper finds it. Nothing in `modes.js` touches it.

### Asked of other files

- **`tests/browser/_harness.mjs` (the lead).** The helper clicks "Got it" once, 2.5 seconds after load. When the sandbox is busy, RPG Companion's welcome notice can come up later than that and take every later click, in any test. Waiting for the notice, or clicking it again just before `openForge` returns, would fix that for every test.

### The new checks on the old code

The new `modes-send.mjs`, run with `modes.js` as it was at `bc8454b`:

```
FAIL Do, Tab to the send button then Enter: the newest user message is You open the door. (focus on send_but; ["open the door"])
FAIL Do, Tab to the send button then Space: the newest user message is You open the door. (focus on send_but; [])
FAIL Say, Tab to the send button then Enter: the newest user message is You say, "Hello there." (focus on send_but; ["hello there"])
FAIL Say, Tab to the send button then Space: the newest user message is You say, "Hello there." (focus on send_but; [])
FAIL no mode: Tab to the send button then Space sends it as typed ([])
ok   a send clicked by a script (as Quick Reply does) is not rewritten (["open the door"])
ok   an Enter fired by a script on the send button is not rewritten (["open the door"])
ok   modes off: Tab to the send button then Enter sends it unchanged (["open the door"])
ok   modes off: Space on the send button sends nothing, as in SillyTavern ("open the door")
FAIL its note says a wording without {{input}} is ignored ({{input}} is what you typed (tidied, when tidying is on). Leave a box empty to use the wording shown in it.)
ok   no script errors

(67 ok and 6 FAIL in all, exit 1. Shown: the failures, the kept script-click check, the other new checks, and the script-error check.)
```

### Test output

Final runs, on the code as committed:

```
$ node tests/browser/modes-send.mjs
ok   Do, You: "open the door" gives "You open the door." ("You open the door.")
ok   Do, I: "open the door" gives "I open the door." ("I open the door.")
ok   Do, You: "Open the door!" gives "You open the door!" ("You open the door!")
ok   Do, I: "Open the door!" gives "I open the door!" ("I open the door!")
ok   Do, You: "you open the door" gives "You open the door." ("You open the door.")
ok   Do, I: "you open the door" gives "You open the door." ("You open the door.")
ok   Do, You: "I'm leaving" gives "I'm leaving." ("I'm leaving.")
ok   Do, I: "I'm leaving" gives "I'm leaving." ("I'm leaving.")
ok   Do, You: "NASA badge out, walk in" gives "You NASA badge out, walk in." ("You NASA badge out, walk in.")
ok   Do, I: "NASA badge out, walk in" gives "I NASA badge out, walk in." ("I NASA badge out, walk in.")
ok   Say, You: "hello there" gives "You say, \"Hello there.\"" ("You say, \"Hello there.\"")
ok   Say, I: "hello there" gives "I say, \"Hello there.\"" ("I say, \"Hello there.\"")
ok   Say, You: "\"Who goes there?\"" gives "You say, \"Who goes there?\"" ("You say, \"Who goes there?\"")
ok   Say, I: "\"Who goes there?\"" gives "I say, \"Who goes there?\"" ("I say, \"Who goes there?\"")
ok   Say, You: "You say hi" gives "You say hi." ("You say hi.")
ok   Say, I: "You say hi" gives "You say hi." ("You say hi.")
ok   tidy off: Do "open the door" gives "You open the door" ("You open the door")
ok   tidy off: Say "hello there" gives You say, "hello there" ("You say, \"hello there\"")
ok   a Do wording of *{{input}}* gives "*open the door.*" ("*open the door.*")
ok   the own wording is used in the I voice too ("*open the door.*")
ok   SillyTavern's own macros in the wording are left for SillyTavern ("{{user}}: \"Hello.\"")
ok   a wording without {{input}} is not used (the text would be lost) ("You open the door.")
ok   the ends are trimmed and a line break inside is kept ("You open the door\nslowly.")
ok   Say takes off curly quotes round the whole text ("You say, \"Hi there.\"")
ok   Say takes off single quotes round the whole text ("You say, \"Hi there.\"")
ok   nothing in the text is read as a replacement pattern ("You pay $& go.")
ok   a word that only starts with "I" is not the word I ("You ice the cake.")
ok   Story and See come back unchanged for now (["the door","The rain stops"])
ok   Do, Enter: the newest user message is "You open the door." (["You open the door."])
ok   the message box is empty after the send ("")
ok   the send went on to SillyTavern, which asked for a reply (answered in the page) (1 asked)
ok   Do, Tab to the send button then Enter: the newest user message is You open the door. (focus on send_but; ["You open the door."])
ok   Do, Tab to the send button then Space: the newest user message is You open the door. (focus on send_but; ["You open the door."])
ok   Say, send button: the newest user message is You say, "Hello there." (["You say, \"Hello there.\""])
ok   Say, Tab to the send button then Enter: the newest user message is You say, "Hello there." (focus on send_but; ["You say, \"Hello there.\""])
ok   Say, Tab to the send button then Space: the newest user message is You say, "Hello there." (focus on send_but; ["You say, \"Hello there.\""])
ok   clicking Say again leaves no mode picked
ok   no mode: the newest user message is "open the door" (["open the door"])
ok   no mode: Tab to the send button then Space sends it as typed (["open the door"])
ok   Do, "/echo test": no user message is added ([])
ok   and the text was not rewritten before SillyTavern ran it (["/echo test",""])
ok   a send clicked by a script (as Quick Reply does) is not rewritten (["open the door"])
ok   an Enter fired by a script on the send button is not rewritten (["open the door"])
ok   Shift+Enter (a new line) does not rewrite the box ("open the door\n")
ok   with SillyTavern's "send on Enter" off, Enter (a new line) does not rewrite the box ("open the door\n")
ok   while SillyTavern is generating, Enter leaves the box as typed ("open the door")
ok   a send that did not go through leaves the rewrite in the box ("*open the door.*")
ok   pressing Enter again does not rewrite it a second time ("*open the door.*")
ok   once connected, it is sent as it is (["*open the door.*"])
ok   with TauriTavern's expanded editor open, the bar is hidden (stand-in)
ok   closing the editor brings the bar back
ok   I voice, Do, Enter: the newest user message is "I open the door." (["I open the door."])
ok   modes off: the bar is gone and Do is still the saved choice
ok   modes off: "open the door" with Enter is sent unchanged (["open the door"])
ok   modes off: "hello there" with the send button is sent unchanged (["hello there"])
ok   modes off: Tab to the send button then Enter sends it unchanged (["open the door"])
ok   modes off: Space on the send button sends nothing, as in SillyTavern ("open the door")
ok   main switch off with the modes on: sent unchanged (["open the door"])
ok   the Message box section has "Write my actions as" with You … and I … (Message box: Write my actions as (second=You …, first=I …))
ok   and "Tidy what I type (first letter, full stop, quotes)", ticked (Tidy what I type (first letter, full stop, quotes))
ok   and a closed fold "Advanced: my own wording" (Advanced: my own wording)
ok   its note says a wording without {{input}} is ignored ({{input}} is what you typed (tidied, when tidying is on). Leave a box empty to use the wording shown in it. A wording without {{input}} is ignored, and the one shown is used instead.)
ok   its three fields show the default wording, are empty, and take 200 characters (You {{input}} | You say, "{{input}}" | You look at {{input}})
ok   with the modes off, all five are greyed out (disabled) (true,true,true,true,true)
ok   ticking the modes on makes them usable (false,false,false,false,false)
ok   choosing "I …" saves the I voice and the fields show the I wording (I {{input}} | I say, "{{input}}" | I look at {{input}})
ok   unticking Tidy saves it off
ok   typing a Do wording saves it, and leaves the others empty ({"do":"*{{input}}*","say":"","see":""})
ok   the changes are saved
ok   lookKeys: modesVoice (second or first), modesTidy, modesTemplates (do, say, see; 200 at most) ({"modesVoice":{"type":"enum","values":["second","first"]},"modesTidy":{"type":"boolean"},"modesTemplates":{"type":"strings","keys":["do","say","see"],"max":200}})
ok   Import look sets the voice, the tidying and the Say wording, and keeps the Do wording ({"do":"*{{input}}*","say":"{{user}}: \"{{input}}\"","see":""})
ok   the redrawn settings show what was imported, the wording as plain text (second, true, *{{input}}* | {{user}}: "{{input}}" | )
ok   no script errors

$ node tests/run.mjs modes
ok       modes-bar  47 checks, 19s
ok       modes-bar phone  50 checks, 19s
ok       modes-send  73 checks, 36s

3 passed, 0 failed

$ node tests/run.mjs
ok       foundation  18 checks, 14s
ok       foundation phone  15 checks, 13s
ok       harness  8 checks, 11s
ok       harness phone  8 checks, 11s
ok       modes-bar  47 checks, 19s
ok       modes-bar phone  50 checks, 19s
ok       modes-send  73 checks, 36s
ok       stage-column  35 checks, 19s
ok       stage-column phone  10 checks, 14s

9 passed, 0 failed
```
