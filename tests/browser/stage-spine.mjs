// The stage layout's spine (bible section 5.1): the chat column's left edge can be dragged with the mouse, moved
// with the keys and reset with a double-click, and Chat width on the settings screen sets the same width. The
// width never breaks the clamp (chat at least 480px, stage at least 320px). With the layout Classic, on a phone,
// or with the main switch off, there is no spine.
// Usage: node tests/browser/stage-spine.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, held, check, finish } = await openForge({ phone });
// These checks measure the stage against the whole window. RPG Companion's side panel, if the sandbox has it open,
// takes room at the right that the chat column leaves free (tested in together.mjs); a test-page rule hides it
// (its own code shows it again after an inline change).
await page.addStyleTag({ content: '#rpg-companion-panel { display: none !important; }' });

const near = (a, b, px) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= px;
const win = () => page.evaluate(() => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }));
const stageChat = () => page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.stageChat);
const valueNow = () => page.evaluate(() => document.getElementById('forge-spine')?.getAttribute('aria-valuenow') ?? null);
// What the spine puts in the page
const traces = () => page.evaluate(() => [
    document.getElementById('forge-spine') && '#forge-spine',
    document.body.classList.contains('forge-dragging') && 'body.forge-dragging',
].filter(Boolean));
// SillyTavern's own chat width, which the spine leaves alone
const native = () => page.evaluate(() => ({
    sheldWidth: getComputedStyle(document.documentElement).getPropertyValue('--sheldWidth').trim(),
    chatWidth: SillyTavern.getContext().powerUserSettings.chat_width,
}));
const settingsSaves = () => held.filter((path) => path.endsWith('/settings/save')).length;
const modelCalls = () => held.filter((path) => /\/generate(\/|$)/.test(path)).length;
// Whether a drag left some text selected (only the kind of selection is read, never its text)
const selected = () => page.evaluate(() => getSelection()?.type === 'Range');

// Presses the mouse on the middle of the spine, moves it to x, and lets go. `during` runs before letting go.
async function dragSpine(x, during) {
    const spine = await box(page, '#forge-spine');
    const y = Math.round(spine.top + spine.height / 2);
    await page.mouse.move((spine.left + spine.right) / 2, y);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 10 });
    const live = during ? await during() : null;
    await page.mouse.up();
    await page.waitForTimeout(200);
    return live;
}

const before = await native();
check('classic: no spine', (await traces()).length === 0, (await traces()).join(', '));

