// Forge ledger layout for the AI Response Configuration tab (Chat Completion only).
// SillyTavern's own controls are moved into the new cards, never copied, so their handlers and
// saving keep working. Each moved node leaves a comment marker behind; restore() puts it back.

const LAYOUT_ID = 'forge-ai-layout';
const moved = [];

const byId = (id) => document.getElementById(id);
const block = (id) => byId(id)?.closest('.range-block');
const drawer = (id) => byId(id)?.closest('.inline-drawer');
const column = (id) => byId(id)?.closest('.flex-container.flexFlowColumn[data-source]');

// Appends el to target, or places it just before `anchor` inside target.
function move(el, target, anchor = null) {
    if (!el || !target || moved.some((m) => m.el === el)) return;
    const mark = document.createComment('forge-ai');
    el.before(mark);
    moved.push({ el, mark });
    target.insertBefore(el, anchor);
}

let observer = null;

// One short line under each sampler. TauriTavern ships its own line for Temperature
// (.range-input-description); a row that already has one keeps it.
const DESCRIPTIONS = {
    temp_openai: 'Controls token randomness.',
    top_p_openai: 'Picks only from the likeliest tokens that add up to this share. 1 turns it off.',
    min_p_openai: 'Drops tokens much less likely than the top one. 0 turns it off.',
    freq_pen_openai: 'Discourages using the same words over and over.',
    pres_pen_openai: 'Nudges the model toward new words and topics.',
    top_k_openai: 'Picks only from this many of the likeliest tokens. 0 turns it off.',
    top_a_openai: 'Drops unlikely tokens, more so when one token is a clear favourite. 0 turns it off.',
    repetition_penalty_openai: 'Discourages repeating recent tokens. 1 turns it off.',
    seed_openai: 'The same seed gives the same reply. -1 picks a random one.',
};

function addDescriptions() {
    for (const [id, text] of Object.entries(DESCRIPTIONS)) {
        const row = block(id);
        if (!row || row.querySelector('.range-input-description, .forge-ai-desc')) continue;
        const note = document.createElement('small');
        note.className = 'forge-ai-desc';
        note.textContent = text;
        row.append(note);
    }
}

// TauriTavern adds a "Request Parameter Management" bar (.tt-gp-bar) above the first parameter block,
// possibly after this layout is built. In this layout every parameter is a plain control instead, so the
// bar is parked in a hidden holder (and goes back where it was if the layout is turned off).
function adoptParamBar() {
    const layout = byId(LAYOUT_ID);
    const bar = document.querySelector('#ai_response_configuration .tt-gp-bar');
    if (!layout || !bar) return;
    const holder = layout.querySelector('[data-card="params"]');
    if (!holder.contains(bar)) move(bar, holder);
}

// TauriTavern keeps a per-preset list of parameters to leave out of requests. With every parameter
// shown as a normal control, a value you can see should also be sent, as in plain SillyTavern.
export function clearOmittedParams() {
    if (!byId(LAYOUT_ID)) return;
    try {
        const settings = SillyTavern.getContext().chatCompletionSettings;
        const tt = settings?.extensions?.tauritavern;
        if (!tt?.omit_params) return;
        delete tt.omit_params;
        if (!Object.keys(tt).length) delete settings.extensions.tauritavern;
        SillyTavern.getContext().saveSettingsDebounced();
    } catch (error) {
        console.warn('[Arcane Forge UI] Could not clear omitted parameters', error);
    }
}

function syncBindState() {
    const bound = byId('bind_preset_to_connection')?.checked ?? false;
    byId(LAYOUT_ID)?.querySelector('.forge-ai-bind')?.classList.toggle('is-on', bound);
}

