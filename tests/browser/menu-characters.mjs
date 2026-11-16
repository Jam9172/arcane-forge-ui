// The menu panel's Characters section and SillyTavern's pinned panels (batch P3): in the panel the character
// list fills the content area and works there, and what it opens shows above the panel. Panels pinned beside
// the chat are unpinned while the panel is active and pinned again when it stops. Floating panels are left
// alone. Only the Forge Tester character, which the helper has selected, is ever shown; no character name is
// read. Phones never take the pins away, but put back recorded ones. At the end the page is loaded again, with
// the settings it loads changed in this page only, to prove the pins survive a load, and on desktop once more
// with another extension's slow APP_INITIALIZED listener (batch P4).
// Usage: node tests/browser/menu-characters.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });

const CHARACTERS = '#forge-menu-buttons .forge-menu-round-characters';
const MENU = '#forge-menu-buttons .forge-menu-round-menu';
const CLOSE = '#forge-menu .forge-menu-close';
const NAV = (drawer) => `#forge-menu .forge-menu-section[data-forge-drawer="${drawer}"]`;
const PINS = ['lm_button_panel_pin', 'rm_button_panel_pin', 'WI_panel_pin'];
// SillyTavern animates a drawer open over twice its animation duration, and waits once more before switching
const SETTLE = 700;
// SillyTavern's character search waits a moment after typing
const SEARCH_WAIT = 1200;

