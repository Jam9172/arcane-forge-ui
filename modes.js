// The send modes (every screen size): Do, Say, Story and See, right above the message box, shaping what
// you type before it is sent. See docs/redesign/BIBLE.md, sections 5.3 and 6. Styles are in css/modes.css.
//
// index.js holds this module in its list of features and calls the functions below; it never needs editing
// for what the modes do. The contract (bible section 9):
//   defaults      merged into Arcane Forge UI's settings
//   lookKeys      the keys Export look writes and Import look accepts, with their types
//   settingsHtml  this feature's section of the settings screen ('' for none)
//   bindSettings  wires that section's controls; call save() after a change
//   apply         puts the page in the state the settings ask for. Called on load, after every settings
//                 change, when the window crosses 1000px, and on the arcane-forge-ui:apply event; safe to
//                 call any number of times, and the only place that adds or removes the modes.

export const id = 'modes';

export const defaults = {};

export const lookKeys = {};

export function settingsHtml(s) {
    return '';
}

export function bindSettings($root, s, save) {}

export function apply(s) {}
