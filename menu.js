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
//
// The frame (#forge-menu) only follows SillyTavern: it shows while a top-level drawer is open and not
// pinned, and every way of changing or closing a menu clicks that drawer's own toggle. The drawer itself
// never moves in the page; css/menu.css places it over the frame's content area.
//
// The two round buttons (#forge-menu-buttons) take the top bar's place: with them, body has
// forge-menu-buttons and css/menu.css hides the top bar and gives its space back. They open the panel the
// same way, through the drawers' own toggles, which stay in the page (hidden) for that.
//
// SillyTavern can pin three panels open beside the chat, which cannot go with the menu panel. While the menu
// panel is active their pins are off and hidden: the ones that were on are recorded in menuPins and turned
// off with their own checkboxes, and turned on again the same way when the menu panel stops being active.
// None of that happens before SillyTavern's pin checkboxes answer clicks (see pinsReady).
//
// By keyboard (bible section 11) the frame is a dialog: opening it moves the focus to the open section's nav
// button, Tab goes round the frame and the open menu, Escape closes it, and closing gives the focus back to
// what opened it. Its two key listeners are on body, and only while the frame is shown.
import { saveSettingsDebounced, eventSource, event_types } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { Popup } from '../../../popup.js';
import { accountStorage } from '../../../util/AccountStorage.js';

export const id = 'menu';

export const defaults = { menuPanel: false, menuButtons: true, menuLast: 'ai-config-button', menuPins: {} };

export const lookKeys = {};

const MODULE = 'arcaneForgeUi';
const DESKTOP = '(min-width: 1001px)';
const FRAME_ID = 'forge-menu';
const BUTTONS_ID = 'forge-menu-buttons';
const BUTTONS_CLASS = 'forge-menu-buttons';
const TITLE_ID = 'forge-menu-title';
const CHARACTERS = 'rightNavHolder';
const DRAWERS = '#top-settings-holder > .drawer';
const MENUS = '#top-settings-holder > .drawer > .drawer-content';
const OPEN_MENU = `${MENUS}.openDrawer:not(.pinnedOpen)`;
// SillyTavern's pin checkboxes: AI response, Characters and Lorebooks (bible section 8), each with the account
// setting its click handler writes (initRossMods in RossAscends-mods.js)
const PINS = new Map([['lm_button_panel_pin', 'LNavLockOn'], ['rm_button_panel_pin', 'NavLockOn'], ['WI_panel_pin', 'WINavLockOn']]);
// SillyTavern marks "no API connection" on the top bar's plug: RA_checkOnlineStatus (RossAscends-mods.js)
// swaps its fa-plug for fa-plug-circle-exclamation, which is also what the page starts with.
const STATUS_ICON = 'API-status-top';
const NO_CONNECTION = 'fa-plug-circle-exclamation';
const SVG = 'http://www.w3.org/2000/svg';
// SillyTavern's own windows that can open over the panel and that its Escape handler (processHotkeys in
// RossAscends-mods.js) closes itself. Its newer popups are <dialog>s, which the browser closes on Escape.
const WINDOWS = '#dialogue_popup, #select_chat_popup, #character_popup';
// The Three columns layout's rail buttons (columns.js), which have the round buttons' job in that layout.
// Each names in data-forge-opens the drawer it opens.
const RAIL_BUTTONS = '#forge-rail [data-forge-opens]';
// What Tab can stop at, before the checks in isTabStop
const TABBABLE = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]';
// Set on the frame while SillyTavern's own Reduced Motion setting is on; css/menu.css then moves nothing
const STILL = 'forge-menu-still';
// The round buttons' line icons: Characters is the address card the top bar shows for that drawer, Menu
// three lines
const CHARACTERS_ICON = 'M3 5h18v14H3z M9 8.5a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M5.5 16.5c.6-1.8 1.9-2.6 3.5-2.6s2.9.8 3.5 2.6 M15 9h3 M15 12h3 M15 15h2';
const MENU_ICON = 'M4 7h16 M4 12h16 M4 17h16';

