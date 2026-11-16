// Story and See (M3): Story puts what you type into the chat as narration and a reply follows; See asks what
// something looks like, or, as a setting, asks Image Generation's imagine command for a picture. No real
// image or text is ever generated: replies are answered in the page, and imagine is a stand-in.
// Usage: node tests/browser/modes-story-see.mjs [phone]
import { fakeConnection, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, held, check, finish } = await openForge({ phone });
const MODES_JS = '/scripts/extensions/third-party/arcane-forge-ui/modes.js';
const NO_TEMPLATES = { do: '', say: '', see: '' };
const FALLBACK = 'See needs SillyTavern\'s Image Generation. Sending a description request instead.';

// ---------- 1. What Story and See send (bible section 6) ----------

// Calls modes.js's transform in the page with Forge UI's default settings plus the given ones
const transform = (text, mode, settings = {}) => page.evaluate(async ({ url, text, mode, settings }) => {
    const { transform } = await import(url);
    return transform(text, mode, { modesVoice: 'second', modesTidy: true, modesTemplates: { do: '', say: '', see: '' }, ...settings });
}, { url: MODES_JS, text, mode, settings });

// Every Story and See row of the table, as [mode, typed, second person, first person]
const TABLE = [
    ['story', 'The rain stops.', 'The rain stops.', 'The rain stops.'],
    ['see', 'the door', 'You look at the door.', 'I look at the door.'],
    ['see', '', 'You look around.', 'I look around.'],
];
for (const [mode, typed, second, first] of TABLE) {
    const label = mode === 'story' ? 'Story' : 'See';
    let got = await transform(typed, mode);
    check(`${label}, You: ${JSON.stringify(typed)} gives ${JSON.stringify(second)}`, got === second, JSON.stringify(got));
    got = await transform(typed, mode, { modesVoice: 'first' });
    check(`${label}, I: ${JSON.stringify(typed)} gives ${JSON.stringify(first)}`, got === first, JSON.stringify(got));
}

// The tidy rules' finer points for the two
let got = await transform('  The rain stops,\nand the wind drops  ', 'story');
check('Story: the ends are trimmed, nothing else (no full stop, a line break inside kept)', got === 'The rain stops,\nand the wind drops', JSON.stringify(got));
got = await transform('  the rain stops ', 'story', { modesTidy: false });
check('Story with tidy off: sent as typed', got === '  the rain stops ', JSON.stringify(got));
got = await transform('The old door', 'see');
check('See: the first letter goes lower case', got === 'You look at the old door.', JSON.stringify(got));
got = await transform('NASA logo', 'see');
check('See: two capitals at the start are kept', got === 'You look at NASA logo.', JSON.stringify(got));
got = await transform('you look at the door', 'see', { modesVoice: 'first' });
check('See: text that starts with "you" gets no You or I in front', got === 'You look at the door.', JSON.stringify(got));
got = await transform('the door?', 'see');
check('See: an end mark that is there stays', got === 'You look at the door?', JSON.stringify(got));
got = await transform('the door', 'see', { modesTidy: false });
check('See with tidy off: the wording only', got === 'You look at the door', JSON.stringify(got));
got = await transform('the door', 'see', { modesTemplates: { ...NO_TEMPLATES, see: '*studies {{input}}*' } });
check('See uses the owner\'s own wording', got === '*studies the door.*', JSON.stringify(got));
got = [await transform('   ', 'see'), await transform('', 'see', { modesTidy: false }), await transform('', 'see', { modesTemplates: { ...NO_TEMPLATES, see: '*studies {{input}}*' } })];
check('See with nothing typed (or only spaces) looks around, with tidy off and with an own wording too', got.every((g) => g === 'You look around.'), JSON.stringify(got));

// ---------- End to end ----------

const chatLength = () => page.evaluate(() => SillyTavern.getContext().chat.length);
const box = () => page.evaluate(() => document.getElementById('send_textarea').value);
// The messages a send added (only messages this test made are read): who and what
const added = (before) => page.evaluate((before) => SillyTavern.getContext().chat.slice(before)
    .map((m) => ({ user: !!m.is_user, type: m.extra?.type ?? '', mes: m.mes })), before);
