// The menu panel by keyboard, and its motion (batch P4): opening moves the focus to the open section's nav
// button, Tab goes round the frame and the open menu, Escape closes the panel unless a window is open over it,
// and closing gives the focus back to what opened it. The frame fades in, or appears at once under either
// reduced motion setting. Phones never get the panel, so there the keys are SillyTavern's alone.
//
// WebKit's Tab normally skips buttons and links (Safari's "Press Tab to highlight each item" is off). The panel
// moves the focus itself on Tab, so plain Tab presses are what this test sends; it never changes a browser or
// system setting.
// Usage: node tests/browser/menu-keys.mjs [phone]
import { openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });

const MENU = '#forge-menu-buttons .forge-menu-round-menu';
const CHARACTERS = '#forge-menu-buttons .forge-menu-round-characters';
const SETTINGS_ICON = '#user-settings-button > .drawer-toggle .drawer-icon';
const NAV = (drawer) => `#forge-menu .forge-menu-section[data-forge-drawer="${drawer}"]`;
// SillyTavern animates a drawer open over twice its animation duration, and waits once more before switching
const SETTLE = 700;

const frameShown = () => page.evaluate(() => {
    const frame = document.getElementById('forge-menu');
    return !!frame && !frame.hidden && frame.querySelector('.forge-menu-panel').getClientRects().length > 0;
});
const openMenus = () => page.evaluate(() => [...document.querySelectorAll('#top-settings-holder > .drawer > .drawer-content.openDrawer')].map((e) => e.id));
// Where the focus is: in the frame, in the open menu, or elsewhere, and what it is
const focus = () => page.evaluate(() => {
    const a = document.activeElement;
    const menu = document.querySelector('#top-settings-holder > .drawer > .drawer-content.openDrawer:not(.pinnedOpen)');
    return {
        inFrame: !!a?.closest('#forge-menu'),
        inMenu: !!menu && !!a && menu.contains(a),
        name: !a ? 'nothing' : `${a.tagName.toLowerCase()}${a.id ? `#${a.id}` : ''}${a.classList.length ? `.${[...a.classList].slice(0, 2).join('.')}` : ''}`,
        current: a?.getAttribute('aria-current') ?? null,
        section: a?.matches('.forge-menu-section') ? a.textContent.trim() : null,
    };
});
const isFocused = (selector) => page.evaluate((selector) => document.activeElement === document.querySelector(selector), selector);
const press = async (key, wait = SETTLE) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(wait);
};
// Opens what a control opens the way a keyboard user does: focus it, press Enter
const openWith = async (selector) => {
    await page.focus(selector);
    await press('Enter');
};
const closeFrame = async () => {
    if (await frameShown()) await page.click('#forge-menu .forge-menu-close');
    await page.waitForTimeout(400);
};
// The transition durations of the frame's two parts, the backdrop and the panel
const durations = () => page.evaluate(() => ['.forge-menu-backdrop', '.forge-menu-panel']
    .map((part) => getComputedStyle(document.querySelector(`#forge-menu ${part}`)).transitionDuration.split(',').map((d) => d.trim())));
const allAre = (list, value) => list.length === 2 && list.every((part) => part.length > 0 && part.every((d) => d === value));
// Opens the Menu section with a click and lists the transitions started in the frame and the open menu, read
// straight after the frame is shown (SillyTavern's change of classes, then the frame's watcher, are microtasks)
const transitionsOnOpening = () => page.evaluate(async (menuButton) => {
    document.querySelector(menuButton).click();
    await Promise.resolve();
    await Promise.resolve();
    const menu = document.querySelector('#top-settings-holder > .drawer > .drawer-content.openDrawer:not(.pinnedOpen)');
    const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return document.getAnimations()
        .filter((a) => a instanceof CSSTransition && a.effect?.target && (a.effect.target.closest('#forge-menu') || menu?.contains(a.effect.target)))
        .map((a) => `${a.effect.target.classList[0] || a.effect.target.id} ${a.transitionProperty} from ${a.effect.getKeyframes()[0]?.[camel(a.transitionProperty)]}`).sort();
}, MENU);
// The three transitions the bible allows, from where it says they start
const allowedMotion = (moving) => moving.length === 3 && moving[0] === 'forge-menu-backdrop opacity from 0' && moving[1] === 'forge-menu-panel opacity from 0'
    && /^forge-menu-panel transform from (scale\(0\.98\)|matrix\(0\.98, 0, 0, 0\.98, 0, 0\))$/.test(moving[2]);