// The sections in the order the nav lists them, with their short labels (bible section 5.2). A drawer that
// another extension adds comes after these, under its own icon's title.
const SECTIONS = new Map([
    ['rightNavHolder', 'Characters'],
    ['ai-config-button', 'AI response'],
    ['sys-settings-button', 'Connection'],
    ['advanced-formatting-button', 'Formatting'],
    ['WI-SP-button', 'Lorebooks'],
    ['persona-management-button', 'Personas'],
    ['backgrounds-button', 'Backgrounds'],
    ['extensions-settings-button', 'Extensions'],
    ['user-settings-button', 'Settings'],
]);

// Only what is needed to undo the feature: the watcher on the top bar, and a pending hide
let observer = null;
let hideTimer = 0;
// Whether SillyTavern's pin checkboxes answer clicks yet, and whether something waits for that
let pinsAnswer = false;
let pinsWait = false;
// How to find again what had the focus when the frame opened: a selector, not the element (bible section 9)
let opener = null;

// The buttons' switch only means something with the panel on, so it is greyed out (disabled) while the
// panel is off
const BUTTONS_NEED = 'Needs "Menus open in one centred panel" on';

export function settingsHtml(s) {
    return `
                <h4>Menus</h4>
                <label class="checkbox_label" for="forge-ui-menu-panel">
                    <input type="checkbox" id="forge-ui-menu-panel"${s.menuPanel ? ' checked' : ''}>
                    <span>Menus open in one centred panel (desktop)</span>
                </label>
                <label class="checkbox_label" for="forge-ui-menu-buttons"${s.menuPanel ? '' : ` title="${BUTTONS_NEED.replaceAll('"', '&quot;')}"`}>
                    <input type="checkbox" id="forge-ui-menu-buttons"${s.menuButtons ? ' checked' : ''}${s.menuPanel ? '' : ' disabled'}>
                    <span>Two round buttons in place of the top bar</span>
                </label>
`;
}

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-menu-panel').on('change', function () {
        s.menuPanel = this.checked;
        const buttons = $root.find('#forge-ui-menu-buttons');
        buttons.prop('disabled', !s.menuPanel);
        buttons.closest('label').attr('title', s.menuPanel ? null : BUTTONS_NEED);
        save();
    });
    $root.find('#forge-ui-menu-buttons').on('change', function () {
        s.menuButtons = this.checked;
        save();
    });
}

export function apply(s) {
    // The Three columns layout (columns.js) has no top bar: its menus always open in the panel, and the top
    // bar is hidden the way the round buttons hide it (css/columns.css hides the buttons themselves)
    const columns = Boolean(s.enabled && s.layout === 'columns');
    const active = Boolean(s.enabled && (s.menuPanel || columns)) && window.matchMedia(DESKTOP).matches;
    if (active) turnOn(s);
    else turnOff(s);
    setButtons(active && (columns || Boolean(s.menuButtons)));
}

function turnOn(s) {
    document.body.classList.add('forge-menu');
    if (!document.getElementById(FRAME_ID)) document.body.append(buildFrame());
    syncMotion(document.getElementById(FRAME_ID));
    const holder = document.getElementById('top-settings-holder');
    if (!observer && holder) {
        // SillyTavern opens and closes a menu by switching classes on its .drawer-content, and marks the
        // connection on the plug icon in the same holder
        observer = new MutationObserver((records) => {
            if (records.some((r) => r.target.id === STATUS_ICON)) syncDot();
            const menus = records.filter((r) => r.target.matches?.(MENUS));
            // A panel pinned while the panel is on is put away too. The pins SillyTavern saved come back in
            // initRossMods, after Forge UI has started; unpin waits for that (see pinsReady).
            if (menus.some((r) => r.target.classList.contains('pinnedOpen'))) unpin(extension_settings[MODULE]);
            if (menus.length) sync();
        });
        observer.observe(holder, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    unpin(s);
    sync();
}

function turnOff(s) {
    observer?.disconnect();
    observer = null;
    clearTimeout(hideTimer);
    stopKeys();
    opener = null;
    document.getElementById(FRAME_ID)?.remove();
    document.body.classList.remove('forge-menu');
    repin(s);
}

// ---------- SillyTavern's pinned panels ----------

// Records each pin that is on, then turns it off with its own checkbox, so SillyTavern does the unpinning.
// A pin already recorded stays recorded, so applying again (or a reload, after which the pins are off)
// never loses the pins to put back.
function unpin(s) {
    if (!s || !pinsReady()) return;
    const on = [...PINS.keys()].filter((pin) => document.getElementById(pin)?.checked);
    if (!on.length) return;
    s.menuPins = { ...s.menuPins, ...Object.fromEntries(on.map((pin) => [pin, true])) };
    saveSettingsDebounced();
    for (const pin of on) document.getElementById(pin).click();
}

// Turns the recorded pins on again with their own checkboxes. A pin is forgotten only once SillyTavern has
// it on: its box is ticked and SillyTavern's own setting says so; any other stays recorded for next time.
// A new object, not the old one changed: Reset hands features a copy of the settings that shares it.
function repin(s) {
    const recorded = s?.menuPins || {};
    if (!Object.keys(recorded).length || !pinsReady()) return;
    for (const pin of PINS.keys()) {
        const box = document.getElementById(pin);
        if (recorded[pin] && box && !box.checked) box.click();
    }
    const left = [...PINS.keys()].filter((pin) => recorded[pin] && !pinnedBySillyTavern(pin));
    s.menuPins = Object.fromEntries(left.map((pin) => [pin, true]));
    saveSettingsDebounced();
}

function pinnedBySillyTavern(pin) {
    return Boolean(document.getElementById(pin)?.checked) && accountStorage.getItem(PINS.get(pin)) === 'true';
}

// Extensions start before SillyTavern's initRossMods (RossAscends-mods.js), which binds the pin checkboxes'
// click handlers and then sets each box from the pin it saved. A click before that changes the box alone,
// and initRossMods then sets it back, so a pin put back that early is lost. SillyTavern emits
// APP_INITIALIZED right after initRossMods, and hands that event at once to a listener added later. Until
// then this says no, and has the panel applied again when it comes. (APP_READY alone comes too late: by
// then SillyTavern may have reopened a pinned panel that was open, 300ms after initRossMods.)
// APP_READY is the second chance. SillyTavern's emit takes its list of listeners when it starts and
// remembers the event for later listeners only once the last of them has finished, so a listener added
// while another extension's slow APP_INITIALIZED listener is still running hears neither. APP_READY is
// emitted only after that, so it always comes; whichever is heard first answers and removes both.
function pinsReady() {
    const events = [event_types.APP_INITIALIZED, event_types.APP_READY].filter(Boolean);
    if (pinsAnswer || !events.length) return true;
    if (!pinsWait) {
        pinsWait = true;
        // Called inside on() when the event has already come; only a later call applies the panel again
        let later = false;
        const answer = () => {
            if (pinsAnswer) return;
            pinsAnswer = true;
            for (const event of events) eventSource.removeListener(event, answer);
            if (later && extension_settings[MODULE]) apply(extension_settings[MODULE]);
        };
        for (const event of events) {
            if (!pinsAnswer) eventSource.on(event, answer);
        }
        later = true;
    }
    return pinsAnswer;
}

// ---------- The two round buttons ----------

// Adds or removes the buttons, and with them the class under which css/menu.css hides the top bar
function setButtons(on) {
    document.body.classList.toggle(BUTTONS_CLASS, on);
    if (!on) {
        document.getElementById(BUTTONS_ID)?.remove();
        return;
    }
    if (!document.getElementById(BUTTONS_ID)) {
        // Before the frame, so Tab reaches them first and the frame stays the last thing in the page
        const frame = document.getElementById(FRAME_ID);
        if (frame) frame.before(buildButtons());
        else document.body.append(buildButtons());
    }
    syncDot();
}

function buildButtons() {
    const group = el('div', { id: BUTTONS_ID });
    const characters = roundButton('forge-menu-round-characters', 'Characters', CHARACTERS_ICON);
    const menu = roundButton('forge-menu-round-menu', 'Menu', MENU_ICON);
    const dot = el('span', { class: 'forge-menu-dot', 'aria-hidden': 'true' });
    dot.hidden = true;
    menu.append(dot);
    characters.addEventListener('click', () => openSection(CHARACTERS));
    menu.addEventListener('click', () => openSection(menuTarget()));
    group.append(characters, menu);
    return group;
}

function roundButton(name, text, path) {
    const button = el('button', { type: 'button', class: `forge-menu-round ${name}`, 'aria-label': text, title: text });
    button.append(lineIcon(path));
    return button;
}

// Menu opens the section that was open last (bible section 5.2), read when clicked. Characters has its
// own button, so Menu never opens it; an id that is not a drawer in the page falls back to AI response.
function menuTarget() {
    const last = extension_settings[MODULE]?.menuLast;
    const present = [...document.querySelectorAll(DRAWERS)].some((d) => d.id === last);
    return last && last !== CHARACTERS && present ? last : defaults.menuLast;
}

// The Menu button's dot follows the plug icon. It says the same in the button's name, for screen readers.
function syncDot() {
    const menu = document.querySelector(`#${BUTTONS_ID} .forge-menu-round-menu`);
    if (!menu) return;
    const offline = document.getElementById(STATUS_ICON)?.classList.contains(NO_CONNECTION) ?? false;
    menu.querySelector('.forge-menu-dot').hidden = !offline;
    const name = offline ? 'Menu (not connected to an API)' : 'Menu';
    menu.setAttribute('aria-label', name);
    menu.title = name;
}

