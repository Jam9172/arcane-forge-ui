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
// column's width as --forge-stage-chat on body, #forge-stage (one empty layer over the stage), and
// #forge-spine (the chat column's left edge, which can be dragged), plus forge-dragging on body while it is.

export const id = 'stage';

export const defaults = { layout: 'classic', stageChat: 46 };

// The Chat width setting's range, as a share of the window (bible section 7)
const CHAT_MIN = 35;
const CHAT_MAX = 70;

export const lookKeys = { stageChat: { type: 'number', min: CHAT_MIN, max: CHAT_MAX } };

// SillyTavern's own phone boundary; the stage is desktop only (bible section 5.4)
const DESKTOP = '(min-width: 1001px)';
const BODY_CLASS = 'forge-stage';
const DRAGGING_CLASS = 'forge-dragging';
const STAGE_ID = 'forge-stage';
const SPINE_ID = 'forge-spine';
const CHAT_WIDTH = '--forge-stage-chat';
// Where Arcane Forge UI keeps its settings (index.js's MODULE); the spine saves through it
const SETTINGS_KEY = 'arcaneForgeUi';
// The Chat width range on the settings screen, and the percentage shown beside it
const RANGE_ID = 'forge-ui-stage-chat';
const RANGE_VALUE_ID = 'forge-ui-stage-chat-value';

const LAYOUTS = {
    classic: "Classic (SillyTavern's own)",
    stage: 'Stage (art on the left, chat on the right)',
};

// The keys the spine answers to (bible section 5.1): Left widens the chat, Right narrows it, Home and End go to
// the limits
const SPINE_KEYS = {
    ArrowLeft: (share) => share + 1,
    ArrowRight: (share) => share - 1,
    Home: () => CHAT_MAX,
    End: () => CHAT_MIN,
};

// The drag in progress, if any: which pointer, where it started, the chat's width then, and the share it has
// been dragged to (null until it moves). Numbers only; the spine itself is looked up when needed.
let drag = null;

export function settingsHtml(s) {
    const choices = Object.entries(LAYOUTS)
        .map(([key, label]) => `<option value="${key}"${key === s.layout ? ' selected' : ''}>${label}</option>`)
        .join('');
    const share = Math.round(chatShare(s.stageChat));
    return `
                <h4>Layout</h4>
                <label class="forge-ui-select">
                    <span>Forge layout</span>
                    <select id="forge-ui-layout" class="text_pole" aria-describedby="forge-ui-layout-note">${choices}</select>
                </label>
                <small id="forge-ui-layout-note">Desktop only. Phones keep the classic layout.</small>
                <label class="forge-ui-range">
                    <span>Chat width <output id="${RANGE_VALUE_ID}">${share}%</output></span>
                    <input type="range" id="${RANGE_ID}" min="${CHAT_MIN}" max="${CHAT_MAX}" step="1" value="${share}"${s.layout === 'stage' ? '' : ' disabled'}>
                </label>
`;
}

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-layout').on('change', function () {
        s.layout = Object.hasOwn(LAYOUTS, this.value) ? this.value : defaults.layout;
        // The chat width only means something in the stage layout, so it is greyed out in the classic one
        $root.find(`#${RANGE_ID}`).prop('disabled', s.layout !== 'stage');
        save();
    });
    $root.find(`#${RANGE_ID}`).on('input', function () {
        s.stageChat = Math.round(chatShare(this.value));
        $root.find(`#${RANGE_VALUE_ID}`).text(`${s.stageChat}%`);
        save();
    });
}

export function apply(s) {
    const body = document.body;
    const active = Boolean(s.enabled && s.layout === 'stage' && window.matchMedia(DESKTOP).matches);
    body.classList.toggle(BODY_CLASS, active);
    if (active) {
        body.style.setProperty(CHAT_WIDTH, chatWidth(chatShare(s.stageChat)));
        if (!document.getElementById(STAGE_ID)) body.append(stageLayer());
        if (!document.getElementById(SPINE_ID)) body.append(spineElement());
        document.getElementById(SPINE_ID).setAttribute('aria-valuenow', String(Math.round(chatShare(s.stageChat))));
    } else {
        drag = null;
        body.classList.remove(DRAGGING_CLASS);
        body.style.removeProperty(CHAT_WIDTH);
        document.getElementById(STAGE_ID)?.remove();
        document.getElementById(SPINE_ID)?.remove();
    }
}

