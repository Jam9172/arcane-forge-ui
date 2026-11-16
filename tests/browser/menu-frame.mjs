// The menu panel's frame (batch P1): with the menu panel on, on a desktop-sized window, every menu opened
// from the top bar shows in one centred panel with the sections listed down its left side. Phones keep
// SillyTavern's own drawers.
// Usage: node tests/browser/menu-frame.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });

const SETTINGS = '#user-settings-button .drawer-toggle';
const LABELS = ['Characters', 'AI response', 'Connection', 'Formatting', 'Lorebooks', 'Personas', 'Backgrounds', 'Extensions', 'Settings'];
// SillyTavern animates a drawer open over twice its animation duration, and waits once more before switching
const SETTLE = 700;

const isOpen = (selector) => page.evaluate((selector) => document.querySelector(selector)?.classList.contains('openDrawer') ?? false, selector);
const openMenus = () => page.evaluate(() => [...document.querySelectorAll('#top-settings-holder > .drawer > .drawer-content.openDrawer')].map((e) => e.id));
const ours = () => page.evaluate(() => [
    ...(document.getElementById('forge-menu') ? ['#forge-menu'] : []),
    ...(document.body.classList.contains('forge-menu') ? ['body.forge-menu'] : []),
]);
const frameShown = () => page.evaluate(() => {
    const frame = document.getElementById('forge-menu');
    return !!frame && !frame.hidden && frame.querySelector('.forge-menu-panel').getClientRects().length > 0;
});
const clickAndSettle = async (selector) => {
    await page.click(selector);
    await page.waitForTimeout(SETTLE);
};
const same = (a, b) => !!a && !!b && ['left', 'top', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) <= 1);
const show = (b) => (b ? `${b.left},${b.top} ${b.width}x${b.height}` : 'not shown');

