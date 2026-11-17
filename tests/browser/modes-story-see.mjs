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
const NO_REPLY = 'Story was added, but its reply could not start while another reply is being generated.';

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
// and the real getContext is put back after. The stand-in imagine can take a while, as a real picture does:
// with `drawing`, it is not done until the test calls testPictureDone() in the page. With `fail`, it then fails.
const standIn = (which, { drawing = false, fail = false } = {}) => page.evaluate(({ which, drawing, fail }) => {
    globalThis.testRealGetContext ??= SillyTavern.getContext;
    globalThis.testImagine = [];
    globalThis.testExecuted = [];
    let done = null;
    const picture = drawing ? new Promise((resolve) => { done = resolve; }) : null;
    globalThis.testPictureDone = () => done?.();
    SillyTavern.getContext = function () {
        const context = globalThis.testRealGetContext.apply(this, arguments);
        if (which === 'no chat') return Object.create(context, { getCurrentChatId: { value: () => undefined } });
        const commands = { ...context.SlashCommandParser.commands };
        delete commands.imagine;
        // the stand-in imagine records what it is given and makes no picture
        const parser = { SlashCommandParser: { value: Object.create(context.SlashCommandParser, { commands: { value: commands } }) } };
        if (which !== 'imagine') return Object.create(context, parser);
        commands.imagine = { name: 'imagine', callback: async (args, value) => {
            globalThis.testImagine.push({ args, value });
            if (picture) await picture;
            if (fail) throw new Error('(test) the stand-in picture failed');
            return '';
        } };
        // A command line run through the context is recorded and not run (the brief's own stand-in)
        return Object.create(context, { ...parser, executeSlashCommandsWithOptions: { value: (...args) => { globalThis.testExecuted.push(args.map(String)); return Promise.resolve(); } } });
    };
}, { which, drawing, fail });
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
// Brief step 3, changed: this test answers generate calls inside the page (see the note above), so the
// helper's `held` list never shows one. The reply is counted where this test answers it instead.
let kinds = await started();
check('then a normal reply was asked for (answered in the page) and came after the narration', (await replies()) === repliesBefore + 1 && kinds.join() === 'normal' && list.length === 2 && list[1].user === false && list[1].type !== NARRATOR,
    `${(await replies()) - repliesBefore} asked, started: ${kinds.join() || 'none'}, ${list.length} added`);

// The same from the send button (a tap on the phone)
repliesBefore = await replies();
list = await send('The wind drops.', 'button', 2);
check('Story, send button: narration "The wind drops.", then a reply', list[0]?.type === NARRATOR && list[0]?.mes === 'The wind drops.' && userTexts(list).length === 0 && (await replies()) === repliesBefore + 1, JSON.stringify(list.map((m) => m.type || (m.user ? 'user' : 'reply'))));

// SillyTavern's chat save, or its server check at the start of a reply, held in the page until the test lets
// it go, so a key can land meanwhile whatever the machine's speed. heldBack() waits until one such request is
// waiting; letGo() lets it (and any others) through, and puts fetch back.
const holdBack = (what) => page.evaluate((what) => {
    globalThis.testFetchBeforeHold ??= window.fetch;
    const answered = globalThis.testFetchBeforeHold;
    const pattern = new RegExp(what);
    let open;
    const gate = new Promise((done) => { open = done; });
    globalThis.testWaiting = 0;
    globalThis.testLetGo = () => {
        open();
        window.fetch = answered;
        delete globalThis.testFetchBeforeHold;
        delete globalThis.testLetGo;
    };
    window.fetch = async (input, init) => {
        if (pattern.test(String(input?.url ?? input))) {
            globalThis.testWaiting++;
            await gate;
        }
        return answered(input, init);
    };
}, what);
const heldBack = () => page.waitForFunction(() => globalThis.testWaiting > 0, null, { timeout: 8000, polling: 50 }).then(() => true, () => false);
const letGo = () => page.evaluate(() => globalThis.testLetGo?.());
const SAVE = '/api/chats/save';
const kindsOf = (list) => JSON.stringify(list.map((m) => (m.user ? `user: ${m.mes}` : m.type || 'reply')));

