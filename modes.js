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
// Do, Say and See rewrite what you type (transform below) just before SillyTavern sends it. Story goes in as
// narration and See can ask Image Generation for a picture instead; those two stop SillyTavern's send and do
// their own (tellStory and askForPicture).
import * as script from '../../../../script.js';

// Where index.js keeps Arcane Forge UI's settings. A click on the bar and a send read them from here, so they
// always use the saved object (Reset replaces it).
const SETTINGS_KEY = 'arcaneForgeUi';
const SVG_NS = 'http://www.w3.org/2000/svg';
// SillyTavern's own phone boundary (bible section 8)
const PHONE = '(max-width: 1000px)';

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

// The wording each mode puts round what you type (bible section 6, "Templates"), and the owner's own
// wording, which replaces it for both voices
const INPUT = '{{input}}';
const TEMPLATES = {
    second: { do: 'You {{input}}', say: 'You say, "{{input}}"', see: 'You look at {{input}}' },
    first: { do: 'I {{input}}', say: 'I say, "{{input}}"', see: 'I look at {{input}}' },
};
const TEMPLATE_KEYS = ['do', 'say', 'see'];
const TEMPLATE_MAX = 200;
// A text ending in one of these gets no full stop (tidy rule 2)
const END_MARKS = ['.', '!', '?', '…', '"', "'", '”', '’', '*', ')', ']', '~'];
// The quote pairs Say takes off a text wrapped in them (tidy rule 4)
const QUOTE_PAIRS = [['"', '"'], ['“', '”'], ["'", "'"]];
// "you" or "I" as a whole word at the start (so "I'm" counts, "Isla" and "your" do not)
const STARTS_WITH_SELF = /^(?:you|i)(?![\p{L}\p{N}_])/iu;
const STARTS_WITH_SELF_SAY = /^(?:you|i)\s+say(?![\p{L}\p{N}_])/iu;

const VOICES = { second: 'You …', first: 'I …' };
// How Story and See go in (bible section 7), with the words the settings show for each
const STORY_AS = { narration: 'narration', message: 'my own message' };
const SEE_AS = { describe: 'a description', picture: 'a picture' };
// See with nothing typed (bible section 6, "What each mode sends")
const LOOK_AROUND = { second: 'You look around.', first: 'I look around.' };
const NO_IMAGE_GENERATION = 'See needs SillyTavern\'s Image Generation. Sending a description request instead.';
// The warning when a Story's reply cannot start, in the manner of /trigger's own
const NO_REPLY = 'Story was added, but its reply could not start while another reply is being generated.';
// How long a Story's reply waits for another reply to finish, and how often it looks (as /trigger does)
const REPLY_WAIT = 10000;
const REPLY_LOOK = 100;

export const id = 'modes';

export const defaults = {
    modes: false,
    modesActive: '',
    modesVoice: 'second',
    modesTidy: true,
    modesStoryAs: 'narration',
    modesSeeAs: 'describe',
    modesTemplates: { do: '', say: '', see: '' },
};

// Bible section 7: the voice, the tidying, how Story and See go in, and the wording travel in a look file;
// the switch and the picked mode do not
export const lookKeys = {
    modesVoice: { type: 'enum', values: Object.keys(VOICES) },
    modesTidy: { type: 'boolean' },
    modesStoryAs: { type: 'enum', values: Object.keys(STORY_AS) },
    modesSeeAs: { type: 'enum', values: Object.keys(SEE_AS) },
    modesTemplates: { type: 'strings', keys: TEMPLATE_KEYS, max: TEMPLATE_MAX },
};

