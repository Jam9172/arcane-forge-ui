// The foundation the redesign's features plug into: the shared tokens, the empty feature files and the
// feature list in index.js. Nothing of the redesign is on screen yet, so the classic page must be untouched.
// Usage: node tests/browser/foundation.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, served, check, finish } = await openForge({ phone });

const FEATURE_CSS = ['css/tokens.css', 'css/stage.css', 'css/menu.css', 'css/modes.css'];
const OUR_ELEMENTS = ['#forge-stage', '#forge-spine', '#forge-menu', '#forge-menu-buttons', '#forge-modes'];
const OUR_CLASSES = ['forge-stage', 'forge-menu', 'forge-menu-buttons', 'forge-modes'];
const token = (name) => page.evaluate((name) => getComputedStyle(document.body).getPropertyValue(name).trim(), name);

// 1. The stylesheets style.css imports came from this checkout
check('the four feature stylesheets were served from this checkout', FEATURE_CSS.every((f) => served.includes(f)), FEATURE_CSS.filter((f) => !served.includes(f)).join(', ') || 'all four');

// 2. The tokens are on body, sized for the screen
check('--forge-space-4 is 16px', (await token('--forge-space-4')) === '16px', await token('--forge-space-4'));
const control = phone ? '44px' : '36px';
check(`--forge-control is ${control}`, (await token('--forge-control')) === control, await token('--forge-control'));
const round = phone ? '44px' : '40px';
check(`--forge-round is ${round}`, (await token('--forge-round')) === round, await token('--forge-round'));
check('--forge-fast is 160ms', (await token('--forge-fast')) === '160ms', await token('--forge-fast'));
await page.emulateMedia({ reducedMotion: 'reduce' });
check('--forge-fast is 0ms with reduced motion', (await token('--forge-fast')) === '0ms', await token('--forge-fast'));
await page.emulateMedia({ reducedMotion: 'no-preference' });

// 3. Classic is untouched
check('the top bar is on screen', !!(await box(page, '#top-bar')));
if (!phone) {
    const gaps = await page.evaluate(() => {
        const r = document.querySelector('#sheld').getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(document.documentElement.clientWidth - r.right) };
    });
    check('the chat column is centred', Math.abs(gaps.left - gaps.right) <= 2, `left gap ${gaps.left}px, right gap ${gaps.right}px`);
}
const leftovers = () => page.evaluate(({ elements, classes }) => [
    ...elements.filter((selector) => document.querySelector(selector)),
    ...classes.filter((name) => document.body.classList.contains(name)).map((name) => `body.${name}`),
], { elements: OUR_ELEMENTS, classes: OUR_CLASSES });
const extra = await leftovers();
check('none of the features is in the page', extra.length === 0, extra.join(', '));

// 6. The three feature modules load and carry the whole contract
const modules = await page.evaluate(async () => {
    const out = {};
    for (const name of ['stage', 'menu', 'modes']) {
        const m = await import(`/scripts/extensions/third-party/arcane-forge-ui/${name}.js`);
        const missing = ['id', 'defaults', 'lookKeys', 'settingsHtml', 'bindSettings', 'apply'].filter((key) => !(key in m));
        const wrong = [];
        if (m.id !== name) wrong.push(`id is ${JSON.stringify(m.id)}`);
        for (const key of ['defaults', 'lookKeys']) if (!m[key] || typeof m[key] !== 'object') wrong.push(`${key} is not an object`);
        for (const key of ['settingsHtml', 'bindSettings', 'apply']) if (typeof m[key] !== 'function') wrong.push(`${key} is not a function`);
        out[name] = [...missing.map((key) => `no ${key}`), ...wrong];
    }
    return out;
});
for (const [name, problems] of Object.entries(modules)) {
    check(`${name}.js exports the feature contract`, problems.length === 0, problems.join(', '));
}

// 4. The re-apply event: the main switch takes the look off and puts it back
await setForge(page, { enabled: false });
check('switched off, body loses forge-ui', !(await page.evaluate(() => document.body.classList.contains('forge-ui'))));
await setForge(page, { enabled: true });
check('switched on again, body has forge-ui', await page.evaluate(() => document.body.classList.contains('forge-ui')));

// Crossing the 1000px boundary applies the settings again (the switch is changed without asking for a re-apply)
if (!phone) {
    await page.evaluate(async () => { (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.enabled = false; });
    await page.setViewportSize({ width: 900, height: 900 });
    await page.waitForTimeout(300);
    check('narrowing the window past 1000px applies the settings', !(await page.evaluate(() => document.body.classList.contains('forge-ui'))));
    await page.evaluate(async () => { (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi.enabled = true; });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    check('widening it again applies them again', await page.evaluate(() => document.body.classList.contains('forge-ui')));
}

// 5. Opened, the settings screen still has its sections, in order
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);
const headings = await page.evaluate(() => [...document.querySelectorAll('.arcane-forge-ui-settings .inline-drawer-content h4')]
    .filter((h) => h.getClientRects().length && getComputedStyle(h).visibility !== 'hidden')
    .map((h) => h.textContent.trim()));
const wanted = ['Text', 'Panels', 'Keyboard', 'Colours', 'Share'];
const inOrder = wanted.every((name, i) => headings.indexOf(name) > (i ? headings.indexOf(wanted[i - 1]) : -1));
check('the settings show Text, Panels, Keyboard, Colours and Share, in that order', inOrder, headings.join(', ') || 'no headings shown');
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(400);

await finish();