// The chat's share of the window in percent, kept within the Chat width range. Anything that is not a number
// (null and '' included) gives the default.
function chatShare(value) {
    const share = Number.parseFloat(value);
    return Number.isFinite(share) ? Math.min(CHAT_MAX, Math.max(CHAT_MIN, share)) : defaults.stageChat;
}

// Bible section 5.1: the chat's share of the window, but never narrower than --forge-chat-min and never so wide
// that the stage gets narrower than --forge-stage-min. Left to CSS, so it follows the window as it is resized.
function chatWidth(share) {
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

// The spine: the chat column's left edge, a window splitter that a mouse, a pen, a finger or the keyboard can
// move (bible section 5.1). Its place and look are in css/stage.css.
function spineElement() {
    const spine = document.createElement('div');
    spine.id = SPINE_ID;
    spine.tabIndex = 0;
    spine.setAttribute('role', 'separator');
    spine.setAttribute('aria-orientation', 'vertical');
    spine.setAttribute('aria-label', 'Chat width');
    spine.setAttribute('aria-valuemin', String(CHAT_MIN));
    spine.setAttribute('aria-valuemax', String(CHAT_MAX));
    spine.addEventListener('pointerdown', startDrag);
    spine.addEventListener('pointermove', moveDrag);
    spine.addEventListener('pointerup', (event) => endDrag(event, true));
    // A drag the browser or the system breaks off puts the saved width back
    spine.addEventListener('pointercancel', (event) => endDrag(event, false));
    spine.addEventListener('lostpointercapture', (event) => endDrag(event, false));
    spine.addEventListener('dblclick', () => setChatShare(defaults.stageChat));
    spine.addEventListener('keydown', moveByKey);
    return spine;
}

// Pointer capture keeps the moves coming to the spine wherever the pointer goes, for a mouse, a pen or a finger.
function startDrag(event) {
    if (event.button !== 0) return; // the main mouse button, a pen tip or a finger
    const sheld = document.getElementById('sheld');
    if (!sheld) return;
    // No mouse press for the browser to act on: once the chat has widened under the press point, WebKit takes
    // the message avatar now there for the thing being pressed and starts dragging the picture, which ends the
    // pointer events. (css/stage.css also stops pictures being dragged while body has forge-dragging.)
    event.preventDefault();
    drag = { pointer: event.pointerId, x: event.clientX, width: sheld.getBoundingClientRect().width, share: null };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add(DRAGGING_CLASS);
}

// The chat follows the pointer live; nothing is saved until the drag ends. The edge moves with the pointer from
// where it was grabbed, so grabbing it a few pixels off the line does not make it jump.
function moveDrag(event) {
    if (drag?.pointer !== event.pointerId) return;
    drag.share = chatShare(((drag.width + drag.x - event.clientX) / window.innerWidth) * 100);
    document.body.style.setProperty(CHAT_WIDTH, chatWidth(drag.share));
    event.currentTarget.setAttribute('aria-valuenow', String(Math.round(drag.share)));
}

function endDrag(event, keep) {
    if (drag?.pointer !== event.pointerId) return;
    const { share } = drag;
    drag = null;
    document.body.classList.remove(DRAGGING_CLASS);
    if (share === null) return; // a click, not a drag
    if (keep) {
        setChatShare(share);
    } else {
        const s = currentSettings();
        if (s) apply(s);
    }
}

function moveByKey(event) {
    const next = SPINE_KEYS[event.key];
    if (!next || event.altKey || event.ctrlKey || event.metaKey) return;
    // The keys stop here: SillyTavern's key listener on document swipes the last message on Left and Right
    // whenever no text box has the focus
    event.preventDefault();
    event.stopPropagation();
    const s = currentSettings();
    if (s) setChatShare(next(Math.round(chatShare(s.stageChat))));
}

// Saves a new chat width from the spine: a whole percent within the range. The page and the settings screen follow.
function setChatShare(share) {
    const s = currentSettings();
    if (!s) return;
    s.stageChat = Math.round(chatShare(share));
    SillyTavern.getContext().saveSettingsDebounced();
    apply(s);
    const range = document.getElementById(RANGE_ID);
    if (range) range.value = String(s.stageChat);
    const shown = document.getElementById(RANGE_VALUE_ID);
    if (shown) shown.textContent = `${s.stageChat}%`;
}

// Arcane Forge UI's settings as they are now (looked up each time, as Reset puts a new object in their place)
function currentSettings() {
    return SillyTavern.getContext().extensionSettings?.[SETTINGS_KEY];
}
