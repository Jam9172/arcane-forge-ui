// The send modes (every screen size): Do, Say, Story and See, right above the message box, shaping what
// you type before it is sent. See docs/redesign/BIBLE.md, sections 5.3 and 6. Styles are in css/modes.css.
//
// index.js holds this module in its list of features and calls the functions below; it never needs editing
// for what the modes do. The contract (bible section 9):
//   defaults      merged into Arcane Forge UI's settings
//   lookKeys      the keys Export look writes and Import look accepts, with their types
//   settingsHtml  this feature's section of the settings screen ('' for none)
//   bindSettings  wires that section's controls; call save() after a change
//   apply         puts the page in the state the settings ask for. Called on load, after every settings
//                 change, when the window crosses 1000px, and on the arcane-forge-ui:apply event; safe to
//                 call any number of times, and the only place that adds or removes the modes.
//
// So far the bar only remembers which mode is picked; what is sent does not change yet.

// Where index.js keeps Arcane Forge UI's settings. A click on the bar reads them from here, so it always
// writes to the saved object (Reset replaces it).
const SETTINGS_KEY = 'arcaneForgeUi';
const SVG_NS = 'http://www.w3.org/2000/svg';

// The four modes, in the bar's order. Each icon is one path on a 24 by 24 grid (bible section 4).
const MODES = [
    { mode: 'do', label: 'Do', title: 'Do: what you do', prompt: 'What do you do?',
        icon: 'M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z' },
    { mode: 'say', label: 'Say', title: 'Say: what you say out loud', prompt: 'What do you say?',
        icon: 'M4.5 5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17h-1A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z' },
    { mode: 'story', label: 'Story', title: 'Story: what happens next, as narration', prompt: 'What happens next?',
        icon: 'M12 7c-1.8-1.4-4.5-2-8-2v13c3.5 0 6.2.6 8 2 1.8-1.4 4.5-2 8-2V5c-3.5 0-6.2.6-8 2z M12 7v13' },
    { mode: 'see', label: 'See', title: 'See: look at something', prompt: 'What do you look at?',
        icon: 'M2.5 12c2.2-4.3 5.4-6.5 9.5-6.5s7.3 2.2 9.5 6.5c-2.2 4.3-5.4 6.5-9.5 6.5S4.7 16.3 2.5 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z' },
];

export const id = 'modes';

export const defaults = { modes: false, modesActive: '' };

// Neither key travels in a look file (bible section 7)
export const lookKeys = {};

export function settingsHtml(s) {
    return `
                <h4>Message box</h4>
                <label class="checkbox_label" for="forge-ui-modes">
                    <input type="checkbox" id="forge-ui-modes"${s.modes ? ' checked' : ''}>
                    <span>Do, Say, Story and See buttons above the message box</span>
                </label>
`;
}

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-modes').on('change', function () {
        s.modes = this.checked;
        save();
    });
}

export function apply(s) {
    const active = Boolean(s.enabled && s.modes);
    document.body.classList.toggle('forge-modes', active);
    if (!active) {
        document.getElementById('forge-modes')?.remove();
        showPrompt('');
        return;
    }
    const form = document.getElementById('send_form');
    const items = document.getElementById('nonQRFormItems');
    if (!form || items?.parentElement !== form) return;
    const bar = document.getElementById('forge-modes') ?? buildBar();
    // Quick Reply and other extensions add their rows to the form too; ours goes back to being the one
    // right before the message box row, whichever was added last
    if (bar.parentElement !== form || bar.nextElementSibling !== items) form.insertBefore(bar, items);
    showSelected(bar, selectedMode(s));
}

// The saved mode, or '' when none is picked (or the saved value is not one of the four)
function selectedMode(s) {
    return MODES.some((m) => m.mode === s.modesActive) ? s.modesActive : '';
}