const click = async (selector, wait = SETTLE) => {
    await page.click(selector);
    await page.waitForTimeout(wait);
};
const isOpen = (id) => page.evaluate((id) => document.getElementById(id)?.classList.contains('openDrawer') ?? false, id);
const frameShown = () => page.evaluate(() => {
    const frame = document.getElementById('forge-menu');
    return !!frame && !frame.hidden && frame.querySelector('.forge-menu-panel').getClientRects().length > 0;
});
const menuPins = () => page.evaluate(async () => JSON.stringify((await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.menuPins));
const pinState = (pin, panel) => page.evaluate(([pin, panel]) => ({
    checked: document.getElementById(pin).checked,
    pinned: document.getElementById(panel).classList.contains('pinnedOpen'),
}), [pin, panel]);
const anyPin = () => page.evaluate((pins) => pins.filter((id) => document.getElementById(id).checked), PINS);
// A pin control (its lock) as it is drawn in its open section: 'gone' when nothing of it can be seen or
// clicked, 'shown' when it can, else what was found. Only measured in an open section: WebKit can report
// stale styles for elements inside a closed (display: none) drawer.
const lock = (pin) => page.evaluate((pin) => {
    const label = document.querySelector(`label[for="${pin}"]`);
    const r = label.getBoundingClientRect();
    if (!label.getClientRects().length || r.width === 0) return 'gone';
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const visible = getComputedStyle(label).visibility !== 'hidden';
    const reached = !!hit?.closest(`label[for="${pin}"]`);
    if (!visible && !reached) return 'gone';
    if (visible && reached) return 'shown';
    return `visible ${visible}, reached ${reached}, hit ${hit?.id || hit?.className || hit?.tagName}`;
}, pin);
// Pins or unpins a panel the way a person does, with the panel off: opens it from the top bar, clicks its lock,
// and closes it again unless asked to leave it open. Returns how the lock looked before the click.
const pinByHand = async (drawer, pin, { leaveOpen = false } = {}) => {
    await click(`#${drawer} > .drawer-toggle`);
    const seen = await lock(pin);
    if (seen === 'shown') await click(`label[for="${pin}"]`, 300);
    if (!leaveOpen) await click(`#${drawer} > .drawer-toggle`);
    return seen;
};
// The frame's content area: right of the nav, below the head, inside the panel's edge
const contentArea = () => page.evaluate(() => {
    const nav = document.querySelector('#forge-menu .forge-menu-nav').getBoundingClientRect();
    const head = document.querySelector('#forge-menu .forge-menu-head').getBoundingClientRect();
    const panel = document.querySelector('#forge-menu .forge-menu-panel').getBoundingClientRect();
    return { left: Math.round(nav.right), top: Math.round(head.bottom), right: Math.round(panel.right - 1), bottom: Math.round(panel.bottom - 1) };
});
const inside = (b, area) => !!b && b.left >= area.left - 2 && b.top >= area.top - 2 && b.right <= area.right + 2 && b.bottom <= area.bottom + 2;
const show = (b) => (b ? `${b.left},${b.top} ${b.width}x${b.height}` : 'not shown');
// The list's entries that are drawn (counted, never read)
const entries = () => page.evaluate(() => [...document.querySelectorAll('#rm_print_characters_block > :is(.character_select, .group_select, .bogus_folder_select)')]
    .filter((e) => e.getClientRects().length).length);
// What is drawn at the middle of #character_popup, and the layers involved
const overPopup = () => page.evaluate(() => {
    const p = document.getElementById('character_popup');
    const r = p.getBoundingClientRect();
    const hit = r.width > 0 ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    const z = (el) => Number(getComputedStyle(el).zIndex) || 0;
    return {
        shown: r.width > 0 && getComputedStyle(p).display !== 'none',
        at: !hit ? 'nothing' : hit.closest('#character_popup') ? 'popup' : hit.closest('#forge-menu') ? 'frame' : hit.closest('#top-settings-holder') ? `menu ${hit.closest('.drawer-content')?.id}` : hit.id || hit.tagName,
        popup: z(p),
        backdrop: z(document.querySelector('#forge-menu .forge-menu-backdrop')),
        panel: z(document.querySelector('#forge-menu .forge-menu-panel')),
        holder: z(document.getElementById('top-settings-holder')),
    };
});

// ---------- Real page loads ----------
// The page is loaded again after an earlier session. The settings it loads stand in for what that session
// saved: they are changed in this page only, never in the sandbox. Every settings save the page makes is
// answered here and kept for the checks, and each click on a pin box is logged with whether SillyTavern's own
// click handler (bound in initRossMods) was on it at that moment.
const LOCKS = { lm_button_panel_pin: 'LNavLockOn', rm_button_panel_pin: 'NavLockOn', WI_panel_pin: 'WINavLockOn' };
const PANELS = { lm_button_panel_pin: 'left-nav-panel', rm_button_panel_pin: 'right-nav-panel', WI_panel_pin: 'WorldInfo' };
const ALL_PINS = Object.fromEntries(PINS.map((pin) => [pin, true]));
const loadWith = async ({ forge, account }) => {
    const saves = [];
    await page.route('**/api/settings/get', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        const settings = JSON.parse(data.settings);
        Object.assign((settings.accountStorage ??= {}), account);
        Object.assign(((settings.extension_settings ??= {}).arcaneForgeUi ??= {}), forge);
        data.settings = JSON.stringify(settings);
        await route.fulfill({ response, json: data });
    });
    await page.route('**/api/settings/save', async (route) => {
        const body = JSON.parse(route.request().postData() || '{}');
        saves.push({
            pins: body.extension_settings?.arcaneForgeUi?.menuPins ?? null,
            locks: Object.fromEntries(Object.entries(LOCKS).map(([pin, key]) => [pin, body.accountStorage?.[key] ?? null])),
        });
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: 'ok' }) });
    });
    await page.addInitScript(() => {
        if (globalThis.forgeTestPinClicks) return;
        globalThis.forgeTestPinClicks = [];
        const click = HTMLElement.prototype.click;
        HTMLElement.prototype.click = function () {
            if (['lm_button_panel_pin', 'rm_button_panel_pin', 'WI_panel_pin'].includes(this.id)) {
                globalThis.forgeTestPinClicks.push({ id: this.id, bound: Boolean(globalThis.jQuery?._data(this, 'events')?.click) });
            }
            return click.call(this);
        };
    });
    await page.reload({ waitUntil: 'load' });
    // The helper's own waits, after SillyTavern says it is ready (it hands APP_READY at once to a late listener).
    // That covers its reopening of pinned panels (300ms after initRossMods) and the delayed settings save.
    await page.waitForFunction(() => globalThis.SillyTavern?.getContext?.()?.extensionSettings?.arcaneForgeUi !== undefined && document.querySelector('#send_textarea'), null, { timeout: 45000 });
    await page.evaluate(() => new Promise((resolve) => {
        const { eventSource, eventTypes } = globalThis.SillyTavern.getContext();
        eventSource.once(eventTypes.APP_READY, () => resolve());
    }));
    await page.waitForTimeout(2500);
    await page.evaluate(() => [...document.querySelectorAll('button, .menu_button')].find((b) => /Got it/i.test(b.textContent))?.click());
    await page.evaluate(async () => { await (await import('/forge-seed.js')).seed(); });
    await page.waitForTimeout(600);
    await page.unroute('**/api/settings/get');
    await page.unroute('**/api/settings/save');
    return { saves, clicks: await page.evaluate(() => globalThis.forgeTestPinClicks) };
};
// Each pin as the page has it: its box, its panel's pinnedOpen, and SillyTavern's own setting for it
const loadedPins = () => page.evaluate(async ([locks, panels]) => {
    const { accountStorage } = await import('/scripts/util/AccountStorage.js');
    return Object.fromEntries(Object.entries(locks).map(([pin, key]) => [pin, {
        checked: document.getElementById(pin).checked,
        pinned: document.getElementById(panels[pin]).classList.contains('pinnedOpen'),
        setting: accountStorage.getItem(key),
    }]));
}, [LOCKS, PANELS]);
const allOn = (state) => Object.values(state).every((p) => p.checked && p.pinned && p.setting === 'true');
const allOff = (state) => Object.values(state).every((p) => !p.checked && !p.pinned && p.setting === 'false');
const allBound = (clicks) => clicks.length > 0 && clicks.every((c) => c.bound);
const recordsAll = (json) => {
    const pins = JSON.parse(json ?? 'null') ?? {};
    return Object.keys(pins).length === PINS.length && PINS.every((pin) => pins[pin] === true);
};
// A save that has forgotten a recorded pin while SillyTavern still has it off would lose it for good
const forgotTooSoon = (saves) => saves.filter((save) => save.pins && PINS.some((pin) => !save.pins[pin] && save.locks[pin] !== 'true'));
// A load with all three pins recorded by a session that ended with the panel on (so SillyTavern has them off),
// in a window where the panel is not active: every pin comes back, and menuPins is emptied only after that
const loadRecorded = async (where) => {
    const { saves, clicks } = await loadWith({
        forge: { enabled: true, menuPanel: true, menuButtons: true, menuPins: ALL_PINS },
        account: { LNavLockOn: 'false', NavLockOn: 'false', WINavLockOn: 'false' },
    });
    const state = await loadedPins();
    check(`${where} with three pins recorded: each pin is back (box ticked, panel pinned, SillyTavern's setting on)`, allOn(state), JSON.stringify(state));
    check(`${where}: menuPins is emptied`, (await menuPins()) === '{}', await menuPins());
    check(`${where}: every click on a pin box came after SillyTavern bound its handler`, allBound(clicks), JSON.stringify(clicks));
    const last = saves.at(-1);
    check(`${where}: no settings save forgets a pin SillyTavern still has off, and the last one has them all on and none recorded`,
        forgotTooSoon(saves).length === 0 && !!last && JSON.stringify(last.pins) === '{}' && Object.values(last.locks).every((l) => l === 'true'),
        `${saves.length} saves, too soon ${JSON.stringify(forgotTooSoon(saves).slice(0, 2))}, last ${JSON.stringify(last)}`);
};

