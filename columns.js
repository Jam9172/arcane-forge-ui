// The Three columns layout (desktop): characters and chats on the left, the story in a reading column in
// the middle, the character's profile on the right. Styles are in css/columns.css.
//
// index.js holds this module in its list of features and calls the functions below (the contract is
// described at the top of stage.js). The layout is chosen with stage.js's "Forge layout" setting; this
// module only acts while that setting is "columns", on a desktop-sized window.
//
// What the layout puts in the page, and apply() takes out again: the classes forge-columns and
// forge-columns-profile on body, --forge-columns-width on body, and four elements at the end of body:
// #forge-rail (characters), #forge-chats (the open character's chats), #forge-chat-head (the strip over the
// chat) and #forge-profile. It listens to SillyTavern's events while it is on, and to nothing while off.
//
// Nothing here moves or rebuilds SillyTavern's own chat, message box or menus: css/columns.css places the
// chat column between our panels, and every button below works by calling SillyTavern's own function or by
// clicking SillyTavern's own control. menu.js opens the menus in its panel while this layout is on, and
// hides the top bar.
import { getPastCharacterChats, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { getGroupPastChats, openGroupById } from '../../../group-chats.js';
import { user_avatar } from '../../../personas.js';
import { timestampToMoment } from '../../../utils.js';
import { selected_world_info } from '../../../world-info.js';

export const id = 'columns';

// The reading column's widest, in px, and its range on the settings screen. The top of the range means no
// limit: the text fills the chat column.
const WIDTH_MIN = 560;
const WIDTH_MAX = 1600;

export const defaults = { columnsProfile: true, columnsReading: WIDTH_MAX, columnsPreview: true };

export const lookKeys = {
    columnsProfile: { type: 'boolean' },
    columnsReading: { type: 'number', min: WIDTH_MIN, max: WIDTH_MAX },
    columnsPreview: { type: 'boolean' },
};

const MODULE = 'arcaneForgeUi';
const DESKTOP = '(min-width: 1001px)';
const BODY_CLASS = 'forge-columns';
const PROFILE_CLASS = 'forge-columns-profile';
const WIDTH = '--forge-columns-width';
const RAIL_ID = 'forge-rail';
const CHATS_ID = 'forge-chats';
const HEAD_ID = 'forge-chat-head';
const PROFILE_ID = 'forge-profile';
const NEED = 'Needs "Forge layout: Three columns (desktop)"';
const CONTROLS = ['forge-ui-columns-profile', 'forge-ui-columns-width', 'forge-ui-columns-preview'];
// How many characters and groups the rail shows, most recently used first; the rest are one click away
// in SillyTavern's own character list
const RAIL_MAX = 40;
// How much of a character's description the profile shows
const ABOUT_MAX = 320;
const SVG = 'http://www.w3.org/2000/svg';
// SillyTavern's own menus, by the id of their drawer in the top bar
const MENU = { characters: 'rightNavHolder', lorebooks: 'WI-SP-button', ai: 'ai-config-button', persona: 'persona-management-button' };

const ICONS = {
    people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-4 12.2-4 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 15.5c1.7.6 2.8 2 3 4.5',
    book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
    menu: 'M4 6h16M4 12h16M4 18h16',
    plus: 'M12 5v14M5 12h14',
    sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    panel: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM15 5v14',
    pen: 'M4 20l4-1 11-11-3-3L5 16z',
};

// Whether the layout is on, the listeners it holds, and the timer and counter that keep refreshes in order
let active = false;
let listening = [];
let refreshTimer = 0;
let chatsRun = 0;

export function settingsHtml(s) {
    const off = s.layout === 'columns' ? '' : ` disabled title="${NEED.replaceAll('"', '&quot;')}"`;
    const width = readingWidth(s.columnsReading);
    return `
                <h4>Three columns</h4>
                <label class="forge-ui-range">
                    <span>Reading width <output id="forge-ui-columns-width-value">${widthLabel(width)}</output></span>
                    <input type="range" id="forge-ui-columns-width" min="${WIDTH_MIN}" max="${WIDTH_MAX}" step="20" value="${width}"${off}>
                </label>
                <label class="checkbox_label" for="forge-ui-columns-profile">
                    <input type="checkbox" id="forge-ui-columns-profile"${s.columnsProfile ? ' checked' : ''}${off}>
                    <span>Character profile on the right</span>
                </label>
                <label class="checkbox_label" for="forge-ui-columns-preview">
                    <input type="checkbox" id="forge-ui-columns-preview"${s.columnsPreview ? ' checked' : ''}${off}>
                    <span>Show each chat's last line in the chat list</span>
                </label>
`;
}

export function bindSettings($root, s, save) {
    // stage.js owns the layout setting; this only keeps our own controls greyed out to match it
    $root.find('#forge-ui-layout').on('change', function () {
        const on = this.value === 'columns';
        for (const control of CONTROLS) $root.find(`#${control}`).prop('disabled', !on).attr('title', on ? null : NEED);
    });
    $root.find('#forge-ui-columns-width').on('input', function () {
        s.columnsReading = readingWidth(this.value);
        $root.find('#forge-ui-columns-width-value').text(widthLabel(s.columnsReading));
        save();
    });
    $root.find('#forge-ui-columns-profile').on('change', function () {
        s.columnsProfile = this.checked;
        save();
    });
    $root.find('#forge-ui-columns-preview').on('change', function () {
        s.columnsPreview = this.checked;
        save();
    });
}

export function apply(s) {
    const body = document.body;
    active = Boolean(s.enabled && s.layout === 'columns' && window.matchMedia(DESKTOP).matches);
    body.classList.toggle(BODY_CLASS, active);
    body.classList.toggle(PROFILE_CLASS, active && Boolean(s.columnsProfile));
    if (!active) {
        stopListening();
        clearTimeout(refreshTimer);
        body.style.removeProperty(WIDTH);
        for (const element of [RAIL_ID, CHATS_ID, HEAD_ID, PROFILE_ID]) document.getElementById(element)?.remove();
        return;
    }
    const width = readingWidth(s.columnsReading);
    body.style.setProperty(WIDTH, width >= WIDTH_MAX ? 'none' : `${width}px`);
    if (!document.getElementById(RAIL_ID)) body.append(el('nav', { id: RAIL_ID, 'aria-label': 'Characters' }));
    if (!document.getElementById(CHATS_ID)) body.append(el('aside', { id: CHATS_ID, 'aria-label': 'Chats' }));
    if (!document.getElementById(HEAD_ID)) body.append(el('div', { id: HEAD_ID }));
    if (!document.getElementById(PROFILE_ID)) body.append(el('aside', { id: PROFILE_ID, 'aria-label': 'Profile' }));
    startListening();
    refresh();
}

function readingWidth(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(number))) : defaults.columnsReading;
}