// Shows the frame while a menu is open and hides it when none is. Worked out from the page every time.
function sync(now = false) {
    const frame = document.getElementById(FRAME_ID);
    if (!frame) return;
    clearTimeout(hideTimer);
    const drawer = openDrawer();
    if (drawer) {
        show(frame, drawer);
        return;
    }
    if (frame.hidden) return;
    // Moving to another menu, SillyTavern closes the open one, waits its animation duration, then opens the
    // next. Hiding at once would make the frame blink between sections, so a close it did not come from the
    // frame is given twice that long to turn out to be a change of section.
    if (now) hide(frame);
    else hideTimer = setTimeout(() => sync(true), animationMs() * 2);
}

function show(frame, drawer) {
    const opening = frame.hidden;
    const nav = frame.querySelector('.forge-menu-nav');
    const key = keyOf(drawer);
    // Rebuilt each time the frame opens, so a drawer another extension added since is listed too
    if (opening || ![...nav.children].some((b) => b.dataset.forgeDrawer === key)) {
        nav.replaceChildren(...sections().map(sectionButton));
    }
    for (const button of nav.children) {
        if (button.dataset.forgeDrawer === key) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    }
    frame.querySelector('.forge-menu-title').textContent = label(drawer);
    // The menu stays where it is in the page, outside the dialog; this hands it to the dialog for screen readers
    const panel = frame.querySelector('.forge-menu-panel');
    const menuId = drawer.querySelector(':scope > .drawer-content')?.id;
    if (menuId) panel.setAttribute('aria-owns', menuId);
    else panel.removeAttribute('aria-owns');
    if (opening) {
        // Before the frame is drawn, so it fades in, or appears at once, as the settings ask
        syncMotion(frame);
        // What closing gives the focus back to: what had it, or, when that cannot be found again, the control
        // that opens this section. A click leaves nothing to find in WebKit: buttons do not take the focus when
        // clicked there, and the press has already taken it from where it was, so after a click on a round
        // button, or on a top bar icon's edge, the focus is nowhere.
        opener = findAgain(document.activeElement) ?? openerOf(drawer);
        frame.hidden = false;
        // Capture first, so that it notes each Tab before anything in the menu can stop it
        document.body.addEventListener('keydown', noteTab, true);
        document.body.addEventListener('keydown', onKey);
        nav.querySelector('[aria-current="page"]')?.focus();
    }
    remember(drawer);
}

