// The send modes bar (M1): Do, Say, Story and See right above the message box. A click picks a mode and a
// second click clears it; the choice is saved. It does not change what is sent yet.
// Usage: node tests/browser/modes-bar.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, held, check, finish } = await openForge({ phone });

const LABELS = ['Do', 'Say', 'Story', 'See'];
const TITLES = ['Do: what you do', 'Say: what you say out loud', 'Story: what happens next, as narration', 'See: look at something'];
const PROMPTS = { do: 'What do you do?', say: 'What do you say?', story: 'What happens next?', see: 'What do you look at?' };

const setting = (key) => page.evaluate(async (key) => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi[key], key);
const reapply = async () => {
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('arcane-forge-ui:apply')));
    await page.waitForTimeout(200);
};
const present = () => page.evaluate(() => ({ bar: !!document.getElementById('forge-modes'), cls: document.body.classList.contains('forge-modes') }));
const checkedList = () => page.evaluate(() => [...document.querySelectorAll('#forge-modes [role="radio"]')].map((b) => b.getAttribute('aria-checked')).join(','));
const placeholder = () => page.evaluate(() => document.getElementById('send_textarea').getAttribute('placeholder'));
const nextToBox = () => page.evaluate(() => {
    const bar = document.getElementById('forge-modes');
    return bar?.parentElement?.id === 'send_form' && bar.nextElementSibling?.id === 'nonQRFormItems';
});
// What sits around the message box row, to compare before and after
const landmarks = () => page.evaluate(() => {
    const items = document.getElementById('nonQRFormItems');
    const before = items.previousElementSibling;
    return `${items.parentElement.id} > ${before ? before.id || before.tagName.toLowerCase() : '(first)'} + #${items.id}`;
});
const focusedMode = () => page.evaluate(() => document.activeElement?.dataset?.mode ?? '');

// Start from a known state (nothing here is saved to the sandbox)
await setForge(page, { enabled: true, modes: false, modesActive: '' });
const nativePlaceholder = await placeholder();
const landmarksBefore = await landmarks();

// 1. Off: nothing of ours
let now = await present();
check('off: no #forge-modes and no forge-modes class', !now.bar && !now.cls);

// 2. On: four buttons, Do, Say, Story, See
await setForge(page, { modes: true });
now = await present();
check('on: #forge-modes and body.forge-modes are there', now.bar && now.cls);
const parts = await page.evaluate(() => {
    const bar = document.getElementById('forge-modes');
    const buttons = [...bar.querySelectorAll(':scope > button')];
    return {
        role: bar.getAttribute('role'),
        label: bar.getAttribute('aria-label'),
        texts: buttons.map((b) => b.textContent.trim()),
        radios: buttons.every((b) => b.type === 'button' && b.getAttribute('role') === 'radio'),
        titles: buttons.map((b) => b.title),
        icons: buttons.map((b) => {
            const svg = b.querySelector('svg');
            if (!svg) return 'none';
            const r = svg.getBoundingClientRect();
            const css = getComputedStyle(svg);
            return `${svg.getAttribute('viewBox')}|${Math.round(r.width)}x${Math.round(r.height)}|${css.fill}|${css.strokeWidth}|${svg.getAttribute('aria-hidden')}`;
        }),
    };
});
check('four buttons whose text is Do, Say, Story, See, in that order', parts.texts.join(',') === LABELS.join(','), parts.texts.join(', '));
check('a radio group labelled "How to send" of type="button" role="radio" buttons', parts.role === 'radiogroup' && parts.label === 'How to send' && parts.radios, `${parts.role}, ${parts.label}`);
check('each button has its title', parts.titles.join('|') === TITLES.join('|'), parts.titles.join(' | '));
check('each button has an 18px line icon on a 24 by 24 grid', parts.icons.every((i) => i === '0 0 24 24|18x18|none|1.8px|true'), parts.icons[0]);
check('nothing is selected at first', (await checkedList()) === 'false,false,false,false', await checkedList());

// 3. Inside #send_form, right before #nonQRFormItems
check('the bar is inside #send_form and its next element sibling is #nonQRFormItems', await nextToBox());

