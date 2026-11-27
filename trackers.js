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
//
// Another model can do the keeping instead ("Kept up to date by: Another model"): then nothing is added to
// what the story's AI is sent, and after each reply a second request goes to the chat completions address the
// user typed in, with the values as they stand and the last few messages; its answer is the same block. That
// request is sent by the app's own custom connection. The key is kept in this device's own storage, never
// in the settings.
import { extension_settings } from '../../../extensions.js';

export const id = 'trackers';

export const defaults = { trackers: false, trackersTime: true, trackersStats: true, trackersInventory: true, trackersUpdate: true, trackersBy: 'story', trackersUrl: '', trackersModel: '', trackersRead: 4, trackersTell: false };

export const lookKeys = {
    trackersTime: { type: 'boolean' },
    trackersStats: { type: 'boolean' },
    trackersInventory: { type: 'boolean' },
};

const MODULE = 'arcaneForgeUi';
const DESKTOP = '(min-width: 1001px)';
const HOLDER_ID = 'forge-trackers';
const KEY = 'forge_trackers';
// The values set by hand while no reply could hold them (an empty chat): what a chat goes back to
const START_KEY = 'forge_trackers_start';
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
const BY = { story: 'The story\'s AI, in each reply', other: 'Another model, after each reply' };
const KEY_STORE = 'arcane_forge_trackers_key';
const READ = [1, 20];          // messages the other model is shown
const READ_TEXT_MAX = 16000;   // characters of them
const ANSWER_TOKENS = 1000;
const URL_MAX = 300;
const MODEL_MAX = 120;
// Names a stat cannot have: the reader takes a line with one of these for the built-in line of that name
const TAKEN_NAMES = ['time', 'date', 'location', 'place', 'weather', 'on person', 'carried', 'carrying', 'wearing', 'clothing', 'worn'];
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
    again: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
};

let active = false;
let listening = [];
let saveTimer = 0;
// What is open for editing in the profile: a stat's id, and an inventory section's key
let openStat = '';
let openList = '';
let addingPlace = false;
// The other model: the request in flight, the reply it is about, the reply to ask about next, and what went
// wrong with the last one
let asking = null;
let askingFor = null;
let queued = null;
// The kind of request SillyTavern is building ('normal', 'swipe', 'impersonate', 'quiet', ...)
let generationType = 'normal';
let otherFailed = '';
let lastToast = { text: '', time: 0 };

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
        // Two stats with one name, or one named like a built-in line, could not be told apart in a reply
        if (!name || !statId || seen.has(statId) || out.length >= STATS_MAX || !nameIsFree(name, out)) continue;
        seen.add(statId);
        out.push({ id: statId, name, color: /^#[0-9a-f]{6}$/i.test(stat?.color) ? stat.color : '#c8553d' });
    }
    return out;
}

function nameIsFree(name, others) {
    const lower = name.toLowerCase();
    return !TAKEN_NAMES.includes(lower) && !/^stored\b/.test(lower) && !others.some((other) => other.name.toLowerCase() === lower);
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
    const parts = Array.isArray(value) ? value : splitList(String(value ?? ''));
    const out = [];
    for (const part of parts) {
        const item = String(part ?? '').replace(/\s+/g, ' ').replace(/^[\s\-*•]+|[\s.]+$/g, '').slice(0, ITEM_MAX);
        if (!item || /^(none|nothing|empty|n\/a|not set|-+)$/i.test(item)) continue;
        if (!out.includes(item) && out.length < ITEMS_MAX) out.push(item);
    }
    return out;
}

// "1,000 gold coins, map (torn, stained)" is two things: a comma between two digits or inside brackets
// belongs to the thing itself
function splitList(text) {
    const parts = [];
    let part = '';
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '(' || char === '[') depth++;
        else if ((char === ')' || char === ']') && depth > 0) depth--;
        const inNumber = char === ',' && /\d/.test(text[i - 1] ?? '') && /\d{3}(?!\d)/.test(text.slice(i + 1, i + 5));
        if (char === '\n' || ((char === ',' || char === ';') && depth === 0 && !inNumber)) {
            parts.push(part);
            part = '';
            // A bracket left open ends with its line
            if (char === '\n') depth = 0;
        } else part += char;
    }
    parts.push(part);
    return parts;
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
    if (!holder) ctx.chatMetadata[START_KEY] = structuredClone(next);
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

