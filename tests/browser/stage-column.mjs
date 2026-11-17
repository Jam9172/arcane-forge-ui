// The stage layout's chat column (bible section 5.1): with Forge layout set to Stage on a desktop-sized window,
// the chat is one column at the right edge and the background art covers only the area to its left. On a phone,
// and with the layout or the main switch off, the page is exactly the classic one.
// Usage: node tests/browser/stage-column.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });
// These checks measure the stage against the whole window. RPG Companion's side panel, if the sandbox has it open,
// takes room at the right that the chat column leaves free (tested in together.mjs); a test-page rule hides it
// (its own code shows it again after an inline change).
await page.addStyleTag({ content: '#rpg-companion-panel { display: none !important; }' });

const LANDMARKS = ['#sheld', '#top-bar', '#bg1', '#send_textarea'];
const boxes = async () => {
    const out = {};
    for (const selector of LANDMARKS) out[selector] = await box(page, selector);
    return out;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, px) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= px;
const show = (b) => (b ? `${b.left},${b.top} to ${b.right},${b.bottom}` : 'not shown');
const win = () => page.evaluate(() => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }));
// What the layout puts in the page: the body class, the width property and our layer
const traces = () => page.evaluate(() => [
    document.body.classList.contains('forge-stage') && 'body.forge-stage',
    document.getElementById('forge-stage') && '#forge-stage',
    document.body.style.getPropertyValue('--forge-stage-chat') && 'body --forge-stage-chat',
    getComputedStyle(document.body).getPropertyValue('--forge-stage-chat').trim() && 'a computed --forge-stage-chat',
].filter(Boolean));
const isStage = () => page.evaluate(() => document.body.classList.contains('forge-stage'));

const classic = await boxes();

if (phone) {
    // 10. A phone keeps the classic layout whatever the setting says
    await setForge(page, { layout: 'stage' });
    const left = await traces();
    check('a phone with layout Stage has none of the stage in the page', left.length === 0, left.join(', '));
    const stage = await boxes();
    check('a phone with layout Stage keeps the classic chat column', same(stage['#sheld'], classic['#sheld']), `${show(stage['#sheld'])}, classic ${show(classic['#sheld'])}`);
    check('a phone with layout Stage keeps the classic background', same(stage['#bg1'], classic['#bg1']), `${show(stage['#bg1'])}, classic ${show(classic['#bg1'])}`);
    await setForge(page, { layout: 'classic' });
} else {
    // 2. Stage on
    await setForge(page, { layout: 'stage' });
    check('layout Stage puts forge-stage on body', await isStage());
    const w = await win();
    const sheld = await box(page, '#sheld');
    const top = await box(page, '#top-bar');
    const bg = await box(page, '#bg1');

    // 3. Docked right, 46% wide
    check("the chat column's right edge is the window's", near(sheld?.right, w.width, 1), `${sheld?.right}px of ${w.width}px`);
    check('the chat column is 46% of the window', near(sheld?.width, w.width * 0.46, 2), `${sheld?.width}px, 46% is ${(w.width * 0.46).toFixed(1)}px`);

    // 4. Below the top bar, down to the bottom
    check('the chat column starts at the bottom of the top bar', near(sheld?.top, top?.bottom, 1), `column top ${sheld?.top}px, bar bottom ${top?.bottom}px`);
    check("the chat column ends at the window's bottom", near(sheld?.bottom, w.height, 1), `${sheld?.bottom}px of ${w.height}px`);

    // 5. The art covers the stage only, and is sized and centred on it
    check('the art starts at the left edge', near(bg?.left, 0, 1), `${bg?.left}px`);
    check('the art ends where the chat column starts', near(bg?.right, sheld?.left, 1), `art right ${bg?.right}px, column left ${sheld?.left}px`);
    const art = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('#bg1'));
        return { attachment: cs.backgroundAttachment, position: cs.backgroundPosition };
    });
    check('the art is sized and centred on the stage, not the window', art.attachment === 'scroll' && art.position === '50% 50%', `${art.attachment}, ${art.position}`);
    const behind = await page.evaluate(({ x, y }) => document.elementsFromPoint(x, y).some((el) => el.id === 'bg1'), { x: sheld.left + sheld.width / 2, y: sheld.top + 10 });
    check('no art behind the chat column', !behind);

    // 6. Our layer covers the stage, hidden from screen readers and from clicks
    const layer = await box(page, '#forge-stage');
    const edges = ['left', 'top', 'right', 'bottom'];
    check('#forge-stage covers the same area as the art', !!layer && edges.every((edge) => near(layer[edge], bg?.[edge], 1)), `${show(layer)}, art ${show(bg)}`);
    const how = await page.evaluate(() => {
        const el = document.getElementById('forge-stage');
        return { hidden: el?.getAttribute('aria-hidden'), pointer: el && getComputedStyle(el).pointerEvents, parent: el?.parentElement?.tagName };
    });
    check('#forge-stage is in body, aria-hidden and takes no clicks', how.parent === 'BODY' && how.hidden === 'true' && how.pointer === 'none', JSON.stringify(how));
    const onTop = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id ?? '', { x: Math.round(bg.right / 2), y: Math.round(w.height / 2) });
    check('a click on the stage does not land on #forge-stage', onTop !== 'forge-stage', onTop || 'nothing');

    // 7. The message box is inside the column
    const textarea = await box(page, '#send_textarea');
    check('the message box lies inside the chat column', !!textarea && textarea.left >= sheld.left && textarea.right <= sheld.right, `${textarea?.left} to ${textarea?.right}px, column ${sheld.left} to ${sheld.right}px`);

    // Applying again changes nothing and adds no second layer
    await setForge(page, { layout: 'stage' });
    const layers = await page.evaluate(() => document.querySelectorAll('#forge-stage').length);
    check('applying the layout again keeps one #forge-stage and the same column', layers === 1 && same(await box(page, '#sheld'), sheld), `${layers} layers`);

    // A top-bar menu still opens where SillyTavern puts it (the same place as in the classic layout)
    const openMenu = async () => {
        await page.click('#extensions-settings-button .drawer-toggle');
        await page.waitForTimeout(600);
        const r = await page.evaluate(() => {
            const content = document.querySelector('#rm_extensions_block');
            const b = content.getBoundingClientRect();
            const hit = document.elementFromPoint(b.left + b.width / 2, b.top + 20);
            return { open: content.classList.contains('openDrawer'), box: [b.left, b.top, b.right, b.bottom].map(Math.round), onTop: !!hit && content.contains(hit) };
        });
        await page.click('#extensions-settings-button .drawer-toggle');
        await page.waitForTimeout(600);
        return r;
    };
    const stageMenu = await openMenu();
    await setForge(page, { layout: 'classic' });
    const classicMenu = await openMenu();
    check('a top-bar menu opens in the stage layout, on top', stageMenu.open && stageMenu.onTop, JSON.stringify(stageMenu));
    check('it opens where it opens in the classic layout', same(stageMenu.box, classicMenu.box), `stage ${stageMenu.box}, classic ${classicMenu.box}`);
    await setForge(page, { layout: 'stage' });

    // 8. A small desktop window: the clamp keeps both sides usable
    await page.setViewportSize({ width: 1040, height: 700 });
    await page.waitForTimeout(300);
    const small = await box(page, '#sheld');
    check('at 1040 by 700 the stage is at least 320px wide', small?.left >= 320, `${small?.left}px`);
    check('at 1040 by 700 the chat column is at least 480px wide', small?.width >= 480, `${small?.width}px`);
    check('at 1040 by 700 the chat column still reaches the right edge', near(small?.right, 1040, 1), `${small?.right}px`);

    // Crossing SillyTavern's phone boundary takes the stage off, and widening puts it back
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(300);
    const narrow = await traces();
    check('at 900px wide the stage is off', narrow.length === 0, narrow.join(', '));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    check('at 1440px wide again the stage is back', await isStage());

    // The main switch takes the layout with it
    await setForge(page, { enabled: false });
    const off = await traces();
    check('main switch off: none of the stage in the page', off.length === 0, off.join(', '));
    await setForge(page, { enabled: true });
    check('main switch on again: the stage is back', await isStage());

    // 9. Classic again: exactly the page we started with
    await setForge(page, { layout: 'classic' });
    const back = await boxes();
    for (const selector of LANDMARKS) {
        check(`classic again: ${selector} is where it was`, same(back[selector], classic[selector]), `${show(back[selector])}, before ${show(classic[selector])}`);
    }
    const left = await traces();
    check('classic again: no #forge-stage, no forge-stage class, no --forge-stage-chat on body', left.length === 0, left.join(', '));
}

