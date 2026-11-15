// The test set-up itself: the page runs this checkout's files, nothing is saved to the sandbox, no model
// is reachable, and only the Forge Tester chat is open. Run this first when a test behaves oddly.
// Usage: node tests/browser/harness.mjs [phone]
import { box, openForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, served, held, check, finish } = await openForge({ phone });

check('the extension loaded and switched its look on', await page.evaluate(() => document.body.classList.contains('forge-ui')));
check("the extension's files came from this checkout", ['manifest.json', 'index.js', 'style.css'].every((f) => served.includes(f)), `${served.length} files`);
check('only the Forge Tester chat is open', await page.evaluate(() => globalThis.SillyTavern.getContext().name2 === 'Forge Tester'));
check(`the screen is ${phone ? 'phone' : 'desktop'} sized`, await page.evaluate((phone) => (phone ? innerWidth <= 1000 : innerWidth > 1000), phone));
check('the message box is on screen', !!(await box(page, '#send_textarea')));

// A save is answered by the test, not by the sandbox
const before = held.length;
await page.evaluate(async () => (await import('/script.js')).saveSettings());
await page.waitForTimeout(800);
check('saving settings never reaches the sandbox', held.slice(before).some((p) => p.endsWith('/api/settings/save')), held.slice(before).join(', ') || 'no save seen');

// A request to another host is refused
const outside = await page.evaluate(() => fetch('https://example.com/').then(() => 'reached', () => 'refused'));
check('requests to other hosts are refused', outside === 'refused', outside);

await finish();
