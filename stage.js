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
//
// What the layout puts in the page, and apply() takes out again: the class forge-stage on body, the chat
// column's width as --forge-stage-chat on body, and #forge-stage, one empty layer over the stage.

export const id = 'stage';

export const defaults = { layout: 'classic', stageChat: 46 };

export const lookKeys = {};

// SillyTavern's own phone boundary; the stage is desktop only (bible section 5.4)
const DESKTOP = '(min-width: 1001px)';
const BODY_CLASS = 'forge-stage';
const STAGE_ID = 'forge-stage';
const CHAT_WIDTH = '--forge-stage-chat';
// The Chat width setting's range, as a share of the window (bible section 7)
const CHAT_MIN = 35;
const CHAT_MAX = 70;

const LAYOUTS = {
    classic: "Classic (SillyTavern's own)",
    stage: 'Stage (art on the left, chat on the right)',
};

export function settingsHtml(s) {
    const choices = Object.entries(LAYOUTS)
        .map(([key, label]) => `<option value="${key}"${key === s.layout ? ' selected' : ''}>${label}</option>`)
        .join('');
    return `
                <h4>Layout</h4>
                <label class="forge-ui-select">
                    <span>Forge layout</span>
                    <select id="forge-ui-layout" class="text_pole" aria-describedby="forge-ui-layout-note">${choices}</select>
                </label>
                <small id="forge-ui-layout-note">Desktop only. Phones keep the classic layout.</small>
`;
}

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-layout').on('change', function () {
        s.layout = this.value in LAYOUTS ? this.value : defaults.layout;
        save();
    });
}

export function apply(s) {
    const body = document.body;
    const active = Boolean(s.enabled && s.layout === 'stage' && window.matchMedia(DESKTOP).matches);
    body.classList.toggle(BODY_CLASS, active);
    if (active) {
        body.style.setProperty(CHAT_WIDTH, chatWidth(s.stageChat));
        if (!document.getElementById(STAGE_ID)) body.append(stageLayer());
    } else {
        body.style.removeProperty(CHAT_WIDTH);
        document.getElementById(STAGE_ID)?.remove();
    }
}

// Bible section 5.1: the chat's share of the window, but never narrower than --forge-chat-min and never so wide
// that the stage gets narrower than --forge-stage-min. Left to CSS, so it follows the window as it is resized.
function chatWidth(percent) {
    const share = Number.isFinite(Number(percent)) ? Math.min(CHAT_MAX, Math.max(CHAT_MIN, Number(percent))) : defaults.stageChat;
    return `clamp(var(--forge-chat-min), ${share}vw, calc(100vw - var(--forge-stage-min)))`;
}

// The layer over the art that later holds the shade and the name plate. It is only decoration, so screen
// readers skip it, and clicks go through it (css/stage.css).
function stageLayer() {
    const layer = document.createElement('div');
    layer.id = STAGE_ID;
    layer.setAttribute('aria-hidden', 'true');
    return layer;
}