const reducedMotion = (on) => page.evaluate((on) => { globalThis.SillyTavern.getContext().powerUserSettings.reduced_motion = on; }, on);

// Key listeners that menu.js adds, wherever it adds them, and whether each is still in place: the page's
// addEventListener and removeEventListener are wrapped (in this page only) to note them
await page.evaluate(() => {
    const live = new Set();
    const where = [];
    globalThis.forgeTestKeys = { live, where };
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (/^key/.test(type) && /arcane-forge-ui\/menu\.js/.test(new Error().stack ?? '')) {
            live.add(listener);
            where.push(this === document ? 'document' : this === window ? 'window' : this === document.body ? 'body' : this.id || this.tagName);
        }
        return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
        if (/^key/.test(type)) live.delete(listener);
        return remove.call(this, type, listener, options);
    };
});
const ourKeys = () => page.evaluate(() => ({ live: globalThis.forgeTestKeys.live.size, where: [...new Set(globalThis.forgeTestKeys.where)] }));
const ours = () => page.evaluate(() => [
    ...['forge-menu', 'forge-menu-buttons'].filter((id) => document.getElementById(id)).map((id) => `#${id}`),
    ...['forge-menu', 'forge-menu-buttons'].filter((name) => document.body.classList.contains(name)).map((name) => `body.${name}`),
    ...(document.querySelector('.forge-menu-still') ? ['.forge-menu-still'] : []),
]);
// SillyTavern's own Escape on its own menu: open Settings from its top bar icon by keyboard, press Escape, and
// note what is open and where the focus is
const nativeEscape = async () => {
    await openWith(SETTINGS_ICON);
    const opened = await openMenus();
    await press('Escape');
    const result = { opened: opened.join(', '), after: (await openMenus()).join(', '), focus: (await focus()).name };
    if ((await openMenus()).length) await page.click('#user-settings-button > .drawer-toggle');
    await page.waitForTimeout(400);
    return result;
};

