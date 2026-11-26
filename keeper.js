// Lorebook keeper: keeps the character entries of chosen lorebooks up to date as the story moves.
// Styles are in css/keeper.css.
//
// index.js holds this module in its list of features (the contract is described at the top of stage.js).
// It only acts while "Lorebook keeper" is switched on; otherwise it sends nothing, changes nothing and
// listens to nothing.
//
// How it works: every few AI replies (or on "Update now") one extra request goes to the AI. It carries the
// newest part of the story and the entries, from the lorebooks the user ticked, whose keys or titles come up
// in it. The guide in that request (guide() below) says what belongs in a character's entry and what does
// not. The answer names the entries that changed, and those are saved:
//   - "note" (the default): the entry's own text is left alone and one "Latest: ..." paragraph is kept under it;
//   - "rewrite": the entry's text is replaced.
// Only an entry's text is ever changed, never its keys, title or settings. Disabled entries, Memory Books'
// memories and lorebooks that are not ticked are never read or changed.
//
// Where things live: how far the story has been read is on the chat (chatMetadata.forge_keeper); the list of
// changes for History and Undo, and the first text of every rewritten entry, are in the extension's settings.
import { extension_settings } from '../../../extensions.js';

export const id = 'keeper';

/** What a character's entry is for: [key, label for the settings, what the AI is told]. */
export const TOPICS = [
    ['looks', 'Looks', 'lasting changes to how they look: hair, scars, build, marks, what they now usually wear'],
    ['health', 'Health and condition', 'injuries, illness, pregnancy, curses, healing: anything about their body or mind that lasts beyond the scene'],
    ['bonds', 'Relationships', 'how they now stand with other characters: new bonds, breaks, trust won or lost, feelings that have settled'],
    ['standing', 'Role and place', 'their job, rank, title, allegiance, and where they now live or are kept'],
    ['things', 'Belongings', 'important things gained or lost: weapons, keepsakes, property, debts'],
    ['goals', 'Goals and promises', 'what they now want, have sworn, owe or plan'],
    ['skills', 'Skills', 'abilities learned, lost or revealed'],
    ['secrets', 'What they know', 'secrets they learned, and secrets about them that came out'],
];

export const defaults = {
    keeper: false,
    keeperBooks: [],
    keeperEvery: 10,
    keeperMode: 'note',
    keeperWords: 60,
    keeperAsk: false,
    keeperShow: true,
    keeperTopics: Object.fromEntries(TOPICS.map(([key]) => [key, true])),
    keeperGuide: '',
    keeperLog: [],
    keeperOriginals: {},
};

export const lookKeys = {
    keeperShow: { type: 'boolean' },
};

const MODULE = 'arcaneForgeUi';
const HOLDER_ID = 'forge-keeper';
const KEY = 'forge_keeper';
const LABEL = 'Latest: ';
const MODES = { note: 'A "Latest" note under my text', rewrite: 'A rewrite of the entry' };
const EVERY = [2, 100];
const WORDS = [20, 200];
const GUIDE_MAX = 600;
const LOG_MAX = 30;
const RECORDS_MAX = 12;       // entries in one request
const ENTRY_MAX = 8000;       // characters; a longer entry is left alone
const RECORDS_TEXT_MAX = 24000;
const STORY_MAX = 24000;      // characters of story in one request (the newest are kept)
const MANUAL_BACK = 20;       // "Update now" with nothing new reads this many messages again
const WAIT = 2500;            // after a reply, before looking whether a check is due
const HOLD = 4;               // after a failed check, wait this many more messages before trying again
// Macros in an entry would be filled in (and run) by SillyTavern on their way to the AI; they travel as
// these marks instead and are put back in what comes home
const OPEN = '⟦⟦';
const CLOSE = '⟧⟧';

let active = false;
let listening = [];
let running = false;
let note = '';        // what the profile says after a check that changed nothing or failed
let timer = 0;
let holdUntil = 0;

function context() {
    return globalThis.SillyTavern.getContext();
}

function settings() {
    return extension_settings[MODULE] ?? {};
}

function between(value, [low, high], fallback) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(high, Math.max(low, number)) : fallback;
}

function modeOf(s) {
    return s.keeperMode === 'rewrite' ? 'rewrite' : 'note';
}

function every(s) {
    return between(s.keeperEvery, EVERY, defaults.keeperEvery);
}

function words(s) {
    return between(s.keeperWords, WORDS, defaults.keeperWords);
}

/** Every lorebook's name. */
function worldNames() {
    const names = context().getWorldInfoNames?.();
    if (Array.isArray(names)) return names;
    // An older SillyTavern: the names are in its own list of lorebooks
    return [...document.querySelectorAll('#world_info option')].map((option) => option.textContent).filter(Boolean);
}

