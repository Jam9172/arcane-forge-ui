// The stage, the menu panel and the send modes all on at once, beside other extensions (I1-together).
// Usage: node tests/browser/together.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });

const ALL_ON = { enabled: true, layout: 'stage', menuPanel: true, menuButtons: true, modes: true, modesActive: '' };
const OUR_CLASSES = ['forge-stage', 'forge-menu', 'forge-menu-buttons', 'forge-modes'];
const overlap = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const show = (b) => (b ? `${b.left},${b.top} ${b.width}x${b.height}` : 'not shown');
const classes = () => page.evaluate((names) => names.filter((n) => document.body.classList.contains(n)), OUR_CLASSES);
const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

// The page with Arcane Forge UI's main switch off before any feature was on, to compare against at the end
await setForge(page, { enabled: false, layout: 'classic', menuPanel: false, modes: false });
const pins = () => page.evaluate(() => ['lm_button_panel_pin', 'rm_button_panel_pin', 'WI_panel_pin'].map((id) => document.getElementById(id)?.checked));
const topBarSize = () => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--topBarBlockSize').trim());
const classic = { sheld: await box(page, '#sheld'), topBar: await box(page, '#top-bar'), textarea: await box(page, '#send_textarea'), pins: await pins(), topBarSize: await topBarSize() };

await setForge(page, ALL_ON);
await page.waitForTimeout(400);

