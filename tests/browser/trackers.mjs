// Trackers (Three columns layout): time and place, stat wheels and an inventory in the profile on the right.
// They are changed by hand, sent to the AI as a note, read back out of a reply's block (which is taken out of
// the message), follow a deleted reply, and leave nothing behind when switched off. Only the Forge Tester
// chat is used; the "AI" is answered in the page, and nothing is saved to the sandbox.
// Usage: node tests/browser/trackers.mjs
// Set FORGE_SHOTS to a folder to also save pictures there.
import { join } from 'node:path';
import { box, fakeConnection, openForge, setForge } from './_harness.mjs';

const { page, check, finish } = await openForge({});
await page.addStyleTag({ content: '#rpg-companion-panel { display: none !important; }' });
const shot = async (name) => { if (process.env.FORGE_SHOTS) await page.screenshot({ path: join(process.env.FORGE_SHOTS, name) }); };
const MODULE_JS = '/scripts/extensions/third-party/arcane-forge-ui/trackers.js';
const now = () => page.evaluate(() => structuredClone(SillyTavern.getContext().chatMetadata.forge_trackers ?? null));
const note = () => page.evaluate(() => SillyTavern.getContext().extensionPrompts.arcane_forge_trackers?.value ?? '');
const sections = () => page.evaluate(() => [...document.querySelectorAll('#forge-trackers > section')].map((s) => s.getAttribute('aria-label')));

// Off by default: nothing in the profile, nothing sent
await setForge(page, { layout: 'columns', columnsProfile: true, trackers: false });
await page.waitForTimeout(800);
check('switched off, the profile has no trackers', (await sections()).length === 0);
check('and nothing is added to what is sent to the AI', (await note()) === '');

await setForge(page, { trackers: true, trackersTime: true, trackersStats: true, trackersInventory: true, trackersUpdate: true });
await page.waitForTimeout(500);
check('switched on, the profile has Time and place, Stats and Inventory', JSON.stringify(await sections()) === JSON.stringify(['Time and place', 'Stats', 'Inventory']), JSON.stringify(await sections()));
const holder = await box(page, '#forge-trackers');
const profile = await box(page, '#forge-profile');
check('they are inside the profile, under the people in the chat', holder && profile && holder.left >= profile.left && holder.right <= profile.right && holder.top >= (await box(page, '#forge-profile .forge-profile-cast')).bottom, JSON.stringify(holder));

// Wheels: four to a row, the fifth on the next row
const wheels = await page.evaluate(() => [...document.querySelectorAll('#forge-trackers .forge-track-wheel')].map((w) => { const r = w.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), name: w.querySelector('span').textContent, number: w.querySelector('text').textContent }; }));
check('there are five wheels, not set yet', wheels.length === 5 && wheels.every((w) => w.number === '–'), JSON.stringify(wheels));
check('four are on the first row and the fifth starts a new row', wheels.slice(0, 4).every((w) => w.top === wheels[0].top) && wheels[4].top > wheels[0].top && wheels[4].left === wheels[0].left, JSON.stringify(wheels.map((w) => [w.left, w.top])));

// By hand
await page.fill('#forge-trackers .forge-track-time input', '7:40 PM');
await page.fill('#forge-trackers .forge-track-date input', 'Tuesday, 14 March');
await page.fill('#forge-trackers .forge-track-location input', 'The mill yard');
await page.click('#forge-trackers .forge-track-wheel >> nth=0');
await page.locator('#forge-trackers .forge-track-slider input').fill('82');
await page.click('#forge-trackers [aria-label="Change: On person"]');
await page.keyboard.type('Pocket knife, 12 coins, none, Pocket knife');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
let v = await now();
check('typing a time, date and place keeps them on the chat', v?.time === '7:40 PM' && v.date === 'Tuesday, 14 March' && v.location === 'The mill yard', JSON.stringify(v));
check('a wheel set with its slider keeps its number', v?.stats.health === 82 && await page.evaluate(() => document.querySelector('#forge-trackers .forge-track-wheel text').textContent === '82%'), JSON.stringify(v?.stats));
check('a list typed with commas becomes its things, without "none" or doubles', JSON.stringify(v?.onPerson) === JSON.stringify(['Pocket knife', '12 coins']) && await page.evaluate(() => document.querySelectorAll('#forge-trackers .forge-track-list:first-child .forge-profile-chip').length === 2), JSON.stringify(v?.onPerson));
await page.click('#forge-trackers [aria-label="Add a place where things are stored"]');
await page.keyboard.type('Home');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await page.keyboard.type('Toolbox');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
v = await now();
check('a place to store things can be added and filled', JSON.stringify(v?.stored) === JSON.stringify({ Home: ['Toolbox'] }), JSON.stringify(v?.stored));
await shot('trackers.png');

