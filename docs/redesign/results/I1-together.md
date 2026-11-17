# I1-together

Built by the lead in its own checkout, without helper agents (the owner's choice for wave 2). There was no independent check.

## Built

- **RPG Companion's side panel.** `stage.js` measures `#rpg-companion-panel` when it has the class `rpg-position-right` and is drawn against the window's right edge on the right half of the window; while it is, `--forge-stage-aside` on `body` is its width (360px in the sandbox at 1440 by 900). `css/stage.css` moves the chat column left by that much (`right: var(--forge-stage-aside)`), and everything sized from the stage (the art, `#forge-stage`, the sprite, the spine) now uses `--forge-stage-taken`, the chat column plus that room. Nothing of RPG Companion's is styled, moved or written to. Its classes and style can change at any time and it may be added after us, so while the stage is on we watch `body`'s children and the panel's `class` and `style` attributes (measuring again 400ms later, after its slide), and the window's resize. All of it is gone with the stage off.
- **Chat under the round buttons.** With the buttons on, `#chat` gets top padding of the buttons' height and the gap above and below them (`css/menu.css`), in either layout (bible 5.2).
- **Main switch off leaves nothing.** `index.js` no longer leaves its own classes (`forge-user-layout`, `forge-icons` and the rest), its inline `--forge-*` properties or the fonts link in the page when Arcane Forge UI's main switch is off (CLAUDE.md rule 6; noted since 00-foundation).
- **Tokens.** `css/tokens.css` gains the layer tokens `--forge-z-stage` (-1), `--forge-z-chat` (30), `--forge-z-plate` (3) and `--forge-z-lift` (1000), and `--forge-menu-dim`, `--forge-menu-grow`, `--forge-icon`, `--forge-dot` and `--forge-spine-reach`. The feature stylesheets use them in place of their raw values.
- **Test helper.** `_harness.mjs` clicks a late "Got it" notice once more after the chat opens.
- `tests/browser/together.mjs`: the brief's nine steps, and one more: with RPG Companion's panel hidden (in the test page only) the column is back at the right edge, and shown again it leaves the room again.
- `tests/browser/stage-column.mjs` and `stage-spine.mjs` measure the stage against the whole window, so with the panel's room taken they failed (10 checks). Each now hides RPG Companion's panel with a test-page style rule (an inline change is undone by its own code) and says why; the room itself is tested in `together.mjs`.

The seams the brief lists were already right once the above was in: the column starts at the top with the buttons and below the top bar without them; the spine is below the menu panel's backdrop, so it cannot be dragged while the panel is open; the panel is centred on the window; the send modes bar keeps its place and fits on one line at the 480px minimum; Quick Reply's bar stays above ours.

## Test output

```
$ node tests/browser/together.mjs
ok   the round buttons are not over the first message
ok   the send modes bar is not over the message box
ok   the spine is not over the chat's text
ok   with the round buttons, the chat column starts at the top of the window
ok   without them, it starts at the top bar's bottom
ok   the menu panel is centred on the window (2px)
ok   a drag on the spine while the panel is open changes no width
ok   RPG Companion's side panel and the chat column do not overlap (panel 1080,35 360x866, column 418,0 662x900)
ok   with a Quick Reply bar in the form, the send modes bar is still right before the message box row
ok   at 1040 by 700, the chat column is at least 480px and the stage at least what the side panel leaves
ok   and the four mode buttons fit inside the column on one line
ok   main switch off: no element whose id starts with forge- (outside the settings screen)
ok   and none of the four feature classes on body
ok   and no forge- class, no --forge- property on body, and no fonts link
ok   --topBarBlockSize and the pins are as SillyTavern had them
ok   and the chat column, the top bar and the message box are where they were with nothing on
ok   no script errors

$ node tests/browser/together.mjs phone
ok   phone: no stage, menu panel or round buttons (forge-modes)
ok   phone: the send modes are on, with the bar above the message box
ok   phone: no sideways scroll
ok   no script errors
```

`node tests/run.mjs`: see the commit's run below the merge in `STATUS.md`.

## Choices the bible did not cover

- **When the window cannot hold everything, the stage gives way.** At 1040 by 700 with RPG Companion's 360px panel open, the window cannot hold the chat's 480px, the stage's 320px and the panel. The chat keeps its 480px and stays out from under the panel; the stage gets what is left (200px there). Brief step 6 is checked that way when a side panel takes room, and as written when none does.
- **Step 7's baseline** is a page with Arcane Forge UI's main switch off, as the brief says ("a page that never had the features on"); with the look on, the column is 1px different, which is the look, not a feature.
- **Step 7's "no element whose id starts with forge-"** leaves out the settings screen in the Extensions drawer: its controls are the switch itself and stay.
- **The chat's top padding applies in both layouts** whenever the buttons show, since the column starts at the top of the window in both.

## Lane requests, answered

| From | Request | Answer |
|---|---|---|
| P1 | a token for the backdrop's dim | done: `--forge-menu-dim` |
| P2 | the chat's top padding under the buttons | done (`css/menu.css`) |
| P2, S1 | the buttons overlap RPG Companion's panel top; the panel covers the chat column | the column now leaves the panel's room; the panel's own 34.5px top gap is RPG Companion's rule and is left alone, so the Characters button still overlaps its top edge by about 17px (for the owner) |
| P2, P3 | toasts touch the top edge; a maximised Author's Note or CFG covers the buttons and Characters and AI response in the panel | left as they are: those are SillyTavern's own layers and positions (for the owner) |
| P3 | a token for the 1000 lift | done: `--forge-z-lift` |
| P4 | a token for the 0.98 scale | done: `--forge-menu-grow` |
| S1, S2, S3 | layer tokens for the stage, the spine and the plate; a token for the spine's reach | done: `--forge-z-stage`, `--forge-z-chat`, `--forge-z-plate`, `--forge-spine-reach` |
| S3 | the plate's 28px and 10px | left raw: they are the bible's own figures, used once, with comments |
| S3 | `setPlateText` as a seventh export | kept: the brief asked for it and `index.js` ignores it; bible 9's "exactly" should read "at least" (for the owner) |
| S3 | sprites in visual novel mode for group chats | not tried: only the Forge Tester chat may be opened |
| M2, M3 | a shared `fakeReplies(page)` in `_harness.mjs` | not done: the two tests that need it each carry their own copy, which works; moving it is a tidy-up for later |
| M2, M3 | a second click on a late "Got it" notice | done in `_harness.mjs` |
| M2, P2, S2, S3 | dim the label of a greyed-out setting; `stageChat: 999` on import | left to I3 (settings screen and `index.js`'s import), as asked |

## Asked of other files

None.

## Not done

Real TauriTavern, and RPG Companion's panel being closed and reopened by hand (the sandbox has it open; the watch was read through, not exercised by a click on its own toggle).
