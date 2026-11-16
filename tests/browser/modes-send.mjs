// Do and Say (M2): with a mode picked, what you type in the message box is rewritten just before SillyTavern
// sends it. The rewriting does not depend on the screen size, so this test has no phone run.
// Usage: node tests/browser/modes-send.mjs
import { fakeConnection, openForge, setForge } from './_harness.mjs';

const { page, held, check, finish } = await openForge();
const MODES_JS = '/scripts/extensions/third-party/arcane-forge-ui/modes.js';
const NO_TEMPLATES = { do: '', say: '', see: '' };

// Bible section 6, "What each mode sends": every Do and Say row, as [mode, typed, second person, first person]
const TABLE = [
    ['do', 'open the door', 'You open the door.', 'I open the door.'],
    ['do', 'Open the door!', 'You open the door!', 'I open the door!'],
    ['do', 'you open the door', 'You open the door.', 'You open the door.'],
    ['do', "I'm leaving", "I'm leaving.", "I'm leaving."],
    ['do', 'NASA badge out, walk in', 'You NASA badge out, walk in.', 'I NASA badge out, walk in.'],
    ['say', 'hello there', 'You say, "Hello there."', 'I say, "Hello there."'],
    ['say', '"Who goes there?"', 'You say, "Who goes there?"', 'I say, "Who goes there?"'],
    ['say', 'You say hi', 'You say hi.', 'You say hi.'],
];

// Calls modes.js's transform in the page with Forge UI's default settings plus the given ones
const transform = (text, mode, settings = {}) => page.evaluate(async ({ url, text, mode, settings }) => {
    const { transform } = await import(url);
    return transform(text, mode, { modesVoice: 'second', modesTidy: true, modesTemplates: { do: '', say: '', see: '' }, ...settings });
}, { url: MODES_JS, text, mode, settings });

// 1. The table, in both voices
for (const [mode, typed, second, first] of TABLE) {
    const label = mode === 'do' ? 'Do' : 'Say';
    let got = await transform(typed, mode);
    check(`${label}, You: ${JSON.stringify(typed)} gives ${JSON.stringify(second)}`, got === second, JSON.stringify(got));
    got = await transform(typed, mode, { modesVoice: 'first' });
    check(`${label}, I: ${JSON.stringify(typed)} gives ${JSON.stringify(first)}`, got === first, JSON.stringify(got));
}

// 2. Tidy off: the template only
let got = await transform('open the door', 'do', { modesTidy: false });
check('tidy off: Do "open the door" gives "You open the door"', got === 'You open the door', JSON.stringify(got));
got = await transform('hello there', 'say', { modesTidy: false });
check('tidy off: Say "hello there" gives You say, "hello there"', got === 'You say, "hello there"', JSON.stringify(got));

// 3. The owner's own wording
got = await transform('open the door', 'do', { modesTemplates: { ...NO_TEMPLATES, do: '*{{input}}*' } });
check('a Do wording of *{{input}}* gives "*open the door.*"', got === '*open the door.*', JSON.stringify(got));
got = await transform('open the door', 'do', { modesVoice: 'first', modesTemplates: { ...NO_TEMPLATES, do: '*{{input}}*' } });
check('the own wording is used in the I voice too', got === '*open the door.*', JSON.stringify(got));
got = await transform('hello', 'say', { modesTemplates: { ...NO_TEMPLATES, say: '{{user}}: "{{input}}"' } });
check('SillyTavern\'s own macros in the wording are left for SillyTavern', got === '{{user}}: "Hello."', JSON.stringify(got));
got = await transform('open the door', 'do', { modesTemplates: { ...NO_TEMPLATES, do: 'Nothing here' } });
check('a wording without {{input}} is not used (the text would be lost)', got === 'You open the door.', JSON.stringify(got));