// After a reply is deleted or swiped away: the values go back to the last copy a reply still holds, or to
// nothing set when no reply holds one (the reply that first stated them is the one that went)
function followChat(swipedId) {
    const ctx = context();
    const chat = ctx.chat ?? [];
    // A swipe that is about to be written anew: SillyTavern keeps the message's extra data, so it still carries
    // the copy of the reply being replaced. That copy stays with the old swipe (swipe_info) and comes off here.
    const swiped = Number.isInteger(swipedId) ? chat[swipedId] : null;
    // One of several replies from a single request, shown for the first time: it still carries its own block
    // (only the first was read when they arrived) under a copy of the first one's values
    const late = Boolean(swiped) && typeof swiped.swipes?.[swiped.swipe_id] === 'string' && typeof swiped.mes === 'string' && /<div\b[^>]*\bforge-trackers\b/i.test(swiped.mes);
    if (swiped && Array.isArray(swiped.swipes) && (late || typeof swiped.swipes[swiped.swipe_id] !== 'string')) delete swiped.extra?.[KEY];
    // The other model was asked about a reply that has gone, or about another swipe of it: its answer is not wanted
    if (askingFor && (!chat.includes(askingFor.message) || swipeOf(askingFor.message) !== askingFor.swipe)) dropAsking();
    if (queued && !chat.includes(queued)) queued = null;
    let kept = null;
    for (let i = chat.length - 1; i >= 0 && !kept; i--) kept = chat[i]?.extra?.[KEY] ?? null;
    if (ctx.chatMetadata) {
        ctx.chatMetadata[KEY] = kept ? tidy(kept) : tidy(ctx.chatMetadata[START_KEY]);
        ctx.saveMetadataDebounced?.();
    }
    // ... which is read and taken out now, from the values as they stood before this reply
    if (late) {
        onReply(swipedId, 'swipe');
        return;
    }
    setNote();
    render();
}

// A fresh reply is given its swipe number (0) only after SillyTavern has announced it, so none yet counts as 0
function swipeOf(message) {
    return message.swipe_id ?? 0;
}

function dropAsking() {
    asking?.abort();
    asking = null;
    askingFor = null;
    queued = null;
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
    if (s.trackersTime !== false) rules.push('The block must agree with your reply: when your reply states the time, date, place or weather, write exactly that; otherwise move the time on by however long the events of your reply took.');
    if (s.trackersStats !== false && stats.length) rules.push(`${stats.map((stat) => stat.name).join(', ')}: whole numbers from 0 to 100; change one only when the story changes it.`);
    if (s.trackersInventory !== false) rules.push('The lists are {{user}}\'s things, separated by commas ("none" when empty); change them only when something is gained, lost, used up, put on, taken off or put away. For things kept somewhere else, use one line per place: Stored (place): things.');
    rules.push('Where a value says "not set", choose one that fits the story.', 'Never mention this block in the story itself.', 'Write the block from <div to </div> and nothing around it: no heading, no brackets, no words before or after.');
    return `{{user}}'s trackers, as they stand now:\n<div class="${BLOCK_CLASS}">\n${lines.join('\n')}\n</div>\nAt the very end of your reply, after the story text, write this block again with the values as they stand after your reply. ${rules.join(' ')}`;
}