function widthLabel(width) {
    return width >= WIDTH_MAX ? 'Full' : `${width}px`;
}

function currentSettings() {
    return extension_settings[MODULE] ?? {};
}

function context() {
    return globalThis.SillyTavern.getContext();
}

// ---------- Following SillyTavern ----------

function startListening() {
    if (listening.length) return;
    const { eventSource, eventTypes } = context();
    const later = () => refreshSoon();
    const names = ['CHAT_CHANGED', 'CHARACTER_EDITED', 'CHARACTER_DELETED', 'CHARACTER_DUPLICATED', 'CHARACTER_PAGE_LOADED', 'GROUP_UPDATED', 'GROUP_CHAT_CREATED', 'GROUP_CHAT_DELETED', 'CHAT_DELETED', 'CHAT_CREATED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'MESSAGE_DELETED', 'WORLDINFO_SETTINGS_UPDATED', 'SETTINGS_UPDATED', 'APP_READY'];
    for (const name of names) {
        const type = eventTypes?.[name];
        if (!type) continue;
        eventSource.on(type, later);
        listening.push([type, later]);
    }
}

function stopListening() {
    if (!listening.length) return;
    const { eventSource } = context();
    for (const [type, handler] of listening) eventSource.removeListener(type, handler);
    listening = [];
}

// Several events arrive together when a chat opens; one refresh answers them all
function refreshSoon() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 120);
}