if (!phone) {
    // 1. Nothing of ours sits on anything else of ours, or on the chat's text
    const buttons = await box(page, '#forge-menu-buttons');
    const first = await page.evaluate(() => {
        const chat = document.getElementById('chat');
        chat.scrollTop = 0;
        const mes = chat.querySelector('.mes .mes_text');
        if (!mes) return null;
        const r = mes.getBoundingClientRect();
        return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) };
    });
    check('the round buttons are not over the first message', !!buttons && !!first && !overlap(buttons, first), `buttons ${show(buttons)}, first message ${first ? `${first.left},${first.top}..${first.right},${first.bottom}` : 'none'}`);
    const bar = await box(page, '#forge-modes');
    const textarea = await box(page, '#send_textarea');
    check('the send modes bar is not over the message box', !!bar && !!textarea && !overlap(bar, textarea) && bar.bottom <= textarea.top, `bar ${show(bar)}, box ${show(textarea)}`);
    const spine = await box(page, '#forge-spine');
    const text = await page.evaluate(() => {
        const r = document.querySelector('#chat .mes .mes_text')?.getBoundingClientRect();
        return r && { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) };
    });
    check("the spine is not over the chat's text", !!spine && !!text && !overlap(spine, text), `spine ${show(spine)}`);

    // 2. With the buttons the column starts at the top; without them, below the top bar
    let sheld = await box(page, '#sheld');
    check('with the round buttons, the chat column starts at the top of the window', sheld?.top === 0, show(sheld));
    await setForge(page, { ...ALL_ON, menuButtons: false });
    sheld = await box(page, '#sheld');
    const topBar = await box(page, '#top-bar');
    check("without them, it starts at the top bar's bottom", !!sheld && !!topBar && Math.abs(sheld.top - topBar.bottom) <= 1, `column ${show(sheld)}, top bar ${show(topBar)}`);
    await setForge(page, ALL_ON);

    // 3. The panel is centred on the window, and the spine cannot be dragged while it is open
    await page.click('#forge-menu-buttons .forge-menu-round-menu');
    await page.waitForTimeout(500);
    const panel = await box(page, '#forge-menu .forge-menu-panel');
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    check('the menu panel is centred on the window (2px)', !!panel && Math.abs(panel.left - (width - panel.right)) <= 2, `${show(panel)} in ${width}`);
    const before = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--forge-stage-chat'));
    const spineNow = await box(page, '#forge-spine');
    if (spineNow) {
        const x = spineNow.left + Math.round(spineNow.width / 2);
        const y = spineNow.top + 200;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 150, y, { steps: 6 });
        await page.mouse.up();
    }
    const after = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--forge-stage-chat'));
    const stillOpen = await page.evaluate(() => !document.getElementById('forge-menu')?.hidden);
    check('a drag on the spine while the panel is open changes no width', before === after, `${before.trim()} then ${after.trim()}, panel ${stillOpen ? 'open' : 'closed'}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 4. RPG Companion's side panel, if the page has it open at the right, is beside the chat column, not over it
    const rpg = await page.evaluate(() => {
        const panel = document.getElementById('rpg-companion-panel');
        if (!panel) return null;
        const r = panel.getBoundingClientRect();
        const shown = r.width > 0 && r.height > 0 && getComputedStyle(panel).display !== 'none' && getComputedStyle(panel).visibility !== 'hidden';
        return { shown, right: panel.classList.contains('rpg-position-right'), box: { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) } };
    });
    if (!rpg || !rpg.shown || !rpg.right) check('RPG Companion not in the page (or not open at the right)', true);
    else {
        sheld = await box(page, '#sheld');
        check("RPG Companion's side panel and the chat column do not overlap", !overlap(rpg.box, sheld), `panel ${show(rpg.box)}, column ${show(sheld)}`);
        // Its panel closed (stood in for in this page only: hidden the way a style change would), the column
        // goes back to the right edge; opened again, it leaves the room again
        await page.evaluate(() => { document.getElementById('rpg-companion-panel').style.display = 'none'; });
        await page.waitForTimeout(600);
        const closed = await box(page, '#sheld');
        await page.evaluate(() => { document.getElementById('rpg-companion-panel').style.display = ''; });
        await page.waitForTimeout(600);
        const reopened = await box(page, '#sheld');
        const width = await page.evaluate(() => document.documentElement.clientWidth);
        check('with its panel closed the column is back at the right edge, and opened again it leaves the room again',
            closed?.right === width && !overlap(rpg.box, reopened), `closed ${show(closed)}, reopened ${show(reopened)}`);
    }

    // 5. Quick Reply's bar (a stand-in) goes first in the form; the send modes bar stays nearest the message box
    await page.evaluate(() => {
        const qr = document.createElement('div');
        qr.id = 'qr--bar';
        qr.textContent = 'stand-in';
        document.getElementById('send_form').prepend(qr);
        document.dispatchEvent(new CustomEvent('arcane-forge-ui:apply'));
    });
    await page.waitForTimeout(300);
    const nearest = await page.evaluate(() => document.getElementById('forge-modes')?.nextElementSibling?.id);
    check('with a Quick Reply bar in the form, the send modes bar is still right before the message box row', nearest === 'nonQRFormItems', String(nearest));
    await page.evaluate(() => document.getElementById('qr--bar')?.remove());

    // 6. At the smallest desktop window the minimums hold and the four buttons fit on one line
    await page.setViewportSize({ width: 1040, height: 700 });
    await page.waitForTimeout(500);
    sheld = await box(page, '#sheld');
    const fits = await page.evaluate(() => {
        const bar = document.getElementById('forge-modes');
        const column = document.getElementById('sheld').getBoundingClientRect();
        const tops = [...bar.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().top));
        const r = bar.getBoundingClientRect();
        return { oneLine: new Set(tops).size === 1, inside: r.left >= column.left - 1 && r.right <= column.right + 1 };
    });
    // With another extension's side panel taking room at the right, the chat keeps its 480px and stays out from
    // under that panel, and the stage is what gives way (the window cannot hold all three minimums)
    const aside = await page.evaluate(() => parseFloat(getComputedStyle(document.body).getPropertyValue('--forge-stage-aside')) || 0);
    check(`at 1040 by 700, the chat column is at least 480px and the stage at least ${aside ? 'what the side panel leaves' : '320px'}`,
        !!sheld && sheld.width >= 480 && (aside ? sheld.left >= 1040 - aside - sheld.width - 1 && sheld.right <= 1040 - aside + 1 : sheld.left >= 320),
        `${show(sheld)}${aside ? `, side panel ${aside}px` : ''}`);
    check('and the four mode buttons fit inside the column on one line', fits.oneLine && fits.inside, JSON.stringify(fits));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    // 7. The main switch off takes all of it away
    await setForge(page, { enabled: false });
    await page.waitForTimeout(300);
    // (The settings screen's own controls, in the Extensions drawer, are the switch itself and stay.)
    const ids = await page.evaluate(() => [...document.querySelectorAll('[id^="forge-"]')].filter((e) => !e.closest('.arcane-forge-ui-settings')).map((e) => e.id));
    check('main switch off: no element whose id starts with forge- (outside the settings screen)', ids.length === 0, ids.join(', '));
    check('and none of the four feature classes on body', (await classes()).length === 0, (await classes()).join(', '));
    const left = await page.evaluate(() => ({ classes: [...document.body.classList].filter((c) => c.startsWith('forge-')), props: [...document.body.style].filter((p) => p.startsWith('--forge-')), fonts: !!document.getElementById('arcane-forge-ui-fonts') }));
    check('and no forge- class, no --forge- property on body, and no fonts link', !left.classes.length && !left.props.length && !left.fonts, JSON.stringify(left));
    check('--topBarBlockSize and the pins are as SillyTavern had them', (await topBarSize()) === classic.topBarSize && JSON.stringify(await pins()) === JSON.stringify(classic.pins),
        `${await topBarSize()} (was ${classic.topBarSize}), pins ${JSON.stringify(await pins())} (were ${JSON.stringify(classic.pins)})`);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const now = { sheld: await box(page, '#sheld'), topBar: await box(page, '#top-bar'), textarea: await box(page, '#send_textarea') };
    check('and the chat column, the top bar and the message box are where they were with nothing on', same(now.sheld, classic.sheld) && same(now.topBar, classic.topBar) && same(now.textarea, classic.textarea),
        `column ${show(now.sheld)} (was ${show(classic.sheld)}), top bar ${show(now.topBar)} (was ${show(classic.topBar)}), box ${show(now.textarea)} (was ${show(classic.textarea)})`);
    await setForge(page, ALL_ON);
} else {
    // 8. On a phone only the send modes are there, above the message box
    const on = await classes();
    check('phone: no stage, menu panel or round buttons', !on.some((c) => c !== 'forge-modes'), on.join(', '));
    const bar = await box(page, '#forge-modes');
    const textarea = await box(page, '#send_textarea');
    check('phone: the send modes are on, with the bar above the message box', on.includes('forge-modes') && !!bar && !!textarea && bar.bottom <= textarea.top, `bar ${show(bar)}, box ${show(textarea)}`);
    // 9. Nothing scrolls sideways
    check('phone: no sideways scroll', !(await sideways()));
}

await setForge(page, { enabled: true, layout: 'classic', menuPanel: false, modes: false });
await finish();
