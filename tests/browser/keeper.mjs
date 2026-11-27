// Lorebook keeper: every few replies the newest part of the story and the entries of the characters in it go
// to the AI with a guide, and the entries that changed are saved (a "Latest" note, or a rewrite), with Undo
// and a history. Only the Forge Tester chat is used, with made-up messages put in the page; the lorebooks are
// made up and live in the page only; the "AI" is answered in the page; nothing is saved to the sandbox.
// Usage: node tests/browser/keeper.mjs
// Set FORGE_SHOTS to a folder to also save pictures there.
import { join } from 'node:path';
import { fakeConnection, openForge, setForge } from './_harness.mjs';

const { page, check, finish } = await openForge({});
await page.addStyleTag({ content: '#rpg-companion-panel { display: none !important; }' });
// Pictures: the notices of the steps before are cleared away first, and a window gets time to finish opening
const shot = async (name, locator) => {
    if (!process.env.FORGE_SHOTS) return;
    await page.evaluate(() => { globalThis.toastr?.clear(); document.querySelectorAll('#toast-container .toast').forEach((notice) => notice.remove()); });
    await page.waitForTimeout(700);
    await (locator ?? page).screenshot({ path: join(process.env.FORGE_SHOTS, name) });
};
const KEEPER_JS = '/scripts/extensions/third-party/arcane-forge-ui/keeper.js';
const CAST = 'Keeper Test Cast';
const WORLD = 'Keeper Test World';
const MIRA = 'Mira Vance is the blacksmith of Ashfall. Tall, soot-streaked, with long black hair she keeps braided. She distrusts the Guild and works alone. {{user}} is her oldest customer.';
const TOMAS = 'Tomas Reed is a runaway farm boy, quick with his hands and slow to trust.';

// Lorebook saves are answered here, and kept to look at
const saves = [];
await page.route('**/api/worldinfo/edit', async (route) => {
    saves.push(route.request().postDataJSON());
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
});