/** The lorebooks it may change: the ticked ones that still exist. */
export function books(s = settings()) {
    const names = worldNames();
    return (Array.isArray(s.keeperBooks) ? s.keeperBooks : []).filter((name) => typeof name === 'string' && names.includes(name));
}

function chatOpen(ctx) {
    return ctx.chatId !== undefined && ctx.chatId !== null && ctx.chatId !== '' && Array.isArray(ctx.chat);
}

function toast(kind, text) {
    globalThis.toastr?.[kind]?.(text, 'Lorebook keeper');
}

// ---------- The "Latest" note inside an entry's text ----------

/** An entry's text as the user's own part and the keeper's note under it. */
export function split(content) {
    const text = String(content ?? '');
    if (text.startsWith(LABEL) && !text.includes('\n')) return { base: '', note: text.slice(LABEL.length).trim() };
    const at = text.lastIndexOf(`\n${LABEL}`);
    if (at === -1) return { base: text, note: '' };
    const tail = text.slice(at + 1 + LABEL.length);
    // "Latest:" further up in the user's own writing is theirs, not a note of ours
    if (/\n\s*\n/.test(tail.trimEnd())) return { base: text, note: '' };
    return { base: text.slice(0, at).trimEnd(), note: tail.replace(/\s+/g, ' ').trim() };
}

/** The user's own part with a note under it (or without one). */
export function join(base, noteText) {
    const own = String(base ?? '').trimEnd();
    if (!noteText) return own;
    return own ? `${own}\n\n${LABEL}${noteText}` : `${LABEL}${noteText}`;
}

// ---------- What the AI is told ----------

function shield(text) {
    return String(text ?? '').replaceAll('{{', OPEN).replaceAll('}}', CLOSE);
}

function unshield(text) {
    return String(text ?? '').replaceAll(OPEN, '{{').replaceAll(CLOSE, '}}');
}

/** The guide: what belongs in a character's entry, what does not, and how to write it. */
export function guide(s = settings()) {
    const mode = modeOf(s);
    const topics = TOPICS.filter(([key]) => s.keeperTopics?.[key] !== false);
    const own = String(s.keeperGuide ?? '').trim().slice(0, GUIDE_MAX);
    const counts = topics.map(([, label, text]) => `- ${label}: ${text}.`);
    if (own) counts.push(`- Also, in the user's own words: ${own}`);
    if (!counts.length) counts.push('- Any lasting change to who the character is.');
    const how = mode === 'note'
        ? [
            'How to write a change:',
            '- Write the record\'s whole new Latest note. It replaces the old note, so keep what is still true from the old note, drop what no longer is, and add the new changes.',
            `- Short, plain statements in the third person and the present tense. At most ${words(s)} words. No headings, no lists, no line breaks.`,
            '- When a change replaces something the record\'s text says, state what is true now and what no longer is, for example: "Her hair is now cropped short, no longer long and braided."',
            '- Do not repeat the record\'s text.',
        ]
        : [
            'How to write a change:',
            '- Write the record\'s whole new text. Keep every sentence that is still true exactly as it is written, change only the parts the story changed, and add new facts where they fit.',
            '- Keep the record\'s style, layout, headings and point of view. Do not shorten it, sum it up or comment on it.',
        ];
    return [
        'You keep the character records of an ongoing story up to date. You do not write the story and you do not continue it.',
        '',
        `You are given character records and the newest part of the story. Each record has an id, a name and its text${mode === 'note' ? ', and sometimes a Latest note you wrote earlier' : ''}.`,
        '',
        'Your job: for each record, find lasting changes to that character which the newest part of the story shows and the record does not say yet.',
        '',
        'What belongs in a record (add only these):',
        ...counts,
        '',
        'What does not belong (never add these):',
        '- Passing moods, single actions, travel and small talk that will not matter in later scenes.',
        '- Anything the record already says, even in other words.',
        '- Guesses. Use only what the story states or clearly shows.',
        '- A change that was undone again within this part of the story.',
        '- Facts about someone else. Each fact goes on the record of the character it is about.',
        '- Records that are not about a character (places, things, rules, lore): leave those alone.',
        '',
        'Most records need no change most of the time. When in doubt, leave a record out.',
        '',
        ...how,
        `- Marks like ${OPEN}user${CLOSE} are placeholders. Keep them exactly as they are.`,
        '',
        'Answer with one block for each changed record and nothing else:',
        '<update id="ID">',
        'the new text',
        '</update>',
        'If no record needs a change, answer exactly: <none/>',
    ].join('\n');
}