if (!phone) {
    await setForge(page, { menuPanel: false, menuButtons: true, menuPins: {}, menuLast: 'ai-config-button' });
    check('start: no panel is pinned', (await anyPin()).length === 0, (await anyPin()).join(', ') || 'none');

    // 1. Panel off: pin Characters with its own lock
    await pinByHand('rightNavHolder', 'rm_button_panel_pin');
    let rm = await pinState('rm_button_panel_pin', 'right-nav-panel');
    check('1. panel off: the Characters lock pins #right-nav-panel', rm.checked && rm.pinned, JSON.stringify(rm));

    // 2. Panel on: the pin is recorded and taken off by SillyTavern, and the controls are hidden
    await setForge(page, { menuPanel: true });
    rm = await pinState('rm_button_panel_pin', 'right-nav-panel');
    check('2. panel on: #right-nav-panel is no longer pinned and its checkbox is off', !rm.checked && !rm.pinned, JSON.stringify(rm));
    check('2. menuPins records it', (await menuPins()) === '{"rm_button_panel_pin":true}', await menuPins());
    check('2. the frame stays closed (Characters was closed)', !(await frameShown()));
    // Each lock as its section shows it in the panel
    const locks = {};
    await click(MENU);
    locks['AI response'] = await lock('lm_button_panel_pin');
    await click(NAV('WI-SP-button'));
    locks.Lorebooks = await lock('WI_panel_pin');
    await click(NAV('rightNavHolder'));
    locks.Characters = await lock('rm_button_panel_pin');
    await click(CLOSE, 400);
    check('2. the three pin controls are not shown in their sections', Object.values(locks).every((l) => l === 'gone') && Object.keys(locks).length === 3, JSON.stringify(locks));

    // 3. Applying again changes nothing
    await setForge(page, {});
    check('3. re-applied: menuPins is unchanged', (await menuPins()) === '{"rm_button_panel_pin":true}', await menuPins());

    // SillyTavern puts back the pins it saved after Forge UI starts (initRossMods); the panel puts that one away too
    await page.evaluate(() => {
        document.getElementById('WI_panel_pin').checked = true;
        document.getElementById('WorldInfo').classList.add('pinnedOpen');
    });
    await page.waitForTimeout(400);
    const wi = await pinState('WI_panel_pin', 'WorldInfo');
    check('a pin SillyTavern sets later is taken off and recorded as well', !wi.checked && !wi.pinned && (await menuPins()) === '{"rm_button_panel_pin":true,"WI_panel_pin":true}',
        `${JSON.stringify(wi)} ${await menuPins()}`);

    // 4. The Characters section fills the content area, and its tabs, search and list work there
    await click(CHARACTERS);
    check('4. Characters opens the frame with #right-nav-panel', (await frameShown()) && (await isOpen('right-nav-panel')));
    let area = await contentArea();
    const panel = await box(page, '#right-nav-panel');
    check('4. #right-nav-panel fills the content area', !!panel && Math.abs(panel.left - area.left) <= 2 && Math.abs(panel.top - area.top) <= 2
        && Math.abs(panel.right - area.right) <= 2 && Math.abs(panel.bottom - area.bottom) <= 2, `${show(panel)} vs ${JSON.stringify(area)}`);
    await click('#rm_button_characters');
    const list = await box(page, '#rm_print_characters_block');
    check('4. the list tab shows the character list (#rm_print_characters_block) inside the content area', inside(list, area), `${show(list)} in ${JSON.stringify(area)}`);
    const tabs = await box(page, '#right-nav-panel-tabs');
    check('4. the tabs lie inside the content area', inside(tabs, area), show(tabs));
    const searchShown = async () => (await box(page, '#character_search_bar')) !== null;
    const searchWasShown = await searchShown();
    if (!searchWasShown) await click('#rm_button_search', 400);
    const search = await box(page, '#character_search_bar');
    check('4. the search box lies inside the content area', inside(search, area), show(search));
    const all = await entries();
    await page.fill('#character_search_bar', 'zq forge test no such name');
    await page.waitForTimeout(SEARCH_WAIT);
    const none = await entries();
    await page.fill('#character_search_bar', '');
    await page.waitForTimeout(SEARCH_WAIT);
    const restored = await entries();
    check('4. searching filters the list, and clearing the search brings it back', all > 0 && none === 0 && restored === all, `${all} entries, ${none} found, ${restored} after clearing`);
    if (!searchWasShown) await click('#rm_button_search', 400);
    const scrolling = await page.evaluate(() => {
        // A tall stand-in entry makes the list longer than its box, whatever the sandbox holds
        const listEl = document.getElementById('rm_print_characters_block');
        const filler = document.createElement('div');
        filler.style.cssText = 'flex: none; height: 3000px;';
        listEl.append(filler);
        listEl.scrollTop = 400;
        const r = listEl.getBoundingClientRect();
        const result = {
            overflows: listEl.scrollHeight > listEl.clientHeight,
            scrolled: listEl.scrollTop > 0,
            bottom: Math.round(r.bottom),
            pageScrolled: document.scrollingElement.scrollTop > 0 || document.scrollingElement.scrollHeight > document.scrollingElement.clientHeight,
        };
        listEl.scrollTop = 0;
        filler.remove();
        return result;
    });
    check('4. a long list scrolls inside its own box, which stays in the content area, and the page does not scroll',
        scrolling.overflows && scrolling.scrolled && scrolling.bottom <= area.bottom + 2 && !scrolling.pageScrolled, JSON.stringify(scrolling));
    await click('#rm_button_selected_ch');
    check('4. the selected character\'s tab brings its editor back', (await box(page, '#rm_ch_create_block')) !== null && (await isOpen('right-nav-panel')));

    // 8. What the Characters section opens shows above the panel
    await click('#advanced_div');
    let over = await overPopup();
    check('8. Advanced definitions opens #character_popup, with the Characters section still open behind it', over.shown && (await isOpen('right-nav-panel')) && (await frameShown()));
    check('8. the element at the middle of #character_popup is inside it, not in the frame', over.at === 'popup', JSON.stringify(over));
    check('8. the frame and the menus\' holder are below it', over.backdrop < over.popup && over.panel < over.popup && over.holder < over.popup, JSON.stringify(over));
    // SillyTavern lifts the holder over that window for a menu that is not a side panel; the frame goes with it
    await click(NAV('WI-SP-button'));
    over = await overPopup();
    check('8. Lorebooks opened from the nav meanwhile: frame and menu go over the window together, the frame just under the menu',
        over.shown && over.at === 'menu WorldInfo' && over.popup < over.backdrop && over.backdrop < over.panel && over.panel < over.holder, JSON.stringify(over));
    await click(NAV('rightNavHolder'));
    over = await overPopup();
    check('8. back on Characters: the window is on top again', over.at === 'popup' && over.panel < over.popup, JSON.stringify(over));
    await click('#character_cross');
    check('8. its own cross closes it, and Characters stays open', !(await overPopup()).shown && (await isOpen('right-nav-panel')) && (await frameShown()));

    // SillyTavern's dialogs open above the panel and can be used
    await page.evaluate(async () => {
        const { callGenericPopup, POPUP_TYPE } = await import('/scripts/popup.js');
        globalThis.forgeTestDialog = callGenericPopup('Forge test dialog', POPUP_TYPE.TEXT);
    });
    await page.waitForTimeout(SETTLE);
    const dialog = page.locator('dialog.popup[open]', { hasText: 'Forge test dialog' });
    const onTop = await dialog.evaluate((d) => {
        const r = d.getBoundingClientRect();
        return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('dialog');
    });
    check('a SillyTavern dialog opened over the Characters section is on top', onTop);
    await dialog.locator('.popup-button-ok').click();
    await page.waitForTimeout(SETTLE);
    check('the dialog closes with its own button, and Characters stays open', (await dialog.count()) === 0 && (await isOpen('right-nav-panel')) && (await frameShown()));

    // 5. Frame closed, panel off: the pins go back, and menuPins is emptied
    await click(CLOSE, 400);
    check('5. the frame is closed', !(await frameShown()) && !(await isOpen('right-nav-panel')));
    await setForge(page, { menuPanel: false });
    rm = await pinState('rm_button_panel_pin', 'right-nav-panel');
    check('5. panel off: #rm_button_panel_pin is checked again and #right-nav-panel pinned', rm.checked && rm.pinned, JSON.stringify(rm));
    const wiBack = await pinState('WI_panel_pin', 'WorldInfo');
    check('5. the Lorebooks pin is back too', wiBack.checked && wiBack.pinned, JSON.stringify(wiBack));
    check('5. menuPins is empty', (await menuPins()) === '{}', await menuPins());
    const seen = [await pinByHand('rightNavHolder', 'rm_button_panel_pin'), await pinByHand('WI-SP-button', 'WI_panel_pin')];
    check('5. the locks are shown again, and unpin both by hand', seen.every((l) => l === 'shown') && (await anyPin()).length === 0,
        `${seen.join(', ')}; pinned: ${(await anyPin()).join(', ') || 'none'}`);

    // 6. The same for AI response, left open this time: once unpinned it is the open menu, so it shows in the frame
    await pinByHand('ai-config-button', 'lm_button_panel_pin', { leaveOpen: true });
    let lm = await pinState('lm_button_panel_pin', 'left-nav-panel');
    check('6. panel off: the AI response lock pins #left-nav-panel', lm.checked && lm.pinned, JSON.stringify(lm));
    await setForge(page, { menuPanel: true });
    lm = await pinState('lm_button_panel_pin', 'left-nav-panel');
    check('6. panel on: #left-nav-panel is no longer pinned and its checkbox is off', !lm.checked && !lm.pinned, JSON.stringify(lm));
    check('6. menuPins records it', (await menuPins()) === '{"lm_button_panel_pin":true}', await menuPins());
    check('6. AI response, which was open, now shows in the frame', (await frameShown()) && (await isOpen('left-nav-panel')));
    check('6. its lock is not shown there', (await lock('lm_button_panel_pin')) === 'gone', await lock('lm_button_panel_pin'));
    await click(CLOSE, 400);
    await setForge(page, { menuPanel: false });
    lm = await pinState('lm_button_panel_pin', 'left-nav-panel');
    check('6. frame closed, panel off: #lm_button_panel_pin is checked again and #left-nav-panel pinned', lm.checked && lm.pinned, JSON.stringify(lm));
    check('6. menuPins is empty', (await menuPins()) === '{}', await menuPins());
    const seenLm = await pinByHand('ai-config-button', 'lm_button_panel_pin');
    check('6. the lock is shown again, and unpin it by hand', seenLm === 'shown' && (await anyPin()).length === 0, `${seenLm}; pinned: ${(await anyPin()).join(', ') || 'none'}`);

    // The other two ways the panel stops being active: the window drops to phone size, and Forge UI is switched off
    await pinByHand('rightNavHolder', 'rm_button_panel_pin');
    await setForge(page, { menuPanel: true });
    const ways = [];
    const note = async (label) => {
        const s = await pinState('rm_button_panel_pin', 'right-nav-panel');
        ways.push({ label, pinned: s.checked && s.pinned, unpinned: !s.checked && !s.pinned, pins: await menuPins() });
    };
    await note('on');
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(500);
    await note('1000px');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await note('1440px');
    await setForge(page, { enabled: false });
    await note('main switch off');
    await setForge(page, { enabled: true });
    await note('main switch on');
    const way = (label) => ways.find((w) => w.label === label);
    const away = (w) => w.unpinned && w.pins === '{"rm_button_panel_pin":true}';
    const back = (w) => w.pinned && w.pins === '{}';
    check('window at 1000px: the pin is back and menuPins empty', away(way('on')) && back(way('1000px')), JSON.stringify(ways.slice(0, 2)));
    check('window at 1440px again: unpinned and recorded again', away(way('1440px')), JSON.stringify(way('1440px')));
    check('Forge UI switched off: the pin is back and menuPins empty', back(way('main switch off')), JSON.stringify(way('main switch off')));
    check('Forge UI switched on: unpinned and recorded again', away(way('main switch on')), JSON.stringify(way('main switch on')));

    // Reset to Forge defaults turns the panel off, and puts the pin back first
    await click(MENU);
    await click(NAV('extensions-settings-button'));
    await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
    await page.waitForTimeout(600);
    await page.click('#forge-ui-reset');
    await page.waitForTimeout(SETTLE);
    rm = await pinState('rm_button_panel_pin', 'right-nav-panel');
    check('Reset: the panel is off, the pin is back and menuPins is empty',
        rm.checked && rm.pinned && (await menuPins()) === '{}' && !(await page.evaluate(() => document.body.classList.contains('forge-menu'))), `${JSON.stringify(rm)} ${await menuPins()}`);
    await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
    await page.waitForTimeout(400);
    await click('#extensions-settings-button > .drawer-toggle');
    await pinByHand('rightNavHolder', 'rm_button_panel_pin');
    check('unpinned again by hand, and no menu is open', (await anyPin()).length === 0 && !(await page.evaluate(() => document.querySelector('#top-settings-holder .openDrawer'))));

    // 7. A floating panel (a .drawer-content outside #top-settings-holder) is not placed, hidden or styled
    const floating = () => page.evaluate(() => {
        const el = document.getElementById('test-floating');
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return JSON.stringify({
            box: [r.left, r.top, r.width, r.height].map(Math.round),
            style: ['position', 'display', 'visibility', 'zIndex', 'opacity', 'backgroundColor', 'borderTopWidth', 'borderRadius', 'boxShadow', 'pointerEvents', 'transition', 'margin'].map((k) => cs[k]),
        });
    });
    await page.evaluate(() => {
        const el = document.createElement('div');
        el.className = 'drawer-content';
        el.id = 'test-floating';
        el.style.cssText = 'position: fixed; left: 40px; top: 140px; width: 300px; height: 200px; display: block;';
        document.body.append(el);
    });
    const floatingOff = await floating();
    await setForge(page, { menuPanel: true });
    await click(MENU);
    check('7. with the panel on and a menu open, the floating stand-in is where it was and looks the same',
        (await frameShown()) && (await floating()) === floatingOff, `${await floating()} vs ${floatingOff}`);
    await click(CLOSE, 400);
    await page.evaluate(() => document.getElementById('test-floating').classList.add('openDrawer'));
    await page.waitForTimeout(400);
    check('7. marked open, it does not bring up the frame', !(await frameShown()));
    await page.evaluate(() => document.getElementById('test-floating').remove());
    await setForge(page, { menuPanel: false });
    check('end: no panel is pinned and menuPins is empty', (await anyPin()).length === 0 && (await menuPins()) === '{}');

    // A load on desktop with the panel on and three pins SillyTavern saved itself (for example after a session
    // at 1000px or less), pinned panels that were open: SillyTavern puts the pins back in initRossMods, then the
    // panel puts them away and records them, before SillyTavern reopens pinned panels (300ms later)
    const desktopLoad = await loadWith({
        forge: { enabled: true, menuPanel: true, menuButtons: true, menuPins: {} },
        account: { LNavLockOn: 'true', NavLockOn: 'true', WINavLockOn: 'true', LNavOpened: 'true', NavOpened: 'true', WINavOpened: 'true' },
    });
    let loaded = await loadedPins();
    check('load at 1440px with the panel on and three pins SillyTavern saved: each is put away (box off, panel not pinned, SillyTavern\'s setting off)',
        allOff(loaded), JSON.stringify(loaded));
    const openAtLoad = await page.evaluate(() => [...document.querySelectorAll('#top-settings-holder .drawer-content.openDrawer')].map((d) => d.id));
    check('load at 1440px: no menu opens, and the frame stays closed', openAtLoad.length === 0 && !(await frameShown()), openAtLoad.join(', ') || 'none open');
    check('load at 1440px: menuPins records all three', recordsAll(await menuPins()), await menuPins());
    check('load at 1440px: every click on a pin box came after SillyTavern bound its handler, one each',
        allBound(desktopLoad.clicks) && desktopLoad.clicks.length === 3, JSON.stringify(desktopLoad.clicks));
    const lastSave = desktopLoad.saves.at(-1);
    check('load at 1440px: the last settings save has the three recorded and off',
        !!lastSave && recordsAll(JSON.stringify(lastSave.pins)) && Object.values(lastSave.locks).every((l) => l === 'false'), JSON.stringify(lastSave));
    await setForge(page, { menuPanel: false });
    loaded = await loadedPins();
    check('load at 1440px, then panel off: each pin is back and menuPins is empty', allOn(loaded) && (await menuPins()) === '{}', `${JSON.stringify(loaded)} ${await menuPins()}`);

    // A load at 900px wide (a desktop window, not a phone) after a session that ended with the panel on
    await page.setViewportSize({ width: 900, height: 900 });
    await loadRecorded('load at 900px');

    // A load in which the panel first becomes active while SillyTavern is still handing out APP_INITIALIZED,
    // because another extension's listener for it is slow: a stand-in listener, put first in the page, switches
    // the panel on and then takes a second. SillyTavern's emit took its list of listeners before the panel
    // started waiting, and remembers the event for later listeners only after the last one has finished, so
    // the wait has to be answered another way. Each listener menu.js adds for APP_INITIALIZED or APP_READY is
    // noted, to see that none is left behind. Characters is pinned by SillyTavern's own saved setting.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
        globalThis.forgeTestMenuWaits = [];
        // A whole URL: a script added this way has no address of its own to resolve '/scripts/…' against
        import(new URL('/scripts/events.js', location.href).href).then(({ eventSource, event_types }) => {
            const on = eventSource.on;
            eventSource.on = function (event, listener) {
                if ([event_types.APP_INITIALIZED, event_types.APP_READY].includes(event) && /arcane-forge-ui\/menu\.js/.test(new Error().stack ?? '')) {
                    globalThis.forgeTestMenuWaits.push({ event, listener, during: globalThis.forgeTestSlowListener === 'running' });
                }
                return on.apply(this, arguments);
            };
            eventSource.on(event_types.APP_INITIALIZED, async () => {
                globalThis.forgeTestSlowListener = 'running';
                const { extension_settings } = await import(new URL('/scripts/extensions.js', location.href).href);
                extension_settings.arcaneForgeUi.menuPanel = true;
                document.dispatchEvent(new CustomEvent('arcane-forge-ui:apply'));
                await new Promise((resolve) => setTimeout(resolve, 1000));
                globalThis.forgeTestSlowListener = 'done';
            });
        });
    });
    const slowLoad = await loadWith({
        forge: { enabled: true, menuPanel: false, menuButtons: true, menuPins: {} },
        account: { LNavLockOn: 'false', NavLockOn: 'true', WINavLockOn: 'false', LNavOpened: 'false', NavOpened: 'false', WINavOpened: 'false' },
    });
    const waits = await page.evaluate(async () => {
        const { eventSource } = await import('/scripts/events.js');
        return {
            slow: globalThis.forgeTestSlowListener,
            during: globalThis.forgeTestMenuWaits.filter((w) => w.during).map((w) => w.event),
            left: globalThis.forgeTestMenuWaits.filter((w) => eventSource.events[w.event]?.includes(w.listener)).map((w) => w.event),
        };
    });
    check('slow APP_INITIALIZED: the stand-in switched the panel on while SillyTavern was handing the event out, and the panel began to wait then',
        waits.slow === 'done' && waits.during.includes('app_initialized'), JSON.stringify(waits));
    const slowPin = (await loadedPins()).rm_button_panel_pin;
    check('slow APP_INITIALIZED: the Characters pin is put away all the same (box off, panel not pinned, SillyTavern\'s setting off)',
        !slowPin.checked && !slowPin.pinned && slowPin.setting === 'false', JSON.stringify(slowPin));
    check('slow APP_INITIALIZED: menuPins records it', (await menuPins()) === '{"rm_button_panel_pin":true}', await menuPins());
    check('slow APP_INITIALIZED: its box was clicked once, after SillyTavern bound its handler',
        allBound(slowLoad.clicks) && slowLoad.clicks.length === 1 && slowLoad.clicks[0].id === 'rm_button_panel_pin', JSON.stringify(slowLoad.clicks));
    check('slow APP_INITIALIZED: nothing of menu.js still waits on APP_INITIALIZED or APP_READY', waits.left.length === 0, JSON.stringify(waits));
    await setForge(page, { menuPanel: false });
    const slowBack = (await loadedPins()).rm_button_panel_pin;
    check('slow APP_INITIALIZED, then panel off: the pin is back and menuPins is empty',
        slowBack.checked && slowBack.pinned && slowBack.setting === 'true' && (await menuPins()) === '{}', `${JSON.stringify(slowBack)} ${await menuPins()}`);
} else {
    // Phone: the panel is never active, so the pins are never touched and their locks stay as SillyTavern
    // draws them. On phones SillyTavern itself hides the AI response and Characters locks; the Lorebooks one
    // stays, so that is the one used here.
    await setForge(page, { menuPanel: false, menuPins: {} });
    check('phone: start: no panel is pinned', (await anyPin()).length === 0, (await anyPin()).join(', ') || 'none');
    const seenOff = await pinByHand('WI-SP-button', 'WI_panel_pin');
    let wi = await pinState('WI_panel_pin', 'WorldInfo');
    check('phone, panel off: the Lorebooks lock pins #WorldInfo', seenOff === 'shown' && wi.checked && wi.pinned, `${seenOff} ${JSON.stringify(wi)}`);
    await setForge(page, { menuPanel: true, menuButtons: true });
    wi = await pinState('WI_panel_pin', 'WorldInfo');
    check('phone: no forge-menu class and no #forge-menu', !(await page.evaluate(() => document.body.classList.contains('forge-menu') || document.getElementById('forge-menu'))));
    check('phone, panel on: the pin stays on and nothing is recorded', wi.checked && wi.pinned && (await menuPins()) === '{}', `${JSON.stringify(wi)} ${await menuPins()}`);
    const seenOn = await pinByHand('WI-SP-button', 'WI_panel_pin');
    check('phone, panel on: the Lorebooks lock is still shown, and unpins it by hand', seenOn === 'shown' && (await anyPin()).length === 0, `${seenOn}; pinned: ${(await anyPin()).join(', ') || 'none'}`);
    await setForge(page, { menuPanel: false });
    check('phone: menuPins is still empty', (await menuPins()) === '{}', await menuPins());

    // A load on a phone after a session that ended with the panel on (on a desktop with the same settings)
    await loadRecorded('phone: load');
}

await finish();