const userTexts = (list) => list.filter((m) => m.user).map((m) => m.mes);
// A welcome notice that comes up after the helper clicked its "Got it" (another extension's, late when the
// sandbox is busy) would take the clicks and keys below, so a showing "Got it" is clicked first, the helper's way
const dismissNotice = async () => {
    const dismissed = await page.evaluate(() => {
        const button = [...document.querySelectorAll('button, .menu_button')].find((b) => /Got it/i.test(b.textContent) && b.getClientRects().length);
        button?.click();
        return !!button;
    });
    if (dismissed) await page.waitForTimeout(400);
};
// A tap on the phone, a mouse click on a desktop
const click = async (selector) => {
    await dismissNotice();
    await (phone ? page.tap(selector) : page.click(selector));
};
const picked = () => page.evaluate(() => document.querySelector('#forge-modes [aria-checked="true"]')?.dataset.mode ?? '');
const pick = async (mode) => {
    if ((await picked()) !== mode) await click(`#forge-modes [data-mode="${mode}"]`);
    await page.waitForTimeout(150);
};
// Waits until at least `count` messages were added after `before` and the (fake) reply is done, or `wait`
// runs out. The check is a plain function (Playwright does not wait for a promise), so SillyTavern's
// script.js is put on a global once, here, for it to read.
await page.evaluate(async () => { globalThis.testST = await import('/script.js'); });
const settle = async (before, count = 1, wait = 8000) => {
    await page.waitForFunction(({ before, count }) => SillyTavern.getContext().chat.length >= before + count && !globalThis.testST.isGenerating() && !document.body.dataset.generating,
        { before, count }, { timeout: wait, polling: 100 }).catch(() => {});
    await page.waitForTimeout(400);
};
const sendButtonShown = () => page.waitForSelector('#send_but', { state: 'visible', timeout: 5000 }).catch(() => {});
// Types into the message box and sends it: 'enter' (Enter in the box), 'button' (a click or tap on the
// send button) or 'script' (a script clicks the send button, as Quick Reply does). Returns what was added.
const send = async (text, how = 'enter', count = 1, wait = 8000) => {
    await dismissNotice();
    const before = await chatLength();
    if (how === 'script') {
        await page.evaluate((text) => {
            document.getElementById('send_textarea').value = text;
            document.getElementById('send_but').click();
        }, text);
    } else {
        await page.fill('#send_textarea', text);
        if (how === 'enter') await page.press('#send_textarea', 'Enter');
        else {
            await sendButtonShown();
            await click('#send_but');
        }
    }
    await settle(before, count, wait);
    return added(before);
};

