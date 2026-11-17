# I3-settings-and-look

Built by the lead in its own checkout, without helper agents (the owner's choice for wave 2). There was no independent check.

## Built

- **Order and wording.** The three new sections already ran Layout, Menus, Message box between Panels and Keyboard, and every label matched bible section 7 except the Forge layout select's options, now "Classic" and "Stage (desktop)" as the bible's label has them (S1's test follows). The note under it ("Desktop only. Phones keep the classic layout.") stays.
- **Greyed out, not hidden.** Every setting that needs another one on is disabled with a `title` naming it: the four stage settings ("Needs "Forge layout: Stage (desktop)""), the four Message box options and the wording fold ("Needs "Do, Say, Story and See buttons above the message box" on"), and the round buttons (P2's). The title follows the switch as it changes. A settings-screen rule in `style.css` dims a greyed-out setting's label too (M2, P2, S2 and S3 asked for it).
- **Look file.** Export look writes every "yes" key and no "no" key (unchanged from the lanes). Import look now ignores a feature's number outside its range instead of clamping it, so a file with `stageChat: 999` changes nothing (S2's question); Forge UI's own numbers still clamp, as before. `format` and `version` are unchanged.
- **Reset** already put every new key back to its default and the page followed (00-foundation); now tested.
- **Changelog.** The ten lane fragments are folded into `CHANGELOG.md` under Unreleased as three entries, newest first in story order: the send modes, the stage layout, the menu panel; plus one line for the main switch leaving nothing behind (I1). The fragments, and with them `docs/redesign/changes/`, are gone.
- **README:** a short section, "Stage layout, menu panel and send modes": what each is, that all three are off by default, and where to turn them on. The early beta warning stays.
- `tests/browser/settings-look.mjs`: the brief's eight steps.

## Test output

```
$ node tests/browser/settings-look.mjs
ok   the headings run Panels, Layout, Menus, Message box, Keyboard
ok   with the menu panel off, Classic layout and the modes off, the settings that need them are greyed out with a title
ok   every setting in the bible's table is on screen under its label, and its control changes it
ok   and the page follows: the stage layout, the menu panel and the send modes are on
ok   Export look writes every key the bible marks "yes"
ok   and none it marks "no"
ok   and keeps its format and version (arcane-forge-ui-look 1)
ok   a look file with stageChat 999, modesVoice "third", stageShade "dark" and a 500-character Do wording changes none of them
ok   a second file with stageChat 55 sets it (55)
ok   an older look file with none of the new keys imports as before (19 #112233)
ok   Reset puts every new key back to the default in its feature's defaults
ok   and none of the features' elements or classes is left in the page
ok   docs/redesign/changes holds no fragment files
ok   CHANGELOG.md's Unreleased section names Do, Say, Story and See, the stage layout and the menu panel
ok   no script errors
```

The full suite is recorded in `STATUS.md` with the merge.

## Choices the bible did not cover

- **Reading the exported file.** The brief names Playwright's download event; SillyTavern's `download()` revokes its blob URL straight after the click, which WebKit can race, so the test keeps the blob as the page makes it and reads that. The file read is the same bytes.
- **Labels "word for word"** are read from the label's own text (the words before a range's live value). The bible's "Forge layout: Classic / Stage (desktop)" is a label with two options, as the other select rows are.
- **Step 7, "none of our elements"**, means the five the features add (`#forge-stage`, `#forge-spine`, `#forge-menu`, `#forge-menu-buttons`, `#forge-modes`); Forge UI's own AI Response layout stays with the look on.

## Asked of other files

None.

## Not done

Nothing in the brief.
