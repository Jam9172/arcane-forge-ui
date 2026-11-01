import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const MODULE = 'arcaneForgeUi';
const FONT_LINK_ID = 'arcane-forge-ui-fonts';
const defaults = { enabled: true };

function settings() {
    extension_settings[MODULE] = Object.assign({}, defaults, extension_settings[MODULE]);
    return extension_settings[MODULE];
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
    const on = settings().enabled;
    if (on) loadFonts();
    document.body.classList.toggle('forge-ui', on);
}

function addSettingsPanel() {
    const html = `
    <div class="arcane-forge-ui-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Arcane Forge UI</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label" for="arcane-forge-ui-enabled">
                    <input type="checkbox" id="arcane-forge-ui-enabled">
                    <span>Use the Arcane Forge look across the whole app</span>
                </label>
                <small>Turn off to go back to your normal SillyTavern theme.</small>
            </div>
        </div>
    </div>`;
    $('#extensions_settings2').append(html);
    $('#arcane-forge-ui-enabled')
        .prop('checked', settings().enabled)
        .on('change', function () {
            settings().enabled = this.checked;
            saveSettingsDebounced();
            apply();
        });
}

jQuery(() => {
    addSettingsPanel();
    apply();
});