function hide(frame) {
    frame.hidden = true;
    stopKeys();
    const back = opener && document.querySelector(opener);
    opener = null;
    // Only when the focus went with the frame or the menu; not when it was moved somewhere on purpose
    if (back && focusLost(frame)) back.focus();
}

// ---------- Keys, while the frame is shown ----------

function stopKeys() {
    document.body.removeEventListener('keydown', noteTab, true);
    document.body.removeEventListener('keydown', onKey);
}

// Escape closes the panel and Tab goes round it. Keys that something inside the panel has already dealt with
// are left alone, and so is everything while one of SillyTavern's windows is open over the panel: that window
// gets the keys.
function onKey(event) {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') {
        if (event.altKey) return;
        if (windowOnTop()) {
            // The window closes itself: a <dialog> by the browser's default for Escape, SillyTavern's older
            // windows by its own Escape handler (processHotkeys in RossAscends-mods.js, on document). That
            // handler stands back while one of SillyTavern's popups is open (Popup.util.isPopupOpen()), but for
            // any other dialog it would close the menu behind it too; for those, and only those, the key goes no
            // further than here. Over SillyTavern's own popups the key goes on as it does with the panel off,
            // so script.js's own Escape (stop generating, say) still acts in the same press.
            if (dialogOnTop() && !Popup.util.isPopupOpen()) event.stopPropagation();
            return;
        }
        // The key is spent: SillyTavern's handler would otherwise close something else behind the panel
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
    } else if (event.key === 'Tab') {
        // Alt+Tab too: in WebKit that is "Tab to every control"
        if (windowOnTop()) return;
        // With the focus inside a shadow root (an open colour picker's fields), where the panel cannot look,
        // the browser moves it. keepTab still brings it back if that takes it out of the panel.
        if (document.activeElement?.shadowRoot?.activeElement) return;
        const stops = tabStops();
        const next = nextStop(stops, document.activeElement, event.shiftKey);
        if (next === undefined) return;
        event.preventDefault();
        if (next) stopOf(next, event.shiftKey)?.focus();
    }
}

