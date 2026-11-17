// The phone pass (I2-phone): on a phone or tablet the only new thing is the send modes bar, and it is
// comfortable with a thumb. Runs its own sizes (portrait, landscape, and a desktop window narrowed to a phone).
import { box, likeTauriTavern, openForge, setForge } from './_harness.mjs';

const { page, check, finish } = await openForge({ phone: true });

const show = (b) => (b ? `${b.left},${b.top} ${b.width}x${b.height}` : 'not shown');
const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const bar = () => page.evaluate(() => {
    const el = document.getElementById('forge-modes');
    const form = document.getElementById('send_form');
    if (!el || !form) return null;
    const f = form.getBoundingClientRect();
    const fs = getComputedStyle(form);
    const inner = f.width - parseFloat(fs.borderLeftWidth) - parseFloat(fs.borderRightWidth) - parseFloat(fs.paddingLeft) - parseFloat(fs.paddingRight);
    const r = el.getBoundingClientRect();
    const buttons = [...el.querySelectorAll('button')].map((b) => {
        const rect = b.getBoundingClientRect();
        const label = b.querySelector('span') ?? b;
        return { width: rect.width, height: rect.height, top: Math.round(rect.top), cut: label.scrollWidth > label.clientWidth + 0.5 || b.scrollWidth > b.clientWidth + 0.5 };
    });
    const textarea = document.getElementById('send_textarea').getBoundingClientRect();
    return { left: r.left, width: r.width, top: r.top, bottom: r.bottom, height: r.height, inner, buttons, rows: new Set(buttons.map((b) => b.top)).size, above: r.bottom <= textarea.top + 0.5 };
});
const portrait = async (label) => {
    const b = await bar();
    check(`${label}: the bar is above the message box`, !!b && b.above, JSON.stringify(b && { bottom: b.bottom }));
    check(`${label}: it is as wide as the form's inner width (2px)`, !!b && Math.abs(b.width - b.inner) <= 2, b && `${b.width.toFixed(1)} of ${b.inner.toFixed(1)}`);
    const widths = b?.buttons.map((x) => x.width) ?? [];
    check(`${label}: four buttons, each at least 44px tall and equal in width (1px)`, widths.length === 4 && b.buttons.every((x) => x.height >= 44) && Math.max(...widths) - Math.min(...widths) <= 1,
        b && b.buttons.map((x) => `${x.width.toFixed(1)}x${x.height.toFixed(1)}`).join(' '));
    check(`${label}: no label is cut off`, !!b && b.buttons.every((x) => !x.cut), b && JSON.stringify(b.buttons.map((x) => x.cut)));
    check(`${label}: no sideways scroll`, !(await sideways()));
};

await setForge(page, { enabled: true, modes: true, modesActive: '', layout: 'stage', menuPanel: true, menuButtons: true, phoneChatScale: 100 });

// 1 to 3. Portrait, at the default text size and at the largest Phone chat text
await portrait('390 by 800');
await setForge(page, { phoneChatScale: 150 });
await portrait('with Phone chat text at 150%');
await setForge(page, { phoneChatScale: 100 });

// 4. SillyTavern's own top bar, and its own full-width drawer from it
check("SillyTavern's top bar is on screen", !!(await box(page, '#top-bar')));
await page.tap('#user-settings-button .drawer-toggle');
await page.waitForTimeout(700);
const drawer = await box(page, '#user-settings-block');
const width = await page.evaluate(() => document.documentElement.clientWidth);
check("tapping its user-settings icon opens SillyTavern's own drawer, full width, and no panel of ours",
    !!drawer && drawer.width >= width - 2 && !(await page.evaluate(() => document.getElementById('forge-menu'))), `${show(drawer)} in ${width}`);
await page.tap('#user-settings-button .drawer-toggle');
await page.waitForTimeout(700);

// 5. The two TauriTavern habits: the bar still holds, and a message shows no outline after a tap and an arrow key
await likeTauriTavern(page);
await portrait('like TauriTavern');
const outline = await page.evaluate(async () => {
    const mes = document.querySelector('#chat > .mes.last_mes') ?? document.querySelector('#chat > .mes');
    if (!mes) return 'no message';
    mes.focus();
    mes.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise((done) => setTimeout(done, 100));
    const style = getComputedStyle(mes);
    return style.outlineStyle === 'none' || parseFloat(style.outlineWidth) === 0 ? 'none' : `${style.outlineStyle} ${style.outlineWidth}`;
});
await page.tap('#chat .mes .mes_text').catch(() => {});
check('like TauriTavern: no message has an outline after a tap and an arrow key', outline === 'none' || outline === 'no message', outline);

// 8. Compact messages on phones, on and off: the bar does not move
await setForge(page, { phoneCompact: true });
const compact = await box(page, '#forge-modes');
await setForge(page, { phoneCompact: false });
const roomy = await box(page, '#forge-modes');
check('the bar is in the same place with Compact messages on phones on and off', JSON.stringify(compact) === JSON.stringify(roomy), `${show(compact)} / ${show(roomy)}`);
await setForge(page, { phoneCompact: true });

// 6. Landscape: one row, and the chat keeps room above the form
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(600);
const land = await bar();
const chat = await box(page, '#chat');
const form = await box(page, '#form_sheld');
check('844 by 390: the bar is one row', land?.rows === 1, JSON.stringify(land?.rows));
check('and it is 36px tall, the window being under 420px', !!land && Math.abs(land.height - 36) <= 1.5, land && `${land.height}px`);
check('and the chat above the form is at least 120px tall', !!chat && !!form && form.top - chat.top >= 120, `chat top ${chat?.top}, form top ${form?.top}`);
check('844 by 390: no sideways scroll', !(await sideways()));

// 7. A desktop window with a menu open in the panel, narrowed to a phone: the panel goes, SillyTavern's own is back
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(800);
const desktopPanel = await page.evaluate(() => document.body.classList.contains('forge-menu'));
await page.evaluate(() => document.querySelector('#forge-menu-buttons .forge-menu-round-menu')?.click());
await page.waitForTimeout(700);
const opened = await page.evaluate(() => !!document.getElementById('forge-menu') && !document.getElementById('forge-menu').hidden);
await page.setViewportSize({ width: 390, height: 800 });
await page.waitForTimeout(800);
const after = await page.evaluate(() => ({ frame: !!document.getElementById('forge-menu'), cls: document.body.classList.contains('forge-menu') }));
check('narrowed to 390 by 800 with a menu open in the panel: no frame and no forge-menu class',
    desktopPanel && opened && !after.frame && !after.cls, `panel at desktop: ${desktopPanel}, opened: ${opened}, after: ${JSON.stringify(after)}`);
// The menu that was open is SillyTavern's own drawer now; close it the way SillyTavern does, then the page is usable
await page.evaluate(() => document.querySelector('#top-settings-holder > .drawer > .drawer-content.openDrawer')?.closest('.drawer')?.querySelector('.drawer-toggle')?.click());
await page.waitForTimeout(700);
check('and the page is usable: the message box is on screen', !!(await box(page, '#send_textarea')));

await setForge(page, { enabled: true, layout: 'classic', menuPanel: false, modes: false });
await finish();
