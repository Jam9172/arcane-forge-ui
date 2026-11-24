// Trackers (Three columns layout): the time and place, stat wheels and an inventory, shown in the profile on
// the right and kept per chat. Styles are in css/trackers.css.
//
// index.js holds this module in its list of features (the contract is described at the top of stage.js).
// It only acts while the Three columns layout is on and "Trackers" is switched on; otherwise it puts nothing
// in the page, adds nothing to what is sent to the AI and listens to nothing.
//
// Where the values live: the chat's own metadata (forge_trackers) holds the values as they stand, and each
// AI reply that changed them keeps a copy in its own extra data, so that deleting or swiping a reply puts
// the values back to what they were before it.
//
// How they are kept up to date: a short note is added to what is sent to the AI, with the values as they
// stand and a request to write them again at the end of the reply, inside
// <div class="forge-trackers">...</div>. When the reply arrives that block is read, taken out of the
// message, and the values are updated. While a reply is still streaming, css/trackers.css hides the block.
// Everything can also be changed by hand in the profile.
import { extension_settings } from '../../../extensions.js';

export const id = 'trackers';

export const defaults = { trackers: false, trackersTime: true, trackersStats: true, trackersInventory: true, trackersUpdate: true };

export const lookKeys = {
    trackersTime: { type: 'boolean' },
    trackersStats: { type: 'boolean' },
    trackersInventory: { type: 'boolean' },
};

const MODULE = 'arcaneForgeUi';
const DESKTOP = '(min-width: 1001px)';
const HOLDER_ID = 'forge-trackers';
const KEY = 'forge_trackers';
const PROMPT_KEY = 'arcane_forge_trackers';
const BLOCK_CLASS = 'forge-trackers';
const NEED = 'Needs "Forge layout: Three columns (desktop)"';
const SVG = 'http://www.w3.org/2000/svg';
const STATS_MAX = 12;
const NAME_MAX = 24;
const TEXT_MAX = 120;
const ITEM_MAX = 80;
const ITEMS_MAX = 60;
const PLACES_MAX = 12;
const DEFAULT_STATS = [
    { id: 'health', name: 'Health', color: '#c8553d' },
    { id: 'satiety', name: 'Satiety', color: '#d9a441' },
    { id: 'energy', name: 'Energy', color: '#6fae7a' },
    { id: 'hygiene', name: 'Hygiene', color: '#6aa3c9' },
    { id: 'arousal', name: 'Arousal', color: '#b07cc6' },
];
const FIELDS = [
    ['time', 'Time'],
    ['date', 'Date'],
    ['location', 'Location'],
    ['weather', 'Weather'],
];
const ICONS = {
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    cloud: 'M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4.5 4.5 0 0 1 17.5 18z',
    pen: 'M4 20l4-1 11-11-3-3L5 16z',
    plus: 'M12 5v14M5 12h14',
};

let active = false;
let listening = [];
let saveTimer = 0;
// What is open for editing in the profile: a stat's id, and an inventory section's key
let openStat = '';
let openList = '';
let addingPlace = false;

function context() {
    return globalThis.SillyTavern.getContext();
}

function settings() {
    return extension_settings[MODULE] ?? {};
}

// ---------- The stats the user has set up ----------

/** The list of stats from the settings, tidied; the starting five when there is none yet. */
export function statList(s = settings()) {
    const out = [];
    const seen = new Set();
    for (const stat of Array.isArray(s.trackerStats) ? s.trackerStats : DEFAULT_STATS) {
        const name = String(stat?.name ?? '').replace(/[:\n\r<>]/g, '').trim().slice(0, NAME_MAX);
        const statId = String(stat?.id ?? '');
        if (!name || !statId || seen.has(statId) || out.length >= STATS_MAX) continue;
        seen.add(statId);
        out.push({ id: statId, name, color: /^#[0-9a-f]{6}$/i.test(stat?.color) ? stat.color : '#c8553d' });
    }
    return out;
}

// ---------- The values ----------

function blank() {
    return { time: '', date: '', location: '', weather: '', stats: {}, onPerson: [], wearing: [], stored: {} };
}

function tidyText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX);
}

