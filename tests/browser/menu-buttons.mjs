// The menu panel's round buttons (batch P2): with the menu panel on, on a desktop-sized window, two round
// buttons at the top right take the place of SillyTavern's top bar. Characters opens the Characters section,
// Menu the section that was open last; a dot on Menu means there is no API connection. Phones never get them.
// Usage: node tests/browser/menu-buttons.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });

const MENU = '#forge-menu-buttons .forge-menu-round-menu';
const CHARACTERS = '#forge-menu-buttons .forge-menu-round-characters';
const CLOSE = '#forge-menu .forge-menu-close';
const TOGGLES = '#top-settings-holder .drawer-toggle';
// SillyTavern animates a drawer open over twice its animation duration, and waits once more before switching
const SETTLE = 700;
// SillyTavern updates the plug icon 200ms (debounce_timeout.short) after the connection changes
const STATUS_WAIT = 600;

const isOpen = (selector) => page.evaluate((selector) => document.querySelector(selector)?.classList.contains('openDrawer') ?? false, selector);
const openMenus = () => page.evaluate(() => [...document.querySelectorAll('#top-settings-holder > .drawer > .drawer-content.openDrawer')].map((e) => e.id));
const frameShown = () => page.evaluate(() => {
    const frame = document.getElementById('forge-menu');
    return !!frame && !frame.hidden && frame.querySelector('.forge-menu-panel').getClientRects().length > 0;
});
const ours = () => page.evaluate(() => [
    ...['forge-menu', 'forge-menu-buttons'].filter((id) => document.getElementById(id)).map((id) => `#${id}`),
    ...['forge-menu', 'forge-menu-buttons'].filter((name) => document.body.classList.contains(name)).map((name) => `body.${name}`),
    ...(document.body.style.getPropertyValue('--topBarBlockSize') ? ['inline --topBarBlockSize'] : []),
]);
// The top bar as it stands: the strip, each drawer's icon, the holder and the chat column, and SillyTavern's size
const topBar = () => page.evaluate(() => {
    const at = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' ? [r.left, r.top, r.width, r.height].map(Math.round) : null;
    };
    return {
        bar: at(document.getElementById('top-bar')),
        holder: at(document.getElementById('top-settings-holder')),
        sheld: at(document.getElementById('sheld')),
        toggles: [...document.querySelectorAll('#top-settings-holder .drawer-toggle')].map(at),
        size: getComputedStyle(document.body).getPropertyValue('--topBarBlockSize').trim(),
    };
});
const sameBox = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 1);
const shownToggles = (state) => state.toggles.filter(Boolean).length;
const click = async (selector, wait = SETTLE) => {
    await page.click(selector);
    await page.waitForTimeout(wait);
};
const closeFrame = () => click(CLOSE, 400);
const menuLast = () => page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.menuLast);
const setStatus = async (status) => {
    await page.evaluate(async (status) => (await import('/script.js')).setOnlineStatus(status), status);
    await page.waitForTimeout(STATUS_WAIT);
};
const dot = () => page.evaluate(() => {
    const d = document.querySelector('#forge-menu-buttons .forge-menu-round-menu .forge-menu-dot');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    const probe = document.createElement('div');
    probe.style.background = 'var(--forge-danger)';
    document.body.append(probe);
    const danger = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const button = d.parentElement.getBoundingClientRect();
    return {
        shown: !d.hidden && r.width > 0 && r.height > 0 && getComputedStyle(d).visibility !== 'hidden',
        size: `${Math.round(r.width)}x${Math.round(r.height)}`,
        red: getComputedStyle(d).backgroundColor === danger,
        onButton: r.left >= button.left && r.right <= button.right + 1 && r.top >= button.top - 1 && r.bottom <= button.bottom,
        name: d.parentElement.getAttribute('aria-label'),
    };
});