export function restoreAiTab() {
    observer?.disconnect();
    observer = null;
    const layout = byId(LAYOUT_ID);
    // A node whose marker sits inside the layout (TauriTavern's bar, added after the build) goes back
    // in front of the block that followed it, once that block is home again.
    const adopted = [];
    while (moved.length) {
        const { el, mark } = moved.pop();
        if (layout?.contains(mark)) {
            adopted.push({ el, next: mark.nextElementSibling });
            continue;
        }
        mark.replaceWith(el);
    }
    for (const { el, next } of adopted) {
        if (next && !layout.contains(next)) next.before(el);
        else byId('range_block_openai')?.prepend(el);
    }
    document.querySelectorAll('.forge-ai-desc').forEach((note) => note.remove());
    layout?.remove();
    document.body.classList.remove('forge-ai-active');
}

function modelLine() {
    try {
        const ctx = SillyTavern.getContext();
        const source = ctx.chatCompletionSettings?.chat_completion_source ?? '';
        const model = ctx.getChatCompletionModel?.() ?? '';
        const names = { openrouter: 'OpenRouter', openai: 'OpenAI', claude: 'Claude', makersuite: 'Google AI Studio', custom: 'Custom' };
        return [names[source] ?? source, model].filter(Boolean).join(' · ');
    } catch {
        return '';
    }
}