// The voice, tidy and wording controls only matter with the modes on, so they are greyed out (disabled)
// while the modes are off. What a text field holds and shows is set in bindSettings, not written into
// this HTML, so nothing the owner typed is ever read as markup.
export function settingsHtml(s) {
    const off = s.modes ? '' : ' disabled';
    const voices = options(VOICES, voiceOf(s));
    const fields = TEMPLATE_KEYS.map((key) => `
                    <label class="forge-ui-select">
                        <span>${MODES.find((m) => m.mode === key).label}</span>
                        <input type="text" id="forge-ui-modes-template-${key}" class="text_pole forge-ui-modes-option forge-ui-modes-template" data-template="${key}" maxlength="${TEMPLATE_MAX}" autocomplete="off"${off}>
                    </label>`).join('');
    return `
                <h4>Message box</h4>
                <label class="checkbox_label" for="forge-ui-modes">
                    <input type="checkbox" id="forge-ui-modes"${s.modes ? ' checked' : ''}>
                    <span>Do, Say, Story and See buttons above the message box</span>
                </label>
                <label class="forge-ui-select">
                    <span>Write my actions as</span>
                    <select id="forge-ui-modes-voice" class="text_pole forge-ui-modes-option"${off}>${voices}</select>
                </label>
                <label class="checkbox_label" for="forge-ui-modes-tidy">
                    <input type="checkbox" id="forge-ui-modes-tidy" class="forge-ui-modes-option"${s.modesTidy !== false ? ' checked' : ''}${off}>
                    <span>Tidy what I type (first letter, full stop, quotes)</span>
                </label>
                <label class="forge-ui-select">
                    <span>Story goes in as</span>
                    <select id="forge-ui-modes-story-as" class="text_pole forge-ui-modes-option"${off}>${options(STORY_AS, storyAs(s))}</select>
                </label>
                <label class="forge-ui-select">
                    <span>See asks for</span>
                    <select id="forge-ui-modes-see-as" class="text_pole forge-ui-modes-option"${off}>${options(SEE_AS, seeAs(s))}</select>
                </label>
                <details id="forge-ui-modes-wording">
                    <summary>Advanced: my own wording</summary>${fields}
                    <small>{{input}} is what you typed (tidied, when tidying is on). Leave a box empty to use the wording shown in it. A wording without {{input}} is ignored, and the one shown is used instead.</small>
                </details>
`;
}

// A select's options, from a { value: label } list (our own fixed words, never anything typed)
function options(list, selected) {
    return Object.entries(list)
        .map(([key, label]) => `<option value="${key}"${key === selected ? ' selected' : ''}>${label}</option>`)
        .join('');
}

export function bindSettings($root, s, save) {
    $root.find('#forge-ui-modes').on('change', function () {
        s.modes = this.checked;
        $root.find('.forge-ui-modes-option').prop('disabled', !s.modes);
        save();
    });
    $root.find('#forge-ui-modes-voice').on('change', function () {
        s.modesVoice = Object.hasOwn(VOICES, this.value) ? this.value : defaults.modesVoice;
        showTemplateHints($root, s);
        save();
    });
    $root.find('#forge-ui-modes-tidy').on('change', function () {
        s.modesTidy = this.checked;
        save();
    });
    $root.find('#forge-ui-modes-story-as').on('change', function () {
        s.modesStoryAs = Object.hasOwn(STORY_AS, this.value) ? this.value : defaults.modesStoryAs;
        save();
    });
    $root.find('#forge-ui-modes-see-as').on('change', function () {
        s.modesSeeAs = Object.hasOwn(SEE_AS, this.value) ? this.value : defaults.modesSeeAs;
        save();
    });
    $root.find('.forge-ui-modes-template').each(function () {
        const own = ownTemplates(s)[this.dataset.template];
        this.value = typeof own === 'string' ? own : '';
    }).on('input', function () {
        s.modesTemplates = { ...ownTemplates(s), [this.dataset.template]: this.value.slice(0, TEMPLATE_MAX) };
        save();
    });
    showTemplateHints($root, s);
}

// Each wording field shows the wording it replaces, in the voice that is chosen
function showTemplateHints($root, s) {
    $root.find('.forge-ui-modes-template').each(function () {
        this.placeholder = TEMPLATES[voiceOf(s)][this.dataset.template];
    });
}