// A second Enter while the narration is still being saved starts no reply of its own: one narration, one reply
await holdBack(SAVE);
repliesBefore = await replies();
await started();
let before = await chatLength();
await page.fill('#send_textarea', 'The rain stops.');
await page.press('#send_textarea', 'Enter');
await page.press('#send_textarea', 'Enter');
await heldBack();
await letGo();
await settle(before, 2);
await page.waitForTimeout(1500);
list = await added(before);
kinds = await started();
check('a second Enter while the narration is being saved starts no second reply', list.filter((m) => m.type === NARRATOR).length === 1 && userTexts(list).length === 0 && (await replies()) === repliesBefore + 1 && kinds.join() === 'normal',
    `${list.length} added, ${(await replies()) - repliesBefore} asked, started: ${kinds.join() || 'none'}`);

// Nor a second Enter after the narration, while the reply is still checking the server: SillyTavern does not
// count itself as generating until that is done. (It asks for "api/ping", relative.)
await holdBack('api/ping$');
repliesBefore = await replies();
await started();
before = await chatLength();
await page.fill('#send_textarea', 'The rain stops.');
await page.press('#send_textarea', 'Enter');
const pinging = await heldBack();
const generatingYet = await page.evaluate(() => globalThis.testST.isGenerating());
await page.press('#send_textarea', 'Enter');
await page.waitForTimeout(300);
await letGo();
await settle(before, 2);
await page.waitForTimeout(1000);
list = await added(before);
kinds = await started();
check('a second Enter while the reply is still checking the server starts no second reply', pinging && !generatingYet && list.length === 2 && list[0].type === NARRATOR && (await replies()) === repliesBefore + 1 && kinds.join() === 'normal',
    `${kindsOf(list)}, ${(await replies()) - repliesBefore} asked, started: ${kinds.join() || 'none'}, ping held: ${pinging}, generating when it was pressed: ${generatingYet}`);

// Text typed while the narration is being saved is not part of the Story. SillyTavern's reply takes whatever
// is in the box as your own message, so it must not find it there; and nothing typed is lost: it is back in
// the box once the reply is in. First typed only, then typed and sent.
const typedMeanwhile = async (story, meanwhile, label, sendIt) => {
    await dismissNotice();
    await holdBack(SAVE);
    repliesBefore = await replies();
    await started();
    const before = await chatLength();
    await page.fill('#send_textarea', story);
    await page.press('#send_textarea', 'Enter');
    const saving = await heldBack();
    if (sendIt) {
        await page.fill('#send_textarea', meanwhile);
        await page.press('#send_textarea', 'Enter');
    } else await page.type('#send_textarea', meanwhile);
    await letGo();
    await settle(before, 2);
    await page.waitForFunction(() => document.getElementById('send_textarea').value !== '', null, { timeout: 3000, polling: 100 }).catch(() => {});
    const list = await added(before);
    const kinds = await started();
    check(`Story, text ${label} while the narration is being saved: the narration, then the reply, and nothing sent as your own message`,
        saving && list.length === 2 && list[0].type === NARRATOR && list[0].mes === story && list[1].type !== NARRATOR && !list[1].user && (await replies()) === repliesBefore + 1 && kinds.join() === 'normal',
        `${kindsOf(list)}, ${(await replies()) - repliesBefore} asked, started: ${kinds.join() || 'none'}, save held: ${saving}`);
    check(`and what was ${label} is back in the message box once the reply is in`, (await box()) === meanwhile, JSON.stringify(await box()));
    await page.fill('#send_textarea', '');
};
await typedMeanwhile('The rain stops.', 'half typed', 'typed', false);
await typedMeanwhile('The wind drops.', 'A door opens.', 'typed and sent', true);