// 4. Quick Reply's bar (a stand-in, unless the real one is there) does not come between
const standIn = await page.evaluate(() => {
    if (document.getElementById('qr--bar')) return false;
    const row = document.createElement('div');
    row.id = 'qr--bar';
    row.style.cssText = 'width: 100%; height: 20px;';
    document.getElementById('send_form').prepend(row);
    return true;
});
await reapply();
check('with Quick Reply\'s bar at the start of #send_form, the bar is still right before #nonQRFormItems', await nextToBox(), standIn ? 'stand-in' : 'the real bar');
// Quick Reply's own stylesheet gives its bar `order: 1`, which would put it under a bar left at the default
const qrBox = await box(page, '#qr--bar');
const barBox = await box(page, '#forge-modes');
const qrOrder = await page.evaluate(() => getComputedStyle(document.getElementById('qr--bar')).order);
check('on screen, Quick Reply\'s bar is above ours', (!qrBox && !standIn) || (!!qrBox && !!barBox && barBox.top >= qrBox.bottom), qrBox && barBox ? `ours at ${barBox.top}, Quick Reply ends at ${qrBox.bottom}, its order ${qrOrder}` : 'not shown');
if (standIn) await page.evaluate(() => document.getElementById('qr--bar').remove());
// A row another extension put between ours and the message box: re-applying puts ours back next to it
await page.evaluate(() => {
    const row = document.createElement('div');
    row.id = 'test-other-row';
    document.getElementById('send_form').insertBefore(row, document.getElementById('nonQRFormItems'));
});
await reapply();
check('a row added after ours goes above it on the next apply', await nextToBox());
await page.evaluate(() => document.getElementById('test-other-row').remove());

// 5. Right above the message box
const bar = await box(page, '#forge-modes');
const textarea = await box(page, '#send_textarea');
const gap = bar && textarea ? textarea.top - bar.bottom : NaN;
check('the bar\'s bottom edge is above the message box and within 16px of it', gap >= 0 && gap <= 16, `${gap}px`);

// 6. Sizes
const sizes = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#forge-modes > button')].map((b) => b.getBoundingClientRect());
    const form = document.getElementById('send_form').getBoundingClientRect();
    const bar = document.getElementById('forge-modes').getBoundingClientRect();
    return {
        heights: buttons.map((r) => Math.round(r.height)),
        widths: buttons.map((r) => Math.round(r.width)),
        bar: { left: Math.round(bar.left), right: Math.round(bar.right), width: Math.round(bar.width) },
        form: { left: Math.round(form.left), right: Math.round(form.right), width: Math.round(form.width) },
        sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
});
const tallest = phone ? 44 : 36;
check(`every button is at least ${tallest}px tall`, sizes.heights.every((h) => h >= tallest), sizes.heights.join(', '));
if (phone) {
    check('the bar is not wider than #send_form', sizes.bar.left >= sizes.form.left && sizes.bar.right <= sizes.form.right, `bar ${sizes.bar.width}px, form ${sizes.form.width}px`);
    check('the bar spans the form (within 16px of each side)', sizes.bar.left - sizes.form.left <= 16 && sizes.form.right - sizes.bar.right <= 16, `${sizes.bar.left - sizes.form.left}px and ${sizes.form.right - sizes.bar.right}px`);
    check('the four buttons share the width', Math.max(...sizes.widths) - Math.min(...sizes.widths) <= 1, sizes.widths.join(', '));
    check('the page has no sideways scroll', !sizes.sideways);
} else {
    check('the bar is as wide as its buttons and sits at the left', sizes.bar.width < sizes.form.width / 2 && sizes.bar.left - sizes.form.left <= 16, `bar ${sizes.bar.width}px at ${sizes.bar.left - sizes.form.left}px in`);
}