if (!phone) {
    // Before: the top bar as SillyTavern draws it, with the panel off
    await setForge(page, { menuPanel: false, menuButtons: true, menuLast: 'ai-config-button' });
    const before = await topBar();
    check('before: the top bar and its nine icons are on screen', !!before.bar && shownToggles(before) === 9 && before.size !== '0px',
        `bar ${before.bar}, ${shownToggles(before)} icons, --topBarBlockSize ${before.size}`);

    // 1. Menu panel on, buttons on: the top bar is gone
    await setForge(page, { menuPanel: true });
    let now = await topBar();
    check('1. body has forge-menu-buttons', await page.evaluate(() => document.body.classList.contains('forge-menu-buttons')));
    check('1. #top-bar is not shown', now.bar === null, String(now.bar));
    check('1. no .drawer-toggle in #top-settings-holder is shown', now.toggles.length > 0 && shownToggles(now) === 0, `${shownToggles(now)} of ${now.toggles.length} shown`);
    check('1. the toggles are still in the page', (await page.locator(TOGGLES).count()) === 9);
    check('1. --topBarBlockSize is 0px on body', now.size === '0px', now.size);
    const holder = await page.evaluate(() => {
        const h = document.getElementById('top-settings-holder');
        return { height: h.getBoundingClientRect().height, events: getComputedStyle(h).pointerEvents };
    });
    check('1. the holder takes no space and catches no clicks', holder.height === 0 && holder.events === 'none', JSON.stringify(holder));
    const underIcons = await page.evaluate((boxes) => boxes.filter(Boolean).map(([l, t, w, h]) => document.elementFromPoint(l + w / 2, t + h / 2))
        .filter((e) => e?.closest('#top-settings-holder, #top-bar')).length, before.toggles);
    check('1. a click where the icons were reaches neither the holder nor the bar', underIcons === 0, `${underIcons} hit`);
    const order = await page.evaluate(() => ({ last: document.body.lastElementChild?.id, next: document.getElementById('forge-menu-buttons')?.nextElementSibling?.id }));
    check('1. the buttons come just before #forge-menu, which stays last in body', order.last === 'forge-menu' && order.next === 'forge-menu', JSON.stringify(order));
    const buttons = await page.evaluate(() => [...document.querySelectorAll('#forge-menu-buttons > *')].map((b) => ({ tag: b.tagName, type: b.type, label: b.getAttribute('aria-label'), title: b.title, icon: !!b.querySelector('svg path') })));
    check('1. #forge-menu-buttons holds two real buttons, Characters then Menu, with labels, titles and icons',
        buttons.length === 2 && buttons.every((b) => b.tag === 'BUTTON' && b.type === 'button' && b.title && b.icon)
        && buttons[0].label === 'Characters' && buttons[1].label.startsWith('Menu'), JSON.stringify(buttons));

    // 2. Two buttons at the top right
    const left = await box(page, CHARACTERS);
    const right = await box(page, MENU);
    const view = await page.evaluate(() => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }));
    check('2. each button is at least 40px wide and tall', !!left && !!right && [left, right].every((b) => b.width >= 40 && b.height >= 40),
        `${left?.width}x${left?.height}, ${right?.width}x${right?.height}`);
    check('2. the right one is within 16px of the top and right edges', !!right && right.top <= 16 && view.w - right.right <= 16,
        `top ${right?.top}, right ${right && view.w - right.right}`);
    check('2. they are 8px apart, side by side', !!left && !!right && Math.abs(right.left - left.right - 8) <= 2 && Math.abs(right.top - left.top) <= 1,
        `${right && right.left - left.right}px`);
    const round = await page.evaluate(() => {
        const b = document.querySelector('#forge-menu-buttons .forge-menu-round-menu');
        const cs = getComputedStyle(b);
        return { radius: parseFloat(cs.borderTopLeftRadius) >= b.getBoundingClientRect().width / 2, border: cs.borderTopWidth, layer: getComputedStyle(b.parentElement).zIndex };
    });
    check('2. they are round, with a 1px line, on the buttons layer', round.radius && round.border === '1px' && round.layer === '3002', JSON.stringify(round));

    // 3. The chat column starts at the top of the window
    const sheld = await box(page, '#sheld');
    check('3. #sheld starts at the top of the window', !!sheld && Math.abs(sheld.top) <= 1, `top ${sheld?.top}`);

    // 4. Menu opens AI response the first time, then the section that was open last
    await click(MENU);
    check('4. Menu opens the frame on AI response', (await frameShown()) && (await isOpen('#left-nav-panel')), (await openMenus()).join(', '));
    const area = await page.evaluate(() => {
        const nav = document.querySelector('#forge-menu .forge-menu-nav').getBoundingClientRect();
        const head = document.querySelector('#forge-menu .forge-menu-head').getBoundingClientRect();
        const menu = document.getElementById('left-nav-panel').getBoundingClientRect();
        const hit = document.elementFromPoint(menu.left + menu.width / 2, menu.top + menu.height / 2);
        return { left: Math.round(menu.left - nav.right), top: Math.round(menu.top - head.bottom), clickable: !!hit?.closest('#left-nav-panel') };
    });
    check('4. the menu lies in the frame\'s content area and takes clicks there', Math.abs(area.left) <= 2 && Math.abs(area.top) <= 2 && area.clickable, JSON.stringify(area));
    await click('#forge-menu .forge-menu-section[data-forge-drawer="WI-SP-button"]');
    check('4. the nav switches to Lorebooks', await isOpen('#WorldInfo'));
    await closeFrame();
    check('4. closed: no menu is open and the frame is hidden', (await openMenus()).length === 0 && !(await frameShown()), (await openMenus()).join(', '));
    await click(MENU);
    check('4. Menu again opens Lorebooks', (await frameShown()) && (await isOpen('#WorldInfo')), (await openMenus()).join(', '));
    await closeFrame();

    // 5. Characters opens the Characters section; Menu still goes back to Lorebooks
    await click(CHARACTERS);
    check('5. Characters opens the frame with #right-nav-panel', (await frameShown()) && (await isOpen('#right-nav-panel')), (await openMenus()).join(', '));
    check('5. the head says Characters', (await page.evaluate(() => document.getElementById('forge-menu-title').textContent)) === 'Characters');
    await closeFrame();
    check('5. menuLast is still Lorebooks', (await menuLast()) === 'WI-SP-button', await menuLast());
    await click(MENU);
    check('5. Menu opens Lorebooks, not Characters', (await isOpen('#WorldInfo')) && !(await isOpen('#right-nav-panel')), (await openMenus()).join(', '));
    await closeFrame();

    // 6. A menuLast that is not in the page falls back to AI response (and so does Characters' own id)
    await setForge(page, { menuLast: 'forge-test-no-such-drawer' });
    await click(MENU);
    check('6. menuLast not in the page: Menu opens AI response', (await isOpen('#left-nav-panel')) && (await openMenus()).length === 1, (await openMenus()).join(', '));
    await closeFrame();
    await setForge(page, { menuLast: 'rightNavHolder' });
    await click(MENU);
    check('6. menuLast set to Characters: Menu still opens AI response', (await isOpen('#left-nav-panel')) && !(await isOpen('#right-nav-panel')), (await openMenus()).join(', '));
    await closeFrame();

    // 7. The "not connected" dot follows the plug icon, which SillyTavern sets from its online status
    await setStatus('Valid');
    let d = await dot();
    check('7. connected: the plug icon says so', await page.evaluate(() => document.getElementById('API-status-top').classList.contains('fa-plug')));
    check('7. connected: no dot on Menu', !!d && !d.shown && d.name === 'Menu', JSON.stringify(d));
    await setStatus('no_connection');
    d = await dot();
    check('7. not connected: the plug icon says so', await page.evaluate(() => document.getElementById('API-status-top').classList.contains('fa-plug-circle-exclamation')));
    check('7. not connected: an 8px --forge-danger dot is on Menu', !!d && d.shown && d.size === '8x8' && d.red && d.onButton, JSON.stringify(d));
    check('7. not connected: Menu\'s name says so', d?.name === 'Menu (not connected to an API)', d?.name);
    check('7. not connected: no dot on Characters', (await page.locator(`${CHARACTERS} .forge-menu-dot`).count()) === 0);
    await setStatus('Valid');
    d = await dot();
    check('7. connected again: no dot', !!d && !d.shown && d.name === 'Menu', JSON.stringify(d));
    await setStatus('no_connection');

    // Crossing SillyTavern's phone boundary takes the buttons away and brings the top bar back, and back again
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(500);
    now = await topBar();
    check('at 1000px wide: no buttons, and the top bar is back', (await ours()).length === 0 && !!now.bar && shownToggles(now) === 9, `${(await ours()).join(', ')}; bar ${now.bar}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    now = await topBar();
    check('at 1440px again: the buttons are back and the top bar hidden', (await box(page, MENU)) !== null && now.bar === null && shownToggles(now) === 0);

    // 8. Buttons off: the top bar is back where it was, and its icons open their menus in the panel
    await setForge(page, { menuButtons: false });
    now = await topBar();
    check('8. the buttons are gone', !(await page.evaluate(() => document.getElementById('forge-menu-buttons') || document.body.classList.contains('forge-menu-buttons'))));
    check('8. #top-bar is back where it was', sameBox(now.bar, before.bar), `${now.bar} vs ${before.bar}`);
    check('8. every icon is back where it was', now.toggles.length === before.toggles.length && now.toggles.every((t, i) => sameBox(t, before.toggles[i])),
        `${shownToggles(now)} shown`);
    check('8. the chat column starts below the top bar again', sameBox(now.sheld, before.sheld) && now.size === before.size, `${now.sheld} vs ${before.sheld}`);
    check('8. the panel is still on', await page.evaluate(() => document.body.classList.contains('forge-menu')));
    await click('#user-settings-button .drawer-toggle');
    const settingsArea = await page.evaluate(() => {
        const nav = document.querySelector('#forge-menu .forge-menu-nav').getBoundingClientRect();
        const menu = document.getElementById('user-settings-block').getBoundingClientRect();
        return Math.round(menu.left - nav.right);
    });
    check('8. a top bar icon opens its menu in the panel', (await frameShown()) && (await isOpen('#user-settings-block')) && Math.abs(settingsArea) <= 2, `menu ${settingsArea}px from the nav`);
    await closeFrame();
    check('8. closed again', (await openMenus()).length === 0 && !(await frameShown()));

    // Forge UI's main switch off takes the buttons with it
    await setForge(page, { menuButtons: true, enabled: false });
    now = await topBar();
    check('main switch off: nothing of ours, and the top bar is back', (await ours()).length === 0 && sameBox(now.bar, before.bar) && now.size === before.size,
        `${(await ours()).join(', ')}; ${now.size}`);
    await setForge(page, { enabled: true });
    check('main switch on again: the buttons are back', (await box(page, MENU)) !== null);

    // 10. Menu panel off: SillyTavern's own top bar size, and nothing of ours
    await setForge(page, { menuPanel: false });
    now = await topBar();
    check('10. --topBarBlockSize on body is SillyTavern\'s value again', now.size === before.size, `${now.size} vs ${before.size}`);
    check('10. nothing of ours remains', (await ours()).length === 0, (await ours()).join(', '));
    check('10. the top bar, its icons and the chat column are where they were',
        sameBox(now.bar, before.bar) && sameBox(now.holder, before.holder) && sameBox(now.sheld, before.sheld) && now.toggles.every((t, i) => sameBox(t, before.toggles[i])));

    // The settings screen: the buttons' checkbox, greyed out while the panel is off
    await click('#extensions-settings-button .drawer-toggle');
    await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
    await page.waitForTimeout(600);
    const field = () => page.evaluate(() => {
        const input = document.getElementById('forge-ui-menu-buttons');
        let heading = input?.closest('label');
        while (heading && heading.tagName !== 'H4') heading = heading.previousElementSibling;
        const panelBox = document.getElementById('forge-ui-menu-panel');
        return {
            label: input?.closest('label')?.textContent.trim(),
            checked: input?.checked,
            disabled: input?.disabled,
            title: input?.closest('label')?.getAttribute('title') ?? '',
            afterPanel: !!panelBox && !!input && !!(panelBox.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING),
            inMenus: heading?.textContent.trim() === 'Menus',
        };
    });
    let f = await field();
    check('settings: the Menus section has "Two round buttons in place of the top bar", ticked, after the panel\'s checkbox',
        f.label === 'Two round buttons in place of the top bar' && f.checked === true && f.afterPanel && f.inMenus, JSON.stringify(f));
    check('settings: with the panel off it is greyed out (disabled, with a title naming the panel\'s switch)', f.disabled === true && f.title.includes('"Menus open in one centred panel"'), JSON.stringify(f));
    await page.click('#forge-ui-menu-panel');
    await page.waitForTimeout(SETTLE);
    f = await field();
    check('settings: ticking the panel enables it and the buttons appear', f.disabled === false && !f.title && (await box(page, MENU)) !== null, JSON.stringify(f));
    await page.click('#forge-ui-menu-buttons');
    await page.waitForTimeout(SETTLE);
    const stored = await page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.menuButtons);
    now = await topBar();
    check('settings: unticking it saves menuButtons false, takes the buttons away and brings the top bar back',
        stored === false && !(await page.evaluate(() => document.getElementById('forge-menu-buttons'))) && sameBox(now.bar, before.bar), `menuButtons ${stored}`);
    await page.click('#forge-ui-menu-buttons');
    await page.waitForTimeout(SETTLE);
    check('settings: ticking it again brings the buttons back', (await box(page, MENU)) !== null && (await topBar()).bar === null);
    await page.click('#forge-ui-menu-panel');
    await page.waitForTimeout(SETTLE);
    f = await field();
    check('settings: unticking the panel greys it out again and leaves nothing of ours', f.disabled === true && f.title.includes('"Menus open in one centred panel"') && (await ours()).length === 0, `${JSON.stringify(f)}; ${(await ours()).join(', ')}`);
    await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
    await page.waitForTimeout(400);
    await click('#extensions-settings-button .drawer-toggle');
    check('settings: the Extensions menu closes from its own icon again', (await openMenus()).length === 0, (await openMenus()).join(', '));
} else {
    // 9. Phone: both settings on change nothing; SillyTavern's own top bar stays
    await setForge(page, { menuPanel: false, menuButtons: true });
    const before = await topBar();
    await setForge(page, { menuPanel: true, menuButtons: true });
    const now = await topBar();
    check('9. phone: no #forge-menu-buttons and no forge-menu-buttons class', (await ours()).length === 0, (await ours()).join(', '));
    check('9. phone: SillyTavern\'s top bar is on screen', !!now.holder && now.holder[1] >= 0 && now.holder[1] + now.holder[3] <= 800 && shownToggles(now) > 0,
        `holder ${now.holder}, ${shownToggles(now)} icons shown`);
    check('9. phone: the top bar is as it was with the settings off',
        sameBox(now.holder, before.holder) && now.size === before.size && now.toggles.every((t, i) => sameBox(t, before.toggles[i])), `${now.holder} vs ${before.holder}`);
    await setForge(page, { menuPanel: false });
}

await finish();