// Nor text typed after the narration is saved, while the reply is still checking the server (SillyTavern
// reads the box again after that check and would send what it finds as your own message), a typed command
// included: neither is sent or run, and both are back in the box once the reply is in.
const typedWhilePinging = async (meanwhile, label) => {
    await dismissNotice();
    await holdBack('api/ping$');
    repliesBefore = await replies();
    await started();
    const before = await chatLength();
    await page.fill('#send_textarea', 'The rain stops.');
    await page.press('#send_textarea', 'Enter');
    const pinging = await heldBack();
    await page.type('#send_textarea', meanwhile);
    await letGo();
    await settle(before, 2);
    await page.waitForFunction(() => document.getElementById('send_textarea').value !== '', null, { timeout: 3000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(300);
    const list = await added(before);
    const kinds = await started();
    check(`Story, ${label} while the reply checks the server: the narration and the reply only, nothing sent as your own message`,
        pinging && list.length === 2 && list[0].type === NARRATOR && !list[1].user && list[1].type !== NARRATOR && (await replies()) === repliesBefore + 1 && kinds.join() === 'normal',
        `${kindsOf(list)}, ${(await replies()) - repliesBefore} asked, started: ${kinds.join() || 'none'}, ping held: ${pinging}`);
    check(`and the ${label} is back in the message box as typed`, (await box()) === meanwhile, JSON.stringify(await box()));
    await page.fill('#send_textarea', '');
};
await typedWhilePinging('late words', 'text typed');
await typedWhilePinging('/echo leaked', 'command typed');

// Typing that carries on across the reply comes back as one piece, joined as typed: what was set aside while
// the narration was saved, then what was typed while the reply was written, with nothing added between.
{
    await dismissNotice();
    await page.evaluate(({ save }) => {
        const answered = window.fetch;
        const gates = {};
        globalThis.testWaitingFor = {};
        for (const name of ['save', 'reply']) {
            let open;
            gates[name] = { gate: new Promise((done) => { open = done; }), open };
            globalThis.testWaitingFor[name] = 0;
        }
        const which = (url) => (new RegExp(save).test(url) ? 'save' : /\/api\/backends\/[^/]+\/generate/.test(url) ? 'reply' : '');
        window.fetch = async (input, init) => {
            const name = which(String(input?.url ?? input));
            if (name) {
                globalThis.testWaitingFor[name]++;
                await gates[name].gate;
            }
            return answered(input, init);
        };
        globalThis.testOpen = (name) => gates[name].open();
        globalThis.testUnhold = () => { gates.save.open(); gates.reply.open(); window.fetch = answered; };
    }, { save: SAVE });
    const waitFor = (name) => page.waitForFunction((name) => globalThis.testWaitingFor[name] > 0, name, { timeout: 8000, polling: 50 }).then(() => true, () => false);
    repliesBefore = await replies();
    const before = await chatLength();
    await page.fill('#send_textarea', 'The rain stops.');
    await page.press('#send_textarea', 'Enter');
    const saving = await waitFor('save');
    await page.type('#send_textarea', 'I ');
    await page.evaluate(() => globalThis.testOpen('save'));
    const replying = await waitFor('reply');
    await page.type('#send_textarea', 'walk to the door');
    await page.evaluate(() => globalThis.testUnhold());
    await settle(before, 2);
    await page.waitForTimeout(500);
    const list = await added(before);
    check('Story, typing that carries on across the reply: nothing sent as your own message', saving && replying && list.length === 2 && userTexts(list).length === 0,
        `${kindsOf(list)}, save held: ${saving}, reply held: ${replying}`);
    check('and the box holds it joined as typed, with no line break added', (await box()) === 'I walk to the door', JSON.stringify(await box()));
    await page.fill('#send_textarea', '');
}

// If SillyTavern is still writing another reply when the Story's own would start (it waits 10 seconds, as
// /trigger does), a warning says so, as /trigger's does, and no reply is asked for. SillyTavern's own flag is
// set while the narration is being saved, as another reply would set it.
await clearToasts();
await holdBack(SAVE);
repliesBefore = await replies();
await started();
before = await chatLength();
await page.fill('#send_textarea', 'The rain stops.');
await page.press('#send_textarea', 'Enter');
const saving = await heldBack();
await page.evaluate(() => globalThis.testST.setSendButtonState(true));
await letGo();
const warned = await page.waitForFunction((text) => [...document.querySelectorAll('#toast-container .toast')].some((t) => t.textContent.includes(text)), NO_REPLY, { timeout: 15000, polling: 200 }).then(() => true, () => false);
await page.evaluate(() => globalThis.testST.setSendButtonState(false));
await page.waitForTimeout(400);
list = await added(before);
kinds = await started();
check('Story, another reply still being written 10 seconds on: a warning says the reply could not start, and none is asked for', saving && warned && list.length === 1 && list[0].type === NARRATOR && (await replies()) === repliesBefore && !kinds.length,
    `${warned ? 'warned' : 'no warning'}, ${kindsOf(list)}, ${(await replies()) - repliesBefore} asked, save held: ${saving}`);
await clearToasts();

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

// A real picture takes many seconds; the stand-in is being made until the test says it is done. Meanwhile more
// sends from the box are held back, as SillyTavern holds them while a command typed in the box runs: a second
// Enter or tap on the emptied box would otherwise be See with an empty box, and send "You look around." and
// ask for a reply.
const enterKey = () => page.press('#send_textarea', 'Enter');
const sendTap = () => (phone ? page.tap('#send_but') : page.click('#send_but'));
const pictures = () => page.evaluate(() => globalThis.testImagine.map((c) => c.value));
const whileDrawing = async (label, sends, options = {}) => {
    await dismissNotice();
    await standIn('imagine', { drawing: true, ...options });
    repliesBefore = await replies();
    const before = await chatLength();
    await page.fill('#send_textarea', 'the far door');
    await sends();
    // time for a send that got through to show, then the picture is done
    await page.waitForTimeout(1200);
    await page.evaluate(() => globalThis.testPictureDone());
    await page.waitForTimeout(500);
    const asked = await pictures();
    const list = await added(before);
    const replied = (await replies()) - repliesBefore;
    check(`See as a picture, ${label}: one picture asked for, nothing sent, no reply`, asked.length === 1 && asked[0] === 'the far door' && list.length === 0 && replied === 0 && (await box()) === '',
        `pictures ${JSON.stringify(asked)}, added ${kindsOf(list)}, ${replied} replies`);
};
// The hold ends with the picture: the next send asks for one again
const nextSendWorks = async (label) => {
    await page.fill('#send_textarea', 'the window');
    await enterKey();
    await page.waitForTimeout(400);
    const asked = await pictures();
    check(label, asked.length === 2 && asked[1] === 'the window', JSON.stringify(asked));
    await realContext();
};
await whileDrawing('a quick double Enter', async () => { await enterKey(); await enterKey(); });
await nextSendWorks('when the picture is done, sends go through again: the next Enter asks for a picture');
await whileDrawing('a second Enter 300 ms later', async () => { await enterKey(); await page.waitForTimeout(300); await enterKey(); });
await realContext();
await sendButtonShown();
await whileDrawing(phone ? 'a double tap on the send button' : 'a double click on the send button', async () => { await sendTap(); await sendTap(); });
await realContext();
await whileDrawing('a picture that fails, with a second Enter 300 ms later', async () => { await enterKey(); await page.waitForTimeout(300); await enterKey(); }, { fail: true });
await nextSendWorks('a picture that fails ends the hold too: the next Enter asks for a picture');
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