// Each Tab on its way in, before anything in the page has seen it. Nothing is changed here: once the browser
// has dealt with the key, keepTab checks where the focus went.
function noteTab(event) {
    if (event.key !== 'Tab' || event.ctrlKey || event.metaKey) return;
    const from = document.activeElement;
    setTimeout(() => keepTab(event, from));
}

// A Tab that something in the menu kept from onKey is left to the browser: Select2's search field, for one, stops
// every key it gets. The browser then moves the focus by its own rules, which can take it out of the frame and the
// menu, or out of the page. Unless the key's default was prevented (onKey, or the control itself, moved the focus),
// a focus that went nowhere, or that left the frame and the open menu for somewhere else, is put on the next stop
// from where it was. Focus that was already elsewhere (a dropdown or a window over the panel) and stays elsewhere
// is left alone, and so is everything while a window is open over the panel.
function keepTab(event, from) {
    const frame = document.getElementById(FRAME_ID);
    if (event.defaultPrevented || !frame || frame.hidden || windowOnTop()) return;
    const stops = tabStops();
    const inside = (element) => stops.roots.some((root) => root.contains(element));
    const active = document.activeElement;
    if (inside(active) || !(nowhere(active) || inside(from))) return;
    const next = nextStop(stops, inside(from) ? from : null, event.shiftKey);
    if (next) stopOf(next, event.shiftKey)?.focus();
}

// An open <dialog> (SillyTavern's popups, or another extension's), or one of SillyTavern's older windows
function windowOnTop() {
    return dialogOnTop() || [...document.querySelectorAll(WINDOWS)].some((element) => drawn(element) && !underPanel(element));
}

