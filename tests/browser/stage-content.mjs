// What the stage layout shows (bible section 5.1): the name plate, the shade over the art, and Character
// Expressions' sprite standing on the stage. Each has its setting under Layout, greyed out while the layout is
// Classic. With the layout Classic, on a phone or with the main switch off, none of it is in the page and the
// sprite is back where SillyTavern put it. Also: the spine leaves the message box's options button clickable.
// Usage: node tests/browser/stage-content.mjs [phone]
import { box, openForge, setForge } from './_harness.mjs';

const phone = process.argv[2] === 'phone';
const { page, check, finish } = await openForge({ phone });
const STAGE_JS = '/scripts/extensions/third-party/arcane-forge-ui/stage.js';
const HOSTILE = '<img src=x onerror=alert(1)><b>Mira</b>';

// Two pictures for the sprite: a tall one (taller than the stage) and a wide one (wider than the stage)
const picture = (width, height) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#777"/></svg>`)}`;
const TALL = picture(600, 1200);
const WIDE = picture(2400, 400);
// Where SillyTavern's MovingUI would have put the sprite: every inline property it writes on the holder
const INLINE = { top: 60, left: 40, width: 300, height: 500 };
const INLINE_STYLE = `top: ${INLINE.top}px; left: ${INLINE.left}px; right: 1100px; bottom: 340px; margin: unset; width: ${INLINE.width}px; height: ${INLINE.height}px;`;

const dialogs = [];
page.on('dialog', (dialog) => { dialogs.push(dialog.message()); dialog.dismiss().catch(() => {}); });

const near = (a, b, px) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= px;
const rect = (selector) => page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null;
}, selector);
const settings = () => page.evaluate(async () => (await import('/scripts/extensions.js')).extension_settings.arcaneForgeUi);
// What the stage's content puts in the page
const traces = () => page.evaluate(() => [
    document.getElementById('forge-stage') && '#forge-stage',
    document.querySelector('.forge-stage-plate') && '.forge-stage-plate',
    document.querySelector('.forge-stage-shade') && '.forge-stage-shade',
    document.body.classList.contains('forge-stage-sprite') && 'body.forge-stage-sprite',
].filter(Boolean));
const chatListeners = () => page.evaluate(() => {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    return eventSource.events[eventTypes.CHAT_CHANGED]?.length ?? 0;
});
const plate = () => page.evaluate(() => {
    const el = document.querySelector('#forge-stage > .forge-stage-plate');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { text: el.textContent, elements: el.childElementCount, shown: r.width > 0 && r.height > 0 };
});
// A colour or font a token resolves to, read from a throwaway element
const resolved = (property, value) => page.evaluate(([property, value]) => {
    const probe = document.createElement('div');
    probe.style.setProperty(property, value);
    document.body.append(probe);
    const out = getComputedStyle(probe).getPropertyValue(property);
    probe.remove();
    return out;
}, [property, value]);