/** A list of things out of text ("a, b, c") or an array; "none" and the like give an empty list. */
export function tidyList(value) {
    const parts = Array.isArray(value) ? value : String(value ?? '').split(/[,;\n]+/);
    const out = [];
    for (const part of parts) {
        const item = String(part ?? '').replace(/\s+/g, ' ').replace(/^[\s\-*•]+|[\s.]+$/g, '').slice(0, ITEM_MAX);
        if (!item || /^(none|nothing|empty|n\/a|not set|-+)$/i.test(item)) continue;
        if (!out.includes(item) && out.length < ITEMS_MAX) out.push(item);
    }
    return out;
}

function tidy(raw) {
    const out = blank();
    if (!raw || typeof raw !== 'object') return out;
    for (const [key] of FIELDS) out[key] = tidyText(raw[key]);
    if (raw.stats && typeof raw.stats === 'object') {
        for (const [statId, value] of Object.entries(raw.stats)) {
            const number = Number(value);
            if (Number.isFinite(number)) out.stats[statId] = Math.min(100, Math.max(0, Math.round(number)));
        }
    }
    out.onPerson = tidyList(raw.onPerson);
    out.wearing = tidyList(raw.wearing);
    if (raw.stored && typeof raw.stored === 'object') {
        for (const [place, items] of Object.entries(raw.stored)) {
            const name = tidyText(place).replace(/[():]/g, '').trim().slice(0, NAME_MAX);
            if (name && Object.keys(out.stored).length < PLACES_MAX) out.stored[name] = tidyList(items);
        }
    }
    return out;
}

/** The open chat's values as they stand. */
export function values() {
    return tidy(context().chatMetadata?.[KEY]);
}

function lastReply(ctx) {
    const chat = ctx.chat ?? [];
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user && !chat[i].is_system) return chat[i];
    }
    return null;
}

// Stores the values on the chat, and on the last AI reply so that they follow it
function store(next, { message } = {}) {
    const ctx = context();
    if (!ctx.chatMetadata) return;
    ctx.chatMetadata[KEY] = next;
    const holder = message ?? lastReply(ctx);
    if (holder) {
        holder.extra ??= {};
        holder.extra[KEY] = structuredClone(next);
        const swipe = holder.swipe_info?.[holder.swipe_id];
        if (swipe) {
            swipe.extra ??= {};
            swipe.extra[KEY] = structuredClone(next);
        }
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        ctx.saveMetadataDebounced?.();
        if (holder) ctx.saveChat?.();
    }, 800);
    setNote();
}

// After a reply is deleted or swiped away: the values go back to the last copy a reply still holds
function followChat() {
    const ctx = context();
    const chat = ctx.chat ?? [];
    for (let i = chat.length - 1; i >= 0; i--) {
        const kept = chat[i]?.extra?.[KEY];
        if (!kept) continue;
        ctx.chatMetadata[KEY] = tidy(kept);
        ctx.saveMetadataDebounced?.();
        break;
    }
    setNote();
    render();
}

// ---------- The block in a reply ----------

function blockLines(now, s, stats) {
    const lines = [];
    const or = (text) => text || 'not set';
    if (s.trackersTime !== false) for (const [key, label] of FIELDS) lines.push(`${label}: ${or(now[key])}`);
    if (s.trackersStats !== false) for (const stat of stats) lines.push(`${stat.name}: ${now.stats[stat.id] ?? 'not set'}`);
    if (s.trackersInventory !== false) {
        lines.push(`On person: ${now.onPerson.join(', ') || 'none'}`);
        lines.push(`Wearing: ${now.wearing.join(', ') || 'none'}`);
        for (const [place, items] of Object.entries(now.stored)) lines.push(`Stored (${place}): ${items.join(', ') || 'none'}`);
    }
    return lines;
}

