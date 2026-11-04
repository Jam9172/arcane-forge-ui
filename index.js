import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '../../../../script.js';
import { download } from '../../../utils.js';
import { buildAiTab, restoreAiTab, refreshModelLine, clearOmittedParams, restoreOmittedParams } from './aiTab.js';

const MODULE = 'arcaneForgeUi';
const FONT_LINK_ID = 'arcane-forge-ui-fonts';

const HEADING_FONTS = {
    cinzel: { label: 'Cinzel (engraved capitals)', value: "'Cinzel', 'Times New Roman', serif" },
    alegreya: { label: 'Alegreya Sans (same as body)', value: "'Alegreya Sans', 'Noto Sans', sans-serif" },
    serif: { label: 'Plain serif', value: "Georgia, 'Times New Roman', serif" },
};

const BODY_FONTS = {
    alegreya: { label: 'Alegreya Sans', value: "'Alegreya Sans', 'Noto Sans', sans-serif" },
    noto: { label: 'Noto Sans (SillyTavern default)', value: "'Noto Sans', sans-serif" },
    serif: { label: 'Georgia (serif)', value: "Georgia, 'Times New Roman', serif" },
};

// Each colour maps to a CSS variable in style.css; every other shade and glow is mixed from these
// (and RPG Companion's Forge panel follows them too).
const COLORS = {
    ember: { label: 'Accent (ember)', variable: '--forge-ember', value: '#E8622C' },
    brass: { label: 'Trim (brass)', variable: '--forge-brass', value: '#D9A35B' },
    crimson: { label: 'Character edge (crimson)', variable: '--forge-crimson', value: '#A61E1A' },
    text: { label: 'Text', variable: '--forge-text', value: '#F1E3D6' },
    card: { label: 'Panels and messages', variable: '--forge-card', value: '#1E100D' },
    bg: { label: 'Page background', variable: '--forge-bg', value: '#120908' },
    danger: { label: 'Danger (delete buttons, warnings)', variable: '--forge-danger', value: '#E5432F' },
};

// Built-in palettes for the seven colours above. Saved palettes live in settings.savedPalettes.
const PALETTES = {
    ember: { label: 'Ember (Forge default)', colors: Object.fromEntries(Object.entries(COLORS).map(([key, c]) => [key, c.value])) },
    frost: { label: 'Frost', colors: { ember: '#5AB4E8', brass: '#C9D6E3', crimson: '#2F6FA8', text: '#E6EEF5', card: '#121A24', bg: '#0A1018', danger: '#E5533F' } },
    night: { label: 'Night', colors: { ember: '#A27BE8', brass: '#C9B27A', crimson: '#5B2A8C', text: '#ECE4F5', card: '#1A1426', bg: '#0F0B17', danger: '#E5533F' } },
    verdant: { label: 'Verdant', colors: { ember: '#6CC46A', brass: '#D2B26A', crimson: '#2F6B3A', text: '#E8EFE2', card: '#131C14', bg: '#0B110C', danger: '#E5533F' } },
};

// What "Export look" writes and "Import look" accepts (on/off switches and backups stay per device).
const LOOK_FORMAT = 'arcane-forge-ui-look';
const HEX = /^#[0-9a-f]{6}$/i;

const defaults = {
    enabled: true,
    aiLayout: true,
    userLayout: true,
    extCards: true,
    icons: true,
    swipesRight: true,
    aiHelp: false,
    aiDescriptions: true,
    aiLabelFont: 'heading',
    fontSize: 17,
    chatScale: 110,
    panelOpacity: 88,
    panelBlur: 0,
    focusRing: true,
    savedPalettes: {},
    headingFont: 'cinzel',
    bodyFont: 'alegreya',
    colors: Object.fromEntries(Object.entries(COLORS).map(([key, c]) => [key, c.value])),
};

// Fills in missing keys in place, so handlers holding this object keep writing to the saved one.
function settings() {
    const current = extension_settings[MODULE] ??= {};
    for (const [key, value] of Object.entries(defaults)) {
        if (current[key] === undefined) current[key] = structuredClone(value);
    }
    for (const [key, value] of Object.entries(defaults.colors)) {
        if (!current.colors[key]) current.colors[key] = value;
    }
    return current;
}

