// A menu can always be scrolled, whatever its drop-downs are doing. SillyTavern's searchable drop-downs
// (Select2) hold the menu still while their list is open; with Arcane Forge UI on, scrolling outside the
// list closes it and the scroll goes through. With the main switch off, SillyTavern behaves as it always did.
// Uses the sandbox's own lorebooks in the Lorebooks menu; no chat is read and nothing is saved.
// Usage: node tests/browser/dropdown-scroll.mjs
import { openForge, setForge } from './_harness.mjs';

const { page, check, finish } = await openForge({});
await setForge(page, { layout: 'columns' });
await page.evaluate(() => document.querySelector('#WI-SP-button > .drawer-toggle').click());
await page.waitForTimeout(900);
// Open the lorebook with the most entries in the editor, so the menu is taller than its window
const tall = await page.evaluate(async () => {
    const select = document.getElementById('world_editor_select');
    const menu = document.getElementById('WorldInfo');
    for (const option of [...select.options].slice(1)) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((done) => setTimeout(done, 2000));
        if (menu.scrollHeight > menu.clientHeight + 300) return true;
    }
    return false;
});
if (!tall) {
    console.log('skip the sandbox has no lorebook long enough to scroll the Lorebooks menu');
    await finish();
}

const state = () => page.evaluate(() => {
    const menu = document.getElementById('WorldInfo');
    const holds = (globalThis.jQuery._data(menu, 'events') || {}).scroll || [];
    return { top: menu.scrollTop, open: document.querySelectorAll('.select2-container--open').length, holds: holds.filter((h) => h.namespace.includes('select2')).length };
});
const reset = async () => { await page.evaluate(() => { document.getElementById('WorldInfo').scrollTop = 0; }); await page.waitForTimeout(200); };
const wheel = async () => { await page.mouse.move(820, 620); await page.mouse.wheel(0, 300); await page.waitForTimeout(400); return state(); };
const picker = page.locator('#WorldInfo .select2-container:visible .select2-selection').first();
const openPicker = async () => { await reset(); await picker.click(); await page.waitForTimeout(400); return state(); };

let s = await wheel();
check('the Lorebooks menu scrolls to begin with', s.top === 300, JSON.stringify(s));

s = await openPicker();
check('opening the lorebook picker puts Select2\'s hold on the menu', s.open > 0 && s.holds > 0, JSON.stringify(s));
s = await wheel();
check('scrolling the menu with the list open closes the list', s.open === 0 && s.holds === 0, JSON.stringify(s));
s = await wheel();
check('and the menu scrolls', s.top > 0, JSON.stringify(s));

// Scrolling inside the open list leaves it open
await openPicker();
const list = await page.evaluate(() => { const r = document.querySelector('.select2-dropdown').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(list.x, list.y);
await page.mouse.wheel(0, 100);
await page.waitForTimeout(300);
s = await state();
check('scrolling inside the open list leaves it open', s.open > 0, JSON.stringify(s));
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// A hold left behind with no list open is taken off by the next scroll
await reset();
await page.evaluate(() => { const menu = globalThis.jQuery('#WorldInfo'); menu.on('scroll.select2.test-leftover', () => menu.scrollTop(0)); });
await page.waitForTimeout(600);
s = await wheel();
s = await wheel();
check('a hold left behind with no list open is taken off, and the menu scrolls', s.holds === 0 && s.top > 0, JSON.stringify(s));

// Main switch off: SillyTavern's own behaviour is untouched
await setForge(page, { enabled: false });
await page.waitForTimeout(400);
if (!(await page.evaluate(() => document.getElementById('WorldInfo').classList.contains('openDrawer')))) {
    await page.evaluate(() => document.querySelector('#WI-SP-button > .drawer-toggle').click());
    await page.waitForTimeout(900);
}
const stockPicker = page.locator('#WorldInfo .select2-container:visible .select2-selection').first();
await reset();
await stockPicker.click();
await page.waitForTimeout(400);
const box = await page.evaluate(() => { const r = document.getElementById('WorldInfo').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 60 }; });
await page.mouse.move(box.x, box.y);
await page.mouse.wheel(0, 300);
await page.waitForTimeout(400);
s = await state();
check('with the main switch off the list stays open and holds the menu, as in SillyTavern', s.open > 0 && s.top === 0, JSON.stringify(s));

await finish();
