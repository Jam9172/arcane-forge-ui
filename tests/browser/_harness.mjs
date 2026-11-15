// Shared set-up for the browser tests. Every test opens the sandbox SillyTavern in WebKit through here.
//
//  - The extension's files are served from THIS checkout, whatever folder the sandbox itself links to. A test
//    run inside a Git worktree therefore tests that worktree's code, and several worktrees can test at once.
//  - Nothing is written to the sandbox: saves of settings, chats and characters are answered here.
//  - No model is ever called: generate requests are answered here, and requests to other hosts are refused.
//  - Only the empty "Forge Tester" chat is opened. Never open, read or screenshot any other chat.
//
// The sandbox must already be running (http://localhost:8000, or FORGE_SANDBOX). Tests never start or stop it.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SANDBOX = process.env.FORGE_SANDBOX || 'http://localhost:8000/';
const EXTENSION_PATH = '/scripts/extensions/third-party/arcane-forge-ui/';
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };

// Playwright: from this checkout if it is installed here, else from FORGE_PLAYWRIGHT_FROM, else from a
// tools/webkit-test folder beside any parent folder (a workshop that keeps one Playwright for every repo).
function loadPlaywright() {
    try { return createRequire(import.meta.url)('playwright'); } catch { /* not installed here */ }
    const from = [];
    if (process.env.FORGE_PLAYWRIGHT_FROM) from.push(resolve(process.env.FORGE_PLAYWRIGHT_FROM));
    for (let dir = FORGE_DIR; dirname(dir) !== dir; dir = dirname(dir)) from.push(join(dirname(dir), 'tools/webkit-test'));
    for (const folder of from) {
        if (!existsSync(join(folder, 'node_modules/playwright'))) continue;
        try { return createRequire(join(folder, 'package.json'))('playwright'); } catch { /* try the next one */ }
    }
    throw new Error('Playwright was not found. Install it in this checkout (npm install playwright), or set FORGE_PLAYWRIGHT_FROM to a folder that has it in node_modules.');
}

/**
 * Opens the sandbox with the Forge Tester chat and returns the page with a few helpers.
 * @param {{phone?: boolean, width?: number, height?: number, chat?: boolean}} [options] phone = a 390 x 800 touch
 *   screen; chat: false skips opening the Forge Tester chat
 */
export async function openForge({ phone = false, width = 1440, height = 900, chat = true } = {}) {
    const { webkit } = loadPlaywright();
    const browser = await webkit.launch();
    const context = await browser.newContext({ viewport: phone ? { width: 390, height: 800 } : { width, height }, hasTouch: phone, isMobile: phone });
    const page = await context.newPage();
    const errors = [];
    const served = [];  // extension files answered from this checkout
    const held = [];    // saves and model calls that were answered here instead of by the sandbox
    page.on('pageerror', (e) => errors.push(String(e)));

    const sandboxHost = new URL(SANDBOX).host;
    await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') return route.continue();
        if (url.host !== sandboxHost) return route.abort(); // nothing leaves the sandbox
        const path = decodeURIComponent(url.pathname);

        if (path.startsWith(EXTENSION_PATH)) {
            const file = resolve(FORGE_DIR, path.slice(EXTENSION_PATH.length));
            if (!file.startsWith(FORGE_DIR + sep) || !existsSync(file)) return route.fulfill({ status: 404, body: 'Not found' });
            served.push(path.slice(EXTENSION_PATH.length));
            return route.fulfill({ path: file, contentType: TYPES[extname(file)] ?? 'application/octet-stream', headers: { 'Cache-Control': 'no-store' } });
        }
        if (request.method() === 'POST' && /\/generate(\/|$)/.test(path)) {
            held.push(path);
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Test reply.' } }] }) });
        }
        if (request.method() === 'POST' && /\/(save|edit|edit-attribute|merge-attributes|rename|delete)$/.test(path)) {
            held.push(path);
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: 'ok' }) });
        }
        return route.continue();
    });

    await page.goto(SANDBOX, { waitUntil: 'load' });
    await page.waitForFunction(() => globalThis.SillyTavern?.getContext?.()?.extensionSettings?.arcaneForgeUi !== undefined && document.querySelector('#send_textarea'), null, { timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => [...document.querySelectorAll('button, .menu_button')].find((b) => /Got it/i.test(b.textContent))?.click());
    if (chat) {
        await page.evaluate(async () => { await (await import('/forge-seed.js')).seed(); });
        await page.waitForTimeout(600);
    }

    let fail = 0;
    /** Prints one "ok" or "FAIL" line; the run-all script reads these. */
    const check = (name, ok, extra = '') => { if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); };
    /** Ends the test: adds the "no script errors" check, closes the browser, exits 1 if a check failed. */
    const finish = async () => {
        check('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '));
        await browser.close();
        process.exit(fail ? 1 : 0);
    };
    return { browser, page, errors, served, held, check, finish };
}

/** Changes Arcane Forge UI settings in the page (never saved) and has the extension apply them. */
export async function setForge(page, patch) {
    await page.evaluate(async (patch) => {
        const { extension_settings } = await import('/scripts/extensions.js');
        Object.assign(extension_settings.arcaneForgeUi, patch);
        document.dispatchEvent(new CustomEvent('arcane-forge-ui:apply'));
    }, patch);
    await page.waitForTimeout(300);
}

/** Makes SillyTavern believe it has a connection (in this page only), so a typed message is accepted. */
export async function fakeConnection(page) {
    await page.evaluate(async () => {
        const st = await import('/script.js');
        const oai = await import('/scripts/openai.js');
        oai.oai_settings.stream_openai = false;
        st.setOnlineStatus('Valid');
    });
}

/**
 * Gives the page the two TauriTavern habits that have bitten the theme before: every message is focusable
 * (tabindex -1, role group), and off-screen messages are not drawn. A stand-in, not TauriTavern itself.
 */
export async function likeTauriTavern(page) {
    await page.evaluate(() => {
        for (const mes of document.querySelectorAll('#chat > .mes')) { mes.setAttribute('tabindex', '-1'); mes.setAttribute('role', 'group'); }
        if (!document.getElementById('test-tt-skip-rule')) {
            const style = document.createElement('style');
            style.id = 'test-tt-skip-rule';
            style.textContent = '#chat > .mes:not(.last_mes) { content-visibility: auto; contain-intrinsic-block-size: auto 200px; flex-shrink: 0; }';
            document.head.append(style);
        }
    });
}

/** Where an element sits, in whole pixels (null when it is not in the page or not shown). */
export function box(page, selector) {
    return page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const shown = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        return shown ? { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) } : null;
    }, selector);
}