if (!phone) {
    // 1. Off: SillyTavern places the menu itself, under the top bar and across the chat column. This test opens
    // menus from the top bar, so the round buttons that would replace it stay off (menu-buttons.mjs tests them).
    await setForge(page, { menuPanel: false, menuButtons: false });
    await clickAndSettle(SETTINGS);
    const nativeBox = await box(page, '#user-settings-block');
    const holder = await box(page, '#top-settings-holder');
    check('off: the Settings menu opens', await isOpen('#user-settings-block'));
    check('off: there is no #forge-menu', !(await page.evaluate(() => document.getElementById('forge-menu'))));
    check('off: the menu is where SillyTavern puts it (under the top bar, as wide as it)',
        !!nativeBox && !!holder && Math.abs(nativeBox.top - holder.bottom) <= 1 && Math.abs(nativeBox.left - holder.left) <= 1 && Math.abs(nativeBox.width - holder.width) <= 1,
        `menu ${show(nativeBox)}, top bar ${show(holder)}`);
    await clickAndSettle(SETTINGS);
    check('off: it closes again', !(await isOpen('#user-settings-block')));

    // 2. On: the frame is in the page, and shows only while a menu is open
    await setForge(page, { menuPanel: true });
    check('on: body has forge-menu', await page.evaluate(() => document.body.classList.contains('forge-menu')));
    check('on: #forge-menu is the last child of body', await page.evaluate(() => document.body.lastElementChild?.id === 'forge-menu'));
    check('on: with no menu open the frame is hidden', !(await frameShown()));
    await clickAndSettle(SETTINGS);
    check('on: opening Settings shows the frame', await frameShown());
    const panel = await box(page, '#forge-menu .forge-menu-panel');
    const tokens = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.cssText = 'position: fixed; width: var(--forge-menu-w); height: var(--forge-menu-h); visibility: hidden;';
        document.body.append(probe);
        const r = probe.getBoundingClientRect();
        probe.remove();
        const nav = getComputedStyle(document.body).getPropertyValue('--forge-menu-nav').trim();
        const head = getComputedStyle(document.body).getPropertyValue('--forge-menu-head').trim();
        return { width: Math.round(r.width), height: Math.round(r.height), nav: parseFloat(nav), head: parseFloat(head), windowW: document.documentElement.clientWidth, windowH: document.documentElement.clientHeight };
    });
    const gaps = panel && { left: panel.left, right: tokens.windowW - panel.right, top: panel.top, bottom: tokens.windowH - panel.bottom };
    check('on: the panel is centred in the window', !!gaps && Math.abs(gaps.left - gaps.right) <= 2 && Math.abs(gaps.top - gaps.bottom) <= 2,
        gaps ? `left ${gaps.left}, right ${gaps.right}, top ${gaps.top}, bottom ${gaps.bottom}` : 'no panel');
    check('on: the panel is --forge-menu-w by --forge-menu-h', !!panel && Math.abs(panel.width - tokens.width) <= 1 && Math.abs(panel.height - tokens.height) <= 1,
        `${show(panel)}, tokens ${tokens.width}x${tokens.height}`);
    const roles = await page.evaluate(() => {
        const p = document.querySelector('#forge-menu .forge-menu-panel');
        return { role: p.getAttribute('role'), modal: p.getAttribute('aria-modal'), title: document.getElementById(p.getAttribute('aria-labelledby'))?.textContent };
    });
    check('on: the panel is a modal dialog labelled by its title, which says Settings', roles.role === 'dialog' && roles.modal === 'true' && roles.title === 'Settings', JSON.stringify(roles));

    // 3. The menu lies inside the panel, right of the nav and below the head, and scrolls inside itself
    const nav = await box(page, '#forge-menu .forge-menu-nav');
    const head = await box(page, '#forge-menu .forge-menu-head');
    const menu = await box(page, '#user-settings-block');
    check('on: the nav is --forge-menu-nav wide and the head --forge-menu-head tall',
        !!nav && !!head && Math.abs(nav.right - panel.left - tokens.nav) <= 1 && Math.abs(head.bottom - panel.top - tokens.head) <= 1,
        `nav ${nav && nav.right - panel.left}px, head ${head && head.bottom - panel.top}px`);
    check('on: the Settings menu starts right of the nav and below the head',
        !!menu && Math.abs(menu.left - nav.right) <= 2 && Math.abs(menu.top - head.bottom) <= 2, `menu ${show(menu)}, nav right ${nav?.right}, head bottom ${head?.bottom}`);
    check('on: the Settings menu ends inside the panel',
        !!menu && menu.right <= panel.right && menu.bottom <= panel.bottom && panel.right - menu.right <= 2 && panel.bottom - menu.bottom <= 2, `menu ${show(menu)}, panel ${show(panel)}`);
    const scrolling = await page.evaluate(() => {
        const m = document.querySelector('#user-settings-block');
        const root = document.scrollingElement;
        return { overflow: getComputedStyle(m).overflowY, scrollHeight: m.scrollHeight, height: m.clientHeight, pageScrolls: root.scrollHeight > root.clientHeight || root.scrollTop > 0 };
    });
    check('on: the menu scrolls inside itself and the page does not scroll', ['auto', 'scroll'].includes(scrolling.overflow) && !scrolling.pageScrolls,
        `overflow ${scrolling.overflow}, ${scrolling.scrollHeight}px of content in ${scrolling.height}px`);
    check('on: the menu is still inside #top-settings-holder', await page.evaluate(() => document.querySelector('#user-settings-block').parentElement.parentElement.id === 'top-settings-holder'));

    // 4. One nav button per drawer, in the bible's order and words, each with the top bar's icon and title
    const buttons = () => page.evaluate(() => [...document.querySelectorAll('#forge-menu .forge-menu-nav .forge-menu-section')].map((b) => ({
        label: b.textContent.trim(),
        current: b.getAttribute('aria-current'),
        title: b.title,
        nativeTitle: (() => {
            const drawer = document.getElementById(b.dataset.forgeDrawer);
            const toggle = drawer?.querySelector(':scope > .drawer-toggle');
            return toggle?.querySelector('.drawer-icon')?.title || toggle?.title || '';
        })(),
        icon: b.querySelector('.forge-menu-icon.forge-menu-mask') ? getComputedStyle(b.querySelector('.forge-menu-icon')).getPropertyValue('--forge-menu-icon').startsWith('url(') : false,
    })));
    let list = await buttons();
    const labels = list.map((b) => b.label);
    check('on: the nav lists the nine menus in order', LABELS.every((name, i) => labels[i] === name), labels.join(', '));
    check('on: each nav button has the native icon\'s title', list.slice(0, 9).every((b) => b.title && b.title === b.nativeTitle), list.filter((b) => b.title !== b.nativeTitle).map((b) => b.label).join(', ') || 'all nine');
    check('on: each nav button shows the top bar\'s Forge icon', list.slice(0, 9).every((b) => b.icon), list.filter((b) => !b.icon).map((b) => b.label).join(', ') || 'all nine');
    let current = list.filter((b) => b.current === 'page').map((b) => b.label);
    check('on: exactly one nav button is current: Settings', current.length === 1 && current[0] === 'Settings', current.join(', ') || 'none');

    // 5. Changing section through the nav; the frame stays up while SillyTavern swaps the menus
    await page.evaluate(() => {
        globalThis.forgeTestHides = 0;
        globalThis.forgeTestWatch = new MutationObserver(() => { if (document.getElementById('forge-menu').hidden) globalThis.forgeTestHides++; });
        globalThis.forgeTestWatch.observe(document.getElementById('forge-menu'), { attributes: true, attributeFilter: ['hidden'] });
    });
    await clickAndSettle('#forge-menu .forge-menu-section[data-forge-drawer="WI-SP-button"]');
    check('Lorebooks: #WorldInfo is open', await isOpen('#WorldInfo'));
    check('Lorebooks: #user-settings-block is closed', !(await isOpen('#user-settings-block')));
    check('Lorebooks: the frame is still shown', await frameShown());
    const hides = await page.evaluate(() => { globalThis.forgeTestWatch.disconnect(); return globalThis.forgeTestHides; });
    check('Lorebooks: the frame did not hide while the menus changed', hides === 0, `${hides} hide(s)`);
    list = await buttons();
    current = list.filter((b) => b.current === 'page').map((b) => b.label);
    check('Lorebooks: aria-current moved to Lorebooks', current.length === 1 && current[0] === 'Lorebooks', current.join(', ') || 'none');
    check('Lorebooks: the head says Lorebooks', (await page.evaluate(() => document.getElementById('forge-menu-title').textContent)) === 'Lorebooks');
    // 9. (checked here, straight after step 5)
    const last = await page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.menuLast);
    check('menuLast is WI-SP-button after opening Lorebooks', last === 'WI-SP-button', last);
    check('the Lorebooks menu lies in the content area too', same(await box(page, '#WorldInfo'), menu), `${show(await box(page, '#WorldInfo'))} vs ${show(menu)}`);

    // 6. Presses on the head and on an empty part of the nav close nothing
    const closeBox = await box(page, '#forge-menu .forge-menu-close');
    const headPoint = { x: closeBox.left - 16, y: Math.round(head.top + head.height / 2) };
    const navPoint = { x: Math.round(nav.left + nav.width / 2), y: nav.bottom - 12 };
    const hit = (p) => page.evaluate(({ x, y }) => {
        const e = document.elementFromPoint(x, y);
        return e?.closest('.forge-menu-head') ? 'head' : e?.closest('.forge-menu-section') ? 'nav button' : e?.closest('.forge-menu-nav') ? 'nav' : e?.closest('#WorldInfo') ? 'menu' : e?.className ?? 'nothing';
    }, p);
    check('the head point is on the head', (await hit(headPoint)) === 'head', await hit(headPoint));
    await page.mouse.click(headPoint.x, headPoint.y);
    await page.waitForTimeout(400);
    check('a click on the head closes nothing', (await isOpen('#WorldInfo')) && (await frameShown()));
    check('the nav point is on an empty part of the nav', (await hit(navPoint)) === 'nav', await hit(navPoint));
    await page.mouse.click(navPoint.x, navPoint.y);
    await page.waitForTimeout(400);
    check('a click on an empty part of the nav closes nothing', (await isOpen('#WorldInfo')) && (await frameShown()));

    // 7. A click inside the open menu (on its own padding, so no control is changed) closes nothing
    const wi = (await box(page, '#WorldInfo')) ?? { left: 0, top: 0 };
    const menuPoint = { x: wi.left + 2, y: wi.top + 2 };
    check('the menu point is on the open menu', (await hit(menuPoint)) === 'menu', await hit(menuPoint));
    await page.mouse.click(menuPoint.x, menuPoint.y);
    await page.waitForTimeout(400);
    check('a click inside the open menu closes nothing', (await isOpen('#WorldInfo')) && (await frameShown()));

    // 8. The close button and the backdrop each close the menu, and the frame goes with it
    await page.click('#forge-menu .forge-menu-close');
    await page.waitForTimeout(400);
    check('the close button: no menu is open', (await openMenus()).length === 0, (await openMenus()).join(', '));
    check('the close button: the frame is hidden', !(await frameShown()));
    await clickAndSettle(SETTINGS);
    check('reopened: the frame is shown', await frameShown());
    const backdropPoint = { x: Math.round(panel.left / 2), y: Math.round(tokens.windowH / 2) };
    const onBackdrop = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.matches('#forge-menu .forge-menu-backdrop'), backdropPoint);
    check('the backdrop point is on the backdrop', onBackdrop);
    await page.mouse.click(backdropPoint.x, backdropPoint.y);
    await page.waitForTimeout(400);
    check('the backdrop: no menu is open', (await openMenus()).length === 0, (await openMenus()).join(', '));
    check('the backdrop: the frame is hidden', !(await frameShown()));

    // 10. A drawer another extension adds is listed last, under its icon's title
    await page.evaluate(() => {
        const drawer = document.createElement('div');
        drawer.className = 'drawer';
        drawer.id = 'test-extra-drawer';
        const toggle = document.createElement('div');
        toggle.className = 'drawer-toggle';
        const icon = document.createElement('div');
        icon.className = 'drawer-icon fa-solid fa-star fa-fw closedIcon';
        icon.title = 'Extra';
        toggle.append(icon);
        const content = document.createElement('div');
        content.className = 'drawer-content closedDrawer';
        drawer.append(toggle, content);
        document.getElementById('top-settings-holder').append(drawer);
    });
    await clickAndSettle(SETTINGS);
    list = await buttons();
    check('a stand-in drawer: the nav ends with a button labelled Extra', list.at(-1)?.label === 'Extra' && list.length === LABELS.length + 1, list.map((b) => b.label).join(', '));
    check('a stand-in drawer: its button shows its own icon', await page.evaluate(() => {
        const icon = document.querySelector('#forge-menu .forge-menu-section[data-forge-drawer="test-extra-drawer"] .forge-menu-icon');
        return !!icon?.classList.contains('fa-star') && getComputedStyle(icon, '::before').content !== 'none';
    }));
    await page.click('#forge-menu .forge-menu-close');
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('test-extra-drawer').remove());

    // The settings screen has the switch, and ticking it while a menu is open moves that menu into the panel
    await setForge(page, { menuPanel: false });
    await clickAndSettle('#extensions-settings-button .drawer-toggle');
    await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
    await page.waitForTimeout(600);
    const section = await page.evaluate(() => {
        const box = document.getElementById('forge-ui-menu-panel');
        const heading = [...document.querySelectorAll('.arcane-forge-ui-settings h4')].find((h) => h.textContent.trim() === 'Menus');
        return { heading: !!heading, label: box?.closest('label')?.textContent.trim(), checked: box?.checked };
    });
    check('the settings have a Menus section with the panel\'s checkbox, unticked', section.heading && section.label === 'Menus open in one centred panel (desktop)' && section.checked === false, JSON.stringify(section));
    await page.click('#forge-ui-menu-panel');
    await page.waitForTimeout(SETTLE);
    const ticked = await page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.menuPanel);
    check('ticking it turns the panel on, with the open Extensions menu inside the frame',
        ticked === true && (await frameShown()) && same(await box(page, '#rm_extensions_block'), menu),
        `menuPanel ${ticked}, menu ${show(await box(page, '#rm_extensions_block'))}`);
    await page.click('#forge-ui-menu-panel');
    await page.waitForTimeout(SETTLE);
    check('unticking it takes the panel away again', (await ours()).length === 0 && (await isOpen('#rm_extensions_block')), (await ours()).join(', '));
    await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
    await page.waitForTimeout(400);
    await clickAndSettle('#extensions-settings-button .drawer-toggle');

    // Forge UI's main switch off takes the panel with it
    await setForge(page, { menuPanel: true, enabled: false });
    check('main switch off: nothing of the panel is in the page', (await ours()).length === 0, (await ours()).join(', '));
    await setForge(page, { enabled: true });

    // 11. Off again: nothing of ours, and the menu is back where SillyTavern puts it
    await setForge(page, { menuPanel: false });
    check('off again: no #forge-menu and no forge-menu class', (await ours()).length === 0, (await ours()).join(', '));
    await clickAndSettle(SETTINGS);
    const againBox = await box(page, '#user-settings-block');
    check('off again: the Settings menu is where it was in step 1', same(againBox, nativeBox), `${show(againBox)} vs ${show(nativeBox)}`);
    await clickAndSettle(SETTINGS);
} else {
    // 12. Phone: the setting changes nothing; SillyTavern opens the menu as it always does
    await setForge(page, { menuPanel: false });
    await clickAndSettle(SETTINGS);
    const nativeBox = await box(page, '#user-settings-block');
    check('phone, off: the Settings menu opens', await isOpen('#user-settings-block') && !!nativeBox, show(nativeBox));
    await clickAndSettle(SETTINGS);
    await setForge(page, { menuPanel: true });
    check('phone, on: no forge-menu class and no #forge-menu', (await ours()).length === 0, (await ours()).join(', '));
    await clickAndSettle(SETTINGS);
    const phoneBox = await box(page, '#user-settings-block');
    check('phone, on: the Settings menu opens where SillyTavern puts it', (await isOpen('#user-settings-block')) && same(phoneBox, nativeBox), `${show(phoneBox)} vs ${show(nativeBox)}`);
    check('phone, on: still nothing of the panel in the page', (await ours()).length === 0, (await ours()).join(', '));
    await clickAndSettle(SETTINGS);
    await setForge(page, { menuPanel: false });
}

await finish();