export function apply(s) {
    const active = Boolean(s.enabled && s.modes);
    document.body.classList.toggle('forge-modes', active);
    listen(active);
    if (!active) {
        document.getElementById('forge-modes')?.remove();
        showPrompt('');
        lastRewrite = '';
        holding = null;
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

function voiceOf(s) {
    return s?.modesVoice === 'first' ? 'first' : 'second';
}

function storyAs(s) {
    return s?.modesStoryAs === 'message' ? 'message' : 'narration';
}

function seeAs(s) {
    return s?.modesSeeAs === 'picture' ? 'picture' : 'describe';
}

// The owner's wording; an older or hand-edited settings file may hold something else there
function ownTemplates(s) {
    const own = s?.modesTemplates;
    return own && typeof own === 'object' && !Array.isArray(own) ? own : {};
}

// ---------- What is sent (bible section 6) ----------

/**
 * The text to send for what was typed, with the given mode picked: the tidy rules and templates of bible
 * section 6. Story is only trimmed (it has no wording); See with nothing typed looks around. How Story and
 * See go in (narration, a picture) is decided where the send is caught, not here. Any other mode comes back
 * unchanged.
 * @param {string} text what is in the message box
 * @param {string} mode 'do', 'say', 'story' or 'see'
 * @param {{modesVoice?: string, modesTidy?: boolean, modesTemplates?: object}} [s] the settings to use
 * @returns {string}
 */
export function transform(text, mode, s = {}) {
    if (typeof text !== 'string') return text;
    // Rule 5: Story gets rule 1 only (and with tidy off, nothing: it has no template)
    if (mode === 'story') return s?.modesTidy === false ? text : text.trim();
    if (mode !== 'do' && mode !== 'say' && mode !== 'see') return text;
    // See is the one mode that acts on an empty box. The sentence is all ours, so it is the same with tidy
    // off, and the owner's See wording (which needs something typed for {{input}}) is not used.
    if (mode === 'see' && !text.trim()) return LOOK_AROUND[voiceOf(s)];
    const template = templateFor(mode, s);
    // Tidy off: the template and nothing else
    if (s?.modesTidy === false) return fill(template, text);
    // Rule 1: trim the ends; line breaks inside stay
    const typed = text.trim();
    if (!typed) return text;
    if (mode === 'do' || mode === 'see') {
        // Rule 3: already "you …" or "I …", so no You or I goes in front
        if (STARTS_WITH_SELF.test(typed)) return endMark(upperFirst(typed));
        return fill(template, endMark(startsWithCapitals(typed) ? typed : lowerFirst(typed)));
    }
    // Rule 4: "you say …" and "I say …" are left as typed, apart from rules 1 and 2
    if (STARTS_WITH_SELF_SAY.test(typed)) return endMark(typed);
    // The end mark goes on the words, so it lands inside the template's quotes
    return fill(template, endMark(upperFirst(unquote(typed))));
}

// The owner's wording for this mode if it has a place for the text, else the default in the chosen voice.
// Wording without {{input}} would throw away what was typed, so it is not used.
function templateFor(mode, s) {
    const own = ownTemplates(s)[mode];
    return typeof own === 'string' && own.includes(INPUT) ? own : TEMPLATES[voiceOf(s)][mode];
}

// split and join, so nothing in the text (such as "$&") is read as a replacement pattern
function fill(template, input) {
    return template.split(INPUT).join(input);
}

// Rule 2: a full stop, unless the text already ends in one of the end marks
function endMark(text) {
    return END_MARKS.includes(Array.from(text).pop()) ? text : `${text}.`;
}

// The first character, whole even when it is outside the basic plane
function firstChar(text) {
    return text ? String.fromCodePoint(text.codePointAt(0)) : '';
}

function upperFirst(text) {
    const first = firstChar(text);
    return first.toUpperCase() + text.slice(first.length);
}

function lowerFirst(text) {
    const first = firstChar(text);
    return first.toLowerCase() + text.slice(first.length);
}

function isCapital(char) {
    return char !== undefined && char !== char.toLowerCase() && char === char.toUpperCase();
}

// Rule 3's exception: "NASA badge out" keeps its capitals. (The rule's other exception, a first word "I",
// never gets here: such a text is caught by STARTS_WITH_SELF first.)
function startsWithCapitals(text) {
    const [first, second] = Array.from(text);
    return isCapital(first) && isCapital(second);
}

// Rule 4: one pair of quotes wrapped round the whole text comes off
function unquote(text) {
    for (const [open, close] of QUOTE_PAIRS) {
        if (text.length < open.length + close.length || !text.startsWith(open) || !text.endsWith(close)) continue;
        const inside = text.slice(open.length, text.length - close.length).trim();
        return inside || text;
    }
    return text;
}

// ---------- Catching the send (bible section 6) ----------

// The last text a rewrite produced. A send that did not go through (no connection, a swipe being edited)
// leaves it in the box; it is never rewritten again, so the wording cannot pile up.
let lastRewrite = '';

// SillyTavern's own "does Enter send?" (scripts/RossAscends-mods.js). Loaded without a static import, so a
// host without that file still gets the fallback: Enter sends unless the screen is a phone.
let shouldSendOnEnter = null;
import('../../../RossAscends-mods.js')
    .then((mods) => {
        if (typeof mods.shouldSendOnEnter === 'function') shouldSendOnEnter = mods.shouldSendOnEnter;
    })
    .catch(() => { /* the fallback in sendsOnEnter */ });

function sendsOnEnter() {
    if (shouldSendOnEnter) return Boolean(shouldSendOnEnter());
    return !window.matchMedia(PHONE).matches;
}

// SillyTavern's scripts/slash-commands.js: sendNarratorMessage (the code behind /sys) for Story, and the flag
// for commands typed in the box still running. Loaded the same way, so a host without it only loses Story as
// narration: Story is then sent as your own message.
let slashCommands = null;
import('../../../slash-commands.js')
    .then((module) => { slashCommands = module; })
    .catch(() => { /* Story goes in as your own message */ });

// SillyTavern's own test for "a reply is being written", with its older flag as a fallback
function generating() {
    return typeof script.isGenerating === 'function' ? Boolean(script.isGenerating()) : Boolean(script.is_send_press);
}

// SillyTavern's other reasons to refuse a send from the message box (sendTextareaMessage in script.js): a
// swipe under way, or commands typed in the box still running. Story and See as a picture send on their own,
// so they ask the same.
function refusesSend() {
    return (script.swipeState ?? 'none') !== 'none' || Boolean(slashCommands?.isExecutingCommandsFromChatInput);
}

// Both listeners sit on document in the capture phase, so they run before SillyTavern's own (its Enter
// handlers, scripts/keyboard.js's included, are on document and its click handler on #send_but). They hold
// no element: the message box and the send button are looked up from each event. On when the modes are
// active, off when not; adding or removing the same function twice does nothing, so apply() can call this
// every time.
function listen(on) {
    const method = on ? 'addEventListener' : 'removeEventListener';
    document[method]('keydown', onSendKey, true);
    document[method]('click', onSendClick, true);
}

// A key the person pressed (trusted) in the message box or on the send button. A key pressed by a script is
// left alone.
function onSendKey(event) {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    if (event.target.id === 'send_textarea') onBoxKey(event);
    else {
        const button = event.target.closest('#send_but');
        if (button) onSendButtonKey(event, button);
    }
}

// Enter in the message box, by SillyTavern's own rule. TauriTavern also ignores keyCode 229 (some WebKit
// versions send the key that ends an IME composition after compositionend); it is skipped here too, so the
// box is never rewritten by a key that does not send.
function onBoxKey(event) {
    if (event.key !== 'Enter') return;
    if (event.isComposing || event.keyCode === 229 || event.shiftKey || event.ctrlKey || event.altKey) return;
    if (!sendsOnEnter()) return;
    shapeMessage(event);
}

// Enter on the send button (Tab from the message box lands on it). SillyTavern's scripts/keyboard.js turns
// that key into a click() from code, which onSendClick cannot tell from a script's. So the box is shaped
// here, on the person's own key, just before; keyboard.js's own test decides (no Alt, Ctrl or Shift, and the
// button not .disabled), so it is shaped only when that click follows. Space is left as SillyTavern has it:
// the button gives it nothing.
function onSendButtonKey(event, button) {
    if (event.key !== 'Enter') return;
    if (event.altKey || event.ctrlKey || event.shiftKey || button.classList.contains('disabled')) return;
    shapeMessage(event);
}

// A click or tap on the send button. Quick Reply and other scripts click it from code (not trusted); what
// they send is never touched. The click keyboard.js makes for Enter is not trusted either; onSendButtonKey
// has shaped the box by then.
function onSendClick(event) {
    if (!event.isTrusted || !(event.target instanceof Element) || !event.target.closest('#send_but')) return;
    shapeMessage(event);
}

// Rewrites the message box for the picked mode, then lets the event carry on to SillyTavern, which sends
// what is now in the box. Story as narration and See as a picture take the send over instead (takeOver).
function shapeMessage(event) {
    const context = SillyTavern.getContext();
    const s = context.extensionSettings[SETTINGS_KEY];
    if (!s?.enabled || !s.modes) return;
    // A Story or a picture is still being worked on, and SillyTavern does not know: a second Enter or tap now,
    // on the emptied box, would send something of its own next to it (a reply, or "You look around." and a
    // reply). So it is held back, as SillyTavern holds sends back while commands typed in the box run.
    if (holding) {
        stopSend(event);
        return;
    }
    const mode = selectedMode(s);
    if (!mode || generating()) return;
    const textarea = document.getElementById('send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const text = textarea.value;
    const typed = text.trim();
    // Empty (See is the one mode that acts on an empty box), a command (SillyTavern's own test: the trimmed
    // text starts with "/"), or already rewritten
    if ((!typed && mode !== 'see') || typed.startsWith('/') || (lastRewrite && text === lastRewrite)) return;
    if (typed && takeOver(event, context, mode, s, text)) return;
    const shaped = transform(text, mode, s);
    if (shaped === text) return;
    setBox(textarea, shaped);
    lastRewrite = shaped;
}

// The input event lets SillyTavern (and TauriTavern) see the new text
function setBox(textarea, value) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// Story as narration and See as a picture do not send what is in the box: they stop SillyTavern's own send
// and do their own. Both need an open chat and a send SillyTavern would make; without them the send carries
// on as Story as your own message, or See as a description. Returns whether it took the send over.
function takeOver(event, context, mode, s, text) {
    if (mode === 'story' && storyAs(s) === 'narration') {
        if (typeof slashCommands?.sendNarratorMessage !== 'function' || !canSendHere(context)) return false;
        stopSend(event);
        tellStory(transform(text, 'story', s), text);
        return true;
    }
    if (mode === 'see' && seeAs(s) === 'picture') {
        if (!canSendHere(context)) return false;
        const imagine = context.SlashCommandParser?.commands?.imagine;
        if (typeof imagine?.callback !== 'function') {
            globalThis.toastr?.warning(NO_IMAGE_GENERATION);
            return false;
        }
        stopSend(event);
        askForPicture(imagine, text);
        return true;
    }
    return false;
}

function canSendHere(context) {
    return Boolean(context.getCurrentChatId?.()) && !refusesSend();
}

// Ours run first (capture, on document), so stopping here keeps the key or the click from SillyTavern's own
// handlers (and keyboard.js's click for Enter on the send button); Enter makes no new line either
function stopSend(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
}

// The Story or picture being worked on while shapeMessage holds other sends back, or null. Each one holds its
// own token, so one that ends late (after the modes were turned off and on again) cannot end another's hold.
let holding = null;

function hold() {
    holding = {};
    return holding;
}

function release(job) {
    if (holding === job) holding = null;
}

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

// Takes what is in the message box out of it, and returns it
function takeBox() {
    const textarea = document.getElementById('send_textarea');
    const text = textarea instanceof HTMLTextAreaElement ? textarea.value : '';
    if (text) setBox(textarea, '');
    return text;
}

// Puts what the person typed back in the message box, in front of anything typed since. It is all one stream of
// typing in the same box, so the two are joined as typed, with nothing added between them.
function putBack(text) {
    const textarea = document.getElementById('send_textarea');
    if (!text || !(textarea instanceof HTMLTextAreaElement)) return;
    setBox(textarea, `${text}${textarea.value}`);
}

// While a reply is being started, SillyTavern reads the message box again after its first steps (commands,
// then the server check) and sends what it finds as your own message; in a group chat its group code reads
// it too. So from the moment the reply is asked for until SillyTavern counts itself as generating, whatever
// is typed is moved out of the box as it comes, and kept. Returns a function that ends this and gives back
// what was kept. The listener is on the box only for that moment.
function keepBoxClear() {
    const textarea = document.getElementById('send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) return () => '';
    let kept = '';
    const move = (event) => {
        // Mid-composition (an input method) the text is not settled yet; the input at its end moves it
        if (event.isComposing || !textarea.value) return;
        kept += textarea.value;
        setBox(textarea, '');
    };
    textarea.addEventListener('input', move);
    return () => {
        textarea.removeEventListener('input', move);
        return kept;
    };
}

// Story as narration (bible section 6). The box is emptied first, so a second Enter while the narration is
// being saved cannot add it twice, and other sends from the box are held back until SillyTavern is writing
// the reply. The narrator message comes from SillyTavern's own sendNarratorMessage (the code behind /sys).
// Then a normal reply starts the way /trigger does: once nothing is being generated (it waits up to 10
// seconds, and warns as /trigger does if that runs out), the box is emptied again and Generate('normal').
// SillyTavern's reply sends what is in the box as your own message; here that is whatever was typed while the
// narration was being saved, so it is held aside instead of thrown away, and put back once the reply is in.
async function tellStory(story, typed) {
    setBox(document.getElementById('send_textarea'), '');
    lastRewrite = '';
    const job = hold();
    try {
        await slashCommands.sendNarratorMessage({}, story);
    } catch (error) {
        console.error('[Arcane Forge UI] Story could not be added as narration.', error);
        release(job);
        putBack(typed);
        return;
    }
    for (let waited = 0; generating() && waited < REPLY_WAIT; waited += REPLY_LOOK) await pause(REPLY_LOOK);
    if (generating()) {
        release(job);
        globalThis.toastr?.warning(NO_REPLY);
        return;
    }
    let meanwhile = takeBox();
    const stopKeeping = keepBoxClear();
    let ended = false;
    let kept = false;
    // What was moved out of the box while the reply was starting joins what was set aside before it
    const endKeeping = () => {
        if (kept) return;
        kept = true;
        meanwhile += stopKeeping();
    };
    const reply = Promise.resolve()
        .then(() => script.Generate('normal'))
        .catch((error) => console.error('[Arcane Forge UI] The reply after a Story could not be started.', error))
        .finally(() => {
            ended = true;
            endKeeping();
            putBack(meanwhile);
        });
    // Generate's first steps (such as checking the server) come before SillyTavern counts itself as
    // generating; the box is kept clear and the hold stays on until it does, and from then on SillyTavern's
    // own flag holds sends back. Turning the modes off (holding cleared) ends both at once.
    while (!ended && !generating() && holding === job) await pause(REPLY_LOOK / 2);
    endKeeping();
    release(job);
    await reply;
}

// See as a picture (bible section 6): the box is emptied and Image Generation's own imagine command runs with
// what was typed. Its callback gets the text as the command's argument, as SillyTavern's command runner would
// hand it over after parsing, but no parser or macro step sees it on the way: nothing in it can start a
// command, end this one with "|", set an argument with "name=", or be filled as a macro before imagine has
// it. Running it as "/imagine …" text cannot promise that (SillyTavern's macro engine drops "{{trim}}" even
// when escaped). Image Generation fills macros in its own final prompt, as for /imagine typed by hand.
// A picture takes many seconds, and SillyTavern does not know one is being made, so other sends from the box
// are held back until the command ends, whether it worked or not.
async function askForPicture(imagine, typed) {
    setBox(document.getElementById('send_textarea'), '');
    lastRewrite = '';
    const job = hold();
    try {
        await imagine.callback({}, typed);
    } catch (error) {
        console.error('[Arcane Forge UI] See could not ask Image Generation for a picture.', error);
    } finally {
        release(job);
    }
}

// ---------- The bar ----------

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

// ---------- The message box's question (bible section 5.3) ----------

// While a mode is picked, the message box asks its question. SillyTavern writes its own placeholder when
// the connection comes or goes, so a watch on that one attribute keeps what SillyTavern wrote last (to give
// back) and puts ours back. With no mode, SillyTavern's is restored.
//
// Nothing here keeps the message box between calls: every call looks it up again and moves the watch to
// the box it finds, and the watch's callback looks it up too. The watch is dropped when no mode is picked.
let shownPrompt = '';
let nativePlaceholder = null;
let placeholderWatch = null;

function showPrompt(mode) {
    placeholderWatch?.disconnect();
    placeholderWatch = null;
    const textarea = document.getElementById('send_textarea');
    const now = textarea?.getAttribute('placeholder') ?? null;
    // SillyTavern wrote over ours and the watch had not seen it yet: that is what to give back
    if (shownPrompt && textarea && now !== shownPrompt) nativePlaceholder = now;
    const prompt = MODES.find((m) => m.mode === mode)?.prompt ?? '';
    if (prompt && textarea) {
        if (!shownPrompt) nativePlaceholder = now;
        shownPrompt = prompt;
        if (now !== prompt) textarea.setAttribute('placeholder', prompt);
        placeholderWatch = new MutationObserver(keepPrompt);
        placeholderWatch.observe(textarea, { attributes: true, attributeFilter: ['placeholder'] });
        return;
    }
    if (shownPrompt && textarea && textarea.getAttribute('placeholder') === shownPrompt) {
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