// The settings screen: the Layout section and its select, which switches the layout (on a desktop only)
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);
const section = await page.evaluate(() => {
    const root = document.querySelector('.arcane-forge-ui-settings .inline-drawer-content');
    const headings = [...root.querySelectorAll('h4')].map((h) => h.textContent.trim());
    const select = root.querySelector('#forge-ui-layout');
    return {
        headings,
        label: select?.closest('label')?.querySelector('span')?.textContent.trim(),
        options: select ? [...select.options].map((o) => `${o.value}: ${o.textContent}`) : [],
        value: select?.value,
        note: document.getElementById(select?.getAttribute('aria-describedby') ?? '')?.textContent.trim(),
    };
});
const at = (name) => section.headings.indexOf(name);
check('the settings have a Layout section between Panels and Keyboard', at('Layout') > at('Panels') && at('Layout') < at('Keyboard') && at('Panels') >= 0, section.headings.join(', '));
check('Layout has the select "Forge layout", set to Classic', section.label === 'Forge layout' && section.value === 'classic', `${section.label}: ${section.value}`);
check('it offers Classic and Stage, in that order', same(section.options, ['classic: Classic', 'stage: Stage (desktop)']), section.options.join(' | '));
check('it carries the note "Desktop only. Phones keep the classic layout."', section.note === 'Desktop only. Phones keep the classic layout.', section.note ?? 'no note');
await page.selectOption('#forge-ui-layout', 'stage');
await page.waitForTimeout(300);
const chosen = await page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.layout);
check(`choosing Stage there saves it and ${phone ? 'leaves the phone classic' : 'turns the stage on'}`, chosen === 'stage' && (await isStage()) === !phone, `layout ${chosen}`);
await page.selectOption('#forge-ui-layout', 'classic');
await page.waitForTimeout(300);
check('choosing Classic there takes the stage off', (await traces()).length === 0);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(400);

await finish();
