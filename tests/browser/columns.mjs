// The Three columns layout: with Forge layout set to Three columns on a desktop-sized window, the character
// rail and the chat list are at the left, the chat is between them and the profile, the top bar is gone and
// the menus open in the panel. On a phone, and with the layout or the main switch off, nothing of it is in
// the page.
// Usage: node tests/browser/columns.mjs [phone]
// Set FORGE_SHOTS to a folder to also save pictures of the layout there.
import { join } from 'node:path';
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });
// RPG Companion's side panel, if the sandbox has it open, takes room at the right; a test-page rule hides it
await page.addStyleTag({ content: '#rpg-companion-panel { display: none !important; }' });

const PARTS = ['#forge-rail', '#forge-chats', '#forge-chat-head', '#forge-profile'];
const traces = () => page.evaluate((parts) => [
    document.body.classList.contains('forge-columns') && 'body.forge-columns',
    document.body.classList.contains('forge-columns-profile') && 'body.forge-columns-profile',
    document.body.style.getPropertyValue('--forge-columns-width') && 'body --forge-columns-width',
    ...parts.filter((part) => document.querySelector(part)),
].filter(Boolean), PARTS);
const shot = async (name) => {
    if (process.env.FORGE_SHOTS) await page.screenshot({ path: join(process.env.FORGE_SHOTS, name) });
};
const near = (a, b, px = 1) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= px;
const classicSheld = await box(page, '#sheld');

if (phone) {
    await setForge(page, { layout: 'columns' });
    const left = await traces();
    check('a phone with layout Three columns has none of it in the page', left.length === 0, left.join(', '));
    const sheld = await box(page, '#sheld');
    check('a phone with layout Three columns keeps the classic chat column', JSON.stringify(sheld) === JSON.stringify(classicSheld));
    await setForge(page, { layout: 'classic' });
    await finish();
}

await setForge(page, { layout: 'columns', columnsProfile: true, columnsReading: 720, modes: true });
await page.waitForTimeout(800);
const on = await traces();
check('layout Three columns puts its class and all four parts in the page', on.length === 7, on.join(', '));

const rail = await box(page, '#forge-rail');
const chats = await box(page, '#forge-chats');
const head = await box(page, '#forge-chat-head');
const profile = await box(page, '#forge-profile');
const sheld = await box(page, '#sheld');
const width = await page.evaluate(() => document.documentElement.clientWidth);
check('the rail is at the left edge, then the chat list', rail?.left === 0 && near(chats?.left, rail?.right), `rail ${rail?.left} to ${rail?.right}, chats from ${chats?.left}`);
check('the chat column starts where the chat list ends', near(sheld?.left, chats?.right), `chat from ${sheld?.left}, list to ${chats?.right}`);
check('the chat column ends where the profile starts, and the profile reaches the right edge', near(sheld?.right, profile?.left) && near(profile?.right, width), `chat to ${sheld?.right}, profile ${profile?.left} to ${profile?.right}, window ${width}`);
check('the strip sits over the chat column, at the top', head?.top === 0 && near(head?.left, sheld?.left) && near(head?.right, sheld?.right) && near(head?.bottom, sheld?.top), `strip ${head?.left},${head?.top} to ${head?.right},${head?.bottom}; chat top ${sheld?.top}`);
check('the top bar is not shown', (await box(page, '#top-bar')) === null);
check('the two round buttons are not shown', (await box(page, '#forge-menu-buttons')) === null);

const open = await page.evaluate(() => {
    const ctx = SillyTavern.getContext();
    return {
        name: ctx.characters[ctx.characterId]?.name,
        listName: document.querySelector('#forge-chats .forge-chats-name')?.textContent,
        profileName: document.querySelector('#forge-profile .forge-profile-name')?.textContent,
        railCurrent: document.querySelector('#forge-rail .forge-rail-item[aria-current="true"]')?.getAttribute('aria-label'),
        railCount: document.querySelectorAll('#forge-rail .forge-rail-item').length,
        characters: ctx.characters.length + ctx.groups.length,
        chat: String(ctx.characters[ctx.characterId]?.chat),
        currentChat: document.querySelector('#forge-chats .forge-chats-item[aria-current="true"] .forge-chats-title')?.textContent,
        chatCount: document.querySelectorAll('#forge-chats .forge-chats-item').length,
    };
});
check('the chat list, the profile and the rail all name the open character', open.name && open.listName === open.name && open.profileName === open.name && open.railCurrent === open.name, JSON.stringify(open));
check('the rail has a button for every character and group (up to 40)', open.railCount === Math.min(40, open.characters), `${open.railCount} of ${open.characters}`);
check('the chat list marks the open chat', open.chatCount >= 1 && open.currentChat === open.chat, `${open.chatCount} chats; marked ${open.currentChat}; open ${open.chat}`);