/** The request: the guide, then the records and the story. */
export function buildMessages(s, records, story) {
    const mode = modeOf(s);
    const blocks = records.map((record, index) => {
        const parts = mode === 'note' ? split(record.content) : { base: record.content, note: '' };
        const lines = [`<record id="${index + 1}" name="${shield(record.title).replaceAll('"', '\'')}">`, '<text>', shield(parts.base), '</text>'];
        if (parts.note) lines.push(`<latest>${shield(parts.note)}</latest>`);
        lines.push('</record>');
        return lines.join('\n');
    });
    return [
        { role: 'system', content: guide(s) },
        { role: 'user', content: `<records>\n${blocks.join('\n')}\n</records>\n\n<story>\n${shield(story)}\n</story>` },
    ];
}

function tidyNote(raw, limit) {
    let text = unshield(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    text = text.replace(/^latest\s*:\s*/i, '');
    if (!text) return '';
    const list = text.split(' ');
    const most = Math.round(limit * 1.5);
    if (list.length > most) {
        // Too long: whole sentences up to the limit, or a plain cut when the first sentence alone is too long
        const cut = list.slice(0, most).join(' ');
        const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
        text = end > 0 ? cut.slice(0, end + 1) : `${list.slice(0, limit).join(' ')}…`;
    }
    return text;
}

function tidyRewrite(raw, old) {
    const text = unshield(raw).replace(/^\s*```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '').trim();
    if (!text) return '';
    // A "rewrite" that lost half the entry is a summary, and one that tripled it is the story retold
    if (old.length > 200 && text.length < old.length * 0.5) return '';
    if (text.length > old.length * 3 + 1000) return '';
    return text;
}

/**
 * Reads the AI's answer: which records changed, and each one's new text.
 * @returns {{world: string, uid: number, title: string, content: string, after: string, mode: string}[]}
 */
export function readReply(text, records, s = settings()) {
    const mode = modeOf(s);
    const out = [];
    const seen = new Set();
    for (const match of String(text ?? '').matchAll(/<update\s+id\s*=\s*["']?\s*([^"'>\s]+)\s*["']?\s*>([\s\S]*?)<\/update\s*>/gi)) {
        const record = records[Number(match[1]) - 1];
        if (!record || seen.has(match[1])) continue;
        seen.add(match[1]);
        const after = mode === 'note' ? join(split(record.content).base, tidyNote(match[2], words(s))) : tidyRewrite(match[2], record.content);
        if (!after || after === record.content || (mode === 'note' && !split(after).note)) continue;
        out.push({ ...record, after, mode });
    }
    return out;
}

// ---------- The story and the entries that come up in it ----------

function state(ctx) {
    if (!ctx.chatMetadata) return null;
    return ctx.chatMetadata[KEY] ??= {};
}

/** How far the story has been read (a message's number), and how many AI replies have come since. */
function progress(ctx) {
    const chat = ctx.chat ?? [];
    const last = chat.length - 1;
    const here = state(ctx);
    if (!here) return { upTo: last, count: 0, last };
    if (!Number.isInteger(here.upTo)) {
        // First time in this chat: start counting from now instead of reading the whole story at once
        here.upTo = last;
        ctx.saveMetadataDebounced?.();
    }
    if (here.upTo > last) here.upTo = last;
    let count = 0;
    for (let i = here.upTo + 1; i <= last; i++) if (chat[i] && !chat[i].is_user && !chat[i].is_system) count++;
    return { upTo: here.upTo, count, last };
}

function plain(mes) {
    return String(mes ?? '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<div class="forge-trackers">[\s\S]*?<\/div>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function storyText(ctx, from, to) {
    const lines = [];
    for (let i = Math.max(0, from); i <= to; i++) {
        const message = ctx.chat[i];
        if (!message || message.is_system || typeof message.mes !== 'string') continue;
        const text = plain(message.mes);
        if (text) lines.push(`${message.name || (message.is_user ? ctx.name1 : ctx.name2) || 'Narrator'}: ${text}`);
    }
    let story = lines.join('\n\n');
    if (story.length > STORY_MAX) {
        story = story.slice(-STORY_MAX);
        const start = story.indexOf('\n\n');
        if (start !== -1 && start < 2000) story = story.slice(start + 2);
    }
    return story;
}

function titleOf(entry) {
    const title = String(entry.comment ?? '').trim();
    if (title) return title;
    const key = (Array.isArray(entry.key) ? entry.key : []).find((k) => typeof k === 'string' && k.trim() && !k.trim().startsWith('/'));
    return key ? key.trim() : `Entry ${entry.uid}`;
}

function mentions(entry, story) {
    const names = [String(entry.comment ?? ''), ...(Array.isArray(entry.key) ? entry.key : [])]
        .map((name) => String(name ?? '').trim().toLowerCase())
        .filter((name) => name.length >= 3 && !name.startsWith('/'));
    let count = 0;
    for (const name of new Set(names)) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        count += (story.match(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'gu')) ?? []).length;
    }
    return count;
}

/** The entries to show the AI: from the ticked lorebooks, the ones the story names, most named first. */
async function findRecords(ctx, s, story) {
    const lower = story.toLowerCase();
    const found = [];
    for (const world of books(s)) {
        let data = null;
        try {
            data = await ctx.loadWorldInfo(world);
        } catch (error) {
            console.error(`[Arcane Forge UI] The lorebook "${world}" could not be read`, error);
        }
        for (const entry of Object.values(data?.entries ?? {})) {
            const content = typeof entry?.content === 'string' ? entry.content : '';
            if (!entry || entry.disable || entry.stmemorybooks === true || !content.trim() || content.length > ENTRY_MAX) continue;
            const named = mentions(entry, lower);
            // An always-on entry is in front of the AI in every reply, so it is offered even when not named
            if (!named && !entry.constant) continue;
            found.push({ world, uid: entry.uid, title: titleOf(entry), content, named });
        }
    }
    found.sort((a, b) => b.named - a.named);
    const records = [];
    let room = RECORDS_TEXT_MAX;
    for (const record of found) {
        if (records.length >= RECORDS_MAX || record.content.length > room) continue;
        room -= record.content.length;
        records.push({ world: record.world, uid: record.uid, title: record.title, content: record.content });
    }
    return records;
}

// ---------- Asking the AI ----------

function textOf(ctx, data) {
    if (typeof data === 'string') return data;
    let text = '';
    try {
        text = ctx.extractMessageFromData?.(data, ctx.mainApi) ?? '';
    } catch { /* an answer in a shape SillyTavern does not know; looked through below */ }
    if (typeof text === 'string' && text.trim()) return text;
    // A thinking model's answer can start with an empty part, which SillyTavern takes for the whole answer
    const parts = data?.choices?.[0]?.message?.content ?? data?.content ?? data?.message?.content;
    if (typeof parts === 'string') return parts;
    if (Array.isArray(parts)) return parts.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('');
    return '';
}

async function ask(ctx, messages) {
    // The raw answer is read here, so that the user's regex scripts and reply clean-up (made for story text)
    // never touch it
    if (typeof ctx.generateRawData === 'function') return textOf(ctx, await ctx.generateRawData({ prompt: messages }));
    return await ctx.generateRaw({ prompt: messages, trimNames: false });
}

// ---------- Saving, the list of changes, and undoing them ----------

async function entryOf(ctx, world, uid) {
    const data = await ctx.loadWorldInfo(world);
    const entry = data?.entries?.[uid] ?? Object.values(data?.entries ?? {}).find((one) => one?.uid === uid);
    return entry ? { data, entry } : null;
}

async function writeEntry(ctx, world, data, entry, text) {
    entry.content = text;
    await ctx.saveWorldInfo(world, data, true);
    try {
        ctx.reloadWorldInfoEditor?.(world, false);
    } catch { /* the editor is not open */ }
}

function record(change) {
    const s = settings();
    s.keeperLog = [change, ...(Array.isArray(s.keeperLog) ? s.keeperLog : [])].slice(0, LOG_MAX);
    if (change.mode === 'rewrite') {
        s.keeperOriginals = s.keeperOriginals && typeof s.keeperOriginals === 'object' ? s.keeperOriginals : {};
        s.keeperOriginals[`${change.world}\n${change.uid}`] ??= { world: change.world, uid: change.uid, title: change.title, text: change.before, time: change.time };
    }
    context().saveSettingsDebounced?.();
}

async function saveUpdates(ctx, updates) {
    const done = [];
    for (const update of updates) {
        try {
            const found = await entryOf(ctx, update.world, update.uid);
            if (!found) continue;
            const before = String(found.entry.content ?? '');
            // The entry may have been edited while the AI was answering: a note still goes under the newer
            // text; a rewrite of the older text is dropped
            let after = update.after;
            if (before !== update.content) {
                if (update.mode !== 'note') continue;
                after = join(split(before).base, split(update.after).note);
            }
            if (after === before) continue;
            await writeEntry(ctx, update.world, found.data, found.entry, after);
            const change = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, time: Date.now(), world: update.world, uid: update.uid, title: update.title, mode: update.mode, before, after, undone: false };
            record(change);
            done.push(change);
        } catch (error) {
            console.error(`[Arcane Forge UI] "${update.title}" could not be saved to the lorebook "${update.world}"`, error);
        }
    }
    return done;
}

/** Puts an entry back to what it was before one change. */
export async function undo(changeId) {
    const s = settings();
    const change = (Array.isArray(s.keeperLog) ? s.keeperLog : []).find((one) => one.id === changeId);
    if (!change || change.undone) return false;
    const ctx = context();
    const found = await entryOf(ctx, change.world, change.uid);
    if (!found) {
        toast('warning', `"${change.title}" is no longer in the lorebook "${change.world}".`);
        return false;
    }
    const now = String(found.entry.content ?? '');
    let next = change.before;
    if (now !== change.after) {
        if (change.mode === 'note' && split(now).note === split(change.after).note) {
            // Your own text was edited since; only the note goes back
            next = join(split(now).base, split(change.before).note);
        } else {
            const ok = await ctx.callGenericPopup?.(`"${change.title}" has been changed again since this update. Put the older text back anyway?`, ctx.POPUP_TYPE?.CONFIRM);
            if (!ok) return false;
        }
    }
    await writeEntry(ctx, change.world, found.data, found.entry, next);
    change.undone = true;
    ctx.saveSettingsDebounced?.();
    render();
    return true;
}

/** Puts a rewritten entry back to the text it had before the keeper first touched it. */
export async function restore(key) {
    const s = settings();
    const first = s.keeperOriginals?.[key];
    if (!first) return false;
    const ctx = context();
    const found = await entryOf(ctx, first.world, first.uid);
    if (!found) {
        toast('warning', `"${first.title}" is no longer in the lorebook "${first.world}".`);
        return false;
    }
    const before = String(found.entry.content ?? '');
    if (before === first.text) return true;
    await writeEntry(ctx, first.world, found.data, found.entry, first.text);
    record({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, time: Date.now(), world: first.world, uid: first.uid, title: first.title, mode: 'restore', before, after: first.text, undone: false });
    render();
    return true;
}

// ---------- A check ----------

/**
 * Reads the newest part of the story and updates the entries it changed.
 * @param {{manual?: boolean}} [options] manual = "Update now": reads everything new (or the last messages
 *   again), and says what happened
 */
export async function run({ manual = false } = {}) {
    const ctx = context();
    const s = settings();
    if (!active || !chatOpen(ctx)) return [];
    if (running) {
        if (manual) toast('info', 'It is already reading the story.');
        return [];
    }
    if (!books(s).length) {
        if (manual) toast('warning', 'Tick at least one lorebook it may change first (Lorebook keeper, in the settings).');
        return [];
    }
    const { upTo, last } = progress(ctx);
    // On its own it stops before the newest reply, which may still be swiped away
    const newest = ctx.chat[last];
    const to = manual || !newest || newest.is_user || newest.is_system ? last : last - 1;
    let from = upTo + 1;
    if (from > to) {
        if (!manual) return [];
        from = Math.max(0, to - MANUAL_BACK + 1);
    }
    const chatId = ctx.chatId;
    running = true;
    note = '';
    render();
    let changes = [];
    try {
        const story = storyText(ctx, from, to);
        const records = story ? await findRecords(ctx, s, story) : [];
        if (records.length) {
            const answer = await ask(ctx, buildMessages(s, records, story));
            if (context().chatId !== chatId) return [];
            let updates = readReply(answer, records, s);
            if (updates.length && s.keeperAsk) updates = await review(updates);
            changes = await saveUpdates(ctx, updates);
        }
        if (context().chatId === chatId) {
            const here = state(ctx);
            if (here) {
                here.upTo = to;
                ctx.saveMetadataDebounced?.();
            }
        }
        if (changes.length) toast('success', `Updated ${changes.map((change) => change.title).join(', ')}.`);
        else {
            note = records.length ? 'No changes last time' : 'Nobody from your lorebooks came up';
            if (manual) toast('info', records.length ? 'Nothing needed changing.' : 'No entry from the ticked lorebooks is named in the newest part of the story.');
        }
    } catch (error) {
        console.error('[Arcane Forge UI] The lorebook keeper could not finish its check', error);
        note = 'The last check failed';
        holdUntil = (ctx.chat?.length ?? 0) + HOLD;
        toast('error', 'The check did not finish. Is the AI connected?');
    } finally {
        running = false;
        render();
    }
    return changes;
}

function check() {
    if (!active || running) return;
    const ctx = context();
    if (!chatOpen(ctx)) return;
    // A reply is still being written; the end of it calls here again
    if (document.body.dataset.generating === 'true') return;
    const { count } = progress(ctx);
    render();
    // Not while there is no AI to ask: the check waits, and nothing is lost
    if (ctx.onlineStatus === 'no_connection') return;
    if (count >= every(settings()) && (ctx.chat?.length ?? 0) >= holdUntil && books().length) start();
}

// A check started from a click or a timer, where nobody waits for the answer
function start(options) {
    run(options).catch((error) => console.error('[Arcane Forge UI] The lorebook keeper stopped', error));
}

function schedule() {
    clearTimeout(timer);
    timer = setTimeout(check, WAIT);
}

// ---------- Following SillyTavern ----------

function startListening() {
    if (listening.length) return;
    const { eventSource, eventTypes } = context();
    const follow = { MESSAGE_RECEIVED: schedule, GENERATION_ENDED: schedule, MESSAGE_DELETED: render, CHAT_CHANGED: onChatChanged };
    for (const [name, handler] of Object.entries(follow)) {
        const type = eventTypes?.[name];
        if (!type) continue;
        eventSource.on(type, handler);
        listening.push([type, handler]);
    }
}

function stopListening() {
    clearTimeout(timer);
    if (!listening.length) return;
    const { eventSource } = context();
    for (const [type, handler] of listening) eventSource.removeListener(type, handler);
    listening = [];
}

function onChatChanged() {
    clearTimeout(timer);
    note = '';
    holdUntil = 0;
    render();
}

// ---------- Windows: asking first, the history, and the guide ----------

function el(tag, attributes, text) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes ?? {})) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
}

function ago(time) {
    const minutes = Math.round((Date.now() - time) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
    return new Date(time).toLocaleDateString();
}

// What a change looks like: for a note only the note, for a rewrite the whole text
function beforeAfter(change) {
    const shown = change.mode === 'note'
        ? [['Latest note before', split(change.before).note || 'None'], ['Latest note now', split(change.after).note || 'None']]
        : [['Before', change.before], ['After', change.after]];
    const box = el('div', { class: 'forge-keeper-diff' });
    for (const [label, text] of shown) {
        const part = el('div', { class: 'forge-keeper-part' });
        part.append(el('p', { class: 'forge-keeper-part-label' }, label), el('p', { class: 'forge-keeper-text' }, text));
        box.append(part);
    }
    return box;
}

/** "Ask me before saving": shows the changes; the ticked ones are kept. */
async function review(updates) {
    const ctx = context();
    const body = el('div', { class: 'forge-keeper-window' });
    body.append(el('h3', {}, 'Lorebook keeper: save these changes?'));
    const boxes = updates.map((update) => {
        const row = el('div', { class: 'forge-keeper-item' });
        const pick = el('label', { class: 'checkbox_label' });
        const box = el('input', { type: 'checkbox' });
        box.checked = true;
        pick.append(box, el('span', { class: 'forge-keeper-title' }, update.title), el('small', {}, update.world));
        row.append(pick, beforeAfter({ mode: update.mode, before: update.content, after: update.after }));
        body.append(row);
        return box;
    });
    const ok = await ctx.callGenericPopup?.(body, ctx.POPUP_TYPE?.CONFIRM, '', { okButton: 'Save', cancelButton: 'Skip', wide: true, allowVerticalScrolling: true });
    return ok ? updates.filter((_, index) => boxes[index].checked) : [];
}

/** History: every change it made, each with Undo. */
export function showHistory() {
    const ctx = context();
    const s = settings();
    const body = el('div', { class: 'forge-keeper-window' });
    body.append(el('h3', {}, 'Lorebook keeper: history'));
    const log = Array.isArray(s.keeperLog) ? s.keeperLog : [];
    if (!log.length) body.append(el('p', { class: 'forge-keeper-empty' }, 'It has not changed anything yet.'));
    for (const change of log) {
        const row = el('details', { class: 'forge-keeper-item' });
        const top = el('summary', {});
        const button = el('button', { type: 'button', class: 'menu_button forge-keeper-undo' }, change.undone ? 'Undone' : 'Undo');
        button.disabled = Boolean(change.undone);
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            if (await undo(change.id)) {
                button.textContent = 'Undone';
                button.disabled = true;
            }
        });
        const kind = change.mode === 'restore' ? 'put back to its first text' : change.mode === 'rewrite' ? 'rewritten' : 'Latest note';
        top.append(el('span', { class: 'forge-keeper-title' }, change.title), el('small', {}, `${change.world} · ${kind} · ${ago(change.time)}`), button);
        row.append(top, beforeAfter(change));
        body.append(row);
    }
    const firsts = Object.entries(s.keeperOriginals ?? {});
    if (firsts.length) {
        body.append(el('h4', {}, 'Rewritten entries: first text'));
        for (const [key, first] of firsts) {
            const row = el('div', { class: 'forge-keeper-item forge-keeper-first' });
            const button = el('button', { type: 'button', class: 'menu_button' }, 'Put back');
            button.addEventListener('click', async () => {
                if (await restore(key)) button.textContent = 'Put back, done';
            });
            row.append(el('span', { class: 'forge-keeper-title' }, first.title), el('small', {}, first.world), button);
            body.append(row);
        }
    }
    return ctx.callGenericPopup?.(body, ctx.POPUP_TYPE?.TEXT, '', { okButton: 'Close', wide: true, allowVerticalScrolling: true });
}

/** Shows the guide as the AI gets it, with the user's own choices in it. */
export function showGuide() {
    const ctx = context();
    const body = el('div', { class: 'forge-keeper-window' });
    body.append(el('h3', {}, 'What the AI is told'), el('pre', { class: 'forge-keeper-guide' }, guide(settings())));
    return ctx.callGenericPopup?.(body, ctx.POPUP_TYPE?.TEXT, '', { okButton: 'Close', wide: true, allowVerticalScrolling: true });
}

// ---------- The feature contract ----------

export function settingsHtml(s) {
    const box = (boxId, on, label) => `
                <label class="checkbox_label" for="${boxId}">
                    <input type="checkbox" id="${boxId}"${on ? ' checked' : ''}>
                    <span>${label}</span>
                </label>`;
    const topics = TOPICS.map(([key, label, text]) => `
                <label class="checkbox_label forge-ui-keeper-topic" for="forge-ui-keeper-topic-${key}">
                    <input type="checkbox" id="forge-ui-keeper-topic-${key}" data-topic="${key}"${s.keeperTopics?.[key] !== false ? ' checked' : ''}>
                    <span><b>${label}:</b> ${text}</span>
                </label>`).join('');
    const modes = Object.entries(MODES).map(([key, label]) => `<option value="${key}"${key === modeOf(s) ? ' selected' : ''}>${label.replaceAll('"', '&quot;')}</option>`).join('');
    return `
                <h4>Lorebook keeper</h4>${box('forge-ui-keeper', s.keeper, 'Keep lorebook characters up to date as the story moves')}
                <small>Every few replies one extra request goes to your AI, with the newest part of the story and the entries of the characters in it. Only the text of entries in the lorebooks ticked here is changed; keys, titles and settings never are.</small>
                <p class="forge-ui-keeper-label">Lorebooks it may change</p>
                <div id="forge-ui-keeper-books" class="forge-ui-keeper-books"></div>
                <label class="forge-ui-select">
                    <span>Check every (AI replies)</span>
                    <input type="number" id="forge-ui-keeper-every" class="text_pole" min="${EVERY[0]}" max="${EVERY[1]}" step="1" value="${every(s)}">
                </label>
                <label class="forge-ui-select">
                    <span>Write changes as</span>
                    <select id="forge-ui-keeper-mode" class="text_pole">${modes}</select>
                </label>
                <label class="forge-ui-select">
                    <span>Longest Latest note (words)</span>
                    <input type="number" id="forge-ui-keeper-words" class="text_pole" min="${WORDS[0]}" max="${WORDS[1]}" step="5" value="${words(s)}">
                </label>${box('forge-ui-keeper-ask', s.keeperAsk, 'Ask me before saving a change')}${box('forge-ui-keeper-show', s.keeperShow !== false, 'Show it in the profile on the right (Three columns)')}
                <p class="forge-ui-keeper-label">What to add</p>${topics}
                <label class="forge-ui-keeper-own" for="forge-ui-keeper-guide">
                    <span>Also add (in your own words)</span>
                    <textarea id="forge-ui-keeper-guide" class="text_pole" rows="3" maxlength="${GUIDE_MAX}" placeholder="Each character's rank in the guild, and who they owe money to."></textarea>
                </label>
                <small>Never added: passing moods, single actions, guesses, and anything the entry already says.</small>
                <div class="forge-ui-keeper-actions">
                    <div class="menu_button" id="forge-ui-keeper-now" role="button" tabindex="0">Update now</div>
                    <div class="menu_button" id="forge-ui-keeper-history" role="button" tabindex="0">History</div>
                    <div class="menu_button" id="forge-ui-keeper-told" role="button" tabindex="0">See what the AI is told</div>
                </div>
`;
}

// The lorebooks as tick boxes; the names are the user's own, so they are set as text, never as markup
function fillBooks(list, s, save) {
    const names = [...worldNames()].sort((a, b) => a.localeCompare(b));
    const picked = new Set(Array.isArray(s.keeperBooks) ? s.keeperBooks : []);
    if (!names.length) {
        list.replaceChildren(el('small', {}, 'You have no lorebooks yet.'));
        return;
    }
    list.replaceChildren(...names.map((name) => {
        const row = el('label', { class: 'checkbox_label' });
        const box = el('input', { type: 'checkbox' });
        box.checked = picked.has(name);
        box.addEventListener('change', () => {
            const now = new Set(Array.isArray(s.keeperBooks) ? s.keeperBooks : []);
            if (box.checked) now.add(name);
            else now.delete(name);
            s.keeperBooks = [...now];
            save();
        });
        row.append(box, el('span', {}, name));
        return row;
    }));
}

export function bindSettings($root, s, save) {
    const flags = { 'forge-ui-keeper': 'keeper', 'forge-ui-keeper-ask': 'keeperAsk', 'forge-ui-keeper-show': 'keeperShow' };
    for (const [boxId, key] of Object.entries(flags)) {
        $root.find(`#${boxId}`).on('change', function () {
            s[key] = this.checked;
            save();
        });
    }
    const list = $root.find('#forge-ui-keeper-books')[0];
    if (list) {
        fillBooks(list, s, save);
        // Lorebooks made or removed since: the list is drawn again when the pointer or the keyboard comes to it
        const again = () => fillBooks(list, s, save);
        list.addEventListener('pointerenter', again);
        list.addEventListener('focusin', (event) => { if (!list.contains(event.relatedTarget)) again(); });
    }
    $root.find('#forge-ui-keeper-every').on('change', function () {
        s.keeperEvery = between(this.value, EVERY, defaults.keeperEvery);
        this.value = s.keeperEvery;
        save();
    });
    $root.find('#forge-ui-keeper-words').on('change', function () {
        s.keeperWords = between(this.value, WORDS, defaults.keeperWords);
        this.value = s.keeperWords;
        save();
    });
    $root.find('#forge-ui-keeper-mode').on('change', function () {
        s.keeperMode = this.value === 'rewrite' ? 'rewrite' : 'note';
        save();
    });
    $root.find('.forge-ui-keeper-topic input').on('change', function () {
        s.keeperTopics = { ...(s.keeperTopics ?? {}), [this.dataset.topic]: this.checked };
        save();
    });
    $root.find('#forge-ui-keeper-guide').val(String(s.keeperGuide ?? '').slice(0, GUIDE_MAX)).on('input', function () {
        s.keeperGuide = String(this.value).slice(0, GUIDE_MAX);
        save();
    });
    const press = (selector, action) => $root.find(selector).on('click keydown', function (event) {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    });
    press('#forge-ui-keeper-now', () => {
        if (!settings().keeper) toast('info', 'Switch the Lorebook keeper on first.');
        else start({ manual: true });
    });
    press('#forge-ui-keeper-history', showHistory);
    press('#forge-ui-keeper-told', showGuide);
}