// The tidy rules' finer points
got = await transform('  open the door\nslowly  ', 'do');
check('the ends are trimmed and a line break inside is kept', got === 'You open the door\nslowly.', JSON.stringify(got));
got = await transform('“hi there”', 'say');
check('Say takes off curly quotes round the whole text', got === 'You say, "Hi there."', JSON.stringify(got));
got = await transform("'hi there'", 'say');
check('Say takes off single quotes round the whole text', got === 'You say, "Hi there."', JSON.stringify(got));
got = await transform('pay $& go', 'do');
check('nothing in the text is read as a replacement pattern', got === 'You pay $& go.', JSON.stringify(got));
got = await transform('Ice the cake', 'do');
check('a word that only starts with "I" is not the word I', got === 'You ice the cake.', JSON.stringify(got));
got = [await transform('the door', 'see'), await transform('The rain stops', 'story')];
check('Story and See come back unchanged for now', got[0] === 'the door' && got[1] === 'The rain stops', JSON.stringify(got));

// ---------- End to end ----------

// What the message box held at each input event, to see whether anything rewrote it
await page.evaluate(() => {
    globalThis.testBoxValues = [];
    document.addEventListener('input', (event) => {
        if (event.target?.id === 'send_textarea') globalThis.testBoxValues.push(event.target.value);
    }, true);
});
const chatLength = () => page.evaluate(() => SillyTavern.getContext().chat.length);
const box = () => page.evaluate(() => document.getElementById('send_textarea').value);
const pick = async (mode) => {
    await page.click(`#forge-modes [data-mode="${mode}"]`);
    await page.waitForTimeout(150);
};
// Waits until SillyTavern has added a message and finished the (fake) reply, or until it is clear nothing came
const settle = async (before) => {
    await page.waitForFunction(async (before) => {
        const st = await import('/script.js');
        return SillyTavern.getContext().chat.length > before && !st.isGenerating();
    }, before, { timeout: 8000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(400);
};
// Types into the message box and sends it with Enter, the send button, or a script (as Quick Reply does).
// Returns the text of the user messages that send added (only messages this test typed are read).
const send = async (text, how = 'enter') => {
    const before = await chatLength();
    await page.evaluate(() => { globalThis.testBoxValues = []; });
    if (how === 'script') {
        await page.evaluate((text) => {
            document.getElementById('send_textarea').value = text;
            document.getElementById('send_but').click();
        }, text);
    } else {
        await page.fill('#send_textarea', text);
        if (how === 'enter') await page.press('#send_textarea', 'Enter');
        else await page.click('#send_but');
    }
    await settle(before);
    return page.evaluate((before) => SillyTavern.getContext().chat.slice(before).filter((m) => m.is_user).map((m) => m.mes), before);
};
const only = (list, text) => list.length === 1 && list[0] === text;

// The sandbox's test seed answers SillyTavern's generate requests in the page with an error, so that no real
// model is ever called. A send would then end in a script error, so this test answers them in the page with
// a made-up reply instead (the request still never leaves the page). It counts them.
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

await setForge(page, { enabled: true, modes: true, modesActive: '', modesVoice: 'second', modesTidy: true, modesTemplates: { ...NO_TEMPLATES } });
await fakeConnection(page);
await page.waitForSelector('#send_but:not(.displayNone)', { timeout: 5000 }).catch(() => {});

// 4. Do, Enter
await pick('do');
let sent = await send('open the door');
check('Do, Enter: the newest user message is "You open the door."', only(sent, 'You open the door.'), JSON.stringify(sent));
check('the message box is empty after the send', (await box()) === '', JSON.stringify(await box()));
check('the send went on to SillyTavern, which asked for a reply (answered in the page)', (await replies()) === 1, `${await replies()} asked`);

// 5. Say, the send button
await pick('say');
sent = await send('hello there', 'button');
check('Say, send button: the newest user message is You say, "Hello there."', only(sent, 'You say, "Hello there."'), JSON.stringify(sent));

// 6. No mode
await pick('say');
check('clicking Say again leaves no mode picked', (await page.evaluate(() => document.querySelectorAll('#forge-modes [aria-checked="true"]').length)) === 0);
sent = await send('open the door');
check('no mode: the newest user message is "open the door"', only(sent, 'open the door'), JSON.stringify(sent));

// 7. A command is never touched
await pick('do');
sent = await send('/echo test');
const seen = await page.evaluate(() => globalThis.testBoxValues);
check('Do, "/echo test": no user message is added', sent.length === 0, JSON.stringify(sent));
check('and the text was not rewritten before SillyTavern ran it', seen.every((v) => v === '/echo test' || v === ''), JSON.stringify(seen));

// Quick Reply puts its text in the box and clicks the send button from code: that is never touched
sent = await send('open the door', 'script');
check('a send clicked by a script (as Quick Reply does) is not rewritten', only(sent, 'open the door'), JSON.stringify(sent));

// Shift+Enter is a new line, not a send
await page.fill('#send_textarea', 'open the door');
await page.press('#send_textarea', 'Shift+Enter');
await page.waitForTimeout(300);
check('Shift+Enter (a new line) does not rewrite the box', (await box()).startsWith('open the door'), JSON.stringify(await box()));
await page.fill('#send_textarea', '');

// SillyTavern's own "does Enter send?" decides (as on a phone, where Enter is a new line). Its setting is
// changed in this page only, never saved, and put back.
const enterSends = await page.evaluate(async () => {
    const { power_user, send_on_enter_options } = await import('/scripts/power-user.js');
    globalThis.testSendOnEnter = power_user.send_on_enter;
    power_user.send_on_enter = send_on_enter_options.DISABLED;
    return (await import('/scripts/RossAscends-mods.js')).shouldSendOnEnter();
});
await page.fill('#send_textarea', 'open the door');
await page.press('#send_textarea', 'Enter');
await page.waitForTimeout(400);
check('with SillyTavern\'s "send on Enter" off, Enter (a new line) does not rewrite the box', enterSends === false && (await box()).startsWith('open the door'), JSON.stringify(await box()));
await page.evaluate(async () => { (await import('/scripts/power-user.js')).power_user.send_on_enter = globalThis.testSendOnEnter; });
await page.fill('#send_textarea', '');

// Never while SillyTavern is generating (its own flag, set here as a reply would set it)
await page.evaluate(async () => (await import('/script.js')).setSendButtonState(true));
await page.fill('#send_textarea', 'open the door');
await page.press('#send_textarea', 'Enter');
await page.waitForTimeout(400);
check('while SillyTavern is generating, Enter leaves the box as typed', (await box()) === 'open the door', JSON.stringify(await box()));
await page.evaluate(async () => (await import('/script.js')).setSendButtonState(false));
await page.fill('#send_textarea', '');

// Never twice: a send that does not go through (no connection) leaves the rewrite in the box, and the next
// Enter sends it as it is. The wording here would grow if it were applied again.
await setForge(page, { modesTemplates: { ...NO_TEMPLATES, do: '*{{input}}*' } });
await page.evaluate(async () => (await import('/script.js')).setOnlineStatus('no_connection'));
await page.waitForTimeout(400);
let before = await chatLength();
await page.fill('#send_textarea', 'open the door');
await page.press('#send_textarea', 'Enter');
await page.waitForTimeout(1200);
const firstTry = await box();
await page.press('#send_textarea', 'Enter');
await page.waitForTimeout(1200);
const secondTry = await box();
check('a send that did not go through leaves the rewrite in the box', firstTry === '*open the door.*', JSON.stringify(firstTry));
check('pressing Enter again does not rewrite it a second time', secondTry === '*open the door.*' && (await chatLength()) === before, JSON.stringify(secondTry));
await fakeConnection(page);
await page.waitForSelector('#send_but:not(.displayNone)', { timeout: 5000 }).catch(() => {});
sent = await send(secondTry);
check('once connected, it is sent as it is', only(sent, '*open the door.*'), JSON.stringify(sent));
await setForge(page, { modesTemplates: { ...NO_TEMPLATES } });

// TauriTavern's expanded editor (a stand-in for its modal dialog): its own Send is not shaped, so the bar
// steps aside while it is open
const barShown = () => page.evaluate(() => {
    const bar = document.getElementById('forge-modes');
    return !!bar && getComputedStyle(bar).display !== 'none';
});
await page.evaluate(() => {
    const dialog = document.createElement('dialog');
    dialog.id = 'tt-chat-input-editor';
    dialog.className = 'tt-chat-input-editor';
    document.body.append(dialog);
    dialog.showModal();
});
await page.waitForTimeout(150);
check('with TauriTavern\'s expanded editor open, the bar is hidden (stand-in)', !(await barShown()));
await page.evaluate(() => document.getElementById('tt-chat-input-editor').close());
await page.waitForTimeout(150);
check('closing the editor brings the bar back', await barShown());
await page.evaluate(() => document.getElementById('tt-chat-input-editor').remove());

// 9. The I voice
await setForge(page, { modesVoice: 'first' });
sent = await send('open the door');
check('I voice, Do, Enter: the newest user message is "I open the door."', only(sent, 'I open the door.'), JSON.stringify(sent));
await setForge(page, { modesVoice: 'second' });

// 8. Modes off (Do stays the saved choice): sent unchanged, so no listener of ours is left
await setForge(page, { modes: false });
check('modes off: the bar is gone and Do is still the saved choice', !(await page.evaluate(() => !!document.getElementById('forge-modes'))) && (await page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.modesActive)) === 'do');
sent = await send('open the door');
check('modes off: "open the door" with Enter is sent unchanged', only(sent, 'open the door'), JSON.stringify(sent));
sent = await send('hello there', 'button');
check('modes off: "hello there" with the send button is sent unchanged', only(sent, 'hello there'), JSON.stringify(sent));
await setForge(page, { enabled: false, modes: true });
sent = await send('open the door');
check('main switch off with the modes on: sent unchanged', only(sent, 'open the door'), JSON.stringify(sent));
await setForge(page, { enabled: true, modes: false, modesActive: '' });

// ---------- Settings ----------

await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);
const controls = () => page.evaluate(() => {
    const voice = document.getElementById('forge-ui-modes-voice');
    const tidy = document.getElementById('forge-ui-modes-tidy');
    const fields = ['do', 'say', 'see'].map((key) => document.getElementById(`forge-ui-modes-template-${key}`));
    const fold = document.getElementById('forge-ui-modes-wording');
    let heading = voice?.closest('label')?.previousElementSibling;
    while (heading && heading.tagName !== 'H4') heading = heading.previousElementSibling;
    return {
        under: heading?.textContent.trim(),
        voiceLabel: voice?.closest('label')?.querySelector('span')?.textContent.trim(),
        voiceOptions: voice ? [...voice.options].map((o) => `${o.value}=${o.textContent}`).join(', ') : '',
        voice: voice?.value,
        tidyLabel: tidy?.closest('label')?.textContent.trim(),
        tidy: tidy?.checked,
        foldTitle: fold?.querySelector('summary')?.textContent.trim(),
        foldOpen: fold?.open,
        placeholders: fields.map((f) => f?.placeholder),
        values: fields.map((f) => f?.value),
        maxLengths: fields.map((f) => f?.maxLength),
        disabled: [voice, tidy, ...fields].map((c) => !!c?.disabled),
    };
});
let ui = await controls();
check('the Message box section has "Write my actions as" with You … and I …', ui.under === 'Message box' && ui.voiceLabel === 'Write my actions as' && ui.voiceOptions === 'second=You …, first=I …' && ui.voice === 'second', `${ui.under}: ${ui.voiceLabel} (${ui.voiceOptions})`);
check('and "Tidy what I type (first letter, full stop, quotes)", ticked', ui.tidyLabel === 'Tidy what I type (first letter, full stop, quotes)' && ui.tidy === true, ui.tidyLabel);
check('and a closed fold "Advanced: my own wording"', ui.foldTitle === 'Advanced: my own wording' && ui.foldOpen === false, ui.foldTitle);
check('its three fields show the default wording, are empty, and take 200 characters', ui.placeholders.join(' | ') === 'You {{input}} | You say, "{{input}}" | You look at {{input}}' && ui.values.every((v) => v === '') && ui.maxLengths.every((n) => n === 200), ui.placeholders.join(' | '));
check('with the modes off, all five are greyed out (disabled)', ui.disabled.every(Boolean), ui.disabled.join(','));
await page.click('#forge-ui-modes');
await page.waitForTimeout(300);
ui = await controls();
check('ticking the modes on makes them usable', ui.disabled.every((d) => !d), ui.disabled.join(','));