function refresh() {
    if (!active) return;
    const s = currentSettings();
    const ctx = context();
    const now = current(ctx);
    renderRail(ctx, now);
    renderHead(ctx, now, s);
    renderProfile(ctx, now);
    renderChats(ctx, now, s);
}

// What is open: a character, a group, or nothing
function current(ctx) {
    if (ctx.groupId) {
        const group = (ctx.groups ?? []).find((g) => String(g.id) === String(ctx.groupId));
        if (group) return { kind: 'group', group, name: group.name, chat: group.chat_id };
    }
    const index = Number(ctx.characterId);
    const character = ctx.characterId !== undefined && ctx.characterId !== null && ctx.characterId !== '' ? ctx.characters?.[index] : null;
    if (character) return { kind: 'character', character, index, name: character.name, chat: character.chat };
    return { kind: 'none', name: '' };
}

// ---------- The rail: characters and groups, most recent first ----------

function renderRail(ctx, now) {
    const rail = document.getElementById(RAIL_ID);
    if (!rail) return;
    const entries = [
        ...(ctx.characters ?? []).map((character, index) => ({ kind: 'character', index, name: character.name, avatar: character.avatar, at: Number(character.date_last_chat) || 0 })),
        ...(ctx.groups ?? []).map((group) => ({ kind: 'group', id: group.id, name: group.name, avatar: validGroupAvatar(group), at: Number(group.date_last_chat) || 0 })),
    ].sort((a, b) => b.at - a.at).slice(0, RAIL_MAX);

    const list = el('div', { class: 'forge-rail-list' });
    for (const entry of entries) {
        const on = entry.kind === 'character' ? now.kind === 'character' && now.index === entry.index : now.kind === 'group' && String(now.group.id) === String(entry.id);
        const button = el('button', { type: 'button', class: 'forge-rail-item', title: entry.name, 'aria-label': entry.name });
        if (on) button.setAttribute('aria-current', 'true');
        button.append(face(entry.name, entry.kind === 'character' ? thumbnail(ctx, 'avatar', entry.avatar) : entry.avatar));
        button.addEventListener('click', () => openEntry(entry));
        list.append(button);
    }

    const top = el('div', { class: 'forge-rail-top' });
    top.append(railButton('All characters', ICONS.people, () => openMenu(MENU.characters), 'forge-rail-home'), el('div', { class: 'forge-rail-rule' }));
    const foot = el('div', { class: 'forge-rail-foot' });
    foot.append(railButton('Lorebooks', ICONS.book, () => openMenu(MENU.lorebooks)), railButton('Menu', ICONS.menu, () => openMenu(MENU.ai)));
    rail.replaceChildren(top, list, foot);
}

function railButton(name, path, action, extra = '') {
    const button = el('button', { type: 'button', class: `forge-rail-button ${extra}`.trim(), title: name, 'aria-label': name });
    button.append(lineIcon(path));
    button.addEventListener('click', action);
    return button;
}

function validGroupAvatar(group) {
    return typeof group?.avatar_url === 'string' ? group.avatar_url : '';
}

async function openEntry(entry) {
    try {
        if (entry.kind === 'group') await openGroupById(String(entry.id));
        else await context().selectCharacterById(entry.index);
    } finally {
        refreshSoon();
    }
}

// ---------- The chat list ----------