// The Forge Tester chat's own last message shows the reading column (nothing is sent, no model is called)
const mes = await box(page, '#chat > .mes.last_mes');
const form = await box(page, '#send_form');
check('a message is no wider than the reading width, and centred in the chat', mes && mes.right - mes.left <= 721 && near((mes.left + mes.right) / 2, (sheld.left + sheld.right) / 2, 12), mes ? `${mes.left} to ${mes.right}` : 'no message');
check('the message box lines up with the messages', form && near(form.left, mes?.left, 2) && near(form.right, mes?.right, 2), form ? `${form.left} to ${form.right}` : 'not shown');
const bar = await box(page, '#forge-modes');
check('the send modes bar is inside the message box', bar && form && bar.left >= form.left && bar.right <= form.right && bar.top >= form.top && bar.bottom <= form.bottom, bar ? `${bar.left},${bar.top} to ${bar.right},${bar.bottom}` : 'not shown');
await shot('columns.png');

// Reading width at the top of its range is Full: messages and the message box fill the chat column
await setForge(page, { columnsReading: 1600 });
const full = await box(page, '#chat > .mes.last_mes');
const fullForm = await box(page, '#send_form');
check('Reading width Full: a message fills the chat column, less its padding', full && sheld.right - sheld.left - (full.right - full.left) <= 80, full ? `${full.left} to ${full.right} in ${sheld.left} to ${sheld.right}` : 'no message');
check('and the message box lines up with it', fullForm && near(fullForm.left, full?.left, 2) && near(fullForm.right, full?.right, 2), fullForm ? `${fullForm.left} to ${fullForm.right}` : 'not shown');
await shot('columns-full.png');
await setForge(page, { columnsReading: 720 });

// Author's Note opens as a window of a usable width beside the rail (SillyTavern would size it from the gap
// beside its centred chat column, which this layout does not have)
await page.evaluate(() => { document.getElementById('floatingPrompt').style.display = 'flex'; });
const note = await box(page, '#floatingPrompt');
check("Author's Note is 440px wide and starts at the rail's edge", note && note.right - note.left === 440 && note.left === rail.right && note.top === 0, note ? `${note.left},${note.top} to ${note.right},${note.bottom}` : 'not shown');
await shot('columns-note.png');
await page.evaluate(() => { document.getElementById('floatingPrompt').style.display = ''; });

// The rail's Menu button opens SillyTavern's menus in the panel
await page.click('#forge-rail .forge-rail-foot [aria-label="Menu"]');
await page.waitForTimeout(700);
const opened = await page.evaluate(() => ({ frame: Boolean(document.getElementById('forge-menu')?.getClientRects().length), menu: Boolean(document.querySelector('#ai-config-button > .drawer-content.openDrawer')) }));
check('the rail\'s Menu button opens AI response in the menu panel', opened.frame && opened.menu, JSON.stringify(opened));
await shot('columns-menu.png');
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// The strip's button hides the profile, and the chat takes its room
await page.click('#forge-chat-head [aria-label="Profile"]');
await page.waitForTimeout(400);
const wide = await box(page, '#sheld');
check('hiding the profile from the strip gives its room to the chat', (await box(page, '#forge-profile')) === null && near(wide?.right, width), `chat to ${wide?.right}`);
check('and the setting follows', await page.evaluate(() => SillyTavern.getContext().extensionSettings.arcaneForgeUi.columnsProfile === false));
await shot('columns-no-profile.png');

// A narrow desktop window has no room for the profile
await setForge(page, { columnsProfile: true });
await page.setViewportSize({ width: 1100, height: 800 });
await page.waitForTimeout(500);
const narrow = await box(page, '#sheld');
check('at 1100px wide the profile is hidden and the chat reaches the right edge', (await box(page, '#forge-profile')) === null && near(narrow?.right, 1100), `chat to ${narrow?.right}`);
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(500);

// Off again: nothing of it is left, and the chat column is where it was
await setForge(page, { layout: 'classic', modes: false });
const off = await traces();
check('layout Classic leaves none of it in the page', off.length === 0, off.join(', '));
const back = await box(page, '#sheld');
check('and the chat column is back where it was', JSON.stringify(back) === JSON.stringify(classicSheld), `${JSON.stringify(back)} was ${JSON.stringify(classicSheld)}`);
check('and the top bar is back', (await box(page, '#top-bar')) !== null);

await setForge(page, { layout: 'columns' });
await setForge(page, { enabled: false });
const dead = await traces();
check('the main switch off leaves none of it in the page', dead.length === 0, dead.join(', '));

await finish();