// Cinzel for headings and names, Alegreya Sans for body text (same pair as RPG Companion's Forge theme).
// Bundled in fonts/, so they work offline and nothing is fetched from Google.
function loadFonts() {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = new URL('./fonts/fonts.css', import.meta.url).href;
    document.head.appendChild(link);
}

function apply() {
    const s = settings();
    const body = document.body;
    if (s.enabled) loadFonts();
    body.classList.toggle('forge-ui', s.enabled);
    body.classList.toggle('forge-no-focus-ring', !s.focusRing);
    body.classList.toggle('forge-user-layout', s.userLayout);
    body.classList.toggle('forge-ext-cards', s.extCards);
    body.classList.toggle('forge-icons', s.icons !== false);
    body.classList.toggle('forge-swipes-right', s.swipesRight !== false);

    body.style.setProperty('--forge-font-px', `${s.fontSize}px`);
    body.style.setProperty('--forge-chat-scale', String(s.chatScale / 100));
    body.style.setProperty('--forge-panel-alpha', `${s.panelOpacity}%`);
    body.style.setProperty('--forge-panel-blur', `${s.panelBlur}px`);
    body.style.setProperty('--forge-heading', (HEADING_FONTS[s.headingFont] ?? HEADING_FONTS.cinzel).value);
    body.style.setProperty('--forge-body-font', (BODY_FONTS[s.bodyFont] ?? BODY_FONTS.alegreya).value);
    for (const [key, c] of Object.entries(COLORS)) {
        body.style.setProperty(c.variable, s.colors[key]);
    }
    applyAiLayout();
}

// The Forge ledger AI tab only covers Chat Completion; other APIs keep SillyTavern's layout.
function applyAiLayout() {
    const s = settings();
    const wanted = s.enabled && s.aiLayout && $('#main_api').val() === 'openai';
    document.body.classList.toggle('forge-ai-hide-help', !s.aiHelp);
    document.body.classList.toggle('forge-ai-hide-desc', !s.aiDescriptions);
    document.body.classList.toggle('forge-ai-body-labels', s.aiLabelFont === 'body');
    if (wanted) buildAiTab();
    else restoreAiTab();
}

function save() {
    saveSettingsDebounced();
    apply();
}

function options(map, selected) {
    return Object.entries(map)
        .map(([key, f]) => `<option value="${key}"${key === selected ? ' selected' : ''}>${f.label}</option>`)
        .join('');
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function validColors(colors) {
    if (!colors || typeof colors !== 'object') return null;
    const out = {};
    for (const key of Object.keys(COLORS)) {
        if (HEX.test(colors[key] ?? '')) out[key] = colors[key];
    }
    return Object.keys(out).length ? out : null;
}

function exportLook() {
    const s = settings();
    const look = {
        fontSize: s.fontSize, chatScale: s.chatScale, panelOpacity: s.panelOpacity, panelBlur: s.panelBlur,
        headingFont: s.headingFont, bodyFont: s.bodyFont, aiLabelFont: s.aiLabelFont, aiDescriptions: s.aiDescriptions,
        aiHelp: s.aiHelp, focusRing: s.focusRing, colors: s.colors, savedPalettes: s.savedPalettes,
    };
    download(JSON.stringify({ format: LOOK_FORMAT, version: 1, look }, null, 4), 'arcane-forge-ui-look.json', 'application/json');
}

// Copies only known keys with sane values, so a hand-edited or foreign file can't break the settings.
function importLook(text) {
    let look;
    try {
        const data = JSON.parse(text);
        if (data?.format !== LOOK_FORMAT || typeof data.look !== 'object') throw new Error('not a look file');
        look = data.look;
    } catch {
        toastr.error('That file is not an Arcane Forge UI look.');
        return;
    }
    const s = settings();
    const clamp = (value, min, max) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined);
    const numbers = { fontSize: [13, 24], chatScale: [80, 150], panelOpacity: [50, 100], panelBlur: [0, 24] };
    for (const [key, [min, max]] of Object.entries(numbers)) {
        const value = clamp(Number(look[key]), min, max);
        if (value !== undefined) s[key] = value;
    }
    if (HEADING_FONTS[look.headingFont]) s.headingFont = look.headingFont;
    if (BODY_FONTS[look.bodyFont]) s.bodyFont = look.bodyFont;
    if (['heading', 'body'].includes(look.aiLabelFont)) s.aiLabelFont = look.aiLabelFont;
    for (const key of ['aiDescriptions', 'aiHelp', 'focusRing']) {
        if (typeof look[key] === 'boolean') s[key] = look[key];
    }
    Object.assign(s.colors, validColors(look.colors) ?? {});
    if (look.savedPalettes && typeof look.savedPalettes === 'object') {
        for (const [name, colors] of Object.entries(look.savedPalettes)) {
            const valid = validColors(colors);
            if (valid && name.trim()) s.savedPalettes[name.trim().slice(0, 40)] = valid;
        }
    }
    save();
    mountSettings();
    toastr.success('Look imported.');
}