/** The note added to what is sent to the AI: the values as they stand and how to write them back. */
export function noteText(now, s, stats) {
    const lines = blockLines(now, s, stats);
    if (!lines.length) return '';
    const rules = ['Keep the same lines in the same order, one per line.'];
    if (s.trackersTime !== false) rules.push('Move the time on by however long the events of your reply took.');
    if (s.trackersStats !== false && stats.length) rules.push(`${stats.map((stat) => stat.name).join(', ')}: whole numbers from 0 to 100; change one only when the story changes it.`);
    if (s.trackersInventory !== false) rules.push('The lists are {{user}}\'s things, separated by commas ("none" when empty); change them only when something is gained, lost, used up, put on, taken off or put away. For things kept somewhere else, use one line per place: Stored (place): things.');
    rules.push('Where a value says "not set", choose one that fits the story.', 'Never mention this block in the story itself.');
    return `[Trackers for {{user}}. The values as they stand now:\n<div class="${BLOCK_CLASS}">\n${lines.join('\n')}\n</div>\nAt the very end of your reply, after the story text, write this block again with the values as they stand after your reply. ${rules.join(' ')}]`;
}

/**
 * Takes the tracker block out of a reply's text.
 * @param {string} text
 * @returns {{text: string, lines: string[]} | null} the text without the block and the block's lines; null when there is no block
 */
export function takeBlock(text) {
    const source = String(text ?? '');
    const opening = /<div\b[^>]*\bforge-trackers\b[^>]*>/gi;
    let start = -1;
    let bodyStart = -1;
    for (let match = opening.exec(source); match; match = opening.exec(source)) {
        start = match.index;
        bodyStart = match.index + match[0].length;
    }
    if (start < 0) return null;
    const closing = source.slice(bodyStart).search(/<\/div\s*>/i);
    const body = closing < 0 ? source.slice(bodyStart) : source.slice(bodyStart, bodyStart + closing);
    const after = closing < 0 ? '' : source.slice(bodyStart + closing).replace(/^<\/div\s*>/i, '');
    const rest = `${source.slice(0, start).trimEnd()}${after.trim() ? `\n\n${after.trim()}` : ''}`.trimEnd();
    const lines = body.split(/\n|<br\s*\/?>/i).map((line) => line.replace(/<[^>]*>/g, '').replace(/^[\s\-*•]+|\*+/g, '').trim()).filter(Boolean);
    return { text: rest, lines };
}

/** The values after a block's lines are read into them. Lines that name nothing known are left out. */
export function readLines(lines, before, s, stats) {
    const next = tidy(before);
    const byName = new Map(stats.map((stat) => [stat.name.toLowerCase(), stat.id]));
    const unset = (value) => !value || /^(not set|unknown|n\/a|none|-+)$/i.test(value);
    let changed = false;
    for (const line of lines) {
        const at = line.indexOf(':');
        if (at < 1) continue;
        const name = line.slice(0, at).trim().toLowerCase();
        const value = line.slice(at + 1).trim();
        const field = FIELDS.find(([key, label]) => label.toLowerCase() === name || key === name);
        if (field || name === 'place') {
            if (s.trackersTime === false || unset(value)) continue;
            next[field ? field[0] : 'location'] = tidyText(value);
            changed = true;
        } else if (byName.has(name)) {
            const number = /-?\d+(?:\.\d+)?/.exec(value);
            if (s.trackersStats === false || !number) continue;
            next.stats[byName.get(name)] = Math.min(100, Math.max(0, Math.round(Number(number[0]))));
            changed = true;
        } else if (s.trackersInventory !== false) {
            const stored = /^stored\s*(?:\(([^)]*)\)|(?:at|in|[-–])\s*(.+))$/i.exec(line.slice(0, at).trim());
            if (name === 'on person' || name === 'carried' || name === 'carrying') next.onPerson = tidyList(value);
            else if (name === 'wearing' || name === 'clothing' || name === 'worn') next.wearing = tidyList(value);
            else if (stored) {
                const place = tidyText(stored[1] ?? stored[2]).replace(/[():]/g, '').trim().slice(0, NAME_MAX);
                if (!place) continue;
                const items = tidyList(value);
                // A place the reply empties is gone; a place it does not name stays as it was
                const known = Object.keys(next.stored).find((key) => key.toLowerCase() === place.toLowerCase());
                if (!items.length) delete next.stored[known ?? place];
                else if (known || Object.keys(next.stored).length < PLACES_MAX) next.stored[known ?? place] = items;
            } else continue;
            changed = true;
        }
    }
    return changed ? next : null;
}