// The note to the AI
let n = await note();
check('the note to the AI has the values as they stand and asks for the block back', n.includes('<div class="forge-trackers">') && n.includes('Time: 7:40 PM') && n.includes('Health: 82') && n.includes('Satiety: not set') && n.includes('On person: Pocket knife, 12 coins') && n.includes('Stored (Home): Toolbox') && n.includes('At the very end of your reply'), n);

// A reply with the block: answered in the page, never by a model
await page.evaluate(() => {
    globalThis.testBodies = [];
    const answered = window.fetch;
    window.fetch = (input, init) => {
        if (/\/api\/backends\/[^/]+\/generate/.test(String(input?.url ?? input))) {
            globalThis.testBodies.push(String(init?.body ?? ''));
            const content = 'The whistle blows and the yard empties.\n\n<div class="forge-trackers">\nTime: 8:15 PM\nDate: Tuesday, 14 March\nLocation: The road home\nWeather: Light rain\nHealth: 78\nSatiety: 40%\nEnergy: 55\nHygiene: 61\nArousal: 5\nOn person: Pocket knife, 9 coins, Loaf of bread\nWearing: Work shirt, Boots\nStored (Home): Toolbox, Spare blanket\nStored (Mill locker): Apron\n</div>';
            return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return answered(input, init);
    };
});
await fakeConnection(page);
await page.waitForSelector('#send_but:not(.displayNone)', { timeout: 5000 }).catch(() => {});
const before = await page.evaluate(() => SillyTavern.getContext().chat.length);
await page.fill('#send_textarea', 'We head home.');
await page.keyboard.press('Enter');
await page.waitForFunction((count) => SillyTavern.getContext().chat.length >= count + 2 && !document.body.dataset.generating, before, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
const reply = await page.evaluate(() => { const chat = SillyTavern.getContext().chat; const m = chat.at(-1); return { ai: !m.is_user, mes: m.mes, shown: document.querySelector('#chat .mes.last_mes .mes_text')?.textContent.trim(), kept: Boolean(m.extra?.forge_trackers) }; });
check('the note went out with the request', await page.evaluate(() => globalThis.testBodies.length === 1 && globalThis.testBodies[0].includes('forge-trackers') && globalThis.testBodies[0].includes('Time: 7:40 PM')));
check('the block is taken out of the reply, in the chat and on screen', reply.ai && reply.mes === 'The whistle blows and the yard empties.' && reply.shown === 'The whistle blows and the yard empties.', JSON.stringify(reply));
v = await now();
check('the reply moved the time and place on', v?.time === '8:15 PM' && v.location === 'The road home' && v.weather === 'Light rain', JSON.stringify(v));
check('and changed every stat (a "%" after the number is fine)', JSON.stringify(v?.stats) === JSON.stringify({ health: 78, satiety: 40, energy: 55, hygiene: 61, arousal: 5 }), JSON.stringify(v?.stats));
check('and the inventory, with a new place to store things', JSON.stringify(v?.onPerson) === JSON.stringify(['Pocket knife', '9 coins', 'Loaf of bread']) && JSON.stringify(v?.wearing) === JSON.stringify(['Work shirt', 'Boots']) && JSON.stringify(v?.stored) === JSON.stringify({ Home: ['Toolbox', 'Spare blanket'], 'Mill locker': ['Apron'] }), JSON.stringify(v));
const drawn = await page.evaluate(() => ({ time: document.querySelector('#forge-trackers .forge-track-time input').value, wheels: [...document.querySelectorAll('#forge-trackers .forge-track-wheel text')].map((t) => t.textContent), lists: [...document.querySelectorAll('#forge-trackers .forge-track-list-head span')].map((s) => s.textContent) }));
check('the profile shows the new values', drawn.time === '8:15 PM' && drawn.wheels.join() === '78%,40%,55%,61%,5%' && drawn.lists.join() === 'On person,Wearing,Stored · Home,Stored · Mill locker', JSON.stringify(drawn));
check('the reply keeps its own copy of the values', reply.kept);
check('the note now carries the new values', (await note()).includes('Time: 8:15 PM'));
await shot('trackers-after-reply.png');
if (process.env.FORGE_SHOTS) {
    // The whole profile in one picture
    await page.setViewportSize({ width: 1440, height: 1500 });
    await page.waitForTimeout(400);
    await page.locator('#forge-profile').screenshot({ path: join(process.env.FORGE_SHOTS, 'trackers-profile.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
}

// Deleting that reply puts the values back
await page.evaluate(() => SillyTavern.getContext().executeSlashCommandsWithOptions('/del 2'));
await page.waitForTimeout(1200);
v = await now();
check('deleting the reply puts the values back to what they were before it', v?.time === '7:40 PM' && v.stats.health === 82 && v.stats.satiety === undefined && JSON.stringify(v.stored) === JSON.stringify({ Home: ['Toolbox'] }), JSON.stringify(v));

// The block is out of sight while a reply is still streaming (the text so far, block not closed yet)
const streaming = await page.evaluate(() => {
    const ctx = SillyTavern.getContext();
    const text = ctx.chat.at(-1)?.is_user ? null : document.querySelector('#chat .mes.last_mes .mes_text');
    if (!text) return { error: 'no reply to show it in' };
    const was = text.innerHTML;
    const hidden = (source) => {
        text.innerHTML = ctx.messageFormatting(source, 'Forge Tester', false, false, ctx.chat.length - 1);
        const line = [...text.querySelectorAll('*')].filter((e) => e.textContent.includes('Health: 7') && !e.children.length);
        const story = [...text.querySelectorAll('*')].some((e) => e.textContent.includes('A story line.') && e.getClientRects().length);
        return { story, lines: line.length, shown: line.filter((e) => e.getClientRects().length).length, textShown: text.innerText.includes('Health') };
    };
    const out = { open: hidden('A story line.\n\n<div class="forge-trackers">\nTime: 9 PM\nHealth: 7'), closed: hidden('A story line.\n\n<div class="forge-trackers">\nTime: 9 PM\nHealth: 7\n</div>') };
    text.innerHTML = was;
    return out;
});
check('a block still being streamed is not shown, and the story is', streaming.open?.story && streaming.open.shown === 0 && !streaming.open.textShown, JSON.stringify(streaming));
check('nor is a finished block that has not been taken out yet', streaming.closed?.story && streaming.closed.shown === 0 && !streaming.closed.textShown, JSON.stringify(streaming));

// Reading replies that are not quite to the letter
const read = await page.evaluate(async (path) => {
    const t = await import(path);
    const s = { trackersTime: true, trackersStats: true, trackersInventory: true };
    const stats = [{ id: 'health', name: 'Health', color: '#c8553d' }];
    const blank = { time: '1 PM', date: '', location: '', weather: '', stats: { health: 50 }, onPerson: ['Rope'], wearing: [], stored: { Home: ['Toolbox'], Cart: ['Hay'] } };
    const messy = t.takeBlock('Story.\n<div class="forge-trackers">\n**Time:** 2 PM\n- health: 120/100\nMood: 4\nOn Person: none\nStored (Cart): none\nnot a line\n</div>\nAfterword.');
    const none = t.takeBlock('Just a story with a <div>box</div>.');
    const B = '<div class="forge-trackers">\nTime: 2 PM\n</div>';
    const wrapped = [`Story.\n\n[Trackers for Mira:\n${B}\n]`, `Story.\n\n[Trackers for Mira. The values as they stand now:\n${B}]`, `Story.\n\n**Mira's trackers:**\n${B}`, `Story.\n\n[Updated trackers]\n${B}`].map((text) => t.takeBlock(text));
    const story = [`The trackers closed in.\n${B}`, `He said: "go".\n\n${B}`, `[She waits.]\n${B}`].map((text) => t.takeBlock(text).text);
    const empty = t.takeBlock('Story.\n\n[Trackers for Mira:\n\n]');
    const bare = t.takeBlock('Story.\n\n[Trackers for Mira:\nTime: 3 PM\nHealth: 40\n]');
    const kept = [t.takeBlock('The trackers followed him [all night].'), t.takeBlock('[Trackers for Mira: gone]\nThe story goes on.')];
    const noStats = t.readLines(['Health: 10', 'Time: 3 PM'], blank, { ...s, trackersStats: false }, stats);
    return { wrapped: wrapped.map((w) => `${w.text}|${w.lines.join()}`), story, empty, bare: { text: bare.text, read: t.readLines(bare.lines, blank, s, stats) }, kept, note: t.noteText(blank, s, stats), messyText: messy.text, messy: t.readLines(messy.lines, blank, s, stats), none, noStats, nothing: t.readLines(['Mood: 4'], blank, s, stats) };
}, MODULE_JS);
check('a block with bold labels, bullets, a number over 100 and unknown lines is still read', read.messy?.time === '2 PM' && read.messy.stats.health === 100 && read.messy.onPerson.length === 0 && JSON.stringify(read.messy.stored) === JSON.stringify({ Home: ['Toolbox'] }), JSON.stringify(read.messy));
check('text after the block stays in the message', read.messyText === 'Story.\n\nAfterword.', JSON.stringify(read.messyText));
check('a heading and brackets a model writes around the block go with it', read.wrapped.every((w) => w === 'Story.|Time: 2 PM'), JSON.stringify(read.wrapped));
check('but the story\'s own last line stays', JSON.stringify(read.story) === JSON.stringify(['The trackers closed in.', 'He said: "go".', '[She waits.]']), JSON.stringify(read.story));
check('an empty "[Trackers for Name:]" at the end is taken out', read.empty?.text === 'Story.' && read.empty.lines.length === 0, JSON.stringify(read.empty));
check('and one with the lines but no block is read', read.bare.text === 'Story.' && read.bare.read?.time === '3 PM' && read.bare.read.stats.health === 40, JSON.stringify(read.bare));
check('"trackers" in the story itself is left alone', read.kept[0] === null && read.kept[1] === null);
check('the note has no bracketed heading to copy, and says to write only the block', !read.note.startsWith('[') && !read.note.endsWith(']') && read.note.includes('no heading, no brackets'), read.note.slice(0, 80));
check('a reply without a block is left alone', read.none === null && read.nothing === null);
check('a part that is switched off is not changed by a reply', read.noStats?.stats.health === 50 && read.noStats.time === '3 PM', JSON.stringify(read.noStats));

// Parts on their own switches
await setForge(page, { trackersStats: false });
await page.waitForTimeout(300);
check('Stat wheels off: the wheels are gone and the note leaves the stats out', JSON.stringify(await sections()) === JSON.stringify(['Time and place', 'Inventory']) && !(await note()).includes('Health'), JSON.stringify(await sections()));
await setForge(page, { trackersStats: true, trackersUpdate: false });
await page.waitForTimeout(300);
check('Ask the AI off: nothing is sent, the trackers stay to change by hand', (await note()) === '' && (await sections()).length === 3);
await setForge(page, { trackersUpdate: true });

// The stats are the user's own: the settings screen's list
const custom = await page.evaluate(async (path) => (await import(path)).statList({ trackerStats: [{ id: 'a', name: 'Mana', color: '#3366ff' }, { id: 'a', name: 'Double', color: '#000000' }, { id: 'b', name: '  ', color: '#000000' }, { id: 'c', name: 'Luck: <b>', color: 'red' }] }), MODULE_JS);
check('the list of stats is tidied (no doubles, no empty names, safe names and colours)', JSON.stringify(custom) === JSON.stringify([{ id: 'a', name: 'Mana', color: '#3366ff' }, { id: 'c', name: 'Luck b', color: '#c8553d' }]), JSON.stringify(custom));
await setForge(page, { trackerStats: [{ id: 'a', name: 'Mana', color: '#3366ff' }, { id: 'b', name: 'Luck', color: '#22aa66' }] });
await page.waitForTimeout(300);
check('with two stats set up, the profile has those two wheels', await page.evaluate(() => [...document.querySelectorAll('#forge-trackers .forge-track-wheel span')].map((s) => s.textContent).join() === 'Mana,Luck') && (await note()).includes('Mana: not set'));
await page.evaluate(() => { delete SillyTavern.getContext().extensionSettings.arcaneForgeUi.trackerStats; });

// Off again: nothing left
await setForge(page, { trackers: false });
await page.waitForTimeout(300);
check('switched off again: no trackers in the profile and nothing sent', (await sections()).length === 0 && (await note()) === '');
await setForge(page, { trackers: true, layout: 'classic' });
await page.waitForTimeout(300);
check('with another layout the trackers are not in the page and nothing is sent', (await page.evaluate(() => document.getElementById('forge-trackers'))) === null && (await note()) === '');
await setForge(page, { trackers: false });

await finish();