// The advanced definitions window is under the panel, not over it, while the open menu is not one of
// SillyTavern's side panels: SillyTavern then lifts its menus over that window, and css/menu.css lifts the
// frame with them ("Windows over the panel").
function underPanel(element) {
    return element.matches('#character_popup.open') && Boolean(document.querySelector(`${OPEN_MENU}:not(.fillLeft):not(.fillRight)`));
}

function dialogOnTop() {
    return [...document.querySelectorAll('dialog[open]')].some(drawn);
}

function drawn(element) {
    return element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
}

// What Tab stops at: the frame's buttons (the nav, then the close button), then the open menu's controls,
// each in page order. Looked up on every press, so a control the menu shows or hides meanwhile counts.
function tabStops() {
    const panel = document.querySelector(`#${FRAME_ID} .forge-menu-panel`);
    const menu = document.querySelector(OPEN_MENU);
    const roots = [panel, menu].filter(Boolean);
    return { roots, list: roots.flatMap((root) => [...root.querySelectorAll('*')].filter(stopOf)) };
}

// What gets the focus when Tab stops at an element: the element itself, or, for one that keeps its controls in
// a shadow root, where querySelectorAll does not look (SillyTavern's colour pickers), the first control in
// there. null for an element Tab does not stop at.
// Going back (Shift+Tab) into one, it is the last control in there.
function stopOf(element, back = false) {
    if (element.matches(TABBABLE) && isTabStop(element)) return element;
    if (!element.shadowRoot || element.closest('[inert]')) return null;
    const inner = [...element.shadowRoot.querySelectorAll('*')];
    for (const one of back ? inner.reverse() : inner) {
        const stop = stopOf(one, back);
        if (stop) return stop;
    }
    return null;
}

// The browser's own rules for Tab, as far as the panel needs them: focusable, not disabled, not inert, drawn,
// and one stop per radio group. WebKit's Tab normally skips buttons and links; here it does not.
function isTabStop(element) {
    if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[inert]')) return false;
    if (element.matches('input[type="radio"]') && element.name && !element.checked) {
        const group = [...(element.form ?? document).querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)];
        if (group.some((radio) => radio.checked) || group[0] !== element) return false;
    }
    return drawn(element);
}

// The stop after (or before) the focused element, going round. undefined when the focus is somewhere else on
// top of the panel (a dropdown, say), which then keeps its own Tab; null when there is nothing to stop at.
function nextStop({ roots, list }, active, back) {
    const where = roots.findIndex((root) => root.contains(active));
    if (where < 0 && !astray(active)) return undefined;
    if (!list.length) return null;
    if (where < 0) return back ? list.at(-1) : list[0];
    const at = list.indexOf(active);
    if (at >= 0) return list[(at + (back ? list.length - 1 : 1)) % list.length];
    // Focus on something Tab does not stop at: count the stops that come before it
    const rootOf = (element) => roots.findIndex((root) => root.contains(element));
    const before = list.filter((element) => rootOf(element) < where
        || (rootOf(element) === where && Boolean(element.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING))).length;
    return back ? (list[before - 1] ?? list.at(-1)) : (list[before] ?? list[0]);
}

// Focus outside the frame and the open menu that Tab brings into them: nowhere, or on what opens the panel. With
// the buttons off, the top bar is above the frame, so its icons can be clicked while the panel is open.
function astray(element) {
    return nowhere(element) || Boolean(element.closest(`#${BUTTONS_ID}, ${DRAWERS} > .drawer-toggle`));
}

function nowhere(element) {
    return !element || element === document.body || element === document.documentElement;
}

// ---------- Focus and motion ----------