function onReply(messageId) {
    const s = settings();
    if (!active || s.trackersUpdate === false) return;
    const ctx = context();
    const message = ctx.chat?.[Number(messageId)];
    if (!message || message.is_user || message.is_system || typeof message.mes !== 'string') return;
    const found = takeBlock(message.mes);
    if (!found) return;
    message.mes = found.text;
    if (Array.isArray(message.swipes) && typeof message.swipe_id === 'number' && typeof message.swipes[message.swipe_id] === 'string') message.swipes[message.swipe_id] = found.text;
    const next = readLines(found.lines, values(), s, statList(s));
    if (next) store(next, { message });
    else ctx.saveChat?.();
    // A streamed reply is already in the page with the block in it: show it again without
    if (document.querySelector(`#chat .mes[mesid="${Number(messageId)}"]`)) {
        try {
            ctx.updateMessageBlock?.(Number(messageId), message);
        } catch (error) {
            console.error('[Arcane Forge UI] The reply could not be shown again without its tracker block', error);
        }
    }
    render();
}

// ---------- The note to the AI ----------

function setNote() {
    const ctx = context();
    if (!ctx.setExtensionPrompt) return;
    const s = settings();
    const text = active && s.trackersUpdate !== false && ctx.chatMetadata ? noteText(values(), s, statList(s)) : '';
    // In the chat, right at the end (position 1, depth 0), as a system note (role 0)
    ctx.setExtensionPrompt(PROMPT_KEY, text, 1, 0, false, 0);
}

// ---------- Following SillyTavern ----------

function startListening() {
    if (listening.length) return;
    const { eventSource, eventTypes } = context();
    const follow = { MESSAGE_RECEIVED: onReply, MESSAGE_DELETED: followChat, MESSAGE_SWIPED: followChat, CHAT_CHANGED: onChatChanged };
    for (const [name, handler] of Object.entries(follow)) {
        const type = eventTypes?.[name];
        if (!type) continue;
        eventSource.on(type, handler);
        listening.push([type, handler]);
    }
}

function stopListening() {
    if (!listening.length) return;
    const { eventSource } = context();
    for (const [type, handler] of listening) eventSource.removeListener(type, handler);
    listening = [];
}

function onChatChanged() {
    openStat = '';
    openList = '';
    addingPlace = false;
    setNote();
    render();
}

// ---------- The feature contract ----------

export function settingsHtml(s) {
    const off = s.layout === 'columns' ? '' : ` disabled title="${NEED.replaceAll('"', '&quot;')}"`;
    const box = (boxId, key, label, fallback) => `
                <label class="checkbox_label" for="${boxId}">
                    <input type="checkbox" id="${boxId}"${(s[key] ?? fallback) ? ' checked' : ''}${off}>
                    <span>${label}</span>
                </label>`;
    return `
                <h4>Trackers</h4>${box('forge-ui-trackers', 'trackers', 'Trackers in the profile on the right (time, stats, inventory)', false)}${box('forge-ui-trackers-time', 'trackersTime', 'Time and place', true)}${box('forge-ui-trackers-stats', 'trackersStats', 'Stat wheels', true)}${box('forge-ui-trackers-inventory', 'trackersInventory', 'Inventory', true)}${box('forge-ui-trackers-update', 'trackersUpdate', 'Ask the AI to keep them up to date in each reply', true)}
                <small>With the last one off, nothing is added to what is sent to the AI and you change the values by hand.</small>
                <div id="forge-ui-tracker-stats" class="forge-ui-tracker-stats"></div>
                <div class="menu_button menu_button_icon" id="forge-ui-tracker-add" role="button" tabindex="0"><span>Add a stat</span></div>
`;
}