// Muted labels and the selected label are readable (bible section 11: 4.5 to 1)
const contrast = await page.evaluate(() => {
    const probe = document.createElement('canvas').getContext('2d');
    const rgb = (color) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = color; probe.fillRect(0, 0, 1, 1); return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
    const css = getComputedStyle(document.body);
    const token = (name) => css.getPropertyValue(name).trim();
    const button = getComputedStyle(document.querySelector('#forge-modes > button'));
    return { muted: ratio(button.color, getComputedStyle(document.getElementById('forge-modes')).backgroundColor), selected: ratio(token('--forge-bg'), token('--forge-ember')) };
});
check('the labels are at least 4.5 to 1 against the track, selected or not', contrast.muted >= 4.5 && contrast.selected >= 4.5, `${contrast.muted} and ${contrast.selected}`);

// 7. Click Do, click it again
const savesBefore = held.filter((p) => p.endsWith('/api/settings/save')).length;
await page.click('#forge-modes [data-mode="do"]');
await page.waitForTimeout(200);
check('a click on Do checks Do and only Do', (await checkedList()) === 'true,false,false,false', await checkedList());
check('the setting is "do"', (await setting('modesActive')) === 'do', JSON.stringify(await setting('modesActive')));
const selectedLook = await page.evaluate(() => {
    const css = getComputedStyle(document.querySelector('#forge-modes [data-mode="do"]'));
    return { weight: css.fontWeight, fill: css.backgroundColor };
});
check('the selected button is bold on an ember fill', Number(selectedLook.weight) >= 700 && selectedLook.fill !== 'rgba(0, 0, 0, 0)', `${selectedLook.weight}, ${selectedLook.fill}`);
check('the message box asks "What do you do?"', (await placeholder()) === PROMPTS.do, await placeholder());
await page.waitForTimeout(1500);
check('the choice is saved', held.filter((p) => p.endsWith('/api/settings/save')).length > savesBefore);
await page.click('#forge-modes [data-mode="do"]');
await page.waitForTimeout(200);
check('a second click on Do clears it', (await checkedList()) === 'false,false,false,false', await checkedList());
check('the setting is ""', (await setting('modesActive')) === '', JSON.stringify(await setting('modesActive')));
check('the message box has SillyTavern\'s own placeholder again', (await placeholder()) === nativePlaceholder, await placeholder());

// 8. Say survives a re-apply
await page.click('#forge-modes [data-mode="say"]');
await reapply();
check('with Say selected, a re-apply keeps Say selected', (await checkedList()) === 'false,true,false,false', await checkedList());
check('the message box asks "What do you say?"', (await placeholder()) === PROMPTS.say, await placeholder());

// SillyTavern writes its own placeholder when the connection comes or goes: ours stays while Say is picked,
// and what SillyTavern wrote last is what comes back
await page.evaluate(() => document.getElementById('send_textarea').setAttribute('placeholder', 'Written by SillyTavern'));
await page.waitForTimeout(100);
check('a placeholder SillyTavern writes while a mode is picked gives way to ours', (await placeholder()) === PROMPTS.say, await placeholder());
await page.click('#forge-modes [data-mode="say"]');
await page.waitForTimeout(100);
check('clearing the mode gives back what SillyTavern wrote last', (await placeholder()) === 'Written by SillyTavern', await placeholder());
await page.evaluate((text) => document.getElementById('send_textarea').setAttribute('placeholder', text), nativePlaceholder);
await page.click('#forge-modes [data-mode="say"]');
await page.waitForTimeout(100);

