// The new settings in order, greyed out when they need another, carried in the look file, and put back by Reset
// (I3-settings-and-look). Desktop only.
// Usage: node tests/browser/settings-look.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FORGE_DIR, openForge, setForge } from './_harness.mjs';

const { page, check, finish } = await openForge();
const MODULE_URL = '/scripts/extensions/third-party/arcane-forge-ui/';

// Bible section 7: every key, whether the look file carries it, and the label it has on screen
const KEYS = {
    layout: { look: false, label: 'Forge layout', kind: 'select', options: ['Classic', 'Stage (desktop)', 'Three columns (desktop)'], set: 'stage' },
    stageChat: { look: true, label: 'Chat width', kind: 'range', set: '50' },
    stagePlate: { look: true, label: 'Name on the stage', kind: 'checkbox' },
    stageSprite: { look: true, label: 'Character sprite on the stage, when it has one', kind: 'checkbox' },
    stageShade: { look: true, label: 'Darken the stage art', kind: 'range', set: '20' },
    menuPanel: { look: false, label: 'Menus open in one centred panel (desktop)', kind: 'checkbox' },
    menuButtons: { look: false, label: 'Two round buttons in place of the top bar', kind: 'checkbox' },
    menuLast: { look: false },
    menuPins: { look: false },
    modes: { look: false, label: 'Do, Say, Story and See buttons above the message box', kind: 'checkbox' },
    modesActive: { look: false },
    modesVoice: { look: true, label: 'Write my actions as', kind: 'select', options: ['You …', 'I …'], set: 'first' },
    modesTidy: { look: true, label: 'Tidy what I type (first letter, full stop, quotes)', kind: 'checkbox' },
    modesStoryAs: { look: true, label: 'Story goes in as', kind: 'select', options: ['narration', 'my own message'], set: 'message' },
    modesSeeAs: { look: true, label: 'See asks for', kind: 'select', options: ['a description', 'a picture'], set: 'picture' },
    modesTemplates: { look: true, label: 'Advanced: my own wording', kind: 'summary' },
};

const settings = () => page.evaluate(async () => JSON.parse(JSON.stringify((await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi)));
const defaults = await page.evaluate(async (url) => {
    const out = {};
    for (const name of ['stage', 'menu', 'modes']) Object.assign(out, (await import(`${url}${name}.js`)).defaults);
    return JSON.parse(JSON.stringify(out));
}, MODULE_URL);
const bodyHas = (name) => page.evaluate((name) => document.body.classList.contains(name), name);

// Open the settings screen
await setForge(page, { enabled: true, layout: 'classic', menuPanel: false, modes: false });
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);

// 1. The three sections, in order, between Panels and Keyboard
const headings = await page.evaluate(() => [...document.querySelectorAll('.arcane-forge-ui-settings h4')].map((h) => h.textContent.trim()));
const at = (name) => headings.indexOf(name);
check('the headings run Panels, Layout, Three columns, Menus, Message box, Keyboard', at('Panels') >= 0 && at('Layout') === at('Panels') + 1 && at('Three columns') === at('Layout') + 1 && at('Menus') === at('Three columns') + 1 && at('Message box') === at('Menus') + 1 && at('Keyboard') === at('Message box') + 1, headings.join(', '));

// The control a label names, found by the label's own words
const control = (label) => page.evaluate((label) => {
    const root = document.querySelector('.arcane-forge-ui-settings');
    for (const el of root.querySelectorAll('label, summary')) {
        const words = (el.querySelector(':scope > span')?.childNodes[0]?.textContent ?? el.textContent).trim();
        if (words !== label) continue;
        if (el.tagName === 'SUMMARY') return { id: el.parentElement.id, kind: 'summary', title: el.parentElement.title };
        const input = el.querySelector('input, select') ?? document.getElementById(el.htmlFor);
        if (!input) continue;
        return { id: input.id, kind: input.type === 'checkbox' ? 'checkbox' : input.tagName === 'SELECT' ? 'select' : input.type, disabled: input.disabled, title: input.title || el.title,
            options: input.tagName === 'SELECT' ? [...input.options].map((o) => o.textContent) : undefined };
    }
    return null;
}, label);

// 3. Greyed out, not hidden, while what they need is off
const needs = [['Two round buttons in place of the top bar'], ['Chat width', 'Name on the stage', 'Character sprite on the stage, when it has one', 'Darken the stage art'], ['Write my actions as', 'Tidy what I type (first letter, full stop, quotes)', 'Story goes in as', 'See asks for']];
const greyed = [];
for (const label of needs.flat()) {
    const c = await control(label);
    if (!c || !c.disabled || !c.title) greyed.push(`${label}: ${c ? `disabled ${c.disabled}, title "${c.title}"` : 'missing'}`);
}
check('with the menu panel off, Classic layout and the modes off, the settings that need them are greyed out with a title', greyed.length === 0, greyed.join('; '));

