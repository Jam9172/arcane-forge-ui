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
import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

export const id = 'menu';

export const defaults = { menuPanel: false, menuButtons: true, menuLast: 'ai-config-button' };

export const lookKeys = {};

const MODULE = 'arcaneForgeUi';
const DESKTOP = '(min-width: 1001px)';
const FRAME_ID = 'forge-menu';
const BUTTONS_ID = 'forge-menu-buttons';
const BUTTONS_CLASS = 'forge-menu-buttons';
const TITLE_ID = 'forge-menu-title';
const CHARACTERS = 'rightNavHolder';
const DRAWERS = '#top-settings-holder > .drawer';
const OPEN_MENU = '#top-settings-holder > .drawer > .drawer-content.openDrawer:not(.pinnedOpen)';
// SillyTavern marks "no API connection" on the top bar's plug: RA_checkOnlineStatus (RossAscends-mods.js)
// swaps its fa-plug for fa-plug-circle-exclamation, which is also what the page starts with.
const STATUS_ICON = 'API-status-top';
const NO_CONNECTION = 'fa-plug-circle-exclamation';
const SVG = 'http://www.w3.org/2000/svg';
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
    const active = Boolean(s.enabled && s.menuPanel) && window.matchMedia(DESKTOP).matches;
    if (active) turnOn();
    else turnOff();
    setButtons(active && Boolean(s.menuButtons));
}

function turnOn() {
    document.body.classList.add('forge-menu');
    if (!document.getElementById(FRAME_ID)) document.body.append(buildFrame());
    const holder = document.getElementById('top-settings-holder');
    if (!observer && holder) {
        // SillyTavern opens and closes a menu by switching classes on its .drawer-content, and marks the
        // connection on the plug icon in the same holder
        observer = new MutationObserver((records) => {
            if (records.some((r) => r.target.id === STATUS_ICON)) syncDot();
            if (records.some((r) => r.target.matches?.('#top-settings-holder > .drawer > .drawer-content'))) sync();
        });
        observer.observe(holder, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    sync();
}

function turnOff() {
    observer?.disconnect();
    observer = null;
    clearTimeout(hideTimer);
    document.getElementById(FRAME_ID)?.remove();
    document.body.classList.remove('forge-menu');
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
    if (now) frame.hidden = true;
    else hideTimer = setTimeout(() => sync(true), animationMs() * 2);
}

function show(frame, drawer) {
    const nav = frame.querySelector('.forge-menu-nav');
    const key = keyOf(drawer);
    // Rebuilt each time the frame opens, so a drawer another extension added since is listed too
    if (frame.hidden || ![...nav.children].some((b) => b.dataset.forgeDrawer === key)) {
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
    frame.hidden = false;
    remember(drawer);
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
