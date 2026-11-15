// The Stage layout (desktop): the art on the left, the chat as one column on the right.
// See docs/redesign/BIBLE.md, section 5.1. Styles are in css/stage.css.
//
// index.js holds this module in its list of features and calls the functions below; it never needs editing
// for what the layout does. The contract (bible section 9):
//   defaults      merged into Arcane Forge UI's settings
//   lookKeys      the keys Export look writes and Import look accepts, with their types
//   settingsHtml  this feature's section of the settings screen ('' for none)
//   bindSettings  wires that section's controls; call save() after a change
//   apply         puts the page in the state the settings ask for. Called on load, after every settings
//                 change, when the window crosses 1000px, and on the arcane-forge-ui:apply event; safe to
//                 call any number of times, and the only place that adds or removes the layout.

export const id = 'stage';

export const defaults = {};

export const lookKeys = {};

export function settingsHtml(s) {
    return '';
}

export function bindSettings($root, s, save) {}

export function apply(s) {}
