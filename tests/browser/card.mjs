// The profile card (Three columns layout): clicking a picture opens a window with the character's or the
// persona's picture and profile; Escape, the close button and a click beside it close it; with the setting
// off SillyTavern's own picture zoom is back. Only the Forge Tester chat is used, and no message text is read.
// Usage: node tests/browser/card.mjs
// Set FORGE_SHOTS to a folder to also save pictures there.
import { join } from 'node:path';
import { openForge, setForge } from './_harness.mjs';

const { page, check, finish } = await openForge({});
await page.addStyleTag({ content: '#rpg-companion-panel { display: none !important; }' });
const shot = async (name) => { if (process.env.FORGE_SHOTS) await page.screenshot({ path: join(process.env.FORGE_SHOTS, name) }); };
const card = () => page.evaluate(() => {
    const dialog = document.getElementById('forge-card');
    if (!dialog) return null;
    const r = dialog.getBoundingClientRect();
    return {
        open: dialog.open,
        name: dialog.querySelector('.forge-card-name')?.textContent,
        kind: dialog.querySelector('.forge-card-kind')?.textContent,
        labels: [...dialog.querySelectorAll('.forge-card-label')].map((l) => l.textContent),
        edit: dialog.querySelector('.forge-card-edit')?.textContent,
        whole: dialog.classList.contains('forge-card-whole'),
        sideShown: Boolean(dialog.querySelector('.forge-card-side')?.getClientRects().length),
        width: Math.round(r.width), height: Math.round(r.height), centred: Math.abs(r.left + r.width / 2 - innerWidth / 2) <= 1,
        focusInside: dialog.contains(document.activeElement),
    };
});
const zoomed = () => page.evaluate(() => document.querySelectorAll('.zoomed_avatar:not(#zoomed_avatar_template *)').length);
const names = await page.evaluate(() => { const ctx = SillyTavern.getContext(); return { character: ctx.characters[ctx.characterId].name, user: ctx.name1 }; });

await setForge(page, { layout: 'columns', columnsProfile: true, columnsCard: true });
await page.waitForTimeout(800);

// A character's message
await page.locator('#chat > .mes[is_user="false"][is_system="false"] .mesAvatarWrapper .avatar').last().click();
await page.waitForTimeout(400);
let c = await card();
check("clicking a character's picture in the chat opens its card", c?.open && c.name === names.character && c.kind.startsWith('Character'), JSON.stringify(c));
check('the card is a centred window with the profile beside the picture', c && c.centred && c.width === 920 && c.height === 640 && c.sideShown, JSON.stringify(c));
check("the card has the character's About text and an Edit button", c && c.labels.includes('About') && c.edit === 'Edit character', JSON.stringify(c));
check('the focus is inside the card', c?.focusInside === true);
check("SillyTavern's own zoom did not also open", (await zoomed()) === 0);
await shot('card-character.png');

await page.click('#forge-card .forge-card-picture');
await page.waitForTimeout(300);
c = await card();
check('clicking the picture shows the whole picture across the card', c?.whole && !c.sideShown, JSON.stringify(c));
await shot('card-whole.png');
await page.click('#forge-card .forge-card-picture');
await page.waitForTimeout(300);
c = await card();
check('clicking it again brings the profile back', c && !c.whole && c.sideShown, JSON.stringify(c));

await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape closes the card and takes it out of the page', (await card()) === null);

// The user's own message
await page.locator('#chat > .mes[is_user="true"] .mesAvatarWrapper .avatar').last().click();
await page.waitForTimeout(400);
c = await card();
check("clicking your own picture in the chat opens your persona's card", c?.open && c.name === names.user && c.kind.startsWith('Persona') && c.edit === 'Edit persona', JSON.stringify(c));
await shot('card-persona.png');
await page.click('#forge-card .forge-card-close');
await page.waitForTimeout(300);
check('the close button closes it', (await card()) === null);

// Our own pictures: the profile panel, the people in the chat, the persona strip
await page.click('#forge-profile .forge-profile-top .forge-face-button');
await page.waitForTimeout(400);
c = await card();
check("the profile panel's picture opens the character's card", c?.open && c.name === names.character, JSON.stringify(c));
await page.mouse.click(8, 8);
await page.waitForTimeout(300);
check('a click on the dimmed page beside the card closes it', (await card()) === null);
await page.click('#forge-chats .forge-chats-you .forge-face-button');
await page.waitForTimeout(400);
c = await card();
check("the persona strip's picture opens your persona's card", c?.open && c.name === names.user, JSON.stringify(c));

// Edit closes the card and opens SillyTavern's own menu
await page.click('#forge-card .forge-card-edit');
await page.waitForTimeout(800);
check('Edit persona closes the card and opens the Personas menu', (await card()) === null && await page.evaluate(() => Boolean(document.querySelector('#persona-management-button > .drawer-content.openDrawer'))));
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// Setting off: our pictures are plain again and SillyTavern's zoom is back
await setForge(page, { columnsCard: false });
await page.waitForTimeout(500);
check('with the setting off our own pictures are not buttons', await page.evaluate(() => document.querySelectorAll('.forge-face-button').length === 0));
await page.locator('#chat > .mes[is_user="false"][is_system="false"] .mesAvatarWrapper .avatar').last().click();
await page.waitForTimeout(600);
check("with the setting off a picture in the chat gets SillyTavern's own zoom", (await card()) === null && (await zoomed()) === 1);
await page.evaluate(() => document.querySelectorAll('.zoomed_avatar:not(#zoomed_avatar_template *)').forEach((z) => z.remove()));

// Layout off with a card open: nothing is left
await setForge(page, { columnsCard: true });
await page.click('#forge-profile .forge-profile-top .forge-face-button');
await page.waitForTimeout(300);
await setForge(page, { layout: 'classic' });
check('switching the layout off takes an open card away', (await card()) === null);
await page.locator('#chat > .mes[is_user="false"][is_system="false"] .mesAvatarWrapper .avatar').last().click();
await page.waitForTimeout(600);
check("and a picture in the chat gets SillyTavern's own zoom again", (await card()) === null && (await zoomed()) === 1);

await finish();
