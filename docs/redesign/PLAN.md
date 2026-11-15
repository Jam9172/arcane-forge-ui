# Arcane Forge UI redesign: the plan

What gets built, in what order, and who can work at the same time. The rules and measurements are in `BIBLE.md`; how to run the work is in `HANDOFF.md`; progress is in `STATUS.md`.

## The outcome

On the `overhaul` branch, Arcane Forge UI gains three features, each behind its own switch and each off by default:

1. **Send modes:** Do, Say, Story and See buttons right above the message box, on every screen size.
2. **Stage layout:** on desktop, art on the left and the chat as one column on the right.
3. **Menu panel:** on desktop, every SillyTavern menu in one centred panel, and two round buttons in place of the top bar.

Phones keep SillyTavern's own bar and gain the send modes. Nothing of RPG Companion's is drawn, moved or restyled.

## The shape of the work

Fifteen small batches in three waves. Wave 1 has three lanes that never touch the same files, so they can run at the same time.

```
Wave 0   00-foundation
            |
Wave 1   M1-mode-bar ----> M2-do-and-say ----> M3-story-and-see           lane M: modes.js
         S1-chat-column -> S2-spine-and-width -> S3-stage-content         lane S: stage.js
         P1-menu-frame --> P2-buttons-and-top-bar -> P3-characters-and-pins -> P4-keys-and-motion
            |                                                             lane P: menu.js
Wave 2   I1-together -> I2-phone -> I3-settings-and-look -> I4-sign-off
```

| Batch | Lane | Size | Needs | Outcome |
|---|---|---|---|---|
| `00-foundation` | - | M | - | Features plug in without editing shared files. No visible change. |
| `M1-mode-bar` | M | S | 00 | The four buttons are on screen and remember the choice. |
| `M2-do-and-say` | M | M | M1 | Do and Say rewrite what is typed. |
| `M3-story-and-see` | M | M | M2 | Story goes in as narration; See asks for a description or a picture. |
| `S1-chat-column` | S | M | 00 | The chat docks right; the art is centred on the stage. |
| `S2-spine-and-width` | S | S | S1 | The chat's edge can be dragged; Chat width is a setting. |
| `S3-stage-content` | S | M | S2 | Name plate, shade, and the sprite on the stage. |
| `P1-menu-frame` | P | M | 00 | Menus open in the centred panel with a section list. |
| `P2-buttons-and-top-bar` | P | M | P1 | Two round buttons replace the top bar. |
| `P3-characters-and-pins` | P | S | P2 | The character list works in the panel; pins are put away and put back. |
| `P4-keys-and-motion` | P | S | P3 | Escape, focus, Tab and reduced motion. |
| `I1-together` | - | M | all of wave 1 | All three on at once, and beside other extensions. |
| `I2-phone` | - | S | I1 | The phone pass. |
| `I3-settings-and-look` | - | M | I2 | Settings in order, the look file, changelog, README. |
| `I4-sign-off` | - | S | I3 | Everything run once more; the owner's checklist written. |

Each batch has a brief in `batches/`. A brief is written to be read cold: it names the files, the bible sections to read, what to build, what to leave alone, and the checks that make it done.

## When a batch is done

1. Its test passes on its own and `node tests/run.mjs` passes as a whole.
2. A second agent, one that did not write the code, has checked it against the brief (see `HANDOFF.md`).
3. Only the files the brief owns were changed.
4. Its result file and its changelog line are written.
5. It is merged into `overhaul`. Nothing is pushed.

## Where the owner looks in

The work can run without the owner, but three things only the owner can judge. Each is a few minutes in TauriTavern, after that part is merged and installed.

| After | What to try |
|---|---|
| Lane M | Turn on the send modes. Do, Say, Story and See each send what the bible's table says. |
| Lanes S and P | Turn on Stage and the menu panel on the Mac. Drag the chat's edge. Open every menu from the two buttons. |
| Wave 2 | The phone or tablet: the modes bar above the message box, nothing else moved. |

`I4-sign-off` writes these out step by step in `OWNER-CHECK.md`.

## Choices left for the owner

None of these block the work. Each has a default the batches build to.

| Choice | Built as | Asked at |
|---|---|---|
| Should any of the three be on by default? | all off | sign-off |
| Actions in second or first person? | second ("You open the door.") | any time; it is a setting |
| Story as narration or as your own message? | narration | any time; it is a setting |
| See as a description or a picture? | description | any time; it is a setting |
| What ships to `main`: the code only, or also `docs/redesign`, `tests`, `CLAUDE.md` and `.claude`? | everything stays on the branch | before merging to `main` |
| How does the phone get it before the merge? | it waits for the merge to `main` | after wave 2 |

## Risks, and what the plan does about them

| Risk | Answer |
|---|---|
| TauriTavern is the real target and no test can open it. | Tests copy its two known habits (`likeTauriTavern`), the bible lists its traps, and the owner's three check-ins are in TauriTavern. |
| The menu panel fights SillyTavern's own drawer code. | The panel follows SillyTavern's open and closed classes and clicks its own buttons. It keeps no state of its own. |
| Parallel work collides. | Lanes own separate files; shared files are touched only in wave 0 and wave 2. |
| A helper agent starts cold and guesses. | Briefs are self-contained and the bible has the page map, with what was verified and when. |
| The run cannot ask a question. | Every open choice has a default in the bible. A blocked batch writes why and stops; the other lanes carry on. |
| A switch leaves something behind. | Every feature test proves "off leaves no trace". |

## After the plan

Releasing, merging to `main` and pushing are the owner's calls and are not part of any batch. Arcane Forge UI stays on 0.x.