// Two made-up lorebooks, in the page only
await page.evaluate(async ({ CAST, WORLD, MIRA, TOMAS }) => {
    const wi = await import('/scripts/world-info.js');
    const entry = (uid, key, comment, content, more = {}) => ({ uid, key, keysecondary: [], comment, content, constant: false, disable: false, order: 100, position: 0, ...more });
    wi.worldInfoCache.set(CAST, { entries: {
        0: entry(0, ['Mira', 'Mira Vance'], 'Mira Vance', MIRA),
        1: entry(1, ['Tomas'], 'Tomas Reed', TOMAS),
        2: entry(2, ['Old Hobb'], 'Old Hobb', 'Old Hobb keeps the tavern and waters the ale.'),
        3: entry(3, ['Mira'], '[001] - A memory', 'A memory that names Mira.', { stmemorybooks: true }),
        4: entry(4, ['Tomas'], 'Tomas (old draft)', 'A switched-off entry about Tomas.', { disable: true }),
    } });
    wi.worldInfoCache.set(WORLD, { entries: { 0: entry(0, ['Mira', 'Ashfall'], 'Ashfall', 'Ashfall is a mining town; Mira has her forge there.') } });
    for (const name of [CAST, WORLD]) if (!wi.world_names.includes(name)) wi.world_names.push(name);

    // The "AI": answers from a plan of { entry title: new text }, 'fail', or nothing to change
    globalThis.keeperBodies = [];
    globalThis.keeperPlan = {};
    const answered = window.fetch;
    window.fetch = async (input, init) => {
        if (!/\/api\/backends\/[^/]+\/generate/.test(String(input?.url ?? input))) return answered(input, init);
        const body = String(init?.body ?? '');
        globalThis.keeperBodies.push(body);
        const plan = globalThis.keeperPlan;
        if (plan === 'fail') return new Response(JSON.stringify({ error: { message: 'Test failure' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        const sent = (JSON.parse(body).messages ?? []).map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n');
        if (plan.__edit) {
            const data = wi.worldInfoCache.get(CAST);
            data.entries[0].content = plan.__edit;
            wi.worldInfoCache.set(CAST, data);
        }
        const blocks = Object.entries(plan).filter(([title]) => !title.startsWith('__')).map(([title, text]) => {
            const found = sent.match(new RegExp(`<record id="(\\d+)" name="${title}">`));
            return found ? `<update id="${found[1]}">\n${text}\n</update>` : '';
        }).filter(Boolean);
        const content = blocks.length ? `Here are the changes.\n${blocks.join('\n')}\n<update id="99">Nobody.</update>` : '<none/>';
        return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
}, { CAST, WORLD, MIRA, TOMAS });

const entryText = (uid, world = CAST) => page.evaluate(async ({ world, uid }) => (await SillyTavern.getContext().loadWorldInfo(world)).entries[uid].content, { world, uid });
const forge = () => page.evaluate(() => JSON.parse(JSON.stringify(SillyTavern.getContext().extensionSettings.arcaneForgeUi)));
const bodies = () => page.evaluate(() => globalThis.keeperBodies.map((body) => (JSON.parse(body).messages ?? []).map((m) => ({ role: m.role, content: String(m.content) }))));
const plan = (value) => page.evaluate((value) => { globalThis.keeperPlan = value; }, value);
const section = () => page.evaluate(() => {
    const box = document.querySelector('#forge-keeper section');
    if (!box) return null;
    return { state: box.querySelector('.forge-keeper-state')?.textContent, rows: [...box.querySelectorAll('.forge-keeper-row .forge-keeper-title')].map((t) => t.textContent), empty: box.querySelector('.forge-keeper-empty')?.textContent ?? '', buttons: [...box.querySelectorAll('.forge-keeper-actions button')].map((b) => b.textContent) };
});
const say = (messages) => page.evaluate((messages) => {
    const ctx = SillyTavern.getContext();
    for (const [who, mes] of messages) ctx.chat.push({ name: who === 'user' ? 'Tester' : 'Forge Tester', is_user: who === 'user', is_system: who === 'hidden', mes, send_date: new Date().toISOString(), extra: {} });
}, messages);
const replyEnded = () => page.evaluate(() => { const ctx = SillyTavern.getContext(); return ctx.eventSource.emit(ctx.eventTypes.GENERATION_ENDED, ctx.chat.length); });
const runNow = () => page.evaluate(async (path) => (await (await import(path)).run({ manual: true })).length, KEEPER_JS);

// ---------- Off by default ----------
await setForge(page, { layout: 'columns', columnsProfile: true });
await page.waitForTimeout(800);
check('switched off, the profile has no keeper', (await section()) === null);
check('and it is off until it is switched on', (await forge()).keeper === false && (await forge()).keeperMode === 'note' && (await forge()).keeperAsk === false);

// ---------- The pieces, on their own ----------
const unit = await page.evaluate(async ({ path, MIRA }) => {
    const k = await import(path);
    const all = { keeperMode: 'note', keeperWords: 60, keeperTopics: {}, keeperGuide: '' };
    const noteGuide = k.guide(all);
    const picky = k.guide({ ...all, keeperTopics: { looks: false, skills: false }, keeperGuide: '  Each character\'s rank in the guild.  ' });
    const rewriteGuide = k.guide({ ...all, keeperMode: 'rewrite' });
    const records = [{ world: 'W', uid: 0, title: 'Mira "the Smith" Vance', content: `${MIRA}\n\nLatest: She limps.` }, { world: 'W', uid: 1, title: 'Tomas', content: 'Tomas is a farm boy. '.repeat(15).trim() }];
    const asked = k.buildMessages(all, records, 'Tester: Hello {{user}}.');
    const long = Array.from({ length: 200 }, (_, i) => (i % 20 === 19 ? 'end.' : 'word')).join(' ');
    const read = (text, s = all, list = records) => k.readReply(text, list, s).map((u) => ({ uid: u.uid, after: u.after }));
    return {
        topics: k.TOPICS.map(([, label]) => label),
        noteGuide,
        picky,
        rewriteGuide,
        asked,
        split: [k.split(`${MIRA}\n\nLatest: She limps.`), k.split('Latest: only a note'), k.split('Notes.\nLatest: mine, further up.\n\nMore of my own text.'), k.split('Plain text.'), k.split('Own text.\n\nLatest: She limps.\nTyped under the note.'), k.split('Name: Mira\nLatest: seen at the hall\nHair: black')],
        readable: [k.readable('<none/>'), k.readable('<update id="1">A note.</update>'), k.readable(''), k.readable('I cannot help with that.'), k.readable('<update id="1">A note.</update><update id="2">cut off he')],
        junk: read('<think><update id="2">A draft.</update></think><update id="1" name="Mira">Her debt is <50 gold. She <b>limps</b> badly.</update><update id="2">No change.</update>'),
        join: [k.join('Own text.  \n', 'A note.'), k.join('Own text.', ''), k.join('', 'A note.')],
        messy: read('Sure!\n<update id="1">\nLatest: Her hair is now   cropped short.\nShe owes the Guild.\n</update>\n<UPDATE id=2>Tomas is a farm boy.</UPDATE>\n<update id="1">A second go.</update><update id="7">Nobody.</update>'),
        none: read('<none/>'),
        nothing: read(''),
        same: read('<update id="1">She limps.</update>'),
        longNote: read(`<update id="1">${long}</update>`)[0]?.after.split('Latest: ')[1],
        marks: read('<update id="1">⟦⟦user⟧⟧ now owes her money.</update>')[0]?.after,
        rewrite: read(`<update id="2">${'Tomas is a farm boy. '.repeat(15)}He is now apprenticed at the forge.</update>`, { ...all, keeperMode: 'rewrite' }),
        rewriteShort: read('<update id="2">Tomas: farm boy, now an apprentice.</update>', { ...all, keeperMode: 'rewrite' }),
        rewriteFence: read(`<update id="2">\n\`\`\`\n${'Tomas is a farm boy. '.repeat(15)}Apprenticed now.\n\`\`\`\n</update>`, { ...all, keeperMode: 'rewrite' })[0]?.after,
    };
}, { path: KEEPER_JS, MIRA });
check('the guide names all eight things that belong in an entry', unit.topics.length === 8 && unit.topics.every((label) => unit.noteGuide.includes(`- ${label}: `)), unit.topics.join(', '));
check('and what never belongs: moods, repeats, guesses, things about someone else, entries that are not characters', ['Passing moods', 'already says', 'Guesses', 'someone else', 'not about a character'].every((bit) => unit.noteGuide.includes(bit)));
check('it asks for an <update> block per changed entry, or <none/>', unit.noteGuide.includes('<update id="ID">') && unit.noteGuide.includes('<none/>'));
check('a note is asked for as short present-tense statements with a word limit', unit.noteGuide.includes('whole new Latest note') && unit.noteGuide.includes('At most 60 words'));
check('a rewrite is asked to keep what is still true word for word', unit.rewriteGuide.includes('whole new text') && unit.rewriteGuide.includes('exactly as it is written') && !unit.rewriteGuide.includes('Latest note'));
check('a thing that is unticked is left out, and the user\'s own words go in', !unit.picky.includes('- Looks: ') && !unit.picky.includes('- Skills: ') && unit.picky.includes('- Relationships: ') && unit.picky.includes('in the user\'s own words: Each character\'s rank in the guild.'), unit.picky.slice(0, 200));
const askedUser = unit.asked[1].content;
check('the request is the guide, then the records and the story', unit.asked.length === 2 && unit.asked[0].role === 'system' && unit.asked[0].content === unit.noteGuide && askedUser.includes('<records>') && askedUser.includes('<story>\nTester: Hello'));
check('an entry\'s own text and its Latest note travel apart', askedUser.includes('<latest>She limps.</latest>') && !askedUser.includes('Latest: She limps.'), askedUser.slice(0, 400));
check('macros travel as marks, so that SillyTavern cannot fill them in or run them', !askedUser.includes('{{') && askedUser.includes('⟦⟦user⟧⟧ is her oldest customer') && askedUser.includes('Hello ⟦⟦user⟧⟧'));
check('a quote in a title cannot break the record line', askedUser.includes('name="Mira \'the Smith\' Vance"'));
check('an entry splits into its own text and the note', unit.split[0].base === MIRA && unit.split[0].note === 'She limps.' && unit.split[3].note === '', JSON.stringify(unit.split));
check('"Latest:" further up in the user\'s own writing is left alone', unit.split[2].note === '' && unit.split[2].base.includes('More of my own text.'), JSON.stringify(unit.split[2]));
check('so is an entry that is only a "Latest:" line, and such a line among the user\'s own lines', unit.split[1].base === 'Latest: only a note' && unit.split[1].note === '' && unit.split[5].note === '' && unit.split[5].base.includes('Latest: seen at the hall'), JSON.stringify([unit.split[1], unit.split[5]]));
check('a line typed right under the note stays, with the user\'s own text', unit.split[4].note === 'She limps.' && unit.split[4].base === 'Own text.\n\nTyped under the note.', JSON.stringify(unit.split[4]));
check('and joins back with one blank line between', unit.join[0] === 'Own text.\n\nLatest: A note.' && unit.join[1] === 'Own text.' && unit.join[2] === 'Latest: A note.', JSON.stringify(unit.join));
check('a messy answer is read: chatter, a repeated "Latest:", line breaks, a second block and an unknown id', unit.messy.length === 2 && unit.messy[0].after === `${MIRA}\n\nLatest: Her hair is now cropped short. She owes the Guild.` && unit.messy[1].after.endsWith('\n\nLatest: Tomas is a farm boy.'), JSON.stringify(unit.messy));
check('<none/>, an empty answer and an unchanged note change nothing', unit.none.length === 0 && unit.nothing.length === 0 && unit.same.length === 0);
check('an answer with a whole block or <none/> can be gone by; an empty one, a refusal and a cut-off one cannot', JSON.stringify(unit.readable) === '[true,true,false,false,false]', JSON.stringify(unit.readable));
check('a draft inside the thinking and a block that only says "no change" are left out; "<50" stays and real tags go', unit.junk.length === 1 && unit.junk[0].after === `${MIRA}\n\nLatest: Her debt is <50 gold. She limps badly.`, JSON.stringify(unit.junk));
check('a note far over the limit is cut at the end of a sentence', unit.longNote && unit.longNote.split(' ').length <= 90 && unit.longNote.endsWith('end.'), String(unit.longNote?.split(' ').length));
check('marks come home as macros', unit.marks?.endsWith('Latest: {{user}} now owes her money.'), unit.marks);
check('a rewrite replaces the text', unit.rewrite.length === 1 && unit.rewrite[0].after.endsWith('He is now apprenticed at the forge.') && !unit.rewrite[0].after.includes('Latest:'));
check('a "rewrite" that lost half the entry is refused', unit.rewriteShort.length === 0);
check('a rewrite inside a code fence loses the fence', unit.rewriteFence?.startsWith('Tomas is a farm boy.') && unit.rewriteFence.endsWith('Apprenticed now.'), unit.rewriteFence?.slice(-40));

// ---------- Switched on ----------
await setForge(page, { keeper: true, keeperBooks: [], keeperEvery: 2, keeperShow: true });
await page.waitForTimeout(500);
let now = await section();
check('switched on with no lorebook ticked, the profile says so', now?.state === 'Not set up' && now.empty.includes('Tick the lorebooks') && now.buttons.join() === 'Update now,History', JSON.stringify(now));
await setForge(page, { keeperBooks: [CAST, 'A lorebook that was deleted'] });
await page.evaluate(() => { const ctx = SillyTavern.getContext(); ctx.chatMetadata.forge_keeper = { upTo: ctx.chat.length - 1 }; });
await setForge(page, {});
now = await section();
check('with one ticked, it counts down to the next check', now?.state === 'Next in 2 replies' && now.empty === 'No changes yet.', JSON.stringify(now));
const where = await page.evaluate(() => { const k = document.querySelector('#forge-keeper').getBoundingClientRect(); const p = document.querySelector('#forge-profile').getBoundingClientRect(); const cast = document.querySelector('#forge-profile .forge-profile-cast').getBoundingClientRect(); return k.left >= p.left && k.right <= p.right && k.top >= cast.bottom; });
check('it is inside the profile, under the people in the chat', where);

// ---------- A check on its own, after enough replies ----------
await say([
    ['user', 'I ask Mira what happened to the forge.'],
    ['ai', 'Mira runs a hand over her cropped hair. "Burned off in the fire," Mira says. Tomas keeps sweeping; Mira took him on as her apprentice last week.'],
    ['hidden', 'A hidden note that must not be read: Mira is secretly a dragon.'],
    ['user', 'I offer to help rebuild.'],
]);
await plan({ 'Mira Vance': 'Never sent: there is no connection.' });
await page.evaluate(() => { const ctx = SillyTavern.getContext(); ctx.chatMetadata.forge_keeper.upTo -= 40; });
await replyEnded();
await page.waitForTimeout(3200);
check('with no AI connected, a check that is due waits', (await bodies()).length === 0 && (await section())?.state === 'Due', JSON.stringify(await section()));
await page.evaluate(() => { const ctx = SillyTavern.getContext(); ctx.chatMetadata.forge_keeper.upTo += 40; });
await fakeConnection(page);
await replyEnded();
await page.waitForTimeout(3200);
check('one reply is not enough to check', (await bodies()).length === 0 && (await section())?.state === 'Next in 1 reply', JSON.stringify(await section()));
await say([['ai', 'ZZZ-NEWEST Mira nods and hands over a hammer.']]);
await plan({ 'Mira Vance': 'Her hair is now cropped short, burned off in the forge fire. She has taken Tomas on as her apprentice.' });
await replyEnded();
await page.waitForFunction(() => globalThis.keeperBodies.length >= 1 && !document.querySelector('#forge-keeper .forge-keeper-actions button:disabled'), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
let sent = await bodies();
const first = sent[0] ?? [];
const firstText = first.map((m) => m.content).join('\n');
check('after the second reply one request went out, with the guide first', sent.length === 1 && first[0]?.role === 'system' && first[0].content.includes('What belongs in a record'), String(sent.length));
check('it carries the entries of the people named, most named first', /<record id="1" name="Mira Vance">/.test(firstText) && /<record id="2" name="Tomas Reed">/.test(firstText), firstText.match(/<record[^>]*>/g)?.join(' '));
check('and not the others: nobody named them, a memory, a switched-off entry, a lorebook that is not ticked', !firstText.includes('Old Hobb') && !firstText.includes('A memory that names Mira') && !firstText.includes('switched-off entry') && !firstText.includes('mining town'));
check('it carries the story up to the newest reply, which may still be swiped', firstText.includes('Tester: I ask Mira what happened') && firstText.includes('Forge Tester: Mira runs a hand') && firstText.includes('I offer to help rebuild.') && !firstText.includes('ZZZ-NEWEST'));
check('and nothing from a hidden message', !firstText.includes('dragon'));
check('SillyTavern did not fill in the entry\'s macros on the way out', firstText.includes('\u27E6\u27E6user\u27E7\u27E7 is her oldest customer') && !firstText.includes('{{user}}'));
const afterFirst = `${MIRA}\n\nLatest: Her hair is now cropped short, burned off in the forge fire. She has taken Tomas on as her apprentice.`;
check('the entry keeps its own text and gains a Latest note', (await entryText(0)) === afterFirst, await entryText(0));
check('the lorebook was saved once, with only that entry\'s text changed', saves.length === 1 && saves[0].name === CAST && saves[0].data.entries[0].content === afterFirst && JSON.stringify(saves[0].data.entries[0].key) === '["Mira","Mira Vance"]' && saves[0].data.entries[0].comment === 'Mira Vance' && saves[0].data.entries[1].content === TOMAS && saves[0].data.entries[3].stmemorybooks === true, JSON.stringify(saves.map((s) => s.name)));
let s = await forge();
check('the change is kept for History and Undo', s.keeperLog.length === 1 && s.keeperLog[0].title === 'Mira Vance' && s.keeperLog[0].before === MIRA && s.keeperLog[0].after === afterFirst && s.keeperLog[0].mode === 'note' && !s.keeperLog[0].undone, JSON.stringify(s.keeperLog.map((c) => c.title)));
now = await section();
check('the profile shows who was updated, and counts on from the reply it has not read', JSON.stringify(now?.rows) === '["Mira Vance"]' && now.state === 'Next in 1 reply', JSON.stringify(now));
check('how far it has read is kept on the chat', await page.evaluate(() => { const ctx = SillyTavern.getContext(); return ctx.chatMetadata.forge_keeper.upTo === ctx.chat.length - 2; }));
await shot('keeper-profile.png', page.locator('#forge-profile'));

// ---------- Undo ----------
await page.click('#forge-keeper .forge-keeper-row button');
await page.waitForTimeout(500);
s = await forge();
check('Undo puts the entry back as it was', (await entryText(0)) === MIRA && saves.length === 2 && s.keeperLog[1].undone === true && (await section())?.rows.length === 0, await entryText(0));
check('and the undo is kept for History, with the text it replaced', s.keeperLog.length === 2 && s.keeperLog[0].mode === 'undo' && s.keeperLog[0].before === afterFirst && s.keeperLog[0].after === MIRA, JSON.stringify(s.keeperLog.map((c) => c.mode)));

// ---------- Update now, asking first ----------
await setForge(page, { keeperAsk: true });
await plan({ 'Mira Vance': 'She now owes the Guild a debt.', 'Tomas Reed': 'Never sent: Tomas is not in the newest part.' });
await page.click('#forge-keeper .forge-keeper-actions button >> nth=0');
await page.waitForSelector('dialog.popup[open] .forge-keeper-window', { timeout: 8000 }).catch(() => {});
sent = await bodies();
const second = (sent[1] ?? []).map((m) => m.content).join('\n');
check('Update now reads everything new, the newest reply included', sent.length === 2 && second.includes('ZZZ-NEWEST') && !second.includes('I ask Mira what happened') && !second.includes('Tomas Reed'), String(sent.length));
const asked = await page.evaluate(() => { const w = document.querySelector('dialog.popup[open] .forge-keeper-window'); return w ? { title: w.querySelector('.forge-keeper-title')?.textContent, texts: [...w.querySelectorAll('.forge-keeper-text')].map((t) => t.textContent), ticked: w.querySelector('input[type=checkbox]')?.checked } : null; });
check('with "Ask me before saving" on, a window shows the change first', asked?.title === 'Mira Vance' && asked.ticked && JSON.stringify(asked.texts) === JSON.stringify(['None', 'She now owes the Guild a debt.']), JSON.stringify(asked));
check('and nothing is saved until it is answered', (await entryText(0)) === MIRA && saves.length === 2);
await shot('keeper-ask.png');
await page.click('dialog.popup[open] .popup-button-ok');
await page.waitForFunction(() => !document.querySelector('dialog.popup[open]'), null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(500);
check('Save saves it', (await entryText(0)) === `${MIRA}\n\nLatest: She now owes the Guild a debt.` && saves.length === 3, await entryText(0));

await plan({ 'Mira Vance': 'A change that gets skipped.' });
await page.click('#forge-keeper .forge-keeper-actions button >> nth=0');
await page.waitForSelector('dialog.popup[open] .forge-keeper-window', { timeout: 8000 }).catch(() => {});
await page.click('dialog.popup[open] .popup-button-cancel');
await page.waitForFunction(() => !document.querySelector('dialog.popup[open]'), null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(500);
sent = await bodies();
const third = (sent[2] ?? []).map((m) => m.content).join('\n');
check('with nothing new, Update now reads the last messages again', sent.length === 3 && third.includes('I ask Mira what happened') && third.includes('ZZZ-NEWEST'));
check('the note it wrote before goes along as the old note', third.includes('<latest>She now owes the Guild a debt.</latest>'));
check('Skip saves nothing', (await entryText(0)) === `${MIRA}\n\nLatest: She now owes the Guild a debt.` && saves.length === 3);

// ---------- A newer note takes the old one's place; an entry edited meanwhile keeps the edit ----------
await setForge(page, { keeperAsk: false });
const EDITED = 'Mira Vance is the blacksmith of Ashfall, edited by hand while the AI was answering.';
await plan({ 'Mira Vance': 'Her hair is cropped short. She owes the Guild a debt.', __edit: `${EDITED}\n\nLatest: She now owes the Guild a debt.` });
check('Update now says one entry changed', (await runNow()) === 1);
check('the new note replaces the old one under the text as it is now', (await entryText(0)) === `${EDITED}\n\nLatest: Her hair is cropped short. She owes the Guild a debt.`, await entryText(0));

// ---------- Rewrite ----------
await setForge(page, { keeperMode: 'rewrite' });
const REWRITTEN = `${TOMAS} He is now Mira's apprentice at the forge.`;
await plan({ 'Tomas Reed': REWRITTEN });
check('in rewrite mode an entry\'s text is replaced', (await runNow()) === 1 && (await entryText(1)) === REWRITTEN, await entryText(1));
s = await forge();
check('and its first text is kept', s.keeperOriginals[`${CAST}\n1`]?.text === TOMAS && s.keeperLog[0].mode === 'rewrite');
const rewriteAsk = (await bodies()).at(-1).map((m) => m.content).join('\n');
check('a rewrite is shown the whole entry, its note included', rewriteAsk.includes('Latest: Her hair is cropped short.') && !rewriteAsk.includes('<latest>'));

// ---------- History ----------
await page.click('#forge-keeper .forge-keeper-actions button >> nth=1');
await page.waitForSelector('dialog.popup[open] .forge-keeper-window', { timeout: 8000 }).catch(() => {});
const history = await page.evaluate(() => { const w = document.querySelector('dialog.popup[open] .forge-keeper-window'); return w ? { items: [...w.querySelectorAll('details.forge-keeper-item')].map((d) => [d.querySelector('.forge-keeper-title').textContent, d.querySelector('.forge-keeper-undo').textContent]), firsts: [...w.querySelectorAll('.forge-keeper-first .forge-keeper-title')].map((t) => t.textContent) } : null; });
check('History lists every change, newest first, the undo among them, with what was undone', JSON.stringify(history?.items) === JSON.stringify([['Tomas Reed', 'Undo'], ['Mira Vance', 'Undo'], ['Mira Vance', 'Undo'], ['Mira Vance', 'Undo'], ['Mira Vance', 'Undone']]), JSON.stringify(history));
check('and the rewritten entries, to put back', JSON.stringify(history?.firsts) === '["Tomas Reed"]');
await page.click('dialog.popup[open] details.forge-keeper-item >> nth=0');
await page.waitForTimeout(300);
await shot('keeper-history.png');
await page.click('dialog.popup[open] .forge-keeper-first button');
await page.waitForTimeout(600);
check('"Put back" gives a rewritten entry its first text again', (await entryText(1)) === TOMAS && (await forge()).keeperLog[0].mode === 'restore', await entryText(1));
await page.click('dialog.popup[open] .popup-button-ok');
await page.waitForFunction(() => !document.querySelector('dialog.popup[open]'), null, { timeout: 5000 }).catch(() => {});

// ---------- Nothing to change, and a check that fails ----------
await setForge(page, { keeperMode: 'note' });
await plan({});
const savedBefore = saves.length;
check('an answer of <none/> changes nothing', (await runNow()) === 0 && saves.length === savedBefore && (await section())?.empty === 'No changes last time', JSON.stringify(await section()));
check('the profile lists each entry once, with its newest change', JSON.stringify((await section())?.rows) === '["Tomas Reed","Mira Vance"]', JSON.stringify((await section())?.rows));
await plan('fail');
check('a check that fails changes nothing and says so', (await runNow()) === 0 && saves.length === savedBefore && (await section())?.empty === 'The last check failed', JSON.stringify(await section()));
await say([['user', 'A line with nobody in it.']]);
await plan({});
const before = (await bodies()).length;
check('when nobody from the lorebooks comes up, nothing is sent', (await runNow()) === 0 && (await bodies()).length === before && (await section())?.empty === 'Nobody from your lorebooks came up', JSON.stringify(await section()));

// ---------- The settings ----------
const ui = await page.evaluate(async ({ CAST, WORLD }) => {
    const root = document.querySelector('.arcane-forge-ui-settings');
    const s = SillyTavern.getContext().extensionSettings.arcaneForgeUi;
    const list = root.querySelector('#forge-ui-keeper-books');
    list.dispatchEvent(new Event('pointerenter'));
    const rows = () => [...list.querySelectorAll('label')].map((row) => [row.textContent, row.querySelector('input').checked]);
    const listed = rows().filter(([name]) => name.startsWith('Keeper Test'));
    const world = [...list.querySelectorAll('label')].find((row) => row.textContent === WORLD).querySelector('input');
    world.click();
    const ticked = [...s.keeperBooks];
    world.click();
    const topics = [...root.querySelectorAll('.forge-ui-keeper-topic input')];
    const looks = root.querySelector('#forge-ui-keeper-topic-looks');
    looks.click();
    const own = root.querySelector('#forge-ui-keeper-guide');
    own.value = 'Who each character has sworn loyalty to.';
    own.dispatchEvent(new Event('input', { bubbles: true }));
    const everyBox = root.querySelector('#forge-ui-keeper-every');
    everyBox.value = '500';
    everyBox.dispatchEvent(new Event('change', { bubbles: true }));
    const out = { listed, ticked, unticked: [...s.keeperBooks], topics: topics.length, looks: s.keeperTopics.looks, guide: s.keeperGuide, every: s.keeperEvery, everyShown: everyBox.value, modeOptions: [...root.querySelectorAll('#forge-ui-keeper-mode option')].map((o) => o.textContent) };
    root.querySelector('#forge-ui-keeper-told').click();
    return out;
}, { CAST, WORLD });
check('the settings list the lorebooks, with the ticked one ticked', JSON.stringify(ui.listed) === JSON.stringify([[CAST, true], [WORLD, false]]), JSON.stringify(ui.listed));
check('ticking and unticking a lorebook there changes what it may change', ui.ticked.includes(WORLD) && ui.ticked.includes(CAST) && !ui.unticked.includes(WORLD) && ui.unticked.includes(CAST), JSON.stringify(ui));
check('there are eight things to add, each with its own box, and a box for the user\'s own words', ui.topics === 8 && ui.looks === false && ui.guide === 'Who each character has sworn loyalty to.');
check('a number out of range is brought back into range', ui.every === 100 && ui.everyShown === '100');
check('the two ways to write a change are both offered', JSON.stringify(ui.modeOptions) === JSON.stringify(['A "Latest" note under my text', 'A rewrite of the entry']), JSON.stringify(ui.modeOptions));
await page.waitForSelector('dialog.popup[open] .forge-keeper-guide', { timeout: 8000 }).catch(() => {});
const told = await page.evaluate(() => document.querySelector('dialog.popup[open] .forge-keeper-guide')?.textContent ?? '');
check('"See what the AI is told" shows the guide with those choices in it', told.includes('What belongs in a record') && !told.includes('- Looks: ') && told.includes('Who each character has sworn loyalty to.'), told.slice(0, 120));
await shot('keeper-told.png');
await page.click('dialog.popup[open] .popup-button-ok');
await page.waitForFunction(() => !document.querySelector('dialog.popup[open]'), null, { timeout: 5000 }).catch(() => {});
if (process.env.FORGE_SHOTS) {
    // The top bar is only there in the classic layout
    await setForge(page, { layout: 'classic' });
    await page.click('#extensions-settings-button .drawer-toggle');
    await page.waitForTimeout(600);
    await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
    await page.waitForTimeout(600);
    await page.setViewportSize({ width: 1440, height: 1500 });
    await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll('.arcane-forge-ui-settings h4')].find((h) => h.textContent === 'Lorebook keeper')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(400);
    await shot('keeper-settings.png');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('#extensions-settings-button .drawer-toggle');
    await page.waitForTimeout(400);
    await setForge(page, { layout: 'columns' });
    await page.waitForTimeout(600);
}

// ---------- Hidden from the profile, and switched off ----------
await setForge(page, { keeperShow: false });
check('it can be taken out of the profile and still be on', (await section()) === null && (await forge()).keeper === true);
await setForge(page, { keeperShow: true, keeper: false, keeperEvery: 2 });
check('switched off, it leaves the profile', (await section()) === null);
await say([['ai', 'Mira laughs.'], ['user', 'I laugh too.'], ['ai', 'Mira laughs again.'], ['ai', 'And Mira laughs once more.']]);
const quiet = (await bodies()).length;
await replyEnded();
await page.waitForTimeout(3400);
check('and sends nothing, however many replies come', (await bodies()).length === quiet);
check('nor does Update now', (await page.evaluate(async (path) => (await (await import(path)).run({ manual: true })).length, KEEPER_JS)) === 0 && (await bodies()).length === quiet);

await finish();