// A way to find the element again when the frame closes: its id, or our round button's or the top bar
// icon's place. null for anything else (show then falls back on openerOf).
function findAgain(element) {
    if (!element || element === document.body || element.closest(`#${FRAME_ID}`)) return null;
    // A control inside a menu is hidden once that menu closes
    if (element.closest(MENUS)) return null;
    if (element.id) return `#${CSS.escape(element.id)}`;
    const round = [...element.classList].find((name) => name.startsWith('forge-menu-round-'));
    if (round && element.closest(`#${BUTTONS_ID}`)) return `#${BUTTONS_ID} .${round}`;
    // columns.js builds its rail again now and then, so a rail button is found again by the drawer it opens
    const rail = element.closest(RAIL_BUTTONS);
    if (rail) return railButton(rail.dataset.forgeOpens);
    const toggle = element.closest(`${DRAWERS} > .drawer-toggle`);
    const drawerId = toggle?.parentElement.id;
    if (!drawerId) return null;
    if (element === toggle) return `#${CSS.escape(drawerId)} > .drawer-toggle`;
    return element.matches('.drawer-icon') ? `#${CSS.escape(drawerId)} > .drawer-toggle .drawer-icon` : null;
}

// The control that opens a section, as findAgain would give it: its round button (Characters for Characters,
// Menu for the others), or, with the buttons off, its top bar icon. In the Three columns layout the round
// buttons are hidden (css/columns.css): there it is the rail's button for the section, or the rail's Menu
// button, which opens AI response.
function openerOf(drawer) {
    if (document.querySelector(RAIL_BUTTONS)) {
        return document.querySelector(railButton(drawer.id)) ? railButton(drawer.id) : railButton(defaults.menuLast);
    }
    if (extension_settings[MODULE]?.menuButtons) {
        return `#${BUTTONS_ID} .forge-menu-round-${drawer.id === CHARACTERS ? 'characters' : 'menu'}`;
    }
    return findAgain(iconOf(drawer));
}

function railButton(drawerId) {
    return `#forge-rail [data-forge-opens="${CSS.escape(drawerId)}"]`;
}

// The focus went with the frame: it is nowhere, in the frame, or in a menu that is no longer drawn
function focusLost(frame) {
    const active = document.activeElement;
    if (nowhere(active) || frame.contains(active)) return true;
    return Boolean(active.closest(MENUS)) && !active.getClientRects().length;
}

// SillyTavern's own Reduced Motion setting (bible section 4), read where the bible says each time the frame
// opens, so a change made while it was closed counts. The system setting is css/tokens.css's.
function syncMotion(frame) {
    const still = Boolean(globalThis.SillyTavern?.getContext?.()?.powerUserSettings?.reduced_motion);
    frame.classList.toggle(STILL, still);
}

// The section the Menu button opens next time (bible section 7). Characters has a button of its own.
function remember(drawer) {
    const s = extension_settings[MODULE];
    if (!s || !drawer.id || drawer.id === CHARACTERS || s.menuLast === drawer.id) return;
    s.menuLast = drawer.id;
    saveSettingsDebounced();
}

function buildFrame() {
    const frame = el('div', { id: FRAME_ID });
    frame.hidden = true;
    const backdrop = el('div', { class: 'forge-menu-backdrop' });
    const panel = el('div', { class: 'forge-menu-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': TITLE_ID });
    const nav = el('nav', { class: 'forge-menu-nav', 'aria-label': 'Menus' });
    const head = el('div', { class: 'forge-menu-head' });
    const title = el('h2', { id: TITLE_ID, class: 'forge-menu-title' });
    const close = el('button', { type: 'button', class: 'forge-menu-close', 'aria-label': 'Close', title: 'Close' });
    close.append(lineIcon('M6 6l12 12 M18 6L6 18'));
    head.append(title, close);
    panel.append(nav, head);
    frame.append(backdrop, panel);

    // SillyTavern closes an unpinned drawer on any press outside it (the handler in script.js commented
    // "This autocloses open drawers"). The frame is outside the drawer, so its presses go no further.
    for (const type of ['mousedown', 'touchstart']) {
        frame.addEventListener(type, (event) => event.stopPropagation(), { passive: true });
    }
    backdrop.addEventListener('click', closeMenu);
    close.addEventListener('click', closeMenu);
    nav.addEventListener('click', (event) => {
        const button = event.target.closest('.forge-menu-section');
        if (button) openSection(button.dataset.forgeDrawer);
    });
    return frame;
}