function buildBar() {
    const bar = document.createElement('div');
    bar.id = 'forge-modes';
    bar.setAttribute('role', 'radiogroup');
    bar.setAttribute('aria-label', 'How to send');
    for (const m of MODES) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'forge-modes-button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', 'false');
        button.dataset.mode = m.mode;
        button.title = m.title;
        const label = document.createElement('span');
        label.className = 'forge-modes-label';
        label.textContent = m.label;
        button.append(icon(m.icon), label);
        bar.append(button);
    }
    // The listeners live on the bar, so they go when it goes
    bar.addEventListener('click', onClick);
    bar.addEventListener('keydown', onKeydown);
    return bar;
}

// A line icon (bible section 4); its size and strokes are set in css/modes.css
function icon(path) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'forge-modes-icon');
    const shape = document.createElementNS(SVG_NS, 'path');
    shape.setAttribute('d', path);
    svg.append(shape);
    return svg;
}

// Picking a mode selects it; picking the selected one clears it (bible A2). Saved, so it survives a reload.
function onClick(event) {
    const button = event.target instanceof Element ? event.target.closest('.forge-modes-button') : null;
    if (!button) return;
    const { extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();
    const s = extensionSettings[SETTINGS_KEY];
    s.modesActive = s.modesActive === button.dataset.mode ? '' : button.dataset.mode;
    saveSettingsDebounced();
    showSelected(event.currentTarget, selectedMode(s));
}

// Left and Right move between the buttons (round the ends); Space and Enter are the buttons' own click.
// The keys stop here: SillyTavern's own Left and Right swipe the last message when nothing is being typed.
function onKeydown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const buttons = [...event.currentTarget.querySelectorAll('.forge-modes-button')];
    const at = buttons.indexOf(document.activeElement);
    if (at < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    buttons[(at + step + buttons.length) % buttons.length].focus();
}

// One radio group, one Tab stop: the selected button, or Do when none is
function showSelected(bar, mode) {
    const buttons = [...bar.querySelectorAll('.forge-modes-button')];
    for (const button of buttons) {
        const on = button.dataset.mode === mode;
        button.setAttribute('aria-checked', String(on));
        button.tabIndex = (mode ? on : button === buttons[0]) ? 0 : -1;
    }
    showPrompt(mode);
}

// The message box's placeholder while a mode is picked (bible section 5.3). SillyTavern writes its own
// placeholder when the connection comes or goes, so while ours shows, a watch on that one attribute keeps
// what SillyTavern wrote last (to give back) and puts ours back. With no mode, SillyTavern's is restored.
let shownPrompt = '';
let nativePlaceholder = null;
let placeholderWatch = null;

function showPrompt(mode) {
    const textarea = document.getElementById('send_textarea');
    const prompt = MODES.find((m) => m.mode === mode)?.prompt ?? '';
    if (prompt && textarea) {
        if (!shownPrompt) nativePlaceholder = textarea.getAttribute('placeholder');
        shownPrompt = prompt;
        if (textarea.getAttribute('placeholder') !== prompt) textarea.setAttribute('placeholder', prompt);
        if (!placeholderWatch) {
            placeholderWatch = new MutationObserver(keepPrompt);
            placeholderWatch.observe(textarea, { attributes: true, attributeFilter: ['placeholder'] });
        }
        return;
    }
    placeholderWatch?.disconnect();
    placeholderWatch = null;
    if (shownPrompt && textarea?.getAttribute('placeholder') === shownPrompt) {
        if (nativePlaceholder === null) textarea.removeAttribute('placeholder');
        else textarea.setAttribute('placeholder', nativePlaceholder);
    }
    shownPrompt = '';
    nativePlaceholder = null;
}

function keepPrompt() {
    const textarea = document.getElementById('send_textarea');
    if (!textarea || !shownPrompt) return;
    const now = textarea.getAttribute('placeholder');
    if (now === shownPrompt) return;
    nativePlaceholder = now;
    textarea.setAttribute('placeholder', shownPrompt);
}