const setting = (key) => page.evaluate(async (key) => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi[key], key);
const savesBefore = held.filter((p) => p.endsWith('/api/settings/save')).length;
await page.selectOption('#forge-ui-modes-voice', 'first');
await page.waitForTimeout(300);
ui = await controls();
check('choosing "I …" saves the I voice and the fields show the I wording', (await setting('modesVoice')) === 'first' && ui.placeholders.join(' | ') === 'I {{input}} | I say, "{{input}}" | I look at {{input}}', ui.placeholders.join(' | '));
await page.click('#forge-ui-modes-tidy');
await page.waitForTimeout(300);
check('unticking Tidy saves it off', (await setting('modesTidy')) === false);
await page.click('#forge-ui-modes-wording summary');
await page.fill('#forge-ui-modes-template-do', '*{{input}}*');
await page.waitForTimeout(300);
const templates = await setting('modesTemplates');
check('typing a Do wording saves it, and leaves the others empty', templates?.do === '*{{input}}*' && templates?.say === '' && templates?.see === '', JSON.stringify(templates));
await page.waitForTimeout(1500);
check('the changes are saved', held.filter((p) => p.endsWith('/api/settings/save')).length > savesBefore);

// The voice, the tidying and the wording travel in a look file (bible section 7)
const lookKeys = await page.evaluate(async (url) => (await import(url)).lookKeys, MODES_JS);
check('lookKeys: modesVoice (second or first), modesTidy, modesTemplates (do, say, see; 200 at most)', JSON.stringify(lookKeys) === JSON.stringify({ modesVoice: { type: 'enum', values: ['second', 'first'] }, modesTidy: { type: 'boolean' }, modesTemplates: { type: 'strings', keys: ['do', 'say', 'see'], max: 200 } }), JSON.stringify(lookKeys));
const look = { format: 'arcane-forge-ui-look', version: 1, look: { modesVoice: 'second', modesTidy: true, modesTemplates: { say: '{{user}}: "{{input}}"' } } };
await page.setInputFiles('#forge-ui-import-file', { name: 'look.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(look)) });
await page.waitForTimeout(600);
ui = await controls();
check('Import look sets the voice, the tidying and the Say wording, and keeps the Do wording', (await setting('modesVoice')) === 'second' && (await setting('modesTidy')) === true && JSON.stringify(await setting('modesTemplates')) === JSON.stringify({ do: '*{{input}}*', say: '{{user}}: "{{input}}"', see: '' }), JSON.stringify(await setting('modesTemplates')));
check('the redrawn settings show what was imported, the wording as plain text', ui.voice === 'second' && ui.tidy === true && ui.values.join(' | ') === '*{{input}}* | {{user}}: "{{input}}" | ', `${ui.voice}, ${ui.tidy}, ${ui.values.join(' | ')}`);

// Back to the defaults, and the settings closed
await page.click('#forge-ui-modes');
await page.waitForTimeout(300);
await setForge(page, { modes: false, modesActive: '', modesVoice: 'second', modesTidy: true, modesTemplates: { ...NO_TEMPLATES } });
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(400);

await finish();