async function renderChats(ctx, now, s) {
    const panel = document.getElementById(CHATS_ID);
    if (!panel) return;
    const run = ++chatsRun;
    if (!panel.firstChild) panel.append(el('div', { class: 'forge-chats-head' }), el('div', { class: 'forge-chats-body' }), el('div', { class: 'forge-chats-you' }));
    const [head, body, you] = panel.children;

    const title = el('p', { class: 'forge-chats-name' });
    title.textContent = now.name || 'No character open';
    head.replaceChildren(title);
    renderYou(ctx, you);

    if (now.kind === 'none') {
        const hint = el('p', { class: 'forge-chats-hint' });
        hint.textContent = 'Pick a character on the left to see its chats.';
        body.replaceChildren(hint);
        return;
    }

    let chats = [];
    try {
        const found = now.kind === 'group' ? await getGroupPastChats(String(now.group.id)) : await getPastCharacterChats(now.index);
        chats = Array.isArray(found) ? found : Object.values(found ?? {});
    } catch {
        chats = [];
    }
    // A newer refresh started while this one waited, or the layout went off
    if (run !== chatsRun || !active || !panel.isConnected) return;

    const items = chats
        .filter((chat) => chat && typeof chat.file_name === 'string')
        .map((chat) => ({ name: chat.file_name.replace(/\.jsonl$/, ''), preview: typeof chat.mes === 'string' ? chat.mes : '', when: momentOf(chat.last_mes) }))
        .sort((a, b) => (b.when?.valueOf() ?? 0) - (a.when?.valueOf() ?? 0));

    const fresh = el('button', { type: 'button', class: 'forge-chats-new' });
    fresh.append(lineIcon(ICONS.plus), document.createTextNode('New chat'));
    fresh.addEventListener('click', () => document.getElementById('option_start_new_chat')?.click());
    const heading = el('p', { class: 'forge-chats-label' });
    heading.textContent = 'Chats';
    const list = el('div', { class: 'forge-chats-list' });
    for (const item of items) {
        const button = el('button', { type: 'button', class: 'forge-chats-item' });
        if (item.name === String(now.chat ?? '')) button.setAttribute('aria-current', 'true');
        const line = el('span', { class: 'forge-chats-line' });
        const name = el('span', { class: 'forge-chats-title' });
        name.textContent = item.name;
        const time = el('span', { class: 'forge-chats-time' });
        time.textContent = shortTime(item.when);
        line.append(name, time);
        button.append(line);
        if (s.columnsPreview !== false && item.preview) {
            const preview = el('span', { class: 'forge-chats-preview' });
            preview.textContent = item.preview.replace(/\s+/g, ' ').trim();
            button.append(preview);
        }
        button.title = item.name;
        button.addEventListener('click', () => openChat(now, item.name));
        list.append(button);
    }
    body.replaceChildren(fresh, heading, list);
}

function renderYou(ctx, you) {
    const name = el('p', { class: 'forge-chats-you-name' });
    name.textContent = ctx.name1 || 'You';
    const note = el('p', { class: 'forge-chats-you-note' });
    note.textContent = 'Your persona';
    const text = el('div', { class: 'forge-chats-you-text' });
    text.append(name, note);
    const change = el('button', { type: 'button', class: 'forge-icon-button', title: 'Change persona', 'aria-label': 'Change persona' });
    change.append(lineIcon(ICONS.pen));
    change.addEventListener('click', () => openMenu(MENU.persona));
    you.replaceChildren(face(ctx.name1 || 'You', user_avatar ? thumbnail(ctx, 'persona', user_avatar) : ''), text, change);
}

async function openChat(now, name) {
    if (name === String(now.chat ?? '')) return;
    try {
        const ctx = context();
        if (now.kind === 'group') await ctx.openGroupChat(String(now.group.id), name);
        else await ctx.openCharacterChat(name);
    } finally {
        refreshSoon();
    }
}

function momentOf(value) {
    try {
        const moment = timestampToMoment(value);
        return moment?.isValid?.() ? moment : null;
    } catch {
        return null;
    }
}