function renderSettings() {
    const s = settings();
    const savedNames = Object.keys(s.savedPalettes).sort((a, b) => a.localeCompare(b));
    const colorRows = Object.entries(COLORS).map(([key, c]) => `
        <label class="forge-ui-color-row">
            <input type="color" data-color="${key}" value="${s.colors[key]}">
            <span>${c.label}</span>
        </label>`).join('');

    return `
    <div class="arcane-forge-ui-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Arcane Forge UI</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label" for="arcane-forge-ui-enabled">
                    <input type="checkbox" id="arcane-forge-ui-enabled"${s.enabled ? ' checked' : ''}>
                    <span>Use the Arcane Forge look across the whole app</span>
                </label>
                <label class="checkbox_label" for="forge-ui-ai-layout">
                    <input type="checkbox" id="forge-ui-ai-layout"${s.aiLayout ? ' checked' : ''}>
                    <span>Forge layout for the AI Response tab (Chat Completion)</span>
                </label>
                <label class="checkbox_label" for="forge-ui-user-layout">
                    <input type="checkbox" id="forge-ui-user-layout"${s.userLayout ? ' checked' : ''}>
                    <span>Forge layout for User Settings (cards, switches, roomier rows)</span>
                </label>
                <label class="checkbox_label" for="forge-ui-ext-cards">
                    <input type="checkbox" id="forge-ui-ext-cards"${s.extCards ? ' checked' : ''}>
                    <span>Forge cards for the Extensions drawer (flat cards, turning arrows)</span>
                </label>
                <label class="checkbox_label" for="forge-ui-icons">
                    <input type="checkbox" id="forge-ui-icons"${s.icons !== false ? ' checked' : ''}>
                    <span>Forge icons for the message box (menu, wand, send)</span>
                </label>
                <label class="checkbox_label" for="forge-ui-swipes-right">
                    <input type="checkbox" id="forge-ui-swipes-right"${s.swipesRight !== false ? ' checked' : ''}>
                    <span>Both swipe arrows on the right of the message</span>
                </label>
                <label class="checkbox_label" for="forge-ui-ai-help">
                    <input type="checkbox" id="forge-ui-ai-help"${s.aiHelp ? ' checked' : ''}>
                    <span>Show SillyTavern's help text under AI settings</span>
                </label>
                <label class="checkbox_label" for="forge-ui-ai-desc">
                    <input type="checkbox" id="forge-ui-ai-desc"${s.aiDescriptions ? ' checked' : ''}>
                    <span>Short description under each sampler</span>
                </label>
                <label class="forge-ui-select">
                    <span>AI setting names</span>
                    <select id="forge-ui-ai-label-font" class="text_pole">
                        <option value="heading"${s.aiLabelFont === 'heading' ? ' selected' : ''}>Heading font (matches card titles)</option>
                        <option value="body"${s.aiLabelFont === 'body' ? ' selected' : ''}>Body font</option>
                    </select>
                </label>

                <h4>Text</h4>
                <label class="forge-ui-range">
                    <span>Text size <output id="forge-ui-font-size-value">${s.fontSize}px</output></span>
                    <input type="range" id="forge-ui-font-size" min="13" max="24" step="1" value="${s.fontSize}">
                </label>
                <label class="forge-ui-range">
                    <span>Chat text <output id="forge-ui-chat-scale-value">${s.chatScale}%</output></span>
                    <input type="range" id="forge-ui-chat-scale" min="80" max="150" step="5" value="${s.chatScale}">
                </label>
                <label class="forge-ui-select">
                    <span>Heading font</span>
                    <select id="forge-ui-heading-font" class="text_pole">${options(HEADING_FONTS, s.headingFont)}</select>
                </label>
                <label class="forge-ui-select">
                    <span>Body font</span>
                    <select id="forge-ui-body-font" class="text_pole">${options(BODY_FONTS, s.bodyFont)}</select>
                </label>

                <h4>Panels</h4>
                <label class="forge-ui-range">
                    <span>Panel opacity <output id="forge-ui-panel-opacity-value">${s.panelOpacity}%</output></span>
                    <input type="range" id="forge-ui-panel-opacity" min="50" max="100" step="2" value="${s.panelOpacity}">
                </label>
                <label class="forge-ui-range">
                    <span>Panel blur <output id="forge-ui-panel-blur-value">${s.panelBlur}px</output></span>
                    <input type="range" id="forge-ui-panel-blur" min="0" max="24" step="1" value="${s.panelBlur}">
                </label>

                <h4>Keyboard</h4>
                <label class="checkbox_label" for="forge-ui-focus-ring">
                    <input type="checkbox" id="forge-ui-focus-ring"${s.focusRing ? ' checked' : ''}>
                    <span>Ember ring around the control you reach with Tab (mouse clicks don't show it)</span>
                </label>

                <h4>Colours</h4>
                <div class="forge-ui-palette-row">
                    <select id="forge-ui-palette" class="text_pole" aria-label="Palette">
                        <option value="">Choose a palette…</option>
                        <optgroup label="Built in">${Object.entries(PALETTES).map(([key, p]) => `<option value="builtin:${key}">${p.label}</option>`).join('')}</optgroup>
                        ${savedNames.length ? `<optgroup label="Saved">${savedNames.map((name) => `<option value="saved:${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</optgroup>` : ''}
                    </select>
                    <div class="menu_button" id="forge-ui-palette-save" title="Save the current colours as a palette">Save</div>
                    <div class="menu_button" id="forge-ui-palette-delete" title="Delete the chosen saved palette">Delete</div>
                </div>
                <div class="forge-ui-colors">${colorRows}</div>

                <h4>Share</h4>
                <div class="forge-ui-share-row">
                    <div class="menu_button" id="forge-ui-export" title="Save colours, fonts, sizes, panels and saved palettes to a file">Export look</div>
                    <div class="menu_button" id="forge-ui-import" title="Load a look file exported from Arcane Forge UI">Import look</div>
                    <input type="file" id="forge-ui-import-file" accept=".json,application/json" hidden>
                </div>

                <div class="menu_button" id="forge-ui-reset">Reset to Forge defaults</div>
                <small>Text size multiplies with SillyTavern's own Font Scale in User Settings.</small>
            </div>
        </div>
    </div>`;
}

function bindSettings($root) {
    const s = settings();
    $root.find('#arcane-forge-ui-enabled').on('change', function () {
        s.enabled = this.checked;
        save();
    });
    $root.find('#forge-ui-ai-layout').on('change', function () {
        s.aiLayout = this.checked;
        save();
    });
    $root.find('#forge-ui-user-layout').on('change', function () {
        s.userLayout = this.checked;
        save();
    });
    $root.find('#forge-ui-ext-cards').on('change', function () {
        s.extCards = this.checked;
        save();
    });
    $root.find('#forge-ui-icons').on('change', function () {
        s.icons = this.checked;
        save();
    });
    $root.find('#forge-ui-swipes-right').on('change', function () {
        s.swipesRight = this.checked;
        save();
    });
    $root.find('#forge-ui-ai-help').on('change', function () {
        s.aiHelp = this.checked;
        save();
    });
    $root.find('#forge-ui-ai-desc').on('change', function () {
        s.aiDescriptions = this.checked;
        save();
    });
    $root.find('#forge-ui-ai-label-font').on('change', function () {
        s.aiLabelFont = this.value;
        save();
    });
    $root.find('#forge-ui-font-size').on('input', function () {
        s.fontSize = Number(this.value);
        $root.find('#forge-ui-font-size-value').text(`${s.fontSize}px`);
        save();
    });
    $root.find('#forge-ui-chat-scale').on('input', function () {
        s.chatScale = Number(this.value);
        $root.find('#forge-ui-chat-scale-value').text(`${s.chatScale}%`);
        save();
    });
    $root.find('#forge-ui-panel-opacity').on('input', function () {
        s.panelOpacity = Number(this.value);
        $root.find('#forge-ui-panel-opacity-value').text(`${s.panelOpacity}%`);
        save();
    });
    $root.find('#forge-ui-panel-blur').on('input', function () {
        s.panelBlur = Number(this.value);
        $root.find('#forge-ui-panel-blur-value').text(`${s.panelBlur}px`);
        save();
    });
    $root.find('#forge-ui-focus-ring').on('change', function () {
        s.focusRing = this.checked;
        save();
    });
    $root.find('#forge-ui-heading-font').on('change', function () {
        s.headingFont = this.value;
        save();
    });
    $root.find('#forge-ui-body-font').on('change', function () {
        s.bodyFont = this.value;
        save();
    });
    $root.find('input[data-color]').on('input', function () {
        s.colors[this.dataset.color] = this.value;
        save();
    });
    $root.find('#forge-ui-palette').on('change', function () {
        const [kind, name] = [this.value.slice(0, this.value.indexOf(':')), this.value.slice(this.value.indexOf(':') + 1)];
        const colors = kind === 'builtin' ? PALETTES[name]?.colors : kind === 'saved' ? s.savedPalettes[name] : null;
        if (!colors) return;
        Object.assign(s.colors, colors);
        save();
        mountSettings();
        $('#forge-ui-palette').val(this.value);
    });
    $root.find('#forge-ui-palette-save').on('click', async () => {
        const { callGenericPopup, POPUP_TYPE } = SillyTavern.getContext();
        const name = await callGenericPopup('Name for this palette:', POPUP_TYPE.INPUT, '');
        if (typeof name !== 'string' || !name.trim()) return;
        const key = name.trim().slice(0, 40);
        s.savedPalettes[key] = { ...s.colors };
        save();
        mountSettings();
        $('#forge-ui-palette').val(`saved:${key}`);
    });
    $root.find('#forge-ui-palette-delete').on('click', () => {
        const value = String($root.find('#forge-ui-palette').val() ?? '');
        if (!value.startsWith('saved:')) {
            toastr.info('Choose one of your saved palettes first.');
            return;
        }
        delete s.savedPalettes[value.slice(6)];
        save();
        mountSettings();
    });
    $root.find('#forge-ui-export').on('click', exportLook);
    $root.find('#forge-ui-import').on('click', () => $root.find('#forge-ui-import-file').trigger('click'));
    $root.find('#forge-ui-import-file').on('change', async function () {
        const file = this.files?.[0];
        this.value = '';
        if (file) importLook(await file.text());
    });
    $root.find('#forge-ui-reset').on('click', () => {
        extension_settings[MODULE] = structuredClone({ ...defaults, enabled: s.enabled, aiLayout: s.aiLayout, userLayout: s.userLayout, extCards: s.extCards, icons: s.icons, swipesRight: s.swipesRight, aiHelp: s.aiHelp, aiDescriptions: s.aiDescriptions, omitParamsBackup: s.omitParamsBackup ?? {}, savedPalettes: s.savedPalettes ?? {} });
        save();
        mountSettings();
    });
}

function mountSettings() {
    const wasOpen = $('.arcane-forge-ui-settings .inline-drawer-content').is(':visible');
    $('.arcane-forge-ui-settings').remove();
    const $root = $(renderSettings());
    $('#extensions_settings2').append($root);
    if (wasOpen) {
        $root.find('.inline-drawer-content').show();
        $root.find('.inline-drawer-icon').removeClass('down fa-circle-chevron-down').addClass('up fa-circle-chevron-up');
    }
    bindSettings($root);
}

jQuery(() => {
    mountSettings();
    apply();
    $('#main_api').on('change', applyAiLayout);
    for (const name of ['CHATCOMPLETION_SOURCE_CHANGED', 'CHATCOMPLETION_MODEL_CHANGED', 'SETTINGS_LOADED']) {
        if (event_types[name]) eventSource.on(event_types[name], refreshModelLine);
    }
    // TauriTavern sets the API after extensions start, so check again once settings and the app are ready.
    for (const name of ['SETTINGS_LOADED', 'SETTINGS_LOADED_AFTER', 'APP_READY']) {
        if (event_types[name]) eventSource.on(event_types[name], applyAiLayout);
    }
    // A newly loaded preset may carry TauriTavern's "leave out" list again (cleared and backed up with
    // the Forge layout on, or given back from the backup with it off).
    for (const name of ['OAI_PRESET_CHANGED_AFTER', 'SETTINGS_LOADED_AFTER']) {
        if (event_types[name]) {
            eventSource.on(event_types[name], clearOmittedParams);
            eventSource.on(event_types[name], restoreOmittedParams);
        }
    }
});