function icon(path) {
    return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

// Forge icon set for the preset card: tray in/out, wax seals, quill, chain, urn.
const ICONS = {
    import: icon('M4 14v5h16v-5 M12 3v11 M8 10l4 4 4-4'),
    export: icon('M4 14v5h16v-5 M12 14V3 M8 7l4-4 4 4'),
    save: icon('M12 3.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z M9.3 10.1l1.8 1.8 3.6-3.6 M8.5 15.5L7 21l2.5-1.2L11 21.5 M15.5 15.5L17 21l-2.5-1.2L13 21.5'),
    saveAs: icon('M12 3.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z M12 7v6 M9 10h6 M8.5 15.5L7 21l2.5-1.2L11 21.5 M15.5 15.5L17 21l-2.5-1.2L13 21.5'),
    rename: icon('M20 4c-6 1-10 5-12 11l-2 5 5-2c6-2 10-6 11-12z M8.5 15.5l5-5'),
    remove: icon('M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13 M10 11v5 M14 11v5'),
    bind: icon('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'),
    more: icon('M5 12h.01 M12 12h.01 M19 12h.01'),
};

const LAYOUT_HTML = `
<div id="${LAYOUT_ID}">
    <div class="forge-ai-header">
        <h2>AI Response</h2>
        <span class="forge-ai-model"></span>
    </div>

    <section class="forge-ai-card forge-ai-preset-card">
        <div class="forge-ai-preset-head">
            <h3>Chat Completion Preset</h3>
            <button type="button" class="forge-ai-icon-button forge-ai-bind" data-proxy="label[for='bind_preset_to_connection']" title="Bind presets to API connections" aria-label="Bind presets to API connections">${ICONS.bind}</button>
        </div>
        <div class="forge-ai-preset-row">
            <div class="forge-ai-preset-select"></div>
            <details class="forge-ai-more-menu">
                <summary aria-label="More preset actions" title="More preset actions">${ICONS.more}</summary>
                <div class="forge-ai-menu">
                    <button type="button" data-proxy="[data-preset-manager-rename='openai']">${ICONS.rename}<span>Rename</span></button>
                    <button type="button" data-proxy="#new_oai_preset">${ICONS.saveAs}<span>Save as new preset</span></button>
                    <button type="button" data-proxy="#delete_oai_preset" class="forge-ai-danger">${ICONS.remove}<span>Delete</span></button>
                </div>
            </details>
        </div>
        <div class="forge-ai-preset-actions">
            <button type="button" class="forge-ai-action" data-proxy="#import_oai_preset">${ICONS.import}<span>Import</span></button>
            <button type="button" class="forge-ai-action" data-proxy="#export_oai_preset">${ICONS.export}<span>Export</span></button>
            <button type="button" class="forge-ai-action forge-ai-primary" data-proxy="#update_oai_preset">${ICONS.save}<span>Save</span></button>
        </div>
    </section>

    <section class="forge-ai-card" data-card="length"><h3>Length and memory</h3></section>

    <section class="forge-ai-card" data-card="sampling">
        <h3>Sampling</h3>
        <details class="forge-ai-more">
            <summary>More: Top K, Top A, Repetition, Seed</summary>
            <div class="forge-ai-more-body" data-card="sampling-more"></div>
        </details>
    </section>

    <section class="forge-ai-card" data-card="features"><h3>Model features</h3></section>

    <div data-card="params" hidden></div>

    <section class="forge-ai-card forge-ai-links">
        <details class="forge-ai-link">
            <summary><span>Behaviour</span><small>Names, continue, system</small></summary>
            <div class="forge-ai-link-body" data-card="behaviour"></div>
        </details>
        <details class="forge-ai-link">
            <summary><span>Logit bias</span><small>Ban or boost words</small></summary>
            <div class="forge-ai-link-body" data-card="bias"></div>
        </details>
        <details class="forge-ai-link">
            <summary><span>Prompts</span><small>Order and contents</small></summary>
            <div class="forge-ai-link-body" data-card="prompts"></div>
        </details>
    </section>
</div>`;

export function buildAiTab() {
    if (byId(LAYOUT_ID)) return;
    const host = byId('ai_response_configuration');
    if (!host || !byId('range_block_openai')) return;

    host.insertAdjacentHTML('afterbegin', LAYOUT_HTML);
    const layout = byId(LAYOUT_ID);
    const card = (name) => layout.querySelector(`[data-card="${name}"]`);
    const sampling = card('sampling');
    const samplingMore = sampling.querySelector('.forge-ai-more');

    move(byId('settings_preset_openai'), layout.querySelector('.forge-ai-preset-select'));

    const length = card('length');
    move(block('openai_max_context'), length);
    move(block('openai_max_tokens'), length);
    move(block('openrouter_middleout'), length);
    document.querySelectorAll('#range_block_openai > div[data-source]:not(.range-block)').forEach((el) => move(el, length));
    move(block('stream_toggle'), length);
    move(block('oai_max_context_unlocked'), length);

    for (const id of ['temp_openai', 'top_p_openai', 'min_p_openai', 'freq_pen_openai', 'pres_pen_openai']) {
        move(block(id), sampling, samplingMore);
    }
    for (const id of ['top_k_openai', 'top_a_openai', 'repetition_penalty_openai', 'seed_openai']) {
        move(block(id), card('sampling-more'));
    }

    const features = card('features');
    move(block('openai_show_thoughts'), features);
    move(column('openai_reasoning_effort'), features);
    move(column('openai_verbosity'), features);
    move(block('openai_function_calling'), features);
    move(block('tool_reasoning_mode'), features);
    move(block('openai_media_inlining'), features);
    move(block('openai_request_images'), features);
    move(block('openai_enable_web_search'), features);

    const behaviour = card('behaviour');
    move(drawer('names_behavior'), behaviour);
    move(drawer('continue_postfix'), behaviour);
    move(block('continue_prefill'), behaviour);
    move(block('squash_system_messages'), behaviour);
    move(block('use_sysprompt'), behaviour);

    move(block('openai_logit_bias_preset'), card('bias'));

    const prompts = card('prompts');
    move(block('completion_prompt_manager'), prompts);
    move(drawer('main_prompt_quick_edit_textarea'), prompts);
    move(drawer('impersonation_prompt_textarea'), prompts);

    addDescriptions();
    layout.querySelector('.forge-ai-model').textContent = modelLine();
    layout.addEventListener('click', (event) => {
        const button = event.target.closest('[data-proxy]');
        if (!button) return;
        document.querySelector(button.dataset.proxy)?.click();
        button.closest('details.forge-ai-more-menu')?.removeAttribute('open');
        setTimeout(syncBindState);
    });
    syncBindState();

    adoptParamBar();
    clearOmittedParams();
    observer = new MutationObserver(adoptParamBar);
    observer.observe(host, { childList: true, subtree: true });

    document.body.classList.add('forge-ai-active');
}

export function refreshModelLine() {
    const el = document.querySelector(`#${LAYOUT_ID} .forge-ai-model`);
    if (el) el.textContent = modelLine();
}
