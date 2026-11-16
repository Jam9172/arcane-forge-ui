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
// column's width as --forge-stage-chat on body, #forge-stage (the layer over the stage, holding the shade and
// the name plate), #forge-spine (the chat column's left edge, which can be dragged), forge-dragging on body
// while it is, forge-stage-sprite on body while the sprite is placed on the stage, and one listener for
// SillyTavern's chat-changed event while the name plate is on.
//
// Beyond the contract, setPlateText is exported so a test can give the plate any name.

export const id = 'stage';

export const defaults = { layout: 'classic', stageChat: 46, stagePlate: true, stageSprite: true, stageShade: 0 };

// The Chat width setting's range, as a share of the window, and the Darken setting's, in percent (bible section 7)
const CHAT_MIN = 35;
const CHAT_MAX = 70;
const SHADE_MAX = 60;

export const lookKeys = {
    stageChat: { type: 'number', min: CHAT_MIN, max: CHAT_MAX },
    stagePlate: { type: 'boolean' },
    stageSprite: { type: 'boolean' },
    stageShade: { type: 'number', min: 0, max: SHADE_MAX },
};

// SillyTavern's own phone boundary; the stage is desktop only (bible section 5.4)
const DESKTOP = '(min-width: 1001px)';
const BODY_CLASS = 'forge-stage';
const DRAGGING_CLASS = 'forge-dragging';
// On body while Character Expressions' sprite is placed on the stage (css/stage.css does the placing)
const SPRITE_CLASS = 'forge-stage-sprite';
const STAGE_ID = 'forge-stage';
const SHADE_CLASS = 'forge-stage-shade';
const PLATE_CLASS = 'forge-stage-plate';
// The shade's darkness, set on the shade itself
const SHADE_ALPHA = '--forge-stage-shade';
const SPINE_ID = 'forge-spine';
const CHAT_WIDTH = '--forge-stage-chat';
// Where Arcane Forge UI keeps its settings (index.js's MODULE); the spine saves through it
const SETTINGS_KEY = 'arcaneForgeUi';
// The Chat width range on the settings screen, and the percentage shown beside it
const RANGE_ID = 'forge-ui-stage-chat';
const RANGE_VALUE_ID = 'forge-ui-stage-chat-value';
const PLATE_BOX_ID = 'forge-ui-stage-plate';
const SPRITE_BOX_ID = 'forge-ui-stage-sprite';
const SHADE_RANGE_ID = 'forge-ui-stage-shade';
const SHADE_VALUE_ID = 'forge-ui-stage-shade-value';
// The settings that only mean something in the stage layout, so they are greyed out in the classic one
const STAGE_CONTROLS = [RANGE_ID, PLATE_BOX_ID, SPRITE_BOX_ID, SHADE_RANGE_ID];

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
// Whether refreshPlate is listening for SillyTavern's chat-changed event, so it is added and removed only once
let followingChats = false;

export function settingsHtml(s) {
    const choices = Object.entries(LAYOUTS)
        .map(([key, label]) => `<option value="${key}"${key === s.layout ? ' selected' : ''}>${label}</option>`)
        .join('');
    const share = Math.round(chatShare(s.stageChat));
    const shade = shadeShare(s.stageShade);
    const off = s.layout === 'stage' ? '' : ' disabled';
    return `
                <h4>Layout</h4>
                <label class="forge-ui-select">
                    <span>Forge layout</span>
                    <select id="forge-ui-layout" class="text_pole" aria-describedby="forge-ui-layout-note">${choices}</select>
                </label>
                <small id="forge-ui-layout-note">Desktop only. Phones keep the classic layout.</small>
                <label class="forge-ui-range">
                    <span>Chat width <output id="${RANGE_VALUE_ID}">${share}%</output></span>
                    <input type="range" id="${RANGE_ID}" min="${CHAT_MIN}" max="${CHAT_MAX}" step="1" value="${share}"${off}>
                </label>
                <label class="checkbox_label" for="${PLATE_BOX_ID}">
                    <input type="checkbox" id="${PLATE_BOX_ID}"${s.stagePlate ? ' checked' : ''}${off}>
                    <span>Name on the stage</span>
                </label>
                <label class="checkbox_label" for="${SPRITE_BOX_ID}">
                    <input type="checkbox" id="${SPRITE_BOX_ID}"${s.stageSprite ? ' checked' : ''}${off}>
                    <span>Character sprite on the stage, when it has one</span>
                </label>
                <label class="forge-ui-range">
                    <span>Darken the stage art <output id="${SHADE_VALUE_ID}">${shade}%</output></span>
                    <input type="range" id="${SHADE_RANGE_ID}" min="0" max="${SHADE_MAX}" step="1" value="${shade}"${off}>
                </label>
`;
}

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-layout').on('change', function () {
        s.layout = Object.hasOwn(LAYOUTS, this.value) ? this.value : defaults.layout;
        for (const control of STAGE_CONTROLS) $root.find(`#${control}`).prop('disabled', s.layout !== 'stage');
        save();
    });
    $root.find(`#${RANGE_ID}`).on('input', function () {
        s.stageChat = Math.round(chatShare(this.value));
        $root.find(`#${RANGE_VALUE_ID}`).text(`${s.stageChat}%`);
        save();
    });
    $root.find(`#${PLATE_BOX_ID}`).on('change', function () {
        s.stagePlate = this.checked;
        save();
    });
    $root.find(`#${SPRITE_BOX_ID}`).on('change', function () {
        s.stageSprite = this.checked;
        save();
    });
    $root.find(`#${SHADE_RANGE_ID}`).on('input', function () {
        s.stageShade = shadeShare(this.value);
        $root.find(`#${SHADE_VALUE_ID}`).text(`${s.stageShade}%`);
        save();
    });
}

