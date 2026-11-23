// The profile card: a window with a character's or a persona's picture at full size and their profile
// beside it. Part of the Three columns layout (columns.js opens it and takes it away); styles are in
// css/columns.css.
//
// The card is a <dialog id="forge-card"> at the end of body, shown as a modal: the browser keeps the focus
// inside it, Escape closes it, and it gives the focus back. Every piece of text goes in as text, never as
// markup. From a chat message only two things are read: who sent it and which picture it carries. Its text
// is never read.
//
// About can be edited in place. What is typed is saved to the character or the persona itself, the same way
// SillyTavern's own editor saves it: a short while after the last key, and when the box or the card is left.
import { user_avatar } from '../../../personas.js';

const CARD_ID = 'forge-card';
const SVG = 'http://www.w3.org/2000/svg';
const CLOSE_ICON = 'M6 6l12 12M18 6L6 18';
const GROW_ICON = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';
const ABOUT_ID = 'forge-card-about';
const SAVE_AFTER_MS = 700;
const SAVE_WAIT_MS = 8000;

// Saves what is still unsaved in the open card's About box; set while a card with one is open
let saveOpenCard = null;

function context() {
    return globalThis.SillyTavern.getContext();
}

/**
 * Whose picture a chat message shows: a character, a persona, or null when it is neither (narration, a
 * system message, a sender that is not a character here).
 * @param {Element} mes the message's element in #chat
 * @returns {{kind: 'character', avatar: string} | {kind: 'persona', file: string, name?: string} | null}
 */
export function whoSent(mes) {
    const ctx = context();
    const message = ctx.chat?.[Number(mes?.getAttribute('mesid'))];
    if (!message) return null;
    if (message.is_user) {
        const file = personaFile(message.force_avatar) || user_avatar;
        return file ? { kind: 'persona', file, name: message.name } : null;
    }
    if (message.is_system || message.extra?.type === 'narrator') return null;
    const characters = ctx.characters ?? [];
    if (message.original_avatar && characters.some((c) => c.avatar === message.original_avatar)) return { kind: 'character', avatar: message.original_avatar };
    if (ctx.groupId) {
        const group = (ctx.groups ?? []).find((g) => String(g.id) === String(ctx.groupId));
        const member = (group?.members ?? []).map((avatar) => characters.find((c) => c.avatar === avatar)).find((c) => c && c.name === message.name);
        return member ? { kind: 'character', avatar: member.avatar } : null;
    }
    const open = characters[Number(ctx.characterId)];
    // A message carrying its own picture under another name is not the open character
    if (!open || (message.force_avatar && message.name !== open.name)) return null;
    return { kind: 'character', avatar: open.avatar };
}

// The persona's file name out of a message's picture address ("User Avatars/x.png", or a thumbnail's file=)
function personaFile(address) {
    if (typeof address !== 'string' || !address) return '';
    try {
        const url = new URL(address, location.href);
        const file = url.searchParams.get('file');
        if (file) return url.searchParams.get('type') === 'persona' ? file : '';
        const path = decodeURIComponent(url.pathname);
        const at = path.indexOf('User Avatars/');
        return at >= 0 ? path.slice(at + 'User Avatars/'.length) : '';
    } catch {
        return '';
    }
}

/**
 * Opens the card for a character or a persona. Does nothing when they cannot be found.
 * @param {{kind: 'character', avatar: string} | {kind: 'persona', file: string, name?: string}} who
 * @param {{edit?: (who: object) => void}} [options] edit: what the card's Edit button does
 * @returns {boolean} whether the card opened
 */