// Today as a time, this year as day and month, older with the year
function shortTime(moment) {
    if (!moment) return '';
    const date = moment.toDate();
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (date.getFullYear() === today.getFullYear()) return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------- The strip over the chat ----------

function renderHead(ctx, now, s) {
    const head = document.getElementById(HEAD_ID);
    if (!head) return;
    const titles = el('div', { class: 'forge-head-titles' });
    const title = el('p', { class: 'forge-head-title' });
    title.textContent = now.kind === 'none' ? 'Arcane Forge' : String(now.chat || now.name);
    titles.append(title);
    if (now.kind !== 'none') {
        const sub = el('p', { class: 'forge-head-sub' });
        sub.textContent = `with ${now.name}`;
        titles.append(sub);
    }
    const buttons = el('div', { class: 'forge-head-buttons' });
    const ai = el('button', { type: 'button', class: 'forge-icon-button', title: 'AI response settings', 'aria-label': 'AI response settings' });
    ai.append(lineIcon(ICONS.sliders));
    ai.addEventListener('click', () => openMenu(MENU.ai));
    const shown = Boolean(s.columnsProfile);
    const profile = el('button', { type: 'button', class: 'forge-icon-button', title: shown ? 'Hide profile' : 'Show profile', 'aria-label': 'Profile', 'aria-pressed': String(shown) });
    profile.append(lineIcon(ICONS.panel));
    profile.addEventListener('click', toggleProfile);
    buttons.append(ai, profile);
    head.replaceChildren(titles, buttons);
}

// The same switch as the setting, from the strip: saved, and the settings screen's box follows
function toggleProfile() {
    const s = currentSettings();
    s.columnsProfile = !s.columnsProfile;
    saveSettingsDebounced();
    const box = document.getElementById('forge-ui-columns-profile');
    if (box) box.checked = s.columnsProfile;
    document.body.classList.toggle(PROFILE_CLASS, active && s.columnsProfile);
    renderHead(context(), current(context()), s);
}

// ---------- The profile ----------

function renderProfile(ctx, now) {
    const panel = document.getElementById(PROFILE_ID);
    if (!panel) return;
    const banner = el('div', { class: 'forge-profile-banner' });
    const art = backgroundArt();
    if (art) banner.style.backgroundImage = art;
    const body = el('div', { class: 'forge-profile-body' });

    if (now.kind === 'none') {
        const hint = el('p', { class: 'forge-profile-hint' });
        hint.textContent = 'Open a character and its profile shows here.';
        body.append(hint);
        panel.replaceChildren(banner, body);
        return;
    }

    const character = now.kind === 'character' ? now.character : null;
    const top = el('div', { class: 'forge-profile-top' });
    const picture = face(now.name, character ? thumbnail(ctx, 'avatar', character.avatar) : validGroupAvatar(now.group));
    picture.classList.add('forge-profile-face');
    const name = el('p', { class: 'forge-profile-name' });
    name.textContent = now.name;
    top.append(picture, name);
    const tagline = character ? tagNames(ctx, character.avatar).slice(0, 3).join(' · ') : `${members(ctx, now.group).length} characters`;
    if (tagline) {
        const line = el('p', { class: 'forge-profile-tagline' });
        line.textContent = tagline;
        top.append(line);
    }
    body.append(top);

    const card = el('div', { class: 'forge-profile-card' });
    const about = character ? aboutText(ctx, character) : '';
    if (about) card.append(section('About', paragraph(about)));
    const books = lorebooks(ctx, character);
    if (books.length) {
        const chips = el('div', { class: 'forge-profile-chips' });
        for (const book of books) {
            const chip = el('span', { class: 'forge-profile-chip' });
            chip.textContent = book;
            chips.append(chip);
        }
        card.append(section('Lorebooks in use', chips));
    }
    if (card.firstChild) body.append(card);

    const people = now.kind === 'group' ? members(ctx, now.group).map((member) => ({ name: member.name, src: thumbnail(ctx, 'avatar', member.avatar) })) : [{ name: now.name, src: thumbnail(ctx, 'avatar', character.avatar) }];
    people.push({ name: ctx.name1 || 'You', src: user_avatar ? thumbnail(ctx, 'persona', user_avatar) : '', you: true });
    const cast = el('div', { class: 'forge-profile-cast' });
    const label = el('p', { class: 'forge-profile-label' });
    label.textContent = `In this chat · ${people.length}`;
    cast.append(label);
    for (const person of people) {
        const row = el('div', { class: 'forge-profile-person' });
        const who = el('p', {});
        who.textContent = person.name;
        if (person.you) {
            const you = el('span', { class: 'forge-profile-you' });
            you.textContent = ' (you)';
            who.append(you);
        }
        row.append(face(person.name, person.src), who);
        cast.append(row);
    }
    body.append(cast, el('div', { class: 'forge-profile-gap' }));

    const edit = el('button', { type: 'button', class: 'forge-profile-edit' });
    edit.textContent = now.kind === 'group' ? 'Edit group' : 'Edit character';
    edit.addEventListener('click', () => openMenu(MENU.characters));
    body.append(edit);
    panel.replaceChildren(banner, body);
}

function section(title, content) {
    const box = el('div', { class: 'forge-profile-section' });
    const label = el('p', { class: 'forge-profile-label' });
    label.textContent = title;
    box.append(label, content);
    return box;
}

function paragraph(text) {
    const p = el('p', { class: 'forge-profile-about' });
    p.textContent = text;
    return p;
}

// The start of the description (or the creator's notes when there is none), with SillyTavern's macros filled in
function aboutText(ctx, character) {
    const raw = String(character.description || character.data?.creator_notes || character.creatorcomment || '').trim();
    if (!raw) return '';
    let text = raw;
    try {
        text = ctx.substituteParams ? ctx.substituteParams(raw) : raw;
    } catch { /* keep the raw text */ }
    text = String(text).replace(/\s+/g, ' ').trim();
    return text.length > ABOUT_MAX ? `${text.slice(0, ABOUT_MAX).replace(/\s+\S*$/, '')}…` : text;
}

function tagNames(ctx, avatar) {
    const ids = ctx.tagMap?.[avatar] ?? [];
    const byId = new Map((ctx.tags ?? []).map((tag) => [tag.id, tag.name]));
    return ids.map((tagId) => byId.get(tagId)).filter(Boolean);
}

function members(ctx, group) {
    return (group.members ?? []).map((avatar) => (ctx.characters ?? []).find((character) => character.avatar === avatar)).filter(Boolean);
}

// The character's own lorebook, the chat's, and the ones switched on for every chat
function lorebooks(ctx, character) {
    const names = [character?.data?.extensions?.world, ctx.chatMetadata?.world_info, ...(Array.isArray(selected_world_info) ? selected_world_info : [])];
    return [...new Set(names.filter((name) => typeof name === 'string' && name))];
}

// The art SillyTavern is showing behind the chat, for the profile's banner
function backgroundArt() {
    for (const holder of ['bg_custom', 'bg1']) {
        const element = document.getElementById(holder);
        const image = element ? getComputedStyle(element).backgroundImage : '';
        if (image && image !== 'none') return image;
    }
    return '';
}

// ---------- Small parts ----------

// A round picture, or the name's first letter when there is no picture or it does not load
function face(name, src) {
    const holder = el('span', { class: 'forge-face' });
    const letter = el('span', { class: 'forge-face-letter', 'aria-hidden': 'true' });
    letter.textContent = (String(name || '?').trim()[0] || '?').toUpperCase();
    holder.append(letter);
    if (src) {
        const image = el('img', { alt: '', loading: 'lazy', draggable: 'false' });
        image.addEventListener('error', () => image.remove());
        image.src = src;
        holder.append(image);
    }
    return holder;
}

function thumbnail(ctx, type, file) {
    try {
        return file ? ctx.getThumbnailUrl(type, file) : '';
    } catch {
        return '';
    }
}

// Opens one of SillyTavern's menus by clicking its own top bar icon (hidden, but still in the page), unless
// it is open already
function openMenu(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (!drawer || drawer.querySelector(':scope > .drawer-content.openDrawer')) return;
    drawer.querySelector(':scope > .drawer-toggle')?.click();
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