// The close button and the backdrop close the menu with its own toggle; the frame then goes at once
function closeMenu() {
    toggleOf(openDrawer())?.click();
    sync(true);
}

// A nav button or a round button opens its menu with that drawer's own toggle; SillyTavern closes the other
// one itself. A menu that is already open is left as it is, since its toggle would close it.
function openSection(key) {
    const drawer = drawerByKey(key);
    if (!drawer || drawer.querySelector(':scope > .drawer-content')?.classList.contains('openDrawer')) return;
    toggleOf(drawer)?.click();
}

function sectionButton(drawer) {
    const button = el('button', { type: 'button', class: 'forge-menu-section', 'data-forge-drawer': keyOf(drawer) });
    const title = nativeTitle(drawer);
    if (title) button.title = title;
    const text = el('span', { class: 'forge-menu-label' });
    text.textContent = label(drawer);
    button.append(sectionIcon(drawer), text);
    return button;
}

// The icon the top bar shows for the drawer: Forge's line icon, which style.css draws as a mask from
// --forge-top-icon, or, for a drawer Forge has no icon for, the drawer's own icon classes.
function sectionIcon(drawer) {
    const native = iconOf(drawer);
    const icon = el('span', { class: 'forge-menu-icon', 'aria-hidden': 'true' });
    const mask = native ? getComputedStyle(native).getPropertyValue('--forge-top-icon').trim() : '';
    if (mask) {
        icon.classList.add('forge-menu-mask');
        icon.style.setProperty('--forge-menu-icon', mask);
    } else if (native) {
        icon.classList.add('forge-menu-glyph', ...[...native.classList].filter((name) => /^fa(-|$)/.test(name)));
    }
    return icon;
}

function lineIcon(path) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('forge-menu-svg');
    const line = document.createElementNS(SVG, 'path');
    line.setAttribute('d', path);
    svg.append(line);
    return svg;
}

function el(tag, attributes) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    return element;
}

// ---------- Reading SillyTavern's drawers (looked up each time, never kept) ----------

// The drawer whose menu the frame shows: open and not pinned
function openDrawer() {
    return document.querySelector(OPEN_MENU)?.parentElement ?? null;
}

// Every drawer, the ones the bible names first and in its order, then any others in page order
function sections() {
    const all = [...document.querySelectorAll(DRAWERS)];
    const known = [...SECTIONS.keys()].map((drawerId) => all.find((d) => d.id === drawerId)).filter(Boolean);
    return [...known, ...all.filter((d) => !SECTIONS.has(d.id))];
}

// A drawer is found again by its id, or by its place among the drawers when it has none
function keyOf(drawer) {
    return drawer.id || `#${[...document.querySelectorAll(DRAWERS)].indexOf(drawer)}`;
}

function drawerByKey(key) {
    const all = [...document.querySelectorAll(DRAWERS)];
    return key?.startsWith('#') ? all[Number(key.slice(1))] : all.find((d) => d.id === key);
}

function toggleOf(drawer) {
    return drawer?.querySelector(':scope > .drawer-toggle') ?? null;
}

function iconOf(drawer) {
    return drawer.querySelector(':scope > .drawer-toggle .drawer-icon');
}

// SillyTavern's own (translated) name for the drawer. Backgrounds keeps it on the toggle, not the icon.
function nativeTitle(drawer) {
    return iconOf(drawer)?.title || toggleOf(drawer)?.title || '';
}

function label(drawer) {
    return SECTIONS.get(drawer.id) ?? (nativeTitle(drawer) || drawer.id);
}

// SillyTavern's animation duration in ms (0 when its Reduced Motion setting is on)
function animationMs() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--animation-duration')) || 0;
}