if (!phone) {
    // Before: the panel off, the top bar showing, SillyTavern's Escape alone
    await setForge(page, { menuPanel: false, menuButtons: false, menuLast: 'ai-config-button' });
    const before = await nativeEscape();
    check('before: SillyTavern\'s Escape closes Settings, opened from its icon by keyboard', before.opened === 'user-settings-block' && before.after === '', JSON.stringify(before));

    // 1. Focus Menu and press Enter: the frame opens with the focus on the open section's nav button
    await setForge(page, { menuPanel: true, menuButtons: true });
    await openWith(MENU);
    let f = await focus();
    check('1. Menu by keyboard opens the frame on AI response', (await frameShown()) && (await openMenus()).join() === 'left-nav-panel', (await openMenus()).join(', '));
    check('1. the focus is on the nav button with aria-current="page", AI response\'s', f.inFrame && f.current === 'page' && f.section === 'AI response', JSON.stringify(f));
    const fill = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.background = 'var(--forge-ember)';
        document.body.append(probe);
        const ember = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const button = document.activeElement;
        return { ember: getComputedStyle(button).backgroundColor === ember, ring: getComputedStyle(button).outlineStyle !== 'none' };
    });
    check('1. focused, the current section keeps its --forge-ember fill, inside the existing focus ring', fill.ember && fill.ring, JSON.stringify(fill));
    check('1. one key listener of ours is in place, on body', (await ourKeys()).live === 1 && (await ourKeys()).where.join() === 'body', JSON.stringify(await ourKeys()));

    // 2. A modal dialog labelled by its title; the nav is a nav named Menus
    const roles = await page.evaluate(() => {
        const panel = document.querySelector('#forge-menu .forge-menu-panel');
        const nav = document.querySelector('#forge-menu nav');
        return {
            role: panel.getAttribute('role'),
            modal: panel.getAttribute('aria-modal'),
            title: document.getElementById(panel.getAttribute('aria-labelledby'))?.textContent,
            nav: nav?.getAttribute('aria-label'),
            navHolds: nav?.querySelectorAll('.forge-menu-section').length,
        };
    });
    check('2. the panel has role="dialog" and aria-modal="true", and its aria-labelledby names the section', roles.role === 'dialog' && roles.modal === 'true' && roles.title === 'AI response', JSON.stringify(roles));
    check('2. the nav is a <nav> with aria-label="Menus" that holds the section buttons', roles.nav === 'Menus' && roles.navHolds === 9, JSON.stringify(roles));

    // 3. Tab 60 times, then Shift+Tab 10 times: always in the frame or the open menu
    const strays = [];
    const visits = { frame: 0, menu: 0 };
    for (let i = 1; i <= 60; i++) {
        await page.keyboard.press('Tab');
        f = await focus();
        if (f.inFrame) visits.frame++;
        if (f.inMenu) visits.menu++;
        if (!f.inFrame && !f.inMenu) strays.push(`Tab ${i}: ${f.name}`);
    }
    check('3. 60 Tabs: the focus is always inside #forge-menu or the open menu', strays.length === 0, strays.slice(0, 3).join('; ') || JSON.stringify(visits));
    check('3. Tab stops at the frame\'s buttons and then at the menu\'s controls (buttons too, in WebKit)', visits.frame >= 8 && visits.menu > 30, JSON.stringify(visits));
    for (let i = 1; i <= 10; i++) {
        await page.keyboard.press('Shift+Tab');
        f = await focus();
        if (!f.inFrame && !f.inMenu) strays.push(`Shift+Tab ${i}: ${f.name}`);
    }
    check('3. 10 Shift+Tabs: the same', strays.length === 0, strays.slice(0, 3).join('; ') || 'none outside');
    // Round from the first to the last and back
    await page.focus(NAV('rightNavHolder'));
    await page.keyboard.press('Shift+Tab');
    const last = await focus();
    await page.keyboard.press('Tab');
    const first = await focus();
    check('3. Shift+Tab on the first nav button goes round to the open menu, and Tab comes back to it', last.inMenu && first.section === 'Characters', `${last.name} then ${first.name}`);
    // The close button is in the round too
    await page.focus(NAV('user-settings-button'));
    await page.keyboard.press('Tab');
    check('3. Tab from the last nav button reaches the close button', await isFocused('#forge-menu .forge-menu-close'), (await focus()).name);

    // Changing section by keyboard: the frame stays, and so does the focus, now on the current section
    await page.focus(NAV('WI-SP-button'));
    await press('Enter');
    f = await focus();
    check('a nav button by keyboard changes the section, and the focus stays on it, now current', (await frameShown()) && (await openMenus()).join() === 'WorldInfo' && f.section === 'Lorebooks' && f.current === 'page', `${(await openMenus()).join(', ')} ${JSON.stringify(f)}`);

    // 4. Escape: the frame closes and the focus is back on Menu
    await press('Escape', 400);
    check('4. Escape closes the frame', !(await frameShown()) && (await openMenus()).length === 0, (await openMenus()).join(', '));
    check('4. the focus is back on the Menu round button', await isFocused(MENU), (await focus()).name);
    check('4. no key listener of ours is left', (await ourKeys()).live === 0, JSON.stringify(await ourKeys()));

    // 5. Opened with Characters, Escape gives the focus back to Characters
    await openWith(CHARACTERS);
    check('5. Characters by keyboard opens the Characters section', (await frameShown()) && (await openMenus()).join() === 'right-nav-panel' && (await focus()).section === 'Characters');
    await press('Escape', 400);
    check('5. Escape: the frame is closed and the focus is on the Characters round button', !(await frameShown()) && (await isFocused(CHARACTERS)), (await focus()).name);

    // 6. A <dialog> over the panel takes Escape; the next Escape closes the panel
    await openWith(MENU);
    const section = (await openMenus()).join();
    await page.evaluate(() => {
        const dialog = document.createElement('dialog');
        dialog.id = 'forge-test-dialog';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Stand-in';
        dialog.append(button);
        document.body.append(dialog);
        dialog.showModal();
    });
    await page.waitForTimeout(300);
    check('6. the stand-in dialog is open over the panel', await page.evaluate(() => document.getElementById('forge-test-dialog').open));
    await press('Escape');
    check('6. Escape closes the dialog', !(await page.evaluate(() => document.getElementById('forge-test-dialog').open)));
    check('6. and the panel is still open, on the same section', (await frameShown()) && (await openMenus()).join() === section, `${section} then ${(await openMenus()).join(', ')}`);
    await press('Escape', 400);
    check('6. Escape again closes the panel, and the focus is back on Menu', !(await frameShown()) && (await openMenus()).length === 0 && (await isFocused(MENU)), (await focus()).name);
    await page.evaluate(() => document.getElementById('forge-test-dialog').remove());

    // SillyTavern's own popup over the panel: Escape is its own too
    await openWith(MENU);
    await page.evaluate(async () => {
        const { callGenericPopup, POPUP_TYPE } = await import('/scripts/popup.js');
        globalThis.forgeTestPopup = callGenericPopup('Forge test dialog', POPUP_TYPE.TEXT);
    });
    await page.waitForTimeout(SETTLE);
    const popup = page.locator('dialog.popup[open]', { hasText: 'Forge test dialog' });
    check('a SillyTavern popup opens over the panel', (await popup.count()) === 1);
    await press('Escape');
    check('a SillyTavern popup: Escape closes it, and the panel stays open', (await popup.count()) === 0 && (await frameShown()) && (await openMenus()).length === 1, (await openMenus()).join(', '));
    await press('Escape', 400);
    check('a SillyTavern popup: then Escape closes the panel', !(await frameShown()) && (await isFocused(MENU)), (await focus()).name);

    // SillyTavern's older kind of window, the advanced definitions: its Escape is SillyTavern's own
    await openWith(CHARACTERS);
    // The selected character's tab (the Forge Tester the helper opened), where the window's button is
    await page.click('#rm_button_selected_ch');
    await page.waitForTimeout(SETTLE);
    await page.click('#advanced_div');
    await page.waitForTimeout(SETTLE);
    const popupShown = () => page.evaluate(() => document.getElementById('character_popup').getClientRects().length > 0);
    check('the advanced definitions window opens over the Characters section', (await popupShown()) && (await frameShown()));
    await press('Escape');
    check('the advanced definitions window: Escape closes it (SillyTavern\'s own Escape), and Characters stays open in the frame',
        !(await popupShown()) && (await frameShown()) && (await openMenus()).join() === 'right-nav-panel', (await openMenus()).join(', '));
    await press('Escape', 400);
    check('the advanced definitions window: then Escape closes the panel', !(await frameShown()) && (await openMenus()).length === 0);

    // 7. The panel closed: Escape reaches nothing of ours
    await page.evaluate(() => {
        globalThis.forgeTestToggleClicks = 0;
        globalThis.forgeTestKeysSeen = [];
        for (const toggle of document.querySelectorAll('.drawer-toggle')) toggle.addEventListener('click', () => { globalThis.forgeTestToggleClicks++; });
        document.addEventListener('keydown', (event) => globalThis.forgeTestKeysSeen.push(`${event.key} ${event.defaultPrevented}`), true);
        document.addEventListener('keydown', (event) => globalThis.forgeTestKeysSeen.push(`${event.key} ${event.defaultPrevented}`));
    });
    await page.focus(MENU);
    await press('Escape', 400);
    await page.evaluate(() => document.activeElement?.blur());
    await press('Escape', 400);
    await press('Tab', 200);
    const closed = await page.evaluate(() => ({ clicks: globalThis.forgeTestToggleClicks, seen: globalThis.forgeTestKeysSeen }));
    check('7. with the panel closed, Escape clicks no .drawer-toggle', closed.clicks === 0, `${closed.clicks} clicks`);
    check('7. and Escape and Tab reach document untouched, with no key listener of ours in place',
        closed.seen.join() === ['Escape false', 'Escape false', 'Escape false', 'Escape false', 'Tab false', 'Tab false'].join() && (await ourKeys()).live === 0,
        `${closed.seen.join(', ')}; ${JSON.stringify(await ourKeys())}`);
    check('7. no menu opened', (await openMenus()).length === 0 && !(await frameShown()));

    // 8. Motion: the frame fades in over --forge-fast; with the system's reduced motion it does not
    await openWith(MENU);
    let d = await durations();
    check('8. open: the backdrop\'s and the panel\'s transition-duration is 0.16s', allAre(d, '0.16s'), JSON.stringify(d));
    await closeFrame();
    let moving = await transitionsOnOpening();
    check('8. opening fades the backdrop in, and fades the panel in while it grows from 0.98; nothing else in the frame or the menu moves',
        allowedMotion(moving), moving.join(', '));
    await page.waitForTimeout(SETTLE);
    await closeFrame();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setForge(page, {});
    await openWith(MENU);
    d = await durations();
    check('8. reduced motion (the system\'s): the transition-duration is 0s', allAre(d, '0s'), JSON.stringify(d));
    await closeFrame();
    moving = await transitionsOnOpening();
    check('8. reduced motion (the system\'s): opening moves nothing', moving.length === 0, moving.join(', '));
    await page.waitForTimeout(SETTLE);
    await closeFrame();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await setForge(page, {});

    // 9. SillyTavern's own Reduced Motion setting: the same
    const wasReduced = await page.evaluate(() => globalThis.SillyTavern.getContext().powerUserSettings.reduced_motion);
    await reducedMotion(true);
    await setForge(page, {});
    await openWith(MENU);
    d = await durations();
    check('9. SillyTavern\'s Reduced Motion on: the transition-duration is 0s', allAre(d, '0s'), JSON.stringify(d));
    await closeFrame();
    moving = await transitionsOnOpening();
    check('9. SillyTavern\'s Reduced Motion on: opening moves nothing', moving.length === 0, moving.join(', '));
    await page.waitForTimeout(SETTLE);
    await closeFrame();
    await reducedMotion(wasReduced);
    await setForge(page, {});
    await openWith(MENU);
    d = await durations();
    check('9. switched back: 0.16s again', allAre(d, '0.16s') && wasReduced === false, `${JSON.stringify(d)}, was ${wasReduced}`);
    await press('Escape', 400);

    // 10. Without the round buttons: opened from a top bar icon by keyboard, Escape gives the focus back to it
    await setForge(page, { menuButtons: false });
    await openWith(SETTINGS_ICON);
    f = await focus();
    check('10. buttons off: the Settings icon by keyboard opens the frame, with the focus on Settings in the nav', (await frameShown()) && f.section === 'Settings' && f.current === 'page', JSON.stringify(f));
    await press('Escape', 400);
    check('10. Escape: the frame is closed and the focus is back on that icon', !(await frameShown()) && (await isFocused(SETTINGS_ICON)), (await focus()).name);

    // Forge UI's main switch off while the frame is open takes the key listener with it
    await openWith(SETTINGS_ICON);
    check('main switch: the frame is open, with its key listener', (await frameShown()) && (await ourKeys()).live === 1);
    await setForge(page, { enabled: false });
    check('main switch off: nothing of the panel, and no key listener of ours', (await ours()).length === 0 && (await ourKeys()).live === 0, `${(await ours()).join(', ')} ${JSON.stringify(await ourKeys())}`);
    await setForge(page, { enabled: true });
    await closeFrame();
    if ((await openMenus()).length) await page.click('#user-settings-button > .drawer-toggle');
    await page.waitForTimeout(400);

    // Off: nothing of ours, and Escape is SillyTavern's alone again
    await setForge(page, { menuPanel: false });
    check('off: nothing of the panel is in the page', (await ours()).length === 0, (await ours()).join(', '));
    const after = await nativeEscape();
    check('off: Escape on Settings does what it did before the panel was on', JSON.stringify(after) === JSON.stringify(before), `${JSON.stringify(after)} vs ${JSON.stringify(before)}`);
    check('off: no key listener of ours, and none was ever put on document or window', (await ourKeys()).live === 0 && (await ourKeys()).where.every((w) => w === 'body'), JSON.stringify(await ourKeys()));
} else {
    // Phone: the panel is never active, so Escape on a menu is SillyTavern's alone, the same with it on as off
    await setForge(page, { menuPanel: false, menuButtons: true });
    const before = await nativeEscape();
    await setForge(page, { menuPanel: true, menuButtons: true });
    check('phone: no #forge-menu and no forge-menu class', (await ours()).length === 0, (await ours()).join(', '));
    const on = await nativeEscape();
    check('phone: with the panel on, Escape on Settings does what it does with it off', JSON.stringify(on) === JSON.stringify(before), `${JSON.stringify(on)} vs ${JSON.stringify(before)}`);
    check('phone: no key listener of ours was ever added', (await ourKeys()).where.length === 0, JSON.stringify(await ourKeys()));
    await setForge(page, { menuPanel: false });
}

await finish();