// 2. Every label is on screen, word for word, and its control changes its setting; the page follows
const change = (id, kind, value) => page.evaluate(({ id, kind, value }) => {
    const el = document.getElementById(id);
    if (kind === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); return el.checked; }
    el.value = value;
    el.dispatchEvent(new Event(kind === 'range' ? 'input' : 'change', { bubbles: true }));
    return el.value;
}, { id, kind, value });
const order = ['layout', 'menuPanel', 'modes', 'stageChat', 'stagePlate', 'stageSprite', 'stageShade', 'menuButtons', 'modesVoice', 'modesTidy', 'modesStoryAs', 'modesSeeAs'];
const wrong = [];
for (const key of order) {
    const spec = KEYS[key];
    const c = await control(spec.label);
    if (!c) { wrong.push(`${key}: no control labelled "${spec.label}"`); continue; }
    if (spec.options && JSON.stringify(c.options) !== JSON.stringify(spec.options)) wrong.push(`${key}: options ${JSON.stringify(c.options)}`);
    if (c.disabled) { wrong.push(`${key}: still greyed out`); continue; }
    const before = (await settings())[key];
    await change(c.id, c.kind, spec.set);
    await page.waitForTimeout(200);
    const after = (await settings())[key];
    if (JSON.stringify(before) === JSON.stringify(after)) wrong.push(`${key}: stayed ${JSON.stringify(after)}`);
}
const wording = await control(KEYS.modesTemplates.label);
if (!wording) wrong.push('modesTemplates: no "Advanced: my own wording" fold');
check('every setting in the bible\'s table is on screen under its label, and its control changes it', wrong.length === 0, wrong.join('; '));
check('and the page follows: the stage layout, the menu panel and the send modes are on', (await bodyHas('forge-stage')) && (await bodyHas('forge-menu')) && (await bodyHas('forge-modes')));

// 4. Export writes every "yes" key and no "no" key (the file is read from the page as it is made)
await page.evaluate(() => {
    const make = URL.createObjectURL;
    URL.createObjectURL = (blob) => { globalThis.testLookBlob = blob; return make.call(URL, blob); };
    HTMLAnchorElement.prototype.click = function () {};
});
await page.evaluate(() => document.getElementById('forge-ui-export').click());
const file = await page.evaluate(async () => JSON.parse(await globalThis.testLookBlob.text()));
const yes = Object.keys(KEYS).filter((k) => KEYS[k].look);
const no = Object.keys(KEYS).filter((k) => !KEYS[k].look);
check('Export look writes every key the bible marks "yes"', yes.every((k) => k in file.look), yes.filter((k) => !(k in file.look)).join(', '));
check('and none it marks "no"', no.every((k) => !(k in file.look)), no.filter((k) => k in file.look).join(', '));
check('and keeps its format and version', file.format === 'arcane-forge-ui-look' && file.version === 1, `${file.format} ${file.version}`);

// 5. Import: a file of bad values changes nothing and breaks nothing; a good one is taken
const give = (look) => page.setInputFiles('#forge-ui-import-file', { name: 'look.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'arcane-forge-ui-look', version: 1, look })) });
const watched = ['stageChat', 'modesVoice', 'stageShade', 'modesTemplates'];
const pick = (s) => JSON.stringify(watched.map((k) => s[k]));
let before = await settings();
await give({ stageChat: 999, modesVoice: 'third', stageShade: 'dark', modesTemplates: { do: 'x'.repeat(500) } });
await page.waitForTimeout(500);
check('a look file with stageChat 999, modesVoice "third", stageShade "dark" and a 500-character Do wording changes none of them', pick(await settings()) === pick(before), `${pick(before)} then ${pick(await settings())}`);
await give({ stageChat: 55 });
await page.waitForTimeout(500);
check('a second file with stageChat 55 sets it', (await settings()).stageChat === 55, String((await settings()).stageChat));

// 6. An older look file, with none of the new keys, imports as before
before = await settings();
await give({ fontSize: 19, colors: { ember: '#112233' } });
await page.waitForTimeout(500);
const old = await settings();
check('an older look file with none of the new keys imports as before', old.fontSize === 19 && old.colors.ember === '#112233' && Object.keys(defaults).every((k) => JSON.stringify(old[k]) === JSON.stringify(before[k])), `${old.fontSize} ${old.colors.ember}`);

// 7. Reset puts every new key back to its default, and the page follows at once
await page.evaluate(() => document.getElementById('forge-ui-reset').click());
await page.waitForTimeout(600);
const reset = await settings();
const off = Object.keys(defaults).filter((k) => JSON.stringify(reset[k]) !== JSON.stringify(defaults[k]));
check('Reset puts every new key back to the default in its feature\'s defaults', off.length === 0, off.map((k) => `${k}: ${JSON.stringify(reset[k])}`).join('; '));
const left = await page.evaluate(() => ({
    ids: ['forge-stage', 'forge-spine', 'forge-menu', 'forge-menu-buttons', 'forge-modes'].filter((id) => document.getElementById(id)),
    classes: ['forge-stage', 'forge-menu', 'forge-menu-buttons', 'forge-modes'].filter((c) => document.body.classList.contains(c)),
}));
check('and none of the features\' elements or classes is left in the page', !left.ids.length && !left.classes.length, JSON.stringify(left));

// 8. The changelog fragments are folded in
const changes = join(FORGE_DIR, 'docs/redesign/changes');
const fragments = existsSync(changes) ? readdirSync(changes).filter((f) => f.endsWith('.md')) : [];
check('docs/redesign/changes holds no fragment files', fragments.length === 0, fragments.join(', '));
const log = readFileSync(join(FORGE_DIR, 'CHANGELOG.md'), 'utf8');
const unreleased = log.slice(log.indexOf('## Unreleased'), log.indexOf('\n## ', log.indexOf('## Unreleased') + 5) >>> 0 || undefined);
check("CHANGELOG.md's Unreleased section names Do, Say, Story and See, the stage layout and the menu panel",
    ['Do', 'Say', 'Story', 'See'].every((w) => unreleased.includes(`**${w}**`) || unreleased.includes(w)) && /Stage\*\* layout|stage layout/i.test(unreleased) && /menu panel/i.test(unreleased));

await setForge(page, { enabled: true, layout: 'classic', menuPanel: false, modes: false });
await finish();