export function openCard(who, options = {}) {
    const profile = who?.kind === 'persona' ? personaProfile(who) : who?.kind === 'character' ? characterProfile(who) : null;
    if (!profile) return false;
    closeCard();

    const dialog = el('dialog', { id: CARD_ID, 'aria-label': `${profile.name}: profile` });
    const picture = el('button', { type: 'button', class: 'forge-card-picture', title: 'Show the whole picture', 'aria-label': 'Show the whole picture', 'aria-pressed': 'false' });
    const letter = el('span', { class: 'forge-card-letter', 'aria-hidden': 'true' });
    letter.textContent = (profile.name.trim()[0] || '?').toUpperCase();
    picture.append(letter);
    if (profile.image || profile.thumb) {
        const image = el('img', { alt: '', draggable: 'false' });
        // The full picture; if it does not load, the small one; if that does not either, the letter
        image.addEventListener('error', () => {
            if (profile.thumb && image.dataset.small !== 'true') {
                image.dataset.small = 'true';
                image.src = profile.thumb;
            } else image.remove();
        });
        image.src = profile.image || profile.thumb;
        picture.append(image);
    }
    const grow = el('span', { class: 'forge-card-grow', 'aria-hidden': 'true' });
    grow.append(lineIcon(GROW_ICON));
    picture.append(grow);
    picture.addEventListener('click', () => {
        const whole = dialog.classList.toggle('forge-card-whole');
        picture.setAttribute('aria-pressed', String(whole));
        picture.title = whole ? 'Back to the profile' : 'Show the whole picture';
        picture.setAttribute('aria-label', picture.title);
    });

    const side = el('div', { class: 'forge-card-side' });
    const head = el('div', { class: 'forge-card-head' });
    const kind = el('p', { class: 'forge-card-kind' });
    kind.textContent = profile.kind;
    const name = el('h2', { class: 'forge-card-name' });
    name.textContent = profile.name;
    head.append(kind, name);
    if (profile.tagline) {
        const tagline = el('p', { class: 'forge-card-tagline' });
        tagline.textContent = profile.tagline;
        head.append(tagline);
    }
    const body = el('div', { class: 'forge-card-body', tabindex: '0' });
    const about = profile.about ? aboutBox(profile.about, body) : null;
    if (about) body.append(about.section);
    for (const [title, text] of profile.sections) {
        if (!text) continue;
        const section = el('div', { class: 'forge-card-section' });
        const label = el('p', { class: 'forge-card-label' });
        label.textContent = title;
        const content = el('p', { class: 'forge-card-text' });
        content.textContent = text;
        section.append(label, content);
        body.append(section);
    }
    if (profile.books.length) {
        const section = el('div', { class: 'forge-card-section' });
        const label = el('p', { class: 'forge-card-label' });
        label.textContent = profile.books.length > 1 ? 'Lorebooks' : 'Lorebook';
        const chips = el('div', { class: 'forge-card-chips' });
        for (const book of profile.books) {
            const chip = el('span', { class: 'forge-card-chip' });
            chip.textContent = book;
            chips.append(chip);
        }
        section.append(label, chips);
        body.append(section);
    }
    if (!body.firstChild) {
        const empty = el('p', { class: 'forge-card-empty' });
        empty.textContent = who.kind === 'persona' ? 'This persona has no description yet.' : 'This character has no description yet.';
        body.append(empty);
    }
    side.append(head, body);
    if (options.edit) {
        const edit = el('button', { type: 'button', class: 'forge-card-edit' });
        edit.textContent = who.kind === 'persona' ? 'Edit persona' : 'Edit character';
        edit.addEventListener('click', () => {
            closeCard();
            options.edit(who);
        });
        side.append(edit);
    }

    const close = el('button', { type: 'button', class: 'forge-card-close', title: 'Close', 'aria-label': 'Close' });
    close.append(lineIcon(CLOSE_ICON));
    close.addEventListener('click', closeCard);
    dialog.append(picture, side, close);
    // A click on the dimmed page round the card closes it (the dialog itself is the only thing there)
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeCard();
    });
    dialog.addEventListener('close', () => {
        leaveCard();
        dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
    saveOpenCard = about?.save ?? null;
    about?.fit();
    close.focus();
    return true;
}

export function closeCard() {
    leaveCard();
    const dialog = document.getElementById(CARD_ID);
    if (!dialog) return;
    if (dialog.open) dialog.close();
    dialog.remove();
}

function leaveCard() {
    const save = saveOpenCard;
    saveOpenCard = null;
    if (save) void save();
}

// The About section as a box to type in. It shows the text with the macros filled in ({{char}} as the name)
// until it is clicked, and the text as it is stored while it is being edited.
function aboutBox(about, scroller) {
    const section = el('div', { class: 'forge-card-section forge-card-about' });
    const row = el('div', { class: 'forge-card-label-row' });
    const label = el('label', { class: 'forge-card-label', for: ABOUT_ID });
    label.textContent = 'About';
    const status = el('span', { class: 'forge-card-status', role: 'status' });
    row.append(label, status);
    const area = el('textarea', { id: ABOUT_ID, class: 'forge-card-text forge-card-area', rows: '2', placeholder: 'Nothing here yet. Click to write a description.', title: 'Click to edit. Changes are saved to the profile.' });
    let raw = about.raw;
    let unsaved = false;
    let timer = 0;
    area.value = about.fill(raw);
    const fit = () => {
        if (!area.getClientRects().length) return;
        const at = scroller.scrollTop;
        area.style.height = 'auto';
        area.style.height = `${area.scrollHeight}px`;
        scroller.scrollTop = at;
    };
    const save = async () => {
        clearTimeout(timer);
        if (!unsaved) return;
        unsaved = false;
        const text = raw;
        status.textContent = 'Saving…';
        status.classList.remove('forge-card-status-bad');
        try {
            await about.save(text);
            if (!unsaved) status.textContent = 'Saved';
        } catch (error) {
            console.error('[Arcane Forge UI] The profile could not be saved', error);
            if (raw === text) unsaved = true;
            status.textContent = 'Not saved';
            status.classList.add('forge-card-status-bad');
        }
    };
    area.addEventListener('focus', () => {
        if (area.value === raw) return;
        area.value = raw;
        fit();
    });
    area.addEventListener('input', () => {
        raw = area.value;
        unsaved = true;
        status.textContent = '';
        fit();
        clearTimeout(timer);
        timer = setTimeout(save, SAVE_AFTER_MS);
    });
    area.addEventListener('blur', async () => {
        await save();
        if (document.activeElement === area || !area.isConnected) return;
        area.value = about.fill(raw);
        fit();
    });
    // The box is as tall as its text, also after the card changes size or comes back from the whole picture
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(scroller);
    section.append(row, area);
    return { section, fit, save };
}

// Saves a character's description. For the character open in SillyTavern's own editor it goes through that
// editor's field, so the two never disagree; for any other character it goes straight to the server.
async function saveCharacterAbout(avatar, text) {
    const ctx = context();
    const characters = ctx.characters ?? [];
    const index = characters.findIndex((c) => c.avatar === avatar);
    const character = characters[index];
    if (!character) throw new Error('The character is no longer there');
    const edited = ctx.eventTypes?.CHARACTER_EDITED;
    const field = document.getElementById('description_textarea');
    const inEditor = field && ctx.menuType !== 'create' && String(ctx.characterId) === String(index) && document.getElementById('avatar_url_pole')?.value === avatar;
    if (inEditor && edited) {
        await new Promise((resolve, reject) => {
            const done = () => {
                clearTimeout(waiting);
                ctx.eventSource.removeListener(edited, done);
                resolve();
            };
            const waiting = setTimeout(() => {
                ctx.eventSource.removeListener(edited, done);
                reject(new Error('SillyTavern did not confirm the save'));
            }, SAVE_WAIT_MS);
            ctx.eventSource.on(edited, done);
            field.value = text;
            field.dispatchEvent(new Event('input', { bubbles: true }));
        });
        return;
    }
    const response = await fetch('/api/characters/merge-attributes', {
        method: 'POST',
        headers: ctx.getRequestHeaders(),
        body: JSON.stringify({ avatar, description: text, data: { description: text } }),
    });
    if (!response.ok) throw new Error(`The server answered ${response.status}`);
    character.description = text;
    if (character.data) character.data.description = text;
    try {
        await ctx.getOneCharacter?.(avatar);
    } catch { /* the copy in memory is already changed */ }
    if (edited) await ctx.eventSource.emit(edited, { detail: { id: String(index), character: (ctx.characters ?? [])[index] } });
}

// Saves a persona's description: the one in use through SillyTavern's own field, any other in the settings
async function savePersonaAbout(file, text) {
    const ctx = context();
    const power = ctx.powerUserSettings;
    const field = document.getElementById('persona_description');
    if (file === user_avatar && field) {
        field.value = text;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        return;
    }
    power.persona_descriptions ??= {};
    const saved = power.persona_descriptions[file] ??= { description: '', position: 0, depth: 2, role: 0, lorebook: '', title: '' };
    saved.description = text;
    if (file === user_avatar) power.persona_description = text;
    ctx.saveSettingsDebounced();
}

function characterProfile(who) {
    const ctx = context();
    const character = (ctx.characters ?? []).find((c) => c.avatar === who.avatar);
    if (!character) return null;
    const tags = (ctx.tagMap?.[character.avatar] ?? []).map((tagId) => (ctx.tags ?? []).find((tag) => tag.id === tagId)?.name).filter(Boolean);
    const creator = String(character.data?.creator ?? '').trim();
    return {
        kind: creator ? `Character · by ${creator}` : 'Character',
        name: String(character.name ?? ''),
        tagline: tags.join(' · '),
        image: `/characters/${encodeURIComponent(character.avatar)}`,
        thumb: thumbnail(ctx, 'avatar', character.avatar),
        // A character whose full text is not loaded yet is shown as it is, and not edited
        about: character.shallow ? null : { raw: String(character.description ?? ''), fill: (text) => filled(context(), text), save: (text) => saveCharacterAbout(character.avatar, text) },
        sections: [
            ['About', character.shallow ? filled(ctx, character.description) : ''],
            ['Personality', filled(ctx, character.personality)],
            ["Creator's notes", filled(ctx, character.data?.creator_notes || character.creatorcomment)],
        ],
        books: [character.data?.extensions?.world].filter((book) => typeof book === 'string' && book),
    };
}

function personaProfile(who) {
    const ctx = context();
    const power = ctx.powerUserSettings ?? {};
    const saved = power.persona_descriptions?.[who.file] ?? {};
    const current = who.file === user_avatar;
    const description = saved.description ?? (current ? power.persona_description : '');
    return {
        kind: current ? 'Persona · you, in this chat' : 'Persona',
        name: String(power.personas?.[who.file] || who.name || (current ? ctx.name1 : '') || 'You'),
        tagline: String(saved.title ?? '').trim(),
        image: `/User Avatars/${encodeURIComponent(who.file)}`,
        thumb: thumbnail(ctx, 'persona', who.file),
        about: { raw: String(description ?? ''), fill: (text) => filled(context(), text), save: (text) => savePersonaAbout(who.file, text) },
        sections: [],
        books: [saved.lorebook].filter((book) => typeof book === 'string' && book),
    };
}

// The text with SillyTavern's macros ({{char}}, {{user}}) filled in, trimmed
function filled(ctx, text) {
    const raw = String(text ?? '').trim();
    if (!raw) return '';
    try {
        return String(ctx.substituteParams ? ctx.substituteParams(raw) : raw).trim();
    } catch {
        return raw;
    }
}

function thumbnail(ctx, type, file) {
    try {
        return file ? ctx.getThumbnailUrl(type, file) : '';
    } catch {
        return '';
    }
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
