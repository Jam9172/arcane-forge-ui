// The menu panel (desktop): every SillyTavern menu opens in one centred panel with a section list, and two
// round buttons can take the top bar's place. See docs/redesign/BIBLE.md, section 5.2. Styles are in
// css/menu.css.
//
// index.js holds this module in its list of features and calls the functions below; it never needs editing
// for what the panel does. The contract (bible section 9):
//   defaults      merged into Arcane Forge UI's settings
//   lookKeys      the keys Export look writes and Import look accepts, with their types
//   settingsHtml  this feature's section of the settings screen ('' for none)
//   bindSettings  wires that section's controls; call save() after a change
//   apply         puts the page in the state the settings ask for. Called on load, after every settings
//                 change, when the window crosses 1000px, and on the arcane-forge-ui:apply event; safe to
//                 call any number of times, and the only place that adds or removes the panel.

export const id = 'menu';

export const defaults = {};

export const lookKeys = {};

export function settingsHtml(s) {
    return '';
}

export function bindSettings($root, s, save) {}

export function apply(s) {}
