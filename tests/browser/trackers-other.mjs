// Trackers kept up to date by another model: after each reply a second request goes to the chat completions
// address the user typed in, with its own model and key, and nothing is added to what the story's AI is sent.
// Only the Forge Tester chat is used; both "AIs" are answered in the page; the key is made up here; nothing
// is saved to the sandbox and nothing leaves it.
// Usage: node tests/browser/trackers-other.mjs
// Set FORGE_SHOTS to a folder to also save pictures there.
import { join } from 'node:path';
import { fakeConnection, openForge, setForge } from './_harness.mjs';

const { page, check, finish } = await openForge({});
await page.addStyleTag({ content: '#rpg-companion-panel { display: none !important; }' });
const shot = async (name, locator) => {
    if (!process.env.FORGE_SHOTS) return;
    await page.evaluate(() => { globalThis.toastr?.clear(); document.querySelectorAll('#toast-container .toast').forEach((notice) => notice.remove()); });
    await page.waitForTimeout(600);
    await (locator ?? page).screenshot({ path: join(process.env.FORGE_SHOTS, name) });
};
const MODULE_JS = '/scripts/extensions/third-party/arcane-forge-ui/trackers.js';
const KEY_STORE = 'arcane_forge_trackers_key';
const FAKE_KEY = 'made-up-test-key-0001'; // not a real key: nothing here ever reaches a real service
const now = () => page.evaluate(() => structuredClone(SillyTavern.getContext().chatMetadata.forge_trackers ?? null));
const note = () => page.evaluate(() => SillyTavern.getContext().extensionPrompts.arcane_forge_trackers?.value ?? '');
const row = () => page.evaluate(() => { const r = document.querySelector('#forge-trackers .forge-track-other'); return r ? { text: r.querySelector('span').textContent, failed: r.classList.contains('forge-track-other-failed'), why: r.querySelector('span').title, busy: r.querySelector('button').disabled } : null; });
const others = () => page.evaluate(() => structuredClone(globalThis.otherBodies));
const idle = () => page.waitForFunction(() => { const r = document.querySelector('#forge-trackers .forge-track-other'); return r && !r.querySelector('button').disabled && r.querySelector('span').textContent !== 'Updating…'; }, null, { timeout: 15000 }).catch(() => {});
const set = (id, value) => page.evaluate(({ id, value }) => { const box = document.querySelector(`.arcane-forge-ui-settings #${id}`); box.value = value; box.dispatchEvent(new Event('change', { bubbles: true })); }, { id, value });
const press = (id) => page.evaluate((id) => document.querySelector(`.arcane-forge-ui-settings #${id}`).click(), id);

