## Disclaimer: This code was written entirely using AI on top of the RPG companion extension released by Marinara. Please support the original creator over me.

# Arcane Forge UI

> [!WARNING]
> **Early beta.** Arcane Forge UI is in early beta and progresses slowly. Expect rough edges, layout bugs and changes between versions. Please report problems on the [Issues page](https://github.com/Jam9172/arcane-forge-ui/issues).

A SillyTavern / TauriTavern UI extension that carries the Arcane Forge look from [RPG Companion Arcane](https://github.com/Jam9172/rpg-companion-sillytavern) across the whole app: top bar, side panels, chat messages, message box, buttons, form controls, popups and toasts.

## Features

- Warm ember-and-brass look across the whole app, with redrawn top-bar icons
- Adjustable text size, fonts, colours, panel opacity and panel blur
- A cleaner AI Response tab: preset card, length, sampling with a short description under each sampler, model features, behaviour, logit bias and prompts
- Side panels sit flush with the chat and the window edge

## Stage layout, menu panel and send modes

Three larger changes, each with its own switch and each **off by default**. Turn them on under Extensions → Arcane Forge UI:

- **Send modes** (Message box): Do, Say, Story and See buttons right above the message box, on desktop and phones. They shape what you type before it is sent: an action, a line of speech, narration, or a look at something.
- **Stage layout** (Layout, desktop only): the chat as one column on the right and the background art on the rest of the window, with the character's name and sprite on the stage. Drag the chat's edge to resize it.
- **Menu panel** (Menus, desktop only): every SillyTavern menu opens in one centred panel with a list of sections, and two round buttons take the place of the top bar.

Phones keep SillyTavern's own top bar and menus; only the send modes appear there.

## Install

In SillyTavern or TauriTavern: Extensions → Install extension → paste

```
https://github.com/Jam9172/arcane-forge-ui
```

Turn it on or off under Extensions → Arcane Forge UI. Off restores your normal theme.

Pairs well with RPG Companion Arcane's Arcane Forge theme, but works on its own.

## Changelog

What changed in each version is in [CHANGELOG.md](CHANGELOG.md).

## Licence

MIT. See [LICENSE](LICENSE). The Cinzel and Alegreya Sans fonts are bundled in `fonts/` under the SIL Open Font License 1.1 (see the OFL files there).