const BOXES = { 'forge-ui-trackers': 'trackers', 'forge-ui-trackers-time': 'trackersTime', 'forge-ui-trackers-stats': 'trackersStats', 'forge-ui-trackers-inventory': 'trackersInventory', 'forge-ui-trackers-update': 'trackersUpdate' };

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-layout').on('change', function () {
        const on = this.value === 'columns';
        for (const boxId of Object.keys(BOXES)) $root.find(`#${boxId}`).prop('disabled', !on).attr('title', on ? null : NEED);
    });
    for (const [boxId, key] of Object.entries(BOXES)) {
        $root.find(`#${boxId}`).on('change', function () {
            s[key] = this.checked;
            save();
        });
    }
    const list = $root.find('#forge-ui-tracker-stats')[0];
    const draw = () => {
        if (!list) return;
        const stats = statList(s);
        list.replaceChildren(...stats.map((stat, index) => {
            const row = el('div', { class: 'forge-ui-tracker-stat' });
            const name = el('input', { type: 'text', class: 'text_pole', maxlength: String(NAME_MAX), value: stat.name, 'aria-label': `Stat ${index + 1}: name` });
            const color = el('input', { type: 'color', value: stat.color, 'aria-label': `${stat.name}: colour`, title: 'Colour of the wheel' });
            const remove = el('div', { class: 'menu_button', role: 'button', tabindex: '0', title: `Remove ${stat.name}`, 'aria-label': `Remove ${stat.name}` });
            remove.textContent = '×';
            const keep = (change) => {
                const next = statList(s);
                change(next);
                s.trackerStats = next;
                save();
            };
            name.addEventListener('change', () => {
                const text = name.value.replace(/[:\n\r<>]/g, '').trim().slice(0, NAME_MAX);
                if (!text) {
                    name.value = stat.name;
                    return;
                }
                keep((next) => { next[index].name = text; });
                draw();
            });
            color.addEventListener('input', () => keep((next) => { next[index].color = color.value; }));
            const drop = () => {
                keep((next) => next.splice(index, 1));
                draw();
            };
            remove.addEventListener('click', drop);
            remove.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    drop();
                }
            });
            row.append(name, color, remove);
            return row;
        }));
        $root.find('#forge-ui-tracker-add').toggleClass('disabled', stats.length >= STATS_MAX);
    };
    const add = () => {
        const next = statList(s);
        if (next.length >= STATS_MAX) return;
        next.push({ id: `stat-${Date.now().toString(36)}`, name: `Stat ${next.length + 1}`, color: '#d9a441' });
        s.trackerStats = next;
        save();
        draw();
        list?.lastElementChild?.querySelector('input')?.select();
    };
    $root.find('#forge-ui-tracker-add').on('click', add).on('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            add();
        }
    });
    draw();
}

export function apply(s) {
    active = Boolean(s.enabled && s.trackers && s.layout === 'columns' && window.matchMedia(DESKTOP).matches);
    if (active) startListening();
    else stopListening();
    setNote();
    render();
}

// ---------- In the profile ----------

/**
 * The place in the profile where the trackers go. columns.js puts it in each time it builds the profile; the
 * same element is handed back so that what is being typed in it survives.
 */
export function holder() {
    const existing = document.getElementById(HOLDER_ID);
    if (existing) return existing;
    const made = el('div', { id: HOLDER_ID });
    setTimeout(render);
    return made;
}

function render() {
    const box = document.getElementById(HOLDER_ID);
    if (!box) return;
    const ctx = context();
    const s = settings();
    const chatOpen = ctx.chatId !== undefined && ctx.chatId !== null && ctx.chatId !== '';
    if (!active || !chatOpen) {
        box.replaceChildren();
        return;
    }
    const now = values();
    const parts = [];
    if (s.trackersTime !== false) parts.push(timeBlock(now));
    if (s.trackersStats !== false) parts.push(statsBlock(now, statList(s)));
    if (s.trackersInventory !== false) parts.push(inventoryBlock(now));
    box.replaceChildren(...parts.filter(Boolean));
}

function change(edit) {
    const next = values();
    edit(next);
    store(tidy(next));
}