export function apply(s) {
    const body = document.body;
    const active = Boolean(s.enabled && s.layout === 'stage' && window.matchMedia(DESKTOP).matches);
    body.classList.toggle(BODY_CLASS, active);
    // The sprite is placed by css/stage.css alone; with this class off it is wherever SillyTavern puts it
    body.classList.toggle(SPRITE_CLASS, active && Boolean(s.stageSprite));
    followChats(active && Boolean(s.stagePlate));
    if (active) {
        body.style.setProperty(CHAT_WIDTH, chatWidth(chatShare(s.stageChat)));
        if (!document.getElementById(STAGE_ID)) body.append(stageLayer());
        const layer = document.getElementById(STAGE_ID);
        applyShade(layer, shadeShare(s.stageShade));
        applyPlate(layer, Boolean(s.stagePlate));
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

// Sets the name plate's text: the name, given as text and never as markup. An empty name hides the plate,
// as when no chat is open. Does nothing while there is no plate.
export function setPlateText(text) {
    const plate = document.querySelector(`#${STAGE_ID} > .${PLATE_CLASS}`);
    if (!plate) return;
    plate.textContent = String(text ?? '');
    plate.hidden = !plate.textContent;
}

// The shade: a flat black layer over the art, at the Darken setting. At 0 there is no layer.
function applyShade(layer, share) {
    let shade = layer.querySelector(`:scope > .${SHADE_CLASS}`);
    if (!share) {
        shade?.remove();
        return;
    }
    if (!shade) {
        shade = document.createElement('div');
        shade.className = SHADE_CLASS;
        layer.prepend(shade);
    }
    shade.style.setProperty(SHADE_ALPHA, `${share}%`);
}

// The name plate, while its setting is on, showing who the chat is with
function applyPlate(layer, on) {
    let plate = layer.querySelector(`:scope > .${PLATE_CLASS}`);
    if (!on) {
        plate?.remove();
        return;
    }
    if (!plate) {
        plate = document.createElement('div');
        plate.className = PLATE_CLASS;
        layer.append(plate);
    }
    refreshPlate();
}

function refreshPlate() {
    setPlateText(chatName());
}

// The name of the character the open chat is with, or the group's name in a group chat; '' when no chat is open
function chatName() {
    const context = SillyTavern.getContext();
    if (!context.chatId) return '';
    if (context.groupId) return context.groups?.find((group) => String(group.id) === String(context.groupId))?.name ?? '';
    return context.characters?.[context.characterId]?.name ?? '';
}

// SillyTavern says when another chat opens (or the chat closes); the plate follows
function followChats(on) {
    if (on === followingChats) return;
    const { eventSource, eventTypes } = SillyTavern.getContext();
    if (on) eventSource.on(eventTypes.CHAT_CHANGED, refreshPlate);
    else eventSource.removeListener(eventTypes.CHAT_CHANGED, refreshPlate);
    followingChats = on;
}

// The Darken setting in whole percent within its range; anything that is not a number gives none
function shadeShare(value) {
    const share = Number.parseFloat(value);
    return Number.isFinite(share) ? Math.round(Math.min(SHADE_MAX, Math.max(0, share))) : defaults.stageShade;
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

// The layer over the art that holds the shade and the name plate. It is only decoration, so screen readers
// skip it, and clicks go through it (css/stage.css).
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