// Both "AIs" are answered in the page: the story's own, and the other model (told apart by the address)
await page.evaluate(() => {
    globalThis.mainBodies = [];
    globalThis.otherBodies = [];
    globalThis.otherAnswer = '';
    const answered = window.fetch;
    window.fetch = async (input, init) => {
        if (!/\/api\/backends\/[^/]+\/generate/.test(String(input?.url ?? input))) return answered(input, init);
        const body = String(init?.body ?? '');
        const json = JSON.parse(body);
        const reply = (content) => new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (json.chat_completion_source === 'custom' && String(json.custom_url ?? '').startsWith('https://trackers.test')) {
            globalThis.otherBodies.push(json);
            if (globalThis.otherAnswer === 'fail') return new Response(JSON.stringify({ error: { message: 'Bad key' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            return reply(globalThis.otherAnswer);
        }
        globalThis.mainBodies.push(body);
        return reply(globalThis.mainAnswer ?? 'The rain eases as we reach the door.');
    };
    localStorage.removeItem('arcane_forge_trackers_key');
});

// ---------- The address ----------
const urls = await page.evaluate(async (path) => {
    const t = await import(path);
    return ['https://api.example.com/v1/chat/completions', 'https://api.example.com/v1/', ' http://localhost:1234/v1 ', 'https://api.example.com/v1/chat/completions/?x=1#y', 'api.example.com/v1', 'ftp://example.com', ''].map((raw) => t.endpoint(raw));
}, MODULE_JS);
check('a full chat completions URL, a base URL and a local one all come out as the base address', urls[0] === 'https://api.example.com/v1' && urls[1] === 'https://api.example.com/v1' && urls[2] === 'http://localhost:1234/v1' && urls[3] === 'https://api.example.com/v1', JSON.stringify(urls));
check('what is not a web address is refused', urls[4] === '' && urls[5] === '' && urls[6] === '', JSON.stringify(urls));

// ---------- The story's AI keeps them, as before ----------
await setForge(page, { layout: 'columns', columnsProfile: true, trackers: true, trackersTime: true, trackersStats: true, trackersInventory: true, trackersUpdate: true });
await page.waitForTimeout(700);
await page.fill('#forge-trackers .forge-track-time input', '7:40 PM');
await page.waitForTimeout(300);
const before = await page.evaluate(() => { const s = SillyTavern.getContext().extensionSettings.arcaneForgeUi; return { by: s.trackersBy, url: s.trackersUrl, model: s.trackersModel, read: s.trackersRead }; });
check('to start with, the story\'s AI keeps them and there is no other model', before.by === 'story' && before.url === '' && before.model === '' && before.read === 4 && (await row()) === null && (await note()).includes('Time: 7:40 PM'), JSON.stringify(before));
const boxes = await page.evaluate(() => { const root = document.querySelector('.arcane-forge-ui-settings'); return { hidden: root.querySelector('#forge-ui-trackers-other').hidden, options: [...root.querySelectorAll('#forge-ui-trackers-by option')].map((o) => o.textContent), key: root.querySelector('#forge-ui-trackers-key').type, plain: ['forge-ui-trackers-url', 'forge-ui-trackers-model', 'forge-ui-trackers-key'].every((id) => { const box = root.querySelector(`#${id}`); return box.getAttribute('autocapitalize') === 'off' && box.getAttribute('autocorrect') === 'off' && box.getAttribute('spellcheck') === 'false'; }) }; });
check('the settings offer the two keepers, with the other model\'s boxes tucked away', boxes.hidden === true && JSON.stringify(boxes.options) === JSON.stringify(['The story\'s AI, in each reply', 'Another model, after each reply']), JSON.stringify(boxes));
check('the key box hides what is typed, and no box capitalises or corrects it', boxes.key === 'password' && boxes.plain);

// ---------- Setting up the other model ----------
await set('forge-ui-trackers-by', 'other');
await set('forge-ui-trackers-url', ' https://trackers.test/v1/chat/completions ');
await set('forge-ui-trackers-model', ' tiny-model ');
await set('forge-ui-trackers-key', `  ${FAKE_KEY} `);
await set('forge-ui-trackers-read', '2');
await page.waitForTimeout(500);
const kept = await page.evaluate(async ({ path, KEY_STORE, FAKE_KEY }) => {
    const root = document.querySelector('.arcane-forge-ui-settings');
    const s = SillyTavern.getContext().extensionSettings.arcaneForgeUi;
    const keyBox = root.querySelector('#forge-ui-trackers-key');
    return { shown: !root.querySelector('#forge-ui-trackers-other').hidden, by: s.trackersBy, url: s.trackersUrl, model: s.trackersModel, read: s.trackersRead, stored: localStorage.getItem(KEY_STORE) === FAKE_KEY, inSettings: JSON.stringify(s).includes(FAKE_KEY), inPage: document.documentElement.outerHTML.includes(FAKE_KEY), box: keyBox.value, hint: keyBox.placeholder, has: (await import(path)).hasKey() };
}, { path: MODULE_JS, KEY_STORE, FAKE_KEY });
check('choosing another model shows its boxes, and what is typed is kept', kept.shown && kept.by === 'other' && kept.url === 'https://trackers.test/v1/chat/completions' && kept.model === 'tiny-model' && kept.read === 2, JSON.stringify(kept));
check('the key is kept on this device and nowhere in the settings', kept.stored && kept.has && !kept.inSettings);
check('and is not shown again: the box is empty and says a key is saved', kept.box === '' && !kept.inPage && kept.hint.startsWith('A key is saved'), kept.hint);
check('nothing is added to what the story\'s AI is sent', (await note()) === '');
check('the profile says who keeps the trackers', (await row())?.text === 'Kept by tiny-model' && (await row()).failed === false, JSON.stringify(await row()));

// ---------- A reply: the other model is asked ----------
await page.evaluate(() => { globalThis.otherAnswer = 'Here you go.\n<div class="forge-trackers">\nTime: 9:05 PM\nDate: Tuesday, 14 March\nLocation: The porch\nWeather: Drizzle\nHealth: 70\nOn person: Pocket knife, Wet cloak\nWearing: none\nStored (Cart): Hay\n</div>'; });
await fakeConnection(page);
await page.waitForSelector('#send_but:not(.displayNone)', { timeout: 5000 }).catch(() => {});
const length = await page.evaluate(() => SillyTavern.getContext().chat.length);
await page.fill('#send_textarea', 'We wait out the rain.');
await page.keyboard.press('Enter');
await page.waitForFunction((count) => SillyTavern.getContext().chat.length >= count + 2 && !document.body.dataset.generating, length, { timeout: 15000 }).catch(() => {});
await page.waitForFunction(() => globalThis.otherBodies.length >= 1, null, { timeout: 15000 }).catch(() => {});
await idle();
await page.waitForTimeout(500);
let sent = await others();
const main = await page.evaluate(() => globalThis.mainBodies);
const asked = sent[0] ?? {};
const askedText = (asked.messages ?? []).map((m) => m.content).join('\n');
check('the story\'s AI was asked once, with no tracker note', main.length === 1 && !main[0].includes('forge-trackers') && !main[0].includes('trackers, as they stand'), String(main.length));
check('then the other model was asked once, at the address without "/chat/completions"', sent.length === 1 && asked.chat_completion_source === 'custom' && asked.custom_url === 'https://trackers.test/v1' && asked.model === 'tiny-model' && asked.stream === false && asked.max_tokens > 0, JSON.stringify({ n: sent.length, url: asked.custom_url, model: asked.model }));
check('the key went along as that request\'s own header', asked.custom_include_headers === JSON.stringify({ Authorization: `Bearer ${FAKE_KEY}` }));
check('it was told how the trackers work and given the values as they stand', asked.messages?.[0]?.role === 'system' && asked.messages[0].content.includes('You do not write the story') && asked.messages[0].content.includes('Health, Satiety') && askedText.includes('<div class="forge-trackers">\nTime: 7:40 PM') && askedText.includes('Health: not set'), askedText.slice(0, 300));
check('and the last two messages, the reply last', askedText.includes('We wait out the rain.') && askedText.trimEnd().endsWith('The rain eases as we reach the door.') && !askedText.includes('Reply 20'), askedText.slice(-200));
check('no macro is left for it to puzzle over', !askedText.includes('{{'));
check('it is told that what the reply states wins over the trackers', asked.messages?.[0]?.content.includes('write exactly what it states, even when that differs') && asked.messages[0].content.includes('never contradict the last message'));
let v = await now();
check('its answer moved the trackers on', v?.time === '9:05 PM' && v.location === 'The porch' && v.weather === 'Drizzle' && v.stats.health === 70 && JSON.stringify(v.onPerson) === JSON.stringify(['Pocket knife', 'Wet cloak']) && JSON.stringify(v.stored) === JSON.stringify({ Cart: ['Hay'] }), JSON.stringify(v));
const reply = await page.evaluate(() => { const m = SillyTavern.getContext().chat.at(-1); return { mes: m.mes, kept: m.extra?.forge_trackers?.time, shown: document.querySelector('#chat .mes.last_mes .mes_text')?.textContent.trim(), drawn: document.querySelector('#forge-trackers .forge-track-time input').value }; });
check('the reply itself is untouched, and keeps its own copy of the values', reply.mes === 'The rain eases as we reach the door.' && reply.shown === reply.mes && reply.kept === '9:05 PM' && reply.drawn === '9:05 PM', JSON.stringify(reply));
await shot('trackers-other-profile.png', page.locator('#forge-profile'));

// ---------- The story's AI writes a tracker heading or block anyway ----------
for (const [what, answer] of [
    ['an empty "[Trackers for Name:]" at the end of a reply is taken out', 'We step inside.\n\n[Trackers for Mira:\n\n]'],
    ['and so is a block the story\'s AI wrote anyway, with its heading and brackets, without being read', 'We step inside.\n\n[Trackers for Mira:\n<div class="forge-trackers">\nTime: 1 AM\nHealth: 3\n</div>\n]'],
]) {
    const before = await page.evaluate((answer) => { globalThis.mainAnswer = answer; return { chat: SillyTavern.getContext().chat.length, asked: globalThis.otherBodies.length }; }, answer);
    await page.fill('#send_textarea', 'We go in.');
    await page.keyboard.press('Enter');
    await page.waitForFunction((count) => SillyTavern.getContext().chat.length >= count + 2 && !document.body.dataset.generating, before.chat, { timeout: 15000 }).catch(() => {});
    await page.waitForFunction((count) => globalThis.otherBodies.length > count, before.asked, { timeout: 15000 }).catch(() => {});
    await idle();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => { const m = SillyTavern.getContext().chat.at(-1); return { mes: m.mes, shown: document.querySelector('#chat .mes.last_mes .mes_text')?.textContent.trim(), asked: globalThis.otherBodies.length, told: globalThis.otherBodies.at(-1)?.messages?.[1]?.content ?? '' }; });
    check(what, after.mes === 'We step inside.' && after.shown === 'We step inside.' && after.asked === before.asked + 1 && !after.told.includes('Trackers for') && (await now())?.time === '9:05 PM' && (await now()).stats.health === 70, JSON.stringify(after).slice(0, 300));
    await page.evaluate((count) => { globalThis.otherBodies.length = count; delete globalThis.mainAnswer; }, before.asked);
}

// ---------- Asking again, and answers that are not to the letter ----------
await page.evaluate(() => { globalThis.otherAnswer = 'Time: 9:30 PM\n- **Health:** 66/100'; });
await page.click('#forge-trackers .forge-track-other button');
await page.waitForFunction(() => globalThis.otherBodies.length >= 2, null, { timeout: 15000 }).catch(() => {});
await idle();
await page.waitForTimeout(300);
v = await now();
sent = await others();
check('the button in the profile asks again about the newest reply', sent.length === 2 && sent[1].messages[1].content.includes('Time: 9:05 PM'));
check('an answer that is only the lines, without the block around them, is read too', v?.time === '9:30 PM' && v.stats.health === 66 && v.location === 'The porch', JSON.stringify(v));

await page.evaluate(() => { globalThis.otherAnswer = 'I am sorry, I cannot help with that.'; });
await page.click('#forge-trackers .forge-track-other button');
await page.waitForFunction(() => globalThis.otherBodies.length >= 3, null, { timeout: 15000 }).catch(() => {});
await idle();
await page.waitForTimeout(300);
let r = await row();
check('an answer with no tracker lines changes nothing and says so', (await now())?.time === '9:30 PM' && r?.failed && r.text === 'The last update failed' && r.why.includes('no tracker lines'), JSON.stringify(r));

await page.evaluate(() => { globalThis.otherAnswer = 'fail'; });
await page.click('#forge-trackers .forge-track-other button');
await page.waitForFunction(() => globalThis.otherBodies.length >= 4, null, { timeout: 15000 }).catch(() => {});
await idle();
await page.waitForTimeout(300);
r = await row();
check('a refused request changes nothing and shows the service\'s own words', (await now())?.time === '9:30 PM' && r?.failed && r.why === 'Bad key', JSON.stringify(r));
await shot('trackers-other-failed.png', page.locator('#forge-profile'));

// ---------- Test, and Forget the key ----------
await page.evaluate(() => { globalThis.otherAnswer = 'ready'; });
await press('forge-ui-trackers-test');
await page.waitForFunction(() => globalThis.otherBodies.length >= 5, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(400);
sent = await others();
check('Test sends one small request with the same address, model and key', sent.length === 5 && sent[4].messages.length === 1 && sent[4].messages[0].content.includes('ready') && sent[4].custom_url === 'https://trackers.test/v1' && sent[4].custom_include_headers.includes(FAKE_KEY));
check('and says that it answered', await page.evaluate(() => [...document.querySelectorAll('#toast-container .toast-success')].some((t) => t.textContent.includes('It answered: "ready"'))));
await press('forge-ui-trackers-forget');
await page.waitForTimeout(300);
const forgotten = await page.evaluate((KEY_STORE) => ({ stored: localStorage.getItem(KEY_STORE), hint: document.querySelector('.arcane-forge-ui-settings #forge-ui-trackers-key').placeholder }), KEY_STORE);
check('Forget the key forgets it', forgotten.stored === null && forgotten.hint === 'Paste the key here', JSON.stringify(forgotten));
await page.evaluate(() => { globalThis.otherAnswer = 'Time: 9:45 PM'; });
await page.click('#forge-trackers .forge-track-other button');
await page.waitForFunction(() => globalThis.otherBodies.length >= 6, null, { timeout: 15000 }).catch(() => {});
await idle();
await page.waitForTimeout(300);
sent = await others();
r = await row();
check('without a key the request carries a placeholder, so the app\'s own saved key can never go to that address', sent.length === 6 && sent[5].custom_include_headers === JSON.stringify({ Authorization: 'Bearer none' }) && (await now())?.time === '9:45 PM' && r?.failed === false, JSON.stringify(r));

// ---------- Not set up ----------
await set('forge-ui-trackers-model', '');
await page.click('#forge-trackers .forge-track-other button');
await idle();
await page.waitForTimeout(400);
r = await row();
check('with no model typed in, nothing is sent and it says what is missing', (await others()).length === 6 && r?.failed && r.why.includes('model'), JSON.stringify(r));
await set('forge-ui-trackers-model', 'tiny-model');
await set('forge-ui-trackers-url', 'not an address');
await page.click('#forge-trackers .forge-track-other button');
await idle();
await page.waitForTimeout(400);
r = await row();
check('nor with an address that is not one', (await others()).length === 6 && r?.failed && r.why.includes('URL'), JSON.stringify(r));
await set('forge-ui-trackers-url', 'https://trackers.test/v1');

if (process.env.FORGE_SHOTS) {
    // The settings as they are with Three columns on (in any other layout these boxes are greyed out)
    await set('forge-ui-trackers-key', FAKE_KEY);
    await set('forge-ui-layout', 'columns'); // chosen in the settings themselves, which is what un-greys the boxes
    await page.setViewportSize({ width: 1440, height: 1300 });
    await page.evaluate(() => document.querySelector('#extensions-settings-button .drawer-toggle').click());
    await page.waitForTimeout(900);
    await page.evaluate(() => { const drawer = document.querySelector('.arcane-forge-ui-settings .inline-drawer-toggle'); if (!drawer.parentElement.querySelector('.inline-drawer-content')?.getClientRects().length) drawer.click(); });
    await page.waitForTimeout(700);
    await page.evaluate(() => [...document.querySelectorAll('.arcane-forge-ui-settings h4')].find((h) => h.textContent === 'Trackers')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(400);
    await shot('trackers-other-settings.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    await press('forge-ui-trackers-forget');
}

// ---------- Telling the story's AI the values ----------
check('to start with the story\'s AI is told nothing, and the switch is there, off', (await note()) === '' && (await page.evaluate(() => { const box = document.querySelector('.arcane-forge-ui-settings #forge-ui-trackers-tell'); return box && !box.checked && !!box.closest('#forge-ui-trackers-other'); })));
await setForge(page, { trackersTell: true });
await page.waitForTimeout(300);
const told = await note();
check('switched on, it gets the values as they stand to go by, with nothing to write back', told.includes('Time: 9:45 PM') && told.includes('Health: 66') && told.includes('do not write this list out') && !told.includes('forge-trackers') && !told.includes('<div') && !told.includes('not set') && !told.startsWith('['), JSON.stringify(told).slice(120, 620));
await setForge(page, { trackersTell: false });
await page.waitForTimeout(300);
check('switched off again, nothing is sent', (await note()) === '');

// ---------- Back to the story's AI, and off ----------
await set('forge-ui-trackers-by', 'story');
await page.waitForTimeout(400);
check('back with the story\'s AI, the note returns and the other model\'s line is gone', (await note()).includes('Time: 9:45 PM') && (await row()) === null && (await page.evaluate(() => document.querySelector('.arcane-forge-ui-settings #forge-ui-trackers-other').hidden)));

// ---------- Kept by the story's AI: what is sent stays the same from turn to turn, up to the newest messages ----------
// (a provider's prompt cache only works while the start of what is sent does not change)
const turns = [];
for (const [say, answer] of [['We sit by the fire.', 'The fire crackles.\n<div class="forge-trackers">\nTime: 10:00 PM\nHealth: 71\n</div>'], ['We sleep.', 'Morning comes.\n<div class="forge-trackers">\nTime: 7:00 AM\nHealth: 90\n</div>']]) {
    const before = await page.evaluate((answer) => { globalThis.mainAnswer = answer; globalThis.mainBodies.length = 0; return SillyTavern.getContext().chat.length; }, answer);
    await page.fill('#send_textarea', say);
    await page.keyboard.press('Enter');
    await page.waitForFunction((count) => SillyTavern.getContext().chat.length >= count + 2 && !document.body.dataset.generating, before, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    turns.push(await page.evaluate(() => JSON.parse(globalThis.mainBodies[0] ?? '{}').messages ?? []));
}
const text = (m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
const noted = turns.map((messages) => messages.map((m, i) => (text(m).includes('forge-trackers') ? i : -1)).filter((i) => i >= 0));
const firstNote = noted[0][0] ?? -1;
// The sandbox has another extension that adds its own note among the newest messages: that one is not ours to judge
const ours = (messages) => messages.filter((m, i) => i < 2 || m.role !== 'system' || text(m).includes('forge-trackers'));
const [first, second] = turns.map(ours);
const firstEnd = first.findIndex((m) => text(m).includes('forge-trackers'));
const sameStart = firstEnd > 3 && firstEnd === first.length - 1 && JSON.stringify(first.slice(0, firstEnd)) === JSON.stringify(second.slice(0, firstEnd));
check('the tracker note is sent once, at the very end', noted.every((at, i) => at.length === 1 && at[0] >= turns[i].length - 2) && text(turns[1][noted[1][0]]).includes('Time: 10:00 PM'), JSON.stringify(noted.map((at, i) => [at, turns[i].length])));
check('everything before it is word for word what was sent the turn before', sameStart, JSON.stringify({ firstEnd, a: first.slice(-3).map(text).map((t) => t.slice(0, 50)), b: second.slice(firstEnd - 2, firstEnd + 1).map(text).map((t) => t.slice(0, 50)) }));
check('and no old reply carries a block or a changing value into it', turns[1].slice(0, noted[1][0]).every((m) => !/forge-trackers|Trackers for|10:00 PM|7:00 AM/.test(text(m))) && turns[1].some((m) => text(m).includes('The fire crackles.')));
await page.evaluate(() => { delete globalThis.mainAnswer; });

await set('forge-ui-trackers-by', 'other');
await setForge(page, { trackersUpdate: false });
await page.waitForTimeout(300);
check('with "Ask the AI" off, neither is asked and the line is gone', (await note()) === '' && (await row()) === null);
await setForge(page, { trackersUpdate: true, trackers: false });
await page.waitForTimeout(300);
check('switched off, nothing is in the profile', (await page.evaluate(() => document.querySelectorAll('#forge-trackers > *').length)) === 0);
await page.evaluate((KEY_STORE) => localStorage.removeItem(KEY_STORE), KEY_STORE);

await finish();
