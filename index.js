import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '../../../../script.js';
import { buildAiTab, restoreAiTab, refreshModelLine, clearOmittedParams } from './aiTab.js';

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

// Each colour maps to a CSS variable in style.css; every shade and glow is mixed from these.
const COLORS = {
    ember: { label: 'Accent (ember)', variable: '--forge-ember', value: '#E8622C' },
    brass: { label: 'Trim (brass)', variable: '--forge-brass', value: '#D9A35B' },
    crimson: { label: 'Character edge (crimson)', variable: '--forge-crimson', value: '#A61E1A' },
    text: { label: 'Text', variable: '--forge-text', value: '#F1E3D6' },
    card: { label: 'Panels and messages', variable: '--forge-card', value: '#1E100D' },
    bg: { label: 'Page background', variable: '--forge-bg', value: '#120908' },
};

const defaults = {
    enabled: true,
    aiLayout: true,
    aiHelp: false,
    aiDescriptions: true,
    aiLabelFont: 'heading',
    fontSize: 17,
    chatScale: 110,
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
function loadFonts() {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Alegreya+Sans:wght@400;500;700&display=swap';
    document.head.appendChild(link);
}

function apply() {
    const s = settings();
    const body = document.body;
    if (s.enabled) loadFonts();
    body.classList.toggle('forge-ui', s.enabled);

    body.style.setProperty('--forge-font-px', `${s.fontSize}px`);
    body.style.setProperty('--forge-chat-scale', String(s.chatScale / 100));
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

function renderSettings() {
    const s = settings();
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

                <h4>Colours</h4>
                <div class="forge-ui-colors">${colorRows}</div>

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
    $root.find('#forge-ui-reset').on('click', () => {
        extension_settings[MODULE] = structuredClone({ ...defaults, enabled: s.enabled, aiLayout: s.aiLayout, aiHelp: s.aiHelp, aiDescriptions: s.aiDescriptions });
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
    // A newly loaded preset may carry TauriTavern's "leave out" list again.
    for (const name of ['OAI_PRESET_CHANGED_AFTER', 'SETTINGS_LOADED_AFTER']) {
        if (event_types[name]) eventSource.on(event_types[name], clearOmittedParams);
    }
});