function heading(text, ...buttons) {
    const row = el('div', { class: 'forge-track-head' });
    const label = el('p', { class: 'forge-profile-label' });
    label.textContent = text;
    row.append(label, ...buttons);
    return row;
}

function iconButton(icon, label, action) {
    const button = el('button', { type: 'button', class: 'forge-track-button', title: label, 'aria-label': label });
    button.append(lineIcon(ICONS[icon]));
    button.addEventListener('click', action);
    return button;
}

function timeBlock(now) {
    const block = el('section', { class: 'forge-track', 'aria-label': 'Time and place' });
    const card = el('div', { class: 'forge-track-card forge-track-time' });
    const field = (key, label, icon) => {
        const row = el('label', { class: `forge-track-field forge-track-${key}` });
        if (icon) row.append(lineIcon(ICONS[icon]));
        const input = el('input', { type: 'text', maxlength: String(TEXT_MAX), placeholder: label, 'aria-label': label, title: `${label}: click to change`, autocomplete: 'off' });
        input.value = now[key];
        input.addEventListener('input', () => change((next) => { next[key] = input.value; }));
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') input.blur();
        });
        row.append(input);
        return row;
    };
    card.append(field('time', 'Time', 'clock'), field('date', 'Date'), field('location', 'Location', 'pin'), field('weather', 'Weather', 'cloud'));
    block.append(heading('Time and place'), card);
    return block;
}

function statsBlock(now, stats) {
    if (!stats.length) return null;
    const block = el('section', { class: 'forge-track', 'aria-label': 'Stats' });
    const card = el('div', { class: 'forge-track-card' });
    const wheels = el('div', { class: 'forge-track-wheels' });
    const editor = el('div', { class: 'forge-track-slider' });
    const round = 2 * Math.PI * 20;
    const drawEditor = () => {
        const stat = stats.find((one) => one.id === openStat);
        if (!stat) {
            editor.replaceChildren();
            return;
        }
        const name = el('span', {});
        name.textContent = stat.name;
        const range = el('input', { type: 'range', min: '0', max: '100', step: '1', 'aria-label': `${stat.name}, percent` });
        range.value = String(values().stats[stat.id] ?? 0);
        range.addEventListener('input', () => {
            change((next) => { next.stats[stat.id] = Number(range.value); });
            paint(stat, Number(range.value));
        });
        editor.replaceChildren(name, range);
    };
    const painters = new Map();
    const paint = (stat, value) => painters.get(stat.id)?.(value);
    for (const stat of stats) {
        const button = el('button', { type: 'button', class: 'forge-track-wheel', 'aria-pressed': String(openStat === stat.id) });
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', '0 0 50 50');
        svg.setAttribute('aria-hidden', 'true');
        const ring = (colour) => {
            const circle = document.createElementNS(SVG, 'circle');
            for (const [name, value] of Object.entries({ cx: 25, cy: 25, r: 20, fill: 'none', 'stroke-width': 5 })) circle.setAttribute(name, String(value));
            if (colour) circle.setAttribute('stroke', colour);
            return circle;
        };
        const track = ring('');
        track.classList.add('forge-track-ring');
        const fill = ring(stat.color);
        fill.setAttribute('stroke-linecap', 'round');
        fill.setAttribute('transform', 'rotate(-90 25 25)');
        const number = document.createElementNS(SVG, 'text');
        number.setAttribute('x', '25');
        number.setAttribute('y', '29.5');
        number.setAttribute('text-anchor', 'middle');
        svg.append(track, fill, number);
        const name = el('span', {});
        name.textContent = stat.name;
        painters.set(stat.id, (value) => {
            const set = typeof value === 'number';
            fill.setAttribute('stroke-dasharray', `${(round * (set ? value : 0) / 100).toFixed(1)} ${round.toFixed(1)}`);
            fill.style.display = set && value > 0 ? '' : 'none';
            number.textContent = set ? `${value}%` : '–';
            const label = `${stat.name}: ${set ? `${value} percent` : 'not set'}. Click to change`;
            button.title = label;
            button.setAttribute('aria-label', label);
        });
        paint(stat, now.stats[stat.id]);
        button.append(svg, name);
        button.addEventListener('click', () => {
            openStat = openStat === stat.id ? '' : stat.id;
            for (const other of wheels.children) other.setAttribute('aria-pressed', String(other === button && openStat === stat.id));
            drawEditor();
            editor.querySelector('input')?.focus();
        });
        wheels.append(button);
    }
    drawEditor();
    card.append(wheels, editor);
    block.append(heading('Stats'), card);
    return block;
}