// Keys: Left and Right move, Space and Enter pick, one Tab stop
const tabStops = await page.evaluate(() => [...document.querySelectorAll('#forge-modes > button')].filter((b) => b.tabIndex === 0).map((b) => b.dataset.mode).join(','));
check('the selected button is the one Tab stop', tabStops === 'say', tabStops);
// SillyTavern's own Left and Right (swipes) listen on document; the bar's keys must not get there
await page.evaluate(() => {
    globalThis.testArrowsSeen = 0;
    globalThis.testArrowListener = (event) => { if (event.key.startsWith('Arrow')) globalThis.testArrowsSeen++; };
    document.addEventListener('keydown', globalThis.testArrowListener);
});
const generatesBefore = held.filter((p) => /\/generate/.test(p)).length;
await page.focus('#forge-modes [data-mode="say"]');
await page.keyboard.press('ArrowRight');
check('Right moves to the next button', (await focusedMode()) === 'story', await focusedMode());
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowLeft');
check('Left moves back', (await focusedMode()) === 'do', await focusedMode());
await page.keyboard.press('ArrowLeft');
check('Left from Do goes round to See', (await focusedMode()) === 'see', await focusedMode());
await page.keyboard.press('Space');
await page.waitForTimeout(100);
check('Space picks the focused mode', (await checkedList()) === 'false,false,false,true', await checkedList());
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
check('Enter on the selected mode clears it', (await checkedList()) === 'false,false,false,false', await checkedList());
await page.waitForTimeout(300);
const arrowsSeen = await page.evaluate(() => {
    document.removeEventListener('keydown', globalThis.testArrowListener);
    return globalThis.testArrowsSeen;
});
check('the arrow keys stop at the bar, so they swipe nothing', arrowsSeen === 0 && held.filter((p) => /\/generate/.test(p)).length === generatesBefore, `${arrowsSeen} reached the page`);
check('with nothing selected, Do is the Tab stop', (await page.evaluate(() => [...document.querySelectorAll('#forge-modes > button')].filter((b) => b.tabIndex === 0).map((b) => b.dataset.mode).join(','))) === 'do');

// 9. Off again: no trace, and SillyTavern's placeholder back (Say is picked when it goes)
await page.click('#forge-modes [data-mode="say"]');
await setForge(page, { modes: false });
now = await present();
check('off again: the element and the class are gone', !now.bar && !now.cls);
check('the placeholder is what it was before the bar was turned on', (await placeholder()) === nativePlaceholder, await placeholder());
check('the message box row is where it was', (await landmarks()) === landmarksBefore, await landmarks());
check('the choice is kept for next time', (await setting('modesActive')) === 'say');
await page.evaluate(() => document.getElementById('send_textarea').setAttribute('placeholder', 'Written by SillyTavern'));
await page.waitForTimeout(100);
check('off, nothing of ours rewrites the placeholder', (await placeholder()) === 'Written by SillyTavern', await placeholder());
await page.evaluate((text) => document.getElementById('send_textarea').setAttribute('placeholder', text), nativePlaceholder);

// 10. The main switch off wins
await setForge(page, { enabled: false, modes: true });
now = await present();
check('main switch off with the modes on: no bar and no class', !now.bar && !now.cls);
check('main switch off: the placeholder is SillyTavern\'s', (await placeholder()) === nativePlaceholder, await placeholder());
await setForge(page, { enabled: true, modes: false, modesActive: '' });

// The settings screen: a "Message box" section, between Panels and Keyboard, whose checkbox turns the bar on
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);
const section = await page.evaluate(() => {
    const headings = [...document.querySelectorAll('.arcane-forge-ui-settings .inline-drawer-content h4')].map((h) => h.textContent.trim());
    const input = document.getElementById('forge-ui-modes');
    let heading = input?.closest('label')?.previousElementSibling;
    while (heading && heading.tagName !== 'H4') heading = heading.previousElementSibling;
    return { headings, under: heading?.textContent.trim(), label: input?.closest('label')?.textContent.trim(), checked: input?.checked };
});
const order = ['Panels', 'Message box', 'Keyboard'].map((name) => section.headings.indexOf(name));
check('the settings have a Message box section between Panels and Keyboard', order[0] >= 0 && order[0] < order[1] && order[1] < order[2], section.headings.join(', '));
check('its checkbox reads "Do, Say, Story and See buttons above the message box", unticked', section.under === 'Message box' && section.label === 'Do, Say, Story and See buttons above the message box' && section.checked === false, `${section.under}: ${section.label}`);
await page.click('#forge-ui-modes');
await page.waitForTimeout(300);
now = await present();
check('ticking it turns the bar on and saves the switch', now.bar && now.cls && (await setting('modes')) === true);
await page.click('#forge-ui-modes');
await page.waitForTimeout(300);
now = await present();
check('unticking it takes the bar away', !now.bar && !now.cls && (await setting('modes')) === false);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(400);

await finish();
