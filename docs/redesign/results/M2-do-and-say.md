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