function inventoryBlock(now) {
    const block = el('section', { class: 'forge-track', 'aria-label': 'Inventory' });
    const card = el('div', { class: 'forge-track-card forge-track-lists' });
    const list = (key, title, items, save) => {
        const part = el('div', { class: 'forge-track-list' });
        const head = el('div', { class: 'forge-track-list-head' });
        const label = el('span', {});
        label.textContent = title;
        head.append(label);
        part.append(head);
        if (openList === key) {
            const input = el('textarea', { rows: '2', 'aria-label': `${title}: things, separated by commas`, placeholder: 'Things, separated by commas' });
            input.value = items.join(', ');
            let done = false;
            const finish = (keep) => {
                if (done) return;
                done = true;
                openList = '';
                if (keep) save(tidyList(input.value));
                render();
            };
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    finish(true);
                } else if (event.key === 'Escape') {
                    event.stopPropagation();
                    finish(false);
                }
            });
            input.addEventListener('blur', () => finish(true));
            part.append(input);
            setTimeout(() => input.isConnected && input.focus());
            return part;
        }
        head.append(iconButton('pen', `Change: ${title}`, () => {
            openList = key;
            render();
        }));
        const chips = el('div', { class: 'forge-profile-chips' });
        for (const item of items) {
            const chip = el('span', { class: 'forge-profile-chip' });
            chip.textContent = item;
            chips.append(chip);
        }
        if (!items.length) {
            const none = el('span', { class: 'forge-track-none' });
            none.textContent = 'Nothing';
            chips.append(none);
        }
        part.append(chips);
        return part;
    };
    card.append(
        list('onPerson', 'On person', now.onPerson, (items) => change((next) => { next.onPerson = items; })),
        list('wearing', 'Wearing', now.wearing, (items) => change((next) => { next.wearing = items; })),
    );
    for (const [place, items] of Object.entries(now.stored)) {
        // Emptying a place's list takes the place away
        card.append(list(`stored:${place}`, `Stored · ${place}`, items, (kept) => change((next) => {
            if (kept.length) next.stored[place] = kept;
            else delete next.stored[place];
        })));
    }
    if (addingPlace) {
        const input = el('input', { type: 'text', maxlength: String(NAME_MAX), placeholder: 'Name of the place (Home, Saddlebag…)', 'aria-label': 'Name of the place', autocomplete: 'off' });
        let done = false;
        const finish = (keep) => {
            if (done) return;
            done = true;
            addingPlace = false;
            const place = tidyText(input.value).replace(/[():]/g, '').trim().slice(0, NAME_MAX);
            if (keep && place && !Object.keys(now.stored).some((key) => key.toLowerCase() === place.toLowerCase()) && Object.keys(now.stored).length < PLACES_MAX) {
                change((next) => { next.stored[place] = []; });
                openList = `stored:${place}`;
            }
            render();
        };
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                finish(true);
            } else if (event.key === 'Escape') {
                event.stopPropagation();
                finish(false);
            }
        });
        input.addEventListener('blur', () => finish(true));
        const row = el('div', { class: 'forge-track-list' });
        row.append(input);
        card.append(row);
        setTimeout(() => input.isConnected && input.focus());
    }
    block.append(heading('Inventory', iconButton('plus', 'Add a place where things are stored', () => {
        addingPlace = true;
        openList = '';
        render();
    })), card);
    return block;
}

function lineIcon(path) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('forge-line-icon');
    const shape = document.createElementNS(SVG, 'path');
    shape.setAttribute('d', path);
    svg.append(shape);
    return svg;
}

function el(tag, attributes) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes ?? {})) element.setAttribute(name, value);
    return element;
}