// The sprite: Character Expressions' own elements when they are in the page, else a stand-in built like them.
// It gets a picture and the inline places MovingUI writes; everything is put back at the end.
async function giveSprite(src) {
    return page.evaluate(async ([src, style]) => {
        if (!window.forgeTestSprite) {
            let made = false;
            if (!document.getElementById('expression-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.id = 'expression-wrapper';
                const holder = document.createElement('div');
                holder.id = 'expression-holder';
                holder.className = 'expression-holder';
                const img = document.createElement('img');
                img.id = 'expression-image';
                img.className = 'expression';
                holder.append(img);
                wrapper.append(holder);
                document.body.append(wrapper);
                made = true;
            }
            const holder = document.getElementById('expression-holder');
            const img = document.getElementById('expression-image');
            window.forgeTestSprite = { made, holderStyle: holder.getAttribute('style'), imgSrc: img.getAttribute('src'), imgStyle: img.getAttribute('style') };
            holder.setAttribute('style', style);
        }
        const img = document.getElementById('expression-image');
        img.src = src;
        await img.decode();
        return window.forgeTestSprite.made;
    }, [src, INLINE_STYLE]);
}
async function takeSpriteBack() {
    await page.evaluate(() => {
        const saved = window.forgeTestSprite;
        if (!saved) return;
        if (saved.made) {
            document.getElementById('expression-wrapper')?.remove();
        } else {
            const holder = document.getElementById('expression-holder');
            const img = document.getElementById('expression-image');
            for (const [el, name, value] of [[holder, 'style', saved.holderStyle], [img, 'src', saved.imgSrc], [img, 'style', saved.imgStyle]]) {
                if (value === null) el.removeAttribute(name);
                else el.setAttribute(name, value);
            }
        }
        delete window.forgeTestSprite;
    });
}
// Whether the sprite stands where MovingUI's inline style put it
const atInline = (r) => !!r && near(r.left, INLINE.left, 1) && near(r.top, INLINE.top, 1) && near(r.width, INLINE.width, 1);
// The holder's place and size as the page works them out, shown or not
const spriteStyle = () => page.evaluate(() => {
    const holder = document.getElementById('expression-holder');
    const cs = holder && getComputedStyle(holder);
    return cs && Object.fromEntries(['display', 'visibility', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'max-width', 'max-height', 'margin', 'transform'].map((p) => [p, cs.getPropertyValue(p)]));
});

const baseListeners = await chatListeners();
// SillyTavern's own chat-changed listeners, so the test can tell which one is ours
await page.evaluate(() => {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    window.forgeTestChatListeners = [...(eventSource.events[eventTypes.CHAT_CHANGED] ?? [])];
});
check('classic: none of the stage content in the page', (await traces()).length === 0, (await traces()).join(', '));
// 5 (set-up). The sprite, and where SillyTavern alone puts it
const madeSprite = await giveSprite(TALL);
console.log(`     (the sprite is ${madeSprite ? 'a stand-in' : "Character Expressions' own, given a picture"})`);
await page.waitForTimeout(300);
const classicSprite = await spriteStyle();
const asClassic = async () => JSON.stringify(await spriteStyle()) === JSON.stringify(classicSprite);
if (!phone) check('classic: the sprite is at its inline position', atInline(await rect('#expression-holder')), JSON.stringify(await rect('#expression-holder')));

if (phone) {
    // A phone has no stage, so no plate, shade or placed sprite, whatever the settings say
    await setForge(page, { layout: 'stage', stagePlate: true, stageSprite: true, stageShade: 40 });
    const left = await traces();
    check('a phone with layout Stage has no plate, shade or placed sprite', left.length === 0, left.join(', '));
    check('and the sprite is as SillyTavern has it with the layout Classic', await asClassic(), JSON.stringify(await spriteStyle()));
    check('and no chat-changed listener of ours', (await chatListeners()) === baseListeners, `${baseListeners} then ${await chatListeners()}`);
    await setForge(page, { layout: 'classic', stageShade: 0 });
} else {
    // 1. The name plate: the chat's character, bottom left of the stage, in the heading font
    await setForge(page, { layout: 'stage', stageChat: 46, stagePlate: true, stageSprite: true, stageShade: 0 });
    const stage = await rect('#forge-stage');
    const how = await page.evaluate(() => {
        const el = document.querySelector('.forge-stage-plate');
        const cs = el && getComputedStyle(el);
        return el && {
            inStage: el.parentElement?.id === 'forge-stage',
            font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, colour: cs.color, fill: cs.backgroundColor,
            line: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, radius: cs.borderTopLeftRadius,
            padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        };
    });
    const plateBox = await rect('.forge-stage-plate');
    check('the plate says Forge Tester', (await plate())?.text === 'Forge Tester', (await plate())?.text);
    check('it lies inside #forge-stage', how?.inStage && plateBox && plateBox.left >= stage.left && plateBox.right <= stage.right && plateBox.bottom <= stage.bottom, JSON.stringify(plateBox));
    check("it is 24px in from the stage's left and bottom edges", near(plateBox?.left - stage.left, 24, 2) && near(stage.bottom - plateBox?.bottom, 24, 2), `${(plateBox?.left - stage.left).toFixed(1)}px, ${(stage.bottom - plateBox?.bottom).toFixed(1)}px`);
    check('its font is the heading font', how?.font === (await resolved('font-family', 'var(--forge-heading)')), how?.font);
    check('it is 28px, bold, brass on a card plate', how?.size === '28px' && how.weight === '700' && how.colour === (await resolved('color', 'var(--forge-brass)')) && how.fill === (await resolved('background-color', 'var(--forge-card)')), `${how?.size}, ${how?.weight}, ${how?.colour}, ${how?.fill}`);
    check('with a 1px border line, 10px corners and 10px 16px padding', how?.line === `1px solid ${await resolved('border-top-color', 'var(--forge-border)')}` && how.radius === '10px' && how.padding === '10px 16px 10px 16px', `${how?.line}, ${how?.radius}, ${how?.padding}`);
    check('one chat-changed listener of ours', (await chatListeners()) === baseListeners + 1, `${baseListeners} then ${await chatListeners()}`);

    // 3. A hostile name is shown as text, and nothing in it runs
    await page.evaluate(async ([url, name]) => (await import(url)).setPlateText(name), [STAGE_JS, HOSTILE]);
    await page.waitForTimeout(300);
    const hostile = await plate();
    check("the plate function shows a name with markup in it as that text", hostile?.text === HOSTILE && hostile.shown, hostile?.text);
    check('and the plate holds no element', hostile?.elements === 0 && dialogs.length === 0, `${hostile?.elements} elements, ${dialogs.length} dialogs`);

    // The plate follows SillyTavern's chat-changed event: ours is the listener that came with the plate. It is
    // called directly, so no other listener runs and no chat changes.
    const followed = await page.evaluate(async () => {
        const { eventSource, eventTypes } = SillyTavern.getContext();
        const ours = eventSource.events[eventTypes.CHAT_CHANGED].find((listener) => !window.forgeTestChatListeners.includes(listener));
        const text = () => document.querySelector('.forge-stage-plate')?.textContent;
        const shown = () => (document.querySelector('.forge-stage-plate')?.getBoundingClientRect().height ?? 0) > 0;
        const out = {};
        ours();
        out.back = text();
        // A group chat, and no chat at all, told by a stand-in context (no chat is opened or closed)
        const real = SillyTavern.getContext;
        try {
            SillyTavern.getContext = () => ({ ...real(), chatId: 'test-group-chat', groupId: 'test-group', groups: [{ id: 'test-group', name: 'Test Group' }] });
            ours();
            out.group = text();
            SillyTavern.getContext = () => ({ ...real(), chatId: undefined, groupId: null, characterId: undefined });
            ours();
            out.none = shown();
        } finally {
            SillyTavern.getContext = real;
        }
        ours();
        out.again = text();
        out.againShown = shown();
        return out;
    });
    check('on chat-changed the plate shows the open chat again', followed.back === 'Forge Tester', followed.back);
    check("in a group chat it shows the group's name", followed.group === 'Test Group', followed.group);
    check('with no chat open the plate is hidden', followed.none === false);
    check('and it comes back with the chat', followed.again === 'Forge Tester' && followed.againShown);

    // 2. Name on the stage off: no plate, and no listener
    await setForge(page, { stagePlate: false });
    check('stagePlate false: no plate on screen', !(await box(page, '.forge-stage-plate')), JSON.stringify(await plate()));
    check('and no chat-changed listener of ours', (await chatListeners()) === baseListeners, `${baseListeners} then ${await chatListeners()}`);
    await setForge(page, { stagePlate: true });
    check('stagePlate true again: the plate is back', (await plate())?.text === 'Forge Tester' && (await chatListeners()) === baseListeners + 1);

    // 4. The shade: black at the Darken setting, over the whole stage
    await setForge(page, { stageShade: 40 });
    const shade = await page.evaluate(() => {
        const el = document.querySelector('#forge-stage > .forge-stage-shade');
        return el && { fill: getComputedStyle(el).backgroundColor, inStage: el.parentElement?.id === 'forge-stage' };
    });
    const shadeBox = await rect('.forge-stage-shade');
    check('stageShade 40: the shade layer is black at 0.4', shade?.fill === 'rgba(0, 0, 0, 0.4)' && shade.inStage, shade?.fill);
    check('it covers the stage', !!shadeBox && ['left', 'top', 'right', 'bottom'].every((side) => near(shadeBox[side], stage[side], 1)), JSON.stringify(shadeBox));
    await setForge(page, { stageShade: 0 });
    check('stageShade 0: no shade is drawn', !(await box(page, '.forge-stage-shade')) && (await traces()).every((t) => t !== '.forge-stage-shade'));
    await setForge(page, { stageShade: 40 });

    // 5. The sprite stands on the stage: bottom centre, at most 92% of its height, never over the chat
    const sheld = await rect('#sheld');
    const holder = await rect('#expression-holder');
    const img = await rect('#expression-image');
    const inside = (r, s = stage) => !!r && r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1;
    check('stageSprite true: the sprite lies inside the stage', inside(holder) && inside(img), `${JSON.stringify(holder)} in ${JSON.stringify(stage)}`);
    check("its bottom is the stage's bottom", near(holder?.bottom, stage.bottom, 2) && near(img?.bottom, stage.bottom, 2), `${holder?.bottom}px, ${img?.bottom}px, stage ${stage.bottom}px`);
    check("it is centred on the stage", near((holder.left + holder.right) / 2, (stage.left + stage.right) / 2, 2), `${((holder.left + holder.right) / 2).toFixed(1)}px, stage ${((stage.left + stage.right) / 2).toFixed(1)}px`);
    check("a tall picture is scaled to 92% of the stage's height, not cut off", near(img?.height, stage.height * 0.92, 2) && near(holder.height, img.height, 1) && near(img.width / img.height, 0.5, 0.01), `${img?.width.toFixed(1)} by ${img?.height.toFixed(1)}px, 92% is ${(stage.height * 0.92).toFixed(1)}px`);
    check('it does not overlap #sheld', holder.right <= sheld.left + 0.5, `sprite ends ${holder.right.toFixed(1)}px, column starts ${sheld.left.toFixed(1)}px`);
    // Layers, with pointer events lent to our layers for the measuring
    const layers = await page.evaluate(() => {
        const plateEl = document.querySelector('.forge-stage-plate');
        const ours = [...document.querySelectorAll('#forge-stage > *')];
        for (const el of ours) el.style.pointerEvents = 'auto';
        const name = (el) => el.id || (el.matches('#forge-stage > *') ? el.className : el.tagName.toLowerCase());
        const sprite = document.getElementById('expression-image').getBoundingClientRect();
        const p = plateEl.getBoundingClientRect();
        // a point inside both the plate and the sprite, if they meet; and one inside the sprite above the plate
        const both = { x: (Math.max(p.left, sprite.left) + Math.min(p.right, sprite.right)) / 2, y: (p.top + p.bottom) / 2 };
        const meet = p.right > sprite.left + 2 && p.left < sprite.right - 2;
        const out = {
            overPlate: meet ? name(document.elementFromPoint(both.x, both.y)) : null,
            spriteStack: document.elementsFromPoint((sprite.left + sprite.right) / 2, sprite.top + sprite.height / 3).map(name),
        };
        for (const el of ours) el.style.removeProperty('pointer-events');
        for (const el of ours) if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
        return out;
    });
    const at = (n) => layers.spriteStack.indexOf(n);
    check('the plate is drawn over the sprite', layers.overPlate === 'forge-stage-plate', layers.overPlate ?? 'they do not meet');
    check('the sprite is drawn over the shade, and the shade over the art', at('expression-image') >= 0 && at('expression-image') < at('forge-stage-shade') && at('forge-stage-shade') < at('bg1'), layers.spriteStack.slice(0, 6).join(' > '));
    // A wide picture is scaled to the stage's width
    await giveSprite(WIDE);
    await page.waitForTimeout(300);
    const wide = await rect('#expression-holder');
    check('a wide picture stays inside the stage and off the chat column', inside(wide) && wide.right <= sheld.left + 0.5 && near(wide.bottom, stage.bottom, 2), JSON.stringify(wide));
    // The smallest stage
    await page.setViewportSize({ width: 1040, height: 700 });
    await page.waitForTimeout(400);
    const small = { stage: await rect('#forge-stage'), sheld: await rect('#sheld'), sprite: await rect('#expression-holder') };
    check('at 1040 by 700 it stays inside the stage and off the chat column', inside(small.sprite, small.stage) && small.sprite.right <= small.sheld.left + 0.5 && near(small.sprite.bottom, small.stage.bottom, 2), `${JSON.stringify(small.sprite)} in ${JSON.stringify(small.stage)}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    await giveSprite(TALL);

    // With the setting off, the sprite is where SillyTavern put it
    await setForge(page, { stageSprite: false });
    check('stageSprite false: its inline position counts again', atInline(await rect('#expression-holder')), JSON.stringify(await rect('#expression-holder')));
    check('and the sprite is exactly as SillyTavern has it with the layout Classic', await asClassic(), JSON.stringify(await spriteStyle()));
    await setForge(page, { stageSprite: true });
    check('stageSprite true again: back on the stage', near((await rect('#expression-holder'))?.bottom, stage.bottom, 2));

    // The spine leaves the message box's options button clickable
    const options = await page.evaluate(() => {
        const button = document.getElementById('options_button').getBoundingClientRect();
        const spine = document.getElementById('forge-spine').getBoundingClientRect();
        const y = button.top + button.height / 2;
        return {
            button: { left: button.left, right: button.right, y },
            spineRight: spine.right,
            hits: [0.5, 1, 2, 3, 4].map((dx) => document.elementFromPoint(button.left + dx, y)?.closest('#options_button')?.id ?? document.elementFromPoint(button.left + dx, y)?.id ?? ''),
        };
    });
    check("the spine stops short of the options button", options.spineRight <= options.button.left, `spine ends ${options.spineRight.toFixed(1)}px, button starts ${options.button.left.toFixed(1)}px`);
    check("the options button's left edge takes presses", options.hits.every((hit) => hit === 'options_button'), options.hits.join(', '));
    await page.mouse.click(options.button.left + 1, options.button.y);
    await page.waitForTimeout(500);
    const opened = await page.evaluate(() => getComputedStyle(document.getElementById('options')).display !== 'none');
    check('a click 1px inside its left edge opens the options menu', opened);
    if (opened) {
        await page.mouse.click((options.button.left + options.button.right) / 2, options.button.y);
        await page.waitForTimeout(500);
    }

    // The stage's content goes with the stage: below 1000px wide and with the main switch off
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(400);
    check('at 900px wide there is no plate, shade or placed sprite', (await traces()).length === 0, (await traces()).join(', '));
    // SillyTavern's own phone rules hide the sprite at this width, so it is compared with the layout Classic
    const narrowStage = await spriteStyle();
    await setForge(page, { layout: 'classic' });
    const narrowClassic = await spriteStyle();
    await setForge(page, { layout: 'stage' });
    check('and the sprite is as SillyTavern has it with the layout Classic', JSON.stringify(narrowStage) === JSON.stringify(narrowClassic), `${JSON.stringify(narrowStage)} then ${JSON.stringify(narrowClassic)}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    check('at 1440px wide again they are back', (await traces()).length === 4, (await traces()).join(', '));
    await setForge(page, { enabled: false });
    check('main switch off: none of the stage content in the page', (await traces()).length === 0, (await traces()).join(', '));
    check('and the sprite is as SillyTavern has it with the layout Classic, with no listener of ours', (await asClassic()) && (await chatListeners()) === baseListeners, JSON.stringify(await spriteStyle()));
    await setForge(page, { enabled: true });

    // 6. Layout back to Classic: no plate, no shade, the sprite at its inline position
    await setForge(page, { layout: 'classic' });
    const left = await traces();
    check('layout back to Classic: no plate, no shade, no placed sprite', left.length === 0, left.join(', '));
    check('the sprite is back at its inline position', atInline(await rect('#expression-holder')) && (await asClassic()), JSON.stringify(await rect('#expression-holder')));
    check('no chat-changed listener of ours is left', (await chatListeners()) === baseListeners, `${baseListeners} then ${await chatListeners()}`);
    await setForge(page, { stageShade: 0 });
}
const sprite = () => page.evaluate(() => ({ wrapper: !!document.getElementById('expression-wrapper'), holder: document.getElementById('expression-holder')?.getAttribute('style') ?? null, src: document.getElementById('expression-image')?.getAttribute('src') ?? null }));
const before = await page.evaluate(() => ({ wrapper: !window.forgeTestSprite.made, holder: window.forgeTestSprite.holderStyle, src: window.forgeTestSprite.imgSrc }));
await takeSpriteBack();
const putBack = await sprite();
check(madeSprite ? 'the stand-in sprite is gone again' : "Character Expressions' sprite has its own style and picture back", madeSprite ? !putBack.wrapper : JSON.stringify(putBack) === JSON.stringify(before), `${JSON.stringify(before)} then ${JSON.stringify(putBack)}`);

// The look file carries the three settings
const look = await page.evaluate(async (url) => {
    const stage = await import(url);
    return { look: stage.lookKeys, defaults: stage.defaults };
}, STAGE_JS);
check('stagePlate, stageSprite and stageShade are look keys', JSON.stringify([look.look.stagePlate, look.look.stageSprite, look.look.stageShade]) === JSON.stringify([{ type: 'boolean' }, { type: 'boolean' }, { type: 'number', min: 0, max: 60 }]), JSON.stringify(look.look));
check('by default the plate and the sprite are on and the art is not darkened', look.defaults.stagePlate === true && look.defaults.stageSprite === true && look.defaults.stageShade === 0, JSON.stringify(look.defaults));

// The settings screen: the three under Layout, after Chat width, greyed out while the layout is Classic
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(600);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.waitForTimeout(600);
const controls = () => page.evaluate(() => {
    const read = (id) => {
        const input = document.getElementById(id);
        const label = input?.closest('label');
        return input && {
            label: label?.querySelector('span')?.firstChild?.textContent.trim(),
            disabled: input.disabled,
            checked: input.type === 'checkbox' ? input.checked : undefined,
            range: input.type === 'range' ? `${input.min} to ${input.max}, ${label.querySelector('output')?.textContent}` : undefined,
        };
    };
    const ids = ['forge-ui-stage-chat', 'forge-ui-stage-plate', 'forge-ui-stage-sprite', 'forge-ui-stage-shade'];
    const inputs = ids.map((id) => document.getElementById(id));
    const heading = (input) => [...document.querySelectorAll('.arcane-forge-ui-settings h4')].filter((h) => h.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).pop()?.textContent;
    return {
        plate: read(ids[1]), sprite: read(ids[2]), shade: read(ids[3]),
        inOrder: inputs.every(Boolean) && inputs.every((input, i) => i === 0 || inputs[i - 1].compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING),
        section: inputs.every(Boolean) ? [...new Set(inputs.slice(1).map(heading))].join(', ') : null,
    };
});
await page.selectOption('#forge-ui-layout', 'classic');
await page.waitForTimeout(300);
const classic = await controls();
check('Layout has "Name on the stage", ticked', classic.plate?.label === 'Name on the stage' && classic.plate.checked === true, JSON.stringify(classic.plate));
check('and "Character sprite on the stage, when it has one", ticked', classic.sprite?.label === 'Character sprite on the stage, when it has one' && classic.sprite.checked === true, JSON.stringify(classic.sprite));
check('and the range "Darken the stage art", 0 to 60, shown as a percentage', classic.shade?.label === 'Darken the stage art' && classic.shade.range === '0 to 60, 0%', JSON.stringify(classic.shade));
check('all three come after Chat width, under Layout', classic.inOrder && classic.section === 'Layout', `${classic.inOrder}, ${classic.section}`);
check('all three are greyed out while the layout is Classic', classic.plate?.disabled && classic.sprite?.disabled && classic.shade?.disabled);
await page.selectOption('#forge-ui-layout', 'stage');
await page.waitForTimeout(300);
const usable = await controls();
check('choosing Stage makes all three usable', !usable.plate?.disabled && !usable.sprite?.disabled && !usable.shade?.disabled);
await page.click('#forge-ui-stage-plate');
await page.waitForTimeout(300);
check('unticking Name on the stage saves stagePlate false', (await settings()).stagePlate === false);
if (!phone) check('and takes the plate away', !(await box(page, '.forge-stage-plate')));
await page.click('#forge-ui-stage-plate');
await page.waitForTimeout(300);
check('ticking it again saves stagePlate true', (await settings()).stagePlate === true);
await page.click('#forge-ui-stage-sprite');
await page.waitForTimeout(300);
check('unticking the sprite saves stageSprite false', (await settings()).stageSprite === false);
if (!phone) check('and the sprite is no longer placed', !(await page.evaluate(() => document.body.classList.contains('forge-stage-sprite'))));
await page.click('#forge-ui-stage-sprite');
await page.waitForTimeout(300);
await page.fill('#forge-ui-stage-shade', '30');
await page.waitForTimeout(300);
const thirty = await controls();
check('setting Darken to 30 saves stageShade 30 and shows 30%', (await settings()).stageShade === 30 && thirty.shade?.range === '0 to 60, 30%', `${(await settings()).stageShade}, ${thirty.shade?.range}`);
if (phone) {
    const left = await traces();
    check('on a phone they change nothing on the page', left.length === 0, left.join(', '));
} else {
    const fill = await page.evaluate(() => getComputedStyle(document.querySelector('.forge-stage-shade')).backgroundColor);
    check('and the shade is black at 0.3', fill === 'rgba(0, 0, 0, 0.3)', fill);
}
await page.fill('#forge-ui-stage-shade', '0');
await page.waitForTimeout(300);
await page.selectOption('#forge-ui-layout', 'classic');
await page.waitForTimeout(300);
const greyed = await controls();
check('layout back to Classic: all three are greyed out again', greyed.plate?.disabled && greyed.sprite?.disabled && greyed.shade?.disabled);
const left = await traces();
check('and none of the stage content is in the page', left.length === 0, left.join(', '));
check('no chat-changed listener of ours is left', (await chatListeners()) === baseListeners, `${baseListeners} then ${await chatListeners()}`);
await page.click('.arcane-forge-ui-settings .inline-drawer-toggle');
await page.click('#extensions-settings-button .drawer-toggle');
await page.waitForTimeout(400);

await finish();