if (phone) {
    // A phone has no stage, so no spine, whatever the setting says
    await setForge(page, { layout: 'stage' });
    const left = await traces();
    check('a phone with layout Stage has no spine', left.length === 0, left.join(', '));
    await setForge(page, { layout: 'classic' });
} else {
    // 1. Stage on: the spine is the chat column's left edge, as tall as the column
    await setForge(page, { layout: 'stage', stageChat: 46 });
    const w = await win();
    const sheld = await box(page, '#sheld');
    const spine = await box(page, '#forge-spine');
    const how = await page.evaluate(() => {
        const el = document.getElementById('forge-spine');
        const r = el.getBoundingClientRect();
        const line = getComputedStyle(el, '::before');
        // the colour --forge-bar-line resolves to, read from a throwaway element
        const probe = document.createElement('div');
        probe.style.background = 'var(--forge-bar-line)';
        document.body.append(probe);
        const barLine = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const texts = [...document.querySelectorAll('#chat .mes_text')].map((t) => t.getBoundingClientRect()).filter((t) => t.height > 0);
        return {
            attrs: Object.fromEntries(['role', 'aria-orientation', 'tabindex', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow'].map((a) => [a, el.getAttribute(a)])),
            parent: el.parentElement?.tagName,
            lineLeft: r.right - parseFloat(line.right) - parseFloat(line.width),
            lineWidth: line.width,
            lineColour: line.backgroundColor,
            barLine,
            cursor: getComputedStyle(el).cursor,
            onTop: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.id ?? '',
            textLeft: texts.length ? Math.min(...texts.map((t) => t.left)) : null,
            right: r.right,
        };
    });
    const wanted = { role: 'separator', 'aria-orientation': 'vertical', tabindex: '0', 'aria-label': 'Chat width', 'aria-valuemin': '35', 'aria-valuemax': '70', 'aria-valuenow': '46' };
    check('the spine is a focusable vertical separator labelled Chat width, 35 to 70, now 46', JSON.stringify(how.attrs) === JSON.stringify(wanted), JSON.stringify(how.attrs));
    check("the spine sits on the chat column's left edge", !!spine && near((spine.left + spine.right) / 2, sheld.left, 2), `spine ${spine?.left} to ${spine?.right}px, column starts ${sheld.left}px`);
    check("its 1px line is the column's left edge", how.lineWidth === '1px' && near(how.lineLeft, sheld.left, 1), `line at ${how.lineLeft.toFixed(1)}px, ${how.lineWidth}`);
    check('the line is --forge-bar-line', how.lineColour === how.barLine, `${how.lineColour}, bar line ${how.barLine}`);
    check('the grab area is 11px wide', spine?.width === 11, `${spine?.width}px`);
    check('the spine is as tall as the chat column', near(spine?.top, sheld.top, 1) && near(spine?.bottom, sheld.bottom, 1), `spine ${spine?.top} to ${spine?.bottom}px, column ${sheld.top} to ${sheld.bottom}px`);
    check('the spine is on top where it is grabbed, with the resize pointer', how.onTop === 'forge-spine' && how.cursor === 'col-resize', `${how.onTop || 'nothing'}, ${how.cursor}`);
    check("the spine does not reach the chat's text", how.textLeft !== null && how.right < how.textLeft, `spine ends ${how.right.toFixed(1)}px, text starts ${how.textLeft}px`);
    await setForge(page, { layout: 'stage' });
    check('applying the layout again keeps one spine', (await page.evaluate(() => document.querySelectorAll('#forge-spine').length)) === 1);

    // 2. Drag it 200px to the left: the chat follows live, and the width is saved as a whole percent on release
    const savesBefore = await settingsSaves();
    const live = await dragSpine(spine.left + spine.width / 2 - 200, () => page.evaluate(() => ({
        width: document.getElementById('sheld').getBoundingClientRect().width,
        dragging: document.body.classList.contains('forge-dragging'),
        select: getComputedStyle(document.body).webkitUserSelect || getComputedStyle(document.body).userSelect,
    })));
    check('while dragging, the chat follows the pointer', near(live.width, sheld.width + 200, 3), `${live.width.toFixed(1)}px, from ${sheld.width}px`);
    check('while dragging, body has forge-dragging and no text can be selected', live.dragging && live.select === 'none', `${live.dragging}, ${live.select}`);
    const dragged = await box(page, '#sheld');
    const share = await stageChat();
    check('after the drag the chat is about 200px wider', near(dragged.width, sheld.width + 200, 3), `${dragged.width}px, from ${sheld.width}px`);
    check('the saved Chat width is that width as a whole percent of the window', share === Math.round((dragged.width / w.width) * 100), `${share}, ${((dragged.width / w.width) * 100).toFixed(2)}%`);
    check('aria-valuenow follows', (await valueNow()) === String(share), await valueNow());
    check('letting go takes forge-dragging off body', !(await traces()).includes('body.forge-dragging'));
    await page.waitForTimeout(1500); // SillyTavern's settings save is debounced
    check('the drag is saved with the settings', (await settingsSaves()) > savesBefore, `${savesBefore} saves before, ${await settingsSaves()} after`);

    // 3. The clamp: at 1040 by 700 the stage stops at 320px, the setting at 35 and the chat at 480px
    await page.setViewportSize({ width: 1040, height: 700 });
    await page.waitForTimeout(300);
    await dragSpine(5);
    const wide = await box(page, '#sheld');
    check('dragged far to the left, the stage stops at 320px', near(wide.left, 320, 1), `stage ${wide.left}px, Chat width ${await stageChat()}`);
    check('and the setting stops at 70', (await stageChat()) === 70, String(await stageChat()));
    await dragSpine(1035);
    const narrow = await box(page, '#sheld');
    check('dragged far to the right, the setting stops at 35', (await stageChat()) === 35, String(await stageChat()));
    check('and the chat is never under 480px', narrow.width >= 480 && near(narrow.right, 1040, 1), `${narrow.width}px, right edge ${narrow.right}px`);
    check('a drag across the chat selects no text', !(await selected()));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);

    // 4. Keys: Left widens, Right narrows, Home and End go to the limits. SillyTavern swipes the last message on
    // Left and Right from a key listener on document, so the spine's keys must never get there.
    await setForge(page, { stageChat: 46 });
    await page.evaluate(() => {
        window.forgeTestKeys = [];
        window.forgeTestKeyListener = (event) => window.forgeTestKeys.push(event.key);
        document.addEventListener('keydown', window.forgeTestKeyListener);
    });
    const chatBefore = await page.evaluate(() => ({ length: SillyTavern.getContext().chat.length, swipe: SillyTavern.getContext().chat.at(-1)?.swipe_id ?? null }));
    const callsBefore = modelCalls();
    await page.focus('#forge-spine');
    for (const [key, expected] of [['ArrowLeft', 47], ['ArrowRight', 46], ['Home', 70], ['End', 35]]) {
        await page.keyboard.press(key);
        await page.waitForTimeout(150);
        const now = await stageChat();
        const width = (await box(page, '#sheld'))?.width;
        check(`${key} on the spine: Chat width ${expected}, aria-valuenow follows`, now === expected && (await valueNow()) === String(expected), `${now}, aria ${await valueNow()}`);
        check(`${key} on the spine: the chat is ${expected}% wide`, near(width, (w.width * expected) / 100, 2), `${width}px, ${expected}% is ${((w.width * expected) / 100).toFixed(1)}px`);
    }
    const reached = await page.evaluate(() => {
        document.removeEventListener('keydown', window.forgeTestKeyListener);
        const keys = window.forgeTestKeys;
        delete window.forgeTestKeys;
        delete window.forgeTestKeyListener;
        return keys;
    });
    check("the spine's keys do not reach a key listener on document", reached.length === 0, reached.join(', ') || 'none reached it');
    const chatAfter = await page.evaluate(() => ({ length: SillyTavern.getContext().chat.length, swipe: SillyTavern.getContext().chat.at(-1)?.swipe_id ?? null }));
    check('the keys did not swipe the last message', JSON.stringify(chatAfter) === JSON.stringify(chatBefore) && modelCalls() === callsBefore, `${JSON.stringify(chatBefore)} then ${JSON.stringify(chatAfter)}, ${modelCalls() - callsBefore} model calls`);

    // 5. Double-click resets to 46
    await page.dblclick('#forge-spine');
    await page.waitForTimeout(200);
    const reset = await box(page, '#sheld');
    check('a double-click resets Chat width to 46', (await stageChat()) === 46 && (await valueNow()) === '46', `${await stageChat()}, aria ${await valueNow()}`);
    check('and the chat is 46% wide again', near(reset.width, w.width * 0.46, 2), `${reset.width}px`);

    // A drag that the layout ends half way leaves nothing behind and saves nothing
    await dragSpine(300, () => setForge(page, { layout: 'classic' }));
    const ended = await traces();
    check('turning the layout off during a drag leaves no spine and no forge-dragging', ended.length === 0, ended.join(', '));
    check('and keeps the saved width', (await stageChat()) === 46, String(await stageChat()));
    await setForge(page, { layout: 'stage' });

    // The spine goes with the stage: below 1000px wide and with the main switch off
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(300);
    check('at 900px wide there is no spine', (await traces()).length === 0, (await traces()).join(', '));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    check('at 1440px wide again the spine is back', (await traces()).includes('#forge-spine'));
    await setForge(page, { enabled: false });
    check('main switch off: no spine', (await traces()).length === 0, (await traces()).join(', '));
    await setForge(page, { enabled: true });
    check('main switch on again: the spine is back', (await traces()).includes('#forge-spine'));
}

// The look file carries the chat width
const look = await page.evaluate(async () => (await import('/scripts/extensions/third-party/arcane-forge-ui/stage.js')).lookKeys);
check('stageChat is a look key, a number from 35 to 70', JSON.stringify(look.stageChat) === JSON.stringify({ type: 'number', min: 35, max: 70 }), JSON.stringify(look));

// 6. The settings screen: Chat width under Layout, greyed out while the layout is Classic
await setForge(page, { stageChat: 46 });
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);
const range = () => page.evaluate(() => {
    const input = document.getElementById('forge-ui-stage-chat');
    const label = input?.closest('label');
    return input && {
        label: label?.querySelector('span')?.firstChild?.textContent.trim(),
        shown: label?.querySelector('output')?.textContent,
        min: input.min, max: input.max, step: input.step, value: input.value, disabled: input.disabled,
        section: [...document.querySelectorAll('.arcane-forge-ui-settings h4')].filter((h) => h.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).pop()?.textContent,
    };
});
await page.selectOption('#forge-ui-layout', 'classic');
await page.waitForTimeout(300);
const classicRange = await range();
check('the Layout section has the range "Chat width", 35 to 70, shown as a percentage', classicRange?.section === 'Layout' && classicRange.label === 'Chat width' && classicRange.min === '35' && classicRange.max === '70' && classicRange.step === '1' && classicRange.shown === `${classicRange.value}%`, JSON.stringify(classicRange));
check('it is greyed out while the layout is Classic', classicRange?.disabled === true);
await page.selectOption('#forge-ui-layout', 'stage');
await page.waitForTimeout(300);
check('choosing Stage makes it usable', (await range())?.disabled === false);
await page.fill('#forge-ui-stage-chat', '60');
await page.waitForTimeout(300);
const sixty = await range();
check('setting it to 60 saves Chat width 60 and shows 60%', (await stageChat()) === 60 && sixty.shown === '60%', `${await stageChat()}, ${sixty.shown}`);
if (phone) {
    const left = await traces();
    check('on a phone it changes nothing on the page', left.length === 0 && !(await page.evaluate(() => document.body.classList.contains('forge-stage'))), left.join(', '));
} else {
    const sheld = await box(page, '#sheld');
    const w = await win();
    check('#sheld is 60% of the window', near(sheld.width, w.width * 0.6, 2), `${sheld.width}px, 60% is ${(w.width * 0.6).toFixed(1)}px`);
    check('the spine says 60', (await valueNow()) === '60', await valueNow());
    // The settings screen follows the spine
    await page.focus('#forge-spine');
    await page.keyboard.press('End');
    await page.waitForTimeout(200);
    const followed = await range();
    check('moving the spine moves the range with it', followed.value === '35' && followed.shown === '35%', `${followed.value}, ${followed.shown}`);
}

// 7. Classic again: no spine, no forge-dragging
await page.selectOption('#forge-ui-layout', 'classic');
await page.waitForTimeout(300);
const left = await traces();
check('layout back to Classic: no #forge-spine, no forge-dragging', left.length === 0, left.join(', '));
check('the range is greyed out again', (await range())?.disabled === true);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(400);

// SillyTavern's own Chat Width setting and --sheldWidth are left alone
const after = await native();
check("SillyTavern's own chat width is untouched", JSON.stringify(after) === JSON.stringify(before), `${JSON.stringify(before)} then ${JSON.stringify(after)}`);

await finish();