export function apply(s) {
    active = Boolean(s.enabled && s.keeper);
    if (active) startListening();
    else stopListening();
    render();
}

// ---------- In the profile ----------

/**
 * The place in the profile where the keeper goes. columns.js puts it in each time it builds the profile; the
 * same element is handed back each time.
 */
export function holder() {
    const existing = document.getElementById(HOLDER_ID);
    if (existing) return existing;
    const made = el('div', { id: HOLDER_ID });
    setTimeout(render);
    return made;
}

function stateText(ctx, s) {
    if (running) return 'Reading the story…';
    if (!books(s).length) return 'Not set up';
    const left = every(s) - progress(ctx).count;
    if (left <= 0) return 'Due';
    return `Next in ${left} ${left === 1 ? 'reply' : 'replies'}`;
}

function render() {
    const box = document.getElementById(HOLDER_ID);
    if (!box) return;
    const ctx = context();
    const s = settings();
    if (!active || s.keeperShow === false || !chatOpen(ctx)) {
        box.replaceChildren();
        return;
    }
    const section = el('section', { class: 'forge-track forge-keeper', 'aria-label': 'Lorebook keeper' });
    const head = el('div', { class: 'forge-track-head' });
    head.append(el('p', { class: 'forge-profile-label' }, 'Lorebook keeper'), el('span', { class: 'forge-keeper-state' }, stateText(ctx, s)));
    const card = el('div', { class: 'forge-track-card' });
    // The newest change of each entry that still stands, three at most
    const recent = [];
    const shown = new Set();
    for (const change of Array.isArray(s.keeperLog) ? s.keeperLog : []) {
        const key = `${change.world}\n${change.uid}`;
        if (shown.has(key)) continue;
        shown.add(key);
        if (!change.undone && recent.length < 3) recent.push(change);
    }
    for (const change of recent) {
        const row = el('div', { class: 'forge-keeper-row' });
        const who = el('div', { class: 'forge-keeper-who' });
        who.append(el('span', { class: 'forge-keeper-title' }, change.title), el('small', {}, `${change.mode === 'restore' ? 'Put back' : 'Updated'} ${ago(change.time)}`));
        const button = el('button', { type: 'button', class: 'forge-keeper-button' }, 'Undo');
        button.addEventListener('click', () => undo(change.id));
        row.append(who, button);
        card.append(row);
    }
    if (!recent.length || note) {
        card.append(el('p', { class: 'forge-keeper-empty' }, note || (books(s).length ? 'No changes yet.' : 'Tick the lorebooks it may change in the settings.')));
    }
    const actions = el('div', { class: 'forge-keeper-actions' });
    const now = el('button', { type: 'button', class: 'forge-keeper-button' }, 'Update now');
    now.disabled = running;
    now.addEventListener('click', () => start({ manual: true }));
    const history = el('button', { type: 'button', class: 'forge-keeper-button' }, 'History');
    history.addEventListener('click', showHistory);
    actions.append(now, history);
    card.append(actions);
    section.append(head, card);
    box.replaceChildren(section);
}