// The sandbox's test seed answers SillyTavern's generate requests in the page with an error (so no model is
// ever called), and the helper's own answer, which counts them in `held`, is never reached. This test answers
// them in the page with a made-up reply instead, and counts them here (the request still never leaves the page).
await page.evaluate(() => {
    globalThis.testReplies = 0;
    const answered = window.fetch;
    window.fetch = (input, init) => {
        if (/\/api\/backends\/[^/]+\/generate/.test(String(input?.url ?? input))) {
            globalThis.testReplies++;
            const reply = { choices: [{ message: { role: 'assistant', content: 'Test reply.' } }] };
            return Promise.resolve(new Response(JSON.stringify(reply), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return answered(input, init);
    };
});
const replies = () => page.evaluate(() => globalThis.testReplies);
// Which kinds of reply SillyTavern started (its own GENERATION_STARTED event; dry runs, which only count
// tokens, left out)
await page.evaluate(() => {
    globalThis.testStarted = [];
    const { eventSource, eventTypes } = SillyTavern.getContext();
    globalThis.testOnStarted = (type, _options, dryRun) => { if (!dryRun) globalThis.testStarted.push(type); };
    eventSource.on(eventTypes.GENERATION_STARTED, globalThis.testOnStarted);
});
const started = () => page.evaluate(() => globalThis.testStarted.splice(0));
// Toasts showing now with this text
const toasts = (text) => page.evaluate((text) => [...document.querySelectorAll('#toast-container .toast')].filter((t) => t.textContent.includes(text)).length, text);
const clearToasts = async () => {
    await page.evaluate(() => { toastr.clear(); document.querySelectorAll('#toast-container .toast').forEach((t) => t.remove()); });
};

// For a step, SillyTavern.getContext() hands out the real context with one change: what modes.js looks up
// there (the chat that is open, or the imagine command) is a stand-in. SillyTavern itself is not changed,
// and the real getContext is put back after.
const standIn = (which) => page.evaluate((which) => {
    globalThis.testRealGetContext ??= SillyTavern.getContext;
    globalThis.testImagine = [];
    globalThis.testExecuted = [];
    SillyTavern.getContext = function () {
        const context = globalThis.testRealGetContext.apply(this, arguments);
        if (which === 'no chat') return Object.create(context, { getCurrentChatId: { value: () => undefined } });
        const commands = { ...context.SlashCommandParser.commands };
        delete commands.imagine;
        // the stand-in imagine records what it is given and makes no picture
        const parser = { SlashCommandParser: { value: Object.create(context.SlashCommandParser, { commands: { value: commands } }) } };
        if (which !== 'imagine') return Object.create(context, parser);
        commands.imagine = { name: 'imagine', callback: (args, value) => { globalThis.testImagine.push({ args, value }); return ''; } };
        // A command line run through the context is recorded and not run (the brief's own stand-in)
        return Object.create(context, { ...parser, executeSlashCommandsWithOptions: { value: (...args) => { globalThis.testExecuted.push(args.map(String)); return Promise.resolve(); } } });
    };
}, which);
const realContext = () => page.evaluate(() => { if (globalThis.testRealGetContext) SillyTavern.getContext = globalThis.testRealGetContext; });

await setForge(page, { enabled: true, modes: true, modesActive: '', modesVoice: 'second', modesTidy: true, modesStoryAs: 'narration', modesSeeAs: 'describe', modesTemplates: { ...NO_TEMPLATES } });
await fakeConnection(page);
await page.waitForSelector('#send_but:not(.displayNone)', { timeout: 5000 }).catch(() => {});
const NARRATOR = await page.evaluate(() => globalThis.testST.system_message_types.NARRATOR);

// ---------- 2 and 3. Story as narration ----------

await pick('story');
let repliesBefore = await replies();
await started();
let list = await send('The rain stops.', 'enter', 2);
check('Story, Enter: the first message added is a narrator message reading "The rain stops."', list[0]?.user === false && list[0]?.type === NARRATOR && list[0]?.mes === 'The rain stops.', JSON.stringify(list[0]));
check('no user message with that text was added', !userTexts(list).includes('The rain stops.') && userTexts(list).length === 0, JSON.stringify(userTexts(list)));
check('the message box is empty', (await box()) === '', JSON.stringify(await box()));
// Brief step 3, changed: the sandbox's seed answers generate calls inside the page, so the helper's `held`
// list never shows one (see the note above). The reply is counted where this test answers it instead.
let kinds = await started();
check('then a normal reply was asked for (answered in the page) and came after the narration', (await replies()) === repliesBefore + 1 && kinds.join() === 'normal' && list.length === 2 && list[1].user === false && list[1].type !== NARRATOR,
    `${(await replies()) - repliesBefore} asked, started: ${kinds.join() || 'none'}, ${list.length} added`);
check('(the helper\'s held list shows no generate call, as the seed answers it first)', !held.some((p) => p.includes('/generate')));

// The same from the send button (a tap on the phone)
repliesBefore = await replies();
list = await send('The wind drops.', 'button', 2);
check('Story, send button: narration "The wind drops.", then a reply', list[0]?.type === NARRATOR && list[0]?.mes === 'The wind drops.' && userTexts(list).length === 0 && (await replies()) === repliesBefore + 1, JSON.stringify(list.map((m) => m.type || (m.user ? 'user' : 'reply'))));

// A second Enter while the narration is still being saved (the chat save is held back a second here, in the
// page) starts no reply of its own: one narration, one reply
await page.evaluate(() => {
    const answered = window.fetch;
    globalThis.testFetchBeforeSlowSave = answered;
    window.fetch = async (input, init) => {
        if (/\/api\/chats\/save/.test(String(input?.url ?? input))) await new Promise((done) => setTimeout(done, 1000));
        return answered(input, init);
    };
});
repliesBefore = await replies();
await started();
let before = await chatLength();
await page.fill('#send_textarea', 'The rain stops.');
await page.press('#send_textarea', 'Enter');
await page.press('#send_textarea', 'Enter');
await settle(before, 2);
await page.waitForTimeout(1500);
await page.evaluate(() => { window.fetch = globalThis.testFetchBeforeSlowSave; });
list = await added(before);
kinds = await started();
check('a second Enter while the narration is being saved starts no second reply', list.filter((m) => m.type === NARRATOR).length === 1 && userTexts(list).length === 0 && (await replies()) === repliesBefore + 1 && kinds.join() === 'normal',
    `${list.length} added, ${(await replies()) - repliesBefore} asked, started: ${kinds.join() || 'none'}`);

// Never while SillyTavern is generating (its own flag, set here as a reply would set it)
await page.evaluate(() => globalThis.testST.setSendButtonState(true));
before = await chatLength();
await page.fill('#send_textarea', 'The rain stops.');
await page.press('#send_textarea', 'Enter');
await page.waitForTimeout(800);
check('while SillyTavern is generating, Story adds nothing and leaves the box as typed', (await chatLength()) === before && (await box()) === 'The rain stops.', JSON.stringify(await box()));
await page.evaluate(() => globalThis.testST.setSendButtonState(false));
await page.fill('#send_textarea', '');

// A send clicked by a script (as Quick Reply does) is never touched: a plain message
list = await send('The rain stops.', 'script', 1);
check('Story: a send clicked by a script goes in as typed, as a user message', JSON.stringify(userTexts(list)) === '["The rain stops."]' && !list.some((m) => m.type === NARRATOR), JSON.stringify(userTexts(list)));

// With no chat open (a stand-in for the open chat), Story does not narrate: it is sent as your own message
await standIn('no chat');
list = await send('The rain stops.', 'enter', 1);
await realContext();
check('with no chat open, Story is not narrated (sent as your own message)', JSON.stringify(userTexts(list)) === '["The rain stops."]' && !list.some((m) => m.type === NARRATOR), JSON.stringify(userTexts(list)));

// ---------- 4. Story as my own message ----------

await setForge(page, { modesStoryAs: 'message' });
list = await send('  The rain stops.  ', 'enter', 1);
check('Story as "my own message": the newest user message is "The rain stops." (trimmed), no narration', JSON.stringify(userTexts(list)) === '["The rain stops."]' && !list.some((m) => m.type === NARRATOR), JSON.stringify(userTexts(list)));
await setForge(page, { modesStoryAs: 'narration' });

// ---------- 5 and 6. See as a description ----------

await pick('see');
list = await send('the door', 'enter', 1);
check('See, Enter: the newest user message is "You look at the door."', JSON.stringify(userTexts(list)) === '["You look at the door."]', JSON.stringify(userTexts(list)));
list = await send('', 'enter', 1);
check('See with an empty box, Enter: the newest user message is "You look around."', JSON.stringify(userTexts(list)) === '["You look around."]', JSON.stringify(userTexts(list)));
list = await send('', 'button', 1);
check('See with an empty box, send button: "You look around." too', JSON.stringify(userTexts(list)) === '["You look around."]', JSON.stringify(userTexts(list)));
await setForge(page, { modesVoice: 'first' });
list = await send('the door', 'enter', 1);
check('See in the I voice: "I look at the door."', JSON.stringify(userTexts(list)) === '["I look at the door."]', JSON.stringify(userTexts(list)));
await setForge(page, { modesVoice: 'second' });

// ---------- 7. See as a picture, imagine not registered ----------

const imagineThere = await page.evaluate(() => typeof SillyTavern.getContext().SlashCommandParser?.commands?.imagine?.callback === 'function');
console.log(`(the sandbox ${imagineThere ? 'has' : 'does not have'} the imagine command)`);
await setForge(page, { modesSeeAs: 'picture' });
await clearToasts();
await standIn('no imagine');
list = await send('the door', 'enter', 1);
const fallbackToasts = await toasts(FALLBACK);
await realContext();
check('See as a picture without imagine: one toast says so', fallbackToasts === 1, `${fallbackToasts} toasts`);
check('and the description form is sent', JSON.stringify(userTexts(list)) === '["You look at the door."]', JSON.stringify(userTexts(list)));

// ---------- 8. See as a picture, imagine registered ----------

const imagine = async (text, how = 'enter', wait = 2500) => {
    await standIn('imagine');
    repliesBefore = await replies();
    const result = await send(text, how, 1, wait);
    const calls = await page.evaluate(() => ({
        imagine: globalThis.testImagine.map((c) => ({ value: c.value, args: Object.keys(c.args) })),
        executed: globalThis.testExecuted,
    }));
    await realContext();
    return { list: result, ...calls, box: await box(), replies: (await replies()) - repliesBefore };
};
await clearToasts();
const TYPED = 'a door | /echo x {{user}}';
let r = await imagine(TYPED);
check('See as a picture: imagine ran once, with the whole typed text as its argument', r.imagine.length === 1 && r.imagine[0].value === TYPED, JSON.stringify(r.imagine));
const echoed = await page.evaluate(() => `x ${SillyTavern.getContext().name1}`);
check('the text reached it without a command line: nothing was parsed, so /echo did not run and {{user}} stayed as typed', r.executed.length === 0 && r.imagine[0]?.args.length === 0 && (await toasts(echoed)) === 0 && (await toasts('x {{user}}')) === 0, `${r.executed.length} command lines run, args ${JSON.stringify(r.imagine[0]?.args)}`);
check('no message was added, no reply was asked for, and the box is empty', r.list.length === 0 && r.replies === 0 && r.box === '', `${r.list.length} added, ${r.replies} replies, box ${JSON.stringify(r.box)}`);
check('no toast about Image Generation', (await toasts(FALLBACK)) === 0);
// Text a "/imagine …" command line could not carry whole: a named argument, quotes, a closure, {{trim}}
const tricky = ['x=1 the door', '"quoted" door', '{: /echo hi :} door', 'a {{trim}} b', 'a \\{ b'];
const reached = [];
for (const text of tricky) reached.push((await imagine(text)).imagine[0]?.value);
check('so are a named argument, quotes, a closure, {{trim}} and a backslash', JSON.stringify(reached) === JSON.stringify(tricky), JSON.stringify(reached));
r = await imagine('the old door', 'button');
check('the send button asks for a picture the same way', r.imagine.length === 1 && r.imagine[0].value === 'the old door' && r.list.length === 0, JSON.stringify(r.imagine));
// An empty box asks for no picture (imagine needs words); See looks around instead
r = await imagine('', 'enter', 8000);
check('See as a picture with an empty box: no picture is asked for; "You look around." is sent', r.imagine.length === 0 && JSON.stringify(userTexts(r.list)) === '["You look around."]', JSON.stringify(userTexts(r.list)));
await setForge(page, { modesSeeAs: 'describe' });

// ---------- Settings ----------

await setForge(page, { modes: false, modesActive: '' });
await click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);
const controls = () => page.evaluate(() => {
    const read = (id) => {
        const select = document.getElementById(id);
        let heading = select?.closest('label')?.previousElementSibling;
        while (heading && heading.tagName !== 'H4') heading = heading.previousElementSibling;
        return {
            under: heading?.textContent.trim(),
            label: select?.closest('label')?.querySelector('span')?.textContent.trim(),
            options: select ? [...select.options].map((o) => `${o.value}=${o.textContent}`).join(', ') : '',
            value: select?.value,
            disabled: !!select?.disabled,
        };
    };
    return { story: read('forge-ui-modes-story-as'), see: read('forge-ui-modes-see-as') };
});
let ui = await controls();
check('the Message box section has "Story goes in as": narration / my own message', ui.story.under === 'Message box' && ui.story.label === 'Story goes in as' && ui.story.options === 'narration=narration, message=my own message' && ui.story.value === 'narration', `${ui.story.under}: ${ui.story.label} (${ui.story.options})`);
check('and "See asks for": a description / a picture', ui.see.under === 'Message box' && ui.see.label === 'See asks for' && ui.see.options === 'describe=a description, picture=a picture' && ui.see.value === 'describe', `${ui.see.label} (${ui.see.options})`);
check('with the modes off, both are greyed out (disabled)', ui.story.disabled && ui.see.disabled);
await click('#forge-ui-modes');
await page.waitForTimeout(300);
ui = await controls();
check('ticking the modes on makes them usable', !ui.story.disabled && !ui.see.disabled);
const setting = (key) => page.evaluate(async (key) => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi[key], key);
const savesBefore = held.filter((p) => p.endsWith('/api/settings/save')).length;
await page.selectOption('#forge-ui-modes-story-as', 'message');
await page.selectOption('#forge-ui-modes-see-as', 'picture');
await page.waitForTimeout(1500);
check('choosing "my own message" and "a picture" sets both', (await setting('modesStoryAs')) === 'message' && (await setting('modesSeeAs')) === 'picture');
check('and saves them', held.filter((p) => p.endsWith('/api/settings/save')).length > savesBefore);

// Both travel in a look file (bible section 7)
const lookKeys = await page.evaluate(async (url) => {
    const { modesStoryAs, modesSeeAs } = (await import(url)).lookKeys;
    return { modesStoryAs, modesSeeAs };
}, MODES_JS);
check('lookKeys: modesStoryAs (narration or message), modesSeeAs (describe or picture)', JSON.stringify(lookKeys) === JSON.stringify({ modesStoryAs: { type: 'enum', values: ['narration', 'message'] }, modesSeeAs: { type: 'enum', values: ['describe', 'picture'] } }), JSON.stringify(lookKeys));
const defaults = await page.evaluate(async (url) => {
    const { modesStoryAs, modesSeeAs } = (await import(url)).defaults;
    return { modesStoryAs, modesSeeAs };
}, MODES_JS);
check('the defaults are narration and a description', defaults.modesStoryAs === 'narration' && defaults.modesSeeAs === 'describe', JSON.stringify(defaults));
const look = { format: 'arcane-forge-ui-look', version: 1, look: { modesStoryAs: 'narration', modesSeeAs: 'describe' } };
await page.setInputFiles('#forge-ui-import-file', { name: 'look.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(look)) });
await page.waitForTimeout(600);
ui = await controls();
check('Import look sets both, and the redrawn settings show them', (await setting('modesStoryAs')) === 'narration' && (await setting('modesSeeAs')) === 'describe' && ui.story.value === 'narration' && ui.see.value === 'describe', `${ui.story.value}, ${ui.see.value}`);
const badLook = { format: 'arcane-forge-ui-look', version: 1, look: { modesStoryAs: 'shout', modesSeeAs: 'smell' } };
await page.setInputFiles('#forge-ui-import-file', { name: 'look.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(badLook)) });
await page.waitForTimeout(600);
check('a look file with other values changes neither', (await setting('modesStoryAs')) === 'narration' && (await setting('modesSeeAs')) === 'describe');
await click('#forge-ui-modes');
await page.waitForTimeout(300);
await click('.arcane-forge-ui-settings .inline-drawer-toggle');
await click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(400);

// ---------- Off ----------

// Modes off with Story and See saved: no trace, and both are sent as typed
await setForge(page, { modes: true, modesActive: 'story', modesStoryAs: 'narration', modesSeeAs: 'picture' });
await setForge(page, { modes: false });
const trace = () => page.evaluate(() => ({ bar: !!document.getElementById('forge-modes'), cls: document.body.classList.contains('forge-modes') }));
let t = await trace();
check('modes off: no bar and no class', !t.bar && !t.cls);
list = await send('The rain stops.', 'enter', 1);
check('modes off with Story saved: sent as typed, as a user message, no narration', JSON.stringify(userTexts(list)) === '["The rain stops."]' && !list.some((m) => m.type === NARRATOR), JSON.stringify(userTexts(list)));
await setForge(page, { modesActive: 'see' });
await standIn('imagine');
list = await send('the door', 'button', 1);
const imagineCalls = await page.evaluate(() => globalThis.testImagine.length);
await realContext();
check('modes off with See as a picture saved: no picture asked for, sent as typed', imagineCalls === 0 && JSON.stringify(userTexts(list)) === '["the door"]', JSON.stringify(userTexts(list)));
await setForge(page, { enabled: false, modes: true, modesActive: 'story' });
t = await trace();
list = await send('The rain stops.', 'enter', 1);
check('main switch off with the modes on: no bar, and Story is sent as typed', !t.bar && !t.cls && JSON.stringify(userTexts(list)) === '["The rain stops."]' && !list.some((m) => m.type === NARRATOR), JSON.stringify(userTexts(list)));

// Back to the defaults
await setForge(page, { enabled: true, modes: false, modesActive: '', modesStoryAs: 'narration', modesSeeAs: 'describe' });
await page.evaluate(() => SillyTavern.getContext().eventSource.removeListener(SillyTavern.getContext().eventTypes.GENERATION_STARTED, globalThis.testOnStarted));
await finish();