// What a model may write around its block: a last line like "[Trackers for Name:" before it, loose brackets after it.
// Only a line that is nothing but that heading counts: story text that merely mentions a tracker is left alone.
const HEADING = String.raw`(?:updated[ \t]+)?(?:[^\n[\]:]{1,40}?['’]s[ \t]+)?trackers?(?:[ \t]+for[ \t]+[^\n[\]:]{1,40}?)?(?:[.,]?[ \t]*(?:the[ \t]+values[ \t]+)?as[ \t]+they[ \t]+stand(?:[ \t]+now)?)?[ \t]*:?`;
const SHELL_OPEN = new RegExp(String.raw`(?:^|\n)[ \t]*[[(*_#>` + '`' + String.raw`]*[ \t]*${HEADING}[ \t]*[\s\]*_` + '`' + String.raw`]*$`, 'i');
const SHELL_CLOSE = /^[\s*_`]*[\])][\s*_`]*/;
// The same heading with no block inside it, at the end of a reply: "[Trackers for Name: ... ]"
const SHELL_ALONE = new RegExp(String.raw`(?:^|\n)[ \t]*[*_` + '`' + String.raw`]*\[[ \t]*${HEADING}[ \t]*(?:\n([^[\]]{0,2000}))?\][\s*_` + '`' + String.raw`]*$`, 'i');

function takeShell(source) {
    const match = SHELL_ALONE.exec(source);
    if (!match) return null;
    const lines = String(match[1] ?? '').split(/\n|<br\s*\/?>/i).map((line) => line.replace(/<[^>]*>/g, '').replace(/^[\s\-*•]+|\*+/g, '').trim()).filter(Boolean);
    return { text: source.slice(0, match.index).trimEnd(), lines };
}

/** The note for the story's AI when another model keeps the trackers: the values to go by, with nothing to write back. */
export function tellText(now, s, stats) {
    // A list nobody has filled in reads "none"; told as a fact it would have the story strip the character bare
    const lines = blockLines(now, s, stats).filter((line) => !/: (?:not set|none)$/.test(line));
    if (!lines.length) return '';
    return `{{user}}'s situation right now, for you to go by in the story. Keep the story consistent with it, and do not write this list out or mention it:\n${lines.join('\n')}`;
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
    if (start < 0) return takeShell(source);
    const closing = source.slice(bodyStart).search(/<\/div\s*>/i);
    let body = closing < 0 ? source.slice(bodyStart) : source.slice(bodyStart, bodyStart + closing);
    // A block with no end was cut off (the reply ran out of length, or Stop was pressed): its last line may be
    // half a value, so it is left out unless the line was finished
    if (closing < 0 && !/\n\s*$/.test(body)) body = body.slice(0, Math.max(0, body.lastIndexOf('\n')));
    // Earlier blocks in the same reply (the note's own block copied first, say) go too; the last one is read
    let before = source.slice(0, start).replace(/<div\b[^>]*\bforge-trackers\b[^>]*>[\s\S]*?<\/div\s*>/gi, '');
    // A model may copy a heading and brackets around the block ("[Trackers for Name:" ... "]"): they go with it
    let after = (closing < 0 ? '' : source.slice(bodyStart + closing).replace(/^<\/div\s*>/i, '')).replace(SHELL_CLOSE, '');
    // ... or put the block in a code fence, which would stay behind as an empty box
    const fenceOpen = /(?:^|\n)[ \t]*```[a-z]*[ \t]*\n?\s*$/i;
    const fenceClose = /^\s*```[ \t]*(?=\n|$)/;
    if (fenceOpen.test(before) && (fenceClose.test(after) || closing < 0)) {
        before = before.replace(fenceOpen, '');
        after = after.replace(fenceClose, '');
    }
    const rest = `${before.replace(SHELL_OPEN, '').trimEnd()}${after.trim() ? `\n\n${after.trim()}` : ''}`.trim();
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
            const number = statNumber(value);
            if (s.trackersStats === false || number === null) continue;
            next.stats[byName.get(name)] = Math.min(100, Math.max(0, Math.round(number)));
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

// The number a stat line states. "100 → 85" (or "100 -> 85") states the one after the arrow; "8/10" is a
// share, so it counts as 80.
function statNumber(value) {
    const after = /(?:→|->|=>)\s*(-?\d+(?:\.\d+)?)/.exec(value);
    if (after) return Number(after[1]);
    const share = /^\D*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(value);
    if (share && Number(share[2]) > 0 && Number(share[2]) !== 100) return Number(share[1]) * 100 / Number(share[2]);
    const number = /-?\d+(?:\.\d+)?/.exec(value);
    return number ? Number(number[0]) : null;
}

function onReply(messageId, type) {
    const s = settings();
    if (!active || s.trackersUpdate === false) return;
    const ctx = context();
    const message = ctx.chat?.[Number(messageId)];
    if (!message || message.is_user || message.is_system || typeof message.mes !== 'string') return;
    const found = takeBlock(message.mes);
    // A chat that opens with one message fires this for its greeting each time (SillyTavern's 'first_message'):
    // that is not a new reply, so the other model is not asked about it again
    const other = byOther(s);
    const ask = other && type !== 'first_message';
    if (!found) {
        if (ask) askOther(Number(messageId));
        return;
    }
    message.mes = found.text;
    if (Array.isArray(message.swipes) && typeof message.swipe_id === 'number' && typeof message.swipes[message.swipe_id] === 'string') message.swipes[message.swipe_id] = found.text;
    // With another model keeping them, what the story's AI wrote anyway is only taken out
    const next = other ? null : readLines(found.lines, values(), s, statList(s));
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
    if (ask) askOther(Number(messageId));
}

// ---------- Another model keeps them up to date ----------

function byOther(s) {
    return s.trackersBy === 'other';
}

/**
 * The address as the app's custom connection takes it: without "/chat/completions" at its end. Empty when
 * what was typed is not a web address.
 */
export function endpoint(raw) {
    const text = String(raw ?? '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/\/chat\/completions$/i, '').replace(/\/+$/, '');
    return /^https?:\/\/[^\s/]+/i.test(text) ? text : '';
}

// The key lives in this device's own storage: the settings are a file, are synced, and go into look files
function savedKey() {
    try {
        return localStorage.getItem(KEY_STORE) ?? '';
    } catch {
        return '';
    }
}

/** Whether a key is kept on this device (the key itself is never handed out). */
export function hasKey() {
    return Boolean(savedKey());
}

/** Keeps a key on this device; an empty one forgets it. */
export function keepKey(value) {
    try {
        const key = String(value ?? '').trim();
        if (key) localStorage.setItem(KEY_STORE, key);
        else localStorage.removeItem(KEY_STORE);
        return true;
    } catch {
        return false;
    }
}

function plain(mes) {
    return String(mes ?? '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<div\b[^>]*\bforge-trackers\b[^>]*>[\s\S]*?(<\/div\s*>|$)/gi, ' ')
        .replace(/\[[ \t]*trackers? for [^\n[\]]{0,160}\s*\]/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** What the other model is sent: how the trackers work, the values as they stand, and the last messages. */
export function otherMessages(ctx, s, messageId, now = values()) {
    const stats = statList(s);
    const who = String(ctx.name1 ?? '').trim() || 'the main character';
    const rules = ['Keep the same lines in the same order, one per line.'];
    if (s.trackersTime !== false) rules.push('The story decides: when the last message states the time, date, place or weather, in its text or in a header or status line of its own, write exactly what it states, even when that differs from the trackers as they stand. Only when it does not state one, move the time on by however long its events took and keep the rest.');
    if (s.trackersStats !== false && stats.length) rules.push(`${stats.map((stat) => stat.name).join(', ')}: whole numbers from 0 to 100; change one only when the story changes it.`);
    if (s.trackersInventory !== false) rules.push(`The lists are ${who}'s things, separated by commas ("none" when empty); change them only when something is gained, lost, used up, put on, taken off or put away. For things kept somewhere else, use one line per place: Stored (place): things.`);
    rules.push('Take everything from the scene as the messages tell it; never contradict the last message.', 'Where a value says "not set", choose one that fits the story.', 'When the last message changes nothing, write the values again as they are.');
    const most = Math.min(READ[1], Math.max(READ[0], Math.round(Number(s.trackersRead)) || defaults.trackersRead));
    const story = [];
    let room = READ_TEXT_MAX;
    for (let i = messageId; i >= 0 && story.length < most; i--) {
        const message = ctx.chat?.[i];
        if (!message || message.is_system || typeof message.mes !== 'string') continue;
        const text = plain(message.mes);
        if (!text) continue;
        // The newest message always goes, cut short when it is very long; older ones only while there is room
        if (story.length && text.length > room) break;
        story.unshift(`${message.name || (message.is_user ? ctx.name1 : ctx.name2) || 'Narrator'}: ${text.slice(0, READ_TEXT_MAX)}`);
        room -= text.length;
    }
    return [
        { role: 'system', content: `You keep the trackers of ${who}, the main character of an ongoing story, up to date. You do not write the story and you do not continue it.\n\nYou are given the trackers as they stand and the last part of the story. Work out what the LAST message changes, and answer with the block again, with the values as they stand after it. Answer with the block and nothing else.\n\n${rules.map((rule) => `- ${rule}`).join('\n')}` },
        { role: 'user', content: `The trackers as they stand:\n<div class="${BLOCK_CLASS}">\n${blockLines(now, s, stats).join('\n')}\n</div>\n\nThe last part of the story (the last message is the newest):\n\n${story.join('\n\n')}` },
    ];
}

// One request to the address the user typed in, sent by the app's own custom connection
async function sendOther(s, messages, signal, tokens = ANSWER_TOKENS) {
    const url = endpoint(s.trackersUrl);
    const model = String(s.trackersModel ?? '').trim();
    if (!url) throw new Error('Enter the chat completions URL first (Trackers, in the settings).');
    if (!model) throw new Error('Enter the model\'s name first (Trackers, in the settings).');
    const service = context().ChatCompletionService;
    if (typeof service?.processRequest !== 'function') throw new Error('This SillyTavern cannot send a request to a second model.');
    const request = { stream: false, messages, model, chat_completion_source: 'custom', custom_url: url, max_tokens: tokens };
    // The request always carries its own Authorization, so that the key the app keeps for its own custom
    // connection never goes to this address. With no key of ours it is a placeholder, which a service on
    // this machine does not look at.
    request.custom_include_headers = JSON.stringify({ Authorization: `Bearer ${savedKey() || 'none'}` });
    const result = await service.processRequest(request, {}, true, signal);
    return typeof result?.content === 'string' ? result.content : '';
}

function otherProblem(error) {
    otherFailed = String(error?.message ?? error ?? 'It did not answer.').slice(0, 240);
    console.error('[Arcane Forge UI] The trackers\' other model did not update them', error);
    // The same trouble is said once, not after every reply
    if (lastToast.text !== otherFailed || Date.now() - lastToast.time > 60000) globalThis.toastr?.error(otherFailed, 'Trackers: the other model');
    lastToast = { text: otherFailed, time: Date.now() };
}

/** Asks the other model what one reply changes, and stores its answer on that reply. */
async function askOther(messageId) {
    const s = settings();
    const ctx = context();
    const message = ctx.chat?.[messageId];
    if (!active || !message || message.is_user || message.is_system) return false;
    // An answer about an earlier reply is still on its way: this reply waits for it, so that reply's changes
    // are not lost. (Asking again about the same reply replaces the request.)
    if (asking && askingFor && askingFor.message !== message && ctx.chat.includes(askingFor.message)) {
        queued = message;
        return false;
    }
    asking?.abort();
    const mine = asking = new AbortController();
    const swipe = swipeOf(message);
    askingFor = { message, swipe };
    const chatId = ctx.chatId;
    render();
    try {
        const answer = await sendOther(s, otherMessages(ctx, s, messageId), mine.signal);
        // A newer request, another chat, a deleted message or another swipe of it: this answer is about
        // something that is gone
        if (asking !== mine || context().chatId !== chatId || context().chat?.[messageId] !== message || swipeOf(message) !== swipe) return false;
        const lines = (takeBlock(answer) ?? takeBlock(`<div class="${BLOCK_CLASS}">\n${answer}\n</div>`)).lines;
        const next = readLines(lines, values(), s, statList(s));
        if (!next) throw new Error(answer.trim() ? `Its answer had no tracker lines: "${answer.trim().slice(0, 120)}"` : 'Its answer was empty.');
        otherFailed = '';
        store(next, { message });
        return true;
    } catch (error) {
        if (asking !== mine || mine.signal.aborted) return false;
        otherProblem(error);
        return false;
    } finally {
        if (asking === mine) {
            asking = null;
            askingFor = null;
        }
        render();
        // The reply that waited is asked about now, from the values as they stand after this answer
        if (!asking && queued) {
            const next = context().chat?.indexOf(queued) ?? -1;
            queued = null;
            if (next >= 0) askOther(next);
        }
    }
}

/** "Update now": asks again about the newest reply. */
export function updateNow() {
    const chat = context().chat ?? [];
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user && !chat[i].is_system) return askOther(i);
    }
    return Promise.resolve(false);
}

/** "Test": one small request, to see that the address, the model and the key work. */
export async function testOther() {
    const s = settings();
    try {
        const answer = await sendOther(s, [{ role: 'user', content: 'Answer with the single word: ready' }], null, 60);
        globalThis.toastr?.success(answer.trim() ? `It answered: "${answer.trim().slice(0, 80)}"` : 'It answered (with nothing in the answer).', 'Trackers: the other model');
        return true;
    } catch (error) {
        globalThis.toastr?.error(String(error?.message ?? error).slice(0, 240), 'Trackers: the other model');
        return false;
    }
}

// ---------- The note to the AI ----------

function setNote() {
    const ctx = context();
    if (!ctx.setExtensionPrompt) return;
    const s = settings();
    let text = '';
    let asksForBlock = false;
    // Only in a chat whose trackers the profile shows, and only with "Ask the AI to keep them up to date" on
    if (active && ctx.chatMetadata && chatOpen(ctx) && s.trackersUpdate !== false) {
        if (byOther(s)) text = s.trackersTell === true ? tellText(values(), s, statList(s)) : '';
        else {
            text = noteText(values(), s, statList(s));
            asksForBlock = true;
        }
    }
    // In the chat, right at the end (position 1, depth 0), as a system note (role 0). The note that asks for a
    // block is left out of requests whose answer never comes back as a reply: Impersonate writes into the
    // message box, and background requests (image prompts, summaries) go to whoever asked.
    ctx.setExtensionPrompt(PROMPT_KEY, text, 1, 0, false, 0, asksForBlock ? wantsBlock : null);
}

function wantsBlock() {
    return generationType !== 'impersonate' && generationType !== 'quiet';
}

function chatOpen(ctx) {
    return ctx.chatId !== undefined && ctx.chatId !== null && ctx.chatId !== '';
}

// SillyTavern can empty every extension's note without a chat change (a card saved in a chat that has only its
// greeting does), so the note is set again as each request starts.
function onGenerationStarted(type) {
    generationType = typeof type === 'string' && type ? type : 'normal';
    setNote();
}

// ---------- Following SillyTavern ----------

function startListening() {
    if (listening.length) return;
    const { eventSource, eventTypes } = context();
    const follow = { MESSAGE_RECEIVED: onReply, MESSAGE_DELETED: () => followChat(), MESSAGE_SWIPED: followChat, CHAT_CHANGED: onChatChanged, GENERATION_STARTED: onGenerationStarted };
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
    dropAsking();
    otherFailed = '';
    generationType = 'normal';
    // A branch or checkpoint is a copy of its parent's values with fewer messages: the values that count are
    // the ones its own last reply holds
    const ctx = context();
    const chat = ctx.chat ?? [];
    let kept = null;
    for (let i = chat.length - 1; i >= 0 && !kept; i--) kept = chat[i]?.extra?.[KEY] ?? null;
    if (kept && ctx.chatMetadata && JSON.stringify(tidy(kept)) !== JSON.stringify(tidy(ctx.chatMetadata[KEY]))) {
        ctx.chatMetadata[KEY] = tidy(kept);
        ctx.saveMetadataDebounced?.();
    }
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
                <label class="forge-ui-select">
                    <span>Kept up to date by</span>
                    <select id="forge-ui-trackers-by" class="text_pole forge-ui-trackers-option"${off}>${Object.entries(BY).map(([key, label]) => `<option value="${key}"${key === (byOther(s) ? 'other' : 'story') ? ' selected' : ''}>${label}</option>`).join('')}</select>
                </label>
                <div id="forge-ui-trackers-other" class="forge-ui-trackers-other"${byOther(s) ? '' : ' hidden'}>
                    <small>After each reply, the values and the last few messages go to this address instead of being asked of the story's AI. Any service that speaks the chat completions format works.</small>
                    <label class="forge-ui-select">
                        <span>Chat completions URL</span>
                        <input type="text" id="forge-ui-trackers-url" class="text_pole forge-ui-trackers-option" maxlength="${URL_MAX}" placeholder="https://api.example.com/v1" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"${off}>
                    </label>
                    <label class="forge-ui-select">
                        <span>Model</span>
                        <input type="text" id="forge-ui-trackers-model" class="text_pole forge-ui-trackers-option" maxlength="${MODEL_MAX}" placeholder="Paste the model's ID here" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"${off}>
                    </label>
                    <label class="forge-ui-select">
                        <span>API key</span>
                        <input type="password" id="forge-ui-trackers-key" class="text_pole forge-ui-trackers-option" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false"${off}>
                    </label>
                    <small>The key is kept on this device only: not in your settings file, not in a look file, and not synced. It is not shown again once saved.</small>
                    <label class="forge-ui-select">
                        <span>Messages it reads</span>
                        <input type="number" id="forge-ui-trackers-read" class="text_pole forge-ui-trackers-option" min="${READ[0]}" max="${READ[1]}" step="1"${off}>
                    </label>
${box('forge-ui-trackers-tell', 'trackersTell', 'Tell the story\'s AI the values, so the story goes by them', false)}
                    <small>Off: the story's AI is sent nothing about the trackers. On: the values as they stand go along at the very end of what is sent, where they do not disturb a prompt cache.</small>
                    <div class="forge-ui-trackers-actions">
                        <div class="menu_button" id="forge-ui-trackers-test" role="button" tabindex="0">Test</div>
                        <div class="menu_button" id="forge-ui-trackers-forget" role="button" tabindex="0">Forget the key</div>
                    </div>
                </div>
                <div id="forge-ui-tracker-stats" class="forge-ui-tracker-stats"></div>
                <div class="menu_button menu_button_icon" id="forge-ui-tracker-add" role="button" tabindex="0"><span>Add a stat</span></div>
`;
}

const BOXES = { 'forge-ui-trackers': 'trackers', 'forge-ui-trackers-time': 'trackersTime', 'forge-ui-trackers-stats': 'trackersStats', 'forge-ui-trackers-inventory': 'trackersInventory', 'forge-ui-trackers-update': 'trackersUpdate', 'forge-ui-trackers-tell': 'trackersTell' };

// The other model's boxes. What the user typed is put in as values, never as markup; the key is never put back.
function bindOther($root, s, save) {
    const keyBox = $root.find('#forge-ui-trackers-key');
    const keyHint = () => keyBox.attr('placeholder', hasKey() ? 'A key is saved. Type a new one to replace it.' : 'Paste the key here');
    $root.find('#forge-ui-trackers-by').on('change', function () {
        s.trackersBy = this.value === 'other' ? 'other' : 'story';
        $root.find('#forge-ui-trackers-other').prop('hidden', s.trackersBy !== 'other');
        save();
    });
    $root.find('#forge-ui-trackers-url').val(String(s.trackersUrl ?? '').slice(0, URL_MAX)).on('change', function () {
        const text = String(this.value).trim().slice(0, URL_MAX);
        if (text && !endpoint(text)) globalThis.toastr?.warning('That is not a web address. It should start with https:// or http://', 'Trackers: the other model');
        s.trackersUrl = text;
        save();
    });
    $root.find('#forge-ui-trackers-model').val(String(s.trackersModel ?? '').slice(0, MODEL_MAX)).on('change', function () {
        s.trackersModel = String(this.value).trim().slice(0, MODEL_MAX);
        this.value = s.trackersModel;
        save();
    });
    keyBox.on('change', function () {
        if (!String(this.value).trim()) return;
        const kept = keepKey(this.value);
        this.value = '';
        keyHint();
        if (!kept) globalThis.toastr?.error('The key could not be kept on this device.', 'Trackers: the other model');
    });
    keyHint();
    $root.find('#forge-ui-trackers-read').val(Math.min(READ[1], Math.max(READ[0], Math.round(Number(s.trackersRead)) || defaults.trackersRead))).on('change', function () {
        s.trackersRead = Math.min(READ[1], Math.max(READ[0], Math.round(Number(this.value)) || defaults.trackersRead));
        this.value = s.trackersRead;
        save();
    });
    const press = (selector, action) => $root.find(selector).on('click keydown', function (event) {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    });
    press('#forge-ui-trackers-test', () => {
        // A key typed but not yet left: keep it first, so that the test uses it
        keyBox.trigger('change');
        testOther();
    });
    press('#forge-ui-trackers-forget', () => {
        keepKey('');
        keyBox.val('');
        keyHint();
        globalThis.toastr?.info('The key is forgotten.', 'Trackers: the other model');
    });
}

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-layout').on('change', function () {
        const on = this.value === 'columns';
        for (const boxId of Object.keys(BOXES)) $root.find(`#${boxId}`).prop('disabled', !on).attr('title', on ? null : NEED);
        $root.find('.forge-ui-trackers-option').prop('disabled', !on).attr('title', on ? null : NEED);
    });
    bindOther($root, s, save);
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
                if (!nameIsFree(text, stats.filter((one) => one.id !== stat.id))) {
                    name.value = stat.name;
                    globalThis.toastr?.warning(`"${text}" is already the name of another stat or of one of the tracker's own lines. Pick another name.`, 'Trackers');
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

/** "Reset to Forge defaults" clears the other model's address, so the key that went with it is forgotten too. */
export function reset() {
    keepKey('');
}

export function apply(s) {
    active = Boolean(s.enabled && s.trackers && s.layout === 'columns' && window.matchMedia(DESKTOP).matches);
    if (active) startListening();
    else stopListening();
    if (!active || !byOther(s) || s.trackersUpdate === false) {
        dropAsking();
        otherFailed = '';
    }
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
    if (!active || !chatOpen(ctx)) {
        box.replaceChildren();
        return;
    }
    const now = values();
    const parts = [];
    if (byOther(s) && s.trackersUpdate !== false) parts.push(otherRow(s));
    if (s.trackersTime !== false) parts.push(timeBlock(now));
    if (s.trackersStats !== false) parts.push(statsBlock(now, statList(s)));
    if (s.trackersInventory !== false) parts.push(inventoryBlock(now));
    box.replaceChildren(...parts.filter(Boolean));
}

// With another model keeping them: who that is, whether it is at work, and a button to ask it again
function otherRow(s) {
    const row = el('div', { class: `forge-track-other${otherFailed && !asking ? ' forge-track-other-failed' : ''}` });
    const label = el('span', {});
    label.textContent = asking ? 'Updating…' : otherFailed ? 'The last update failed' : `Kept by ${String(s.trackersModel ?? '').trim() || 'another model'}`;
    if (otherFailed && !asking) label.title = otherFailed;
    const button = iconButton('again', 'Update from the newest reply', () => updateNow());
    button.disabled = Boolean(asking);
    row.append(label, button);
    return row;
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
