// "Delete messages" keeps the chat where it was.
//
// When delete mode opens, TauriTavern focuses the first loaded message's checkbox (for keyboard users).
// It asks the webview not to scroll, but on some webviews (reported on iOS) the chat still scrolls to that
// checkbox: straight back to the first message, away from the ones you came to delete. SillyTavern itself
// focuses nothing there, so this guard does nothing on it.
//
// The guard notes what the chat shows just before delete mode opens. Once it is open, it moves the focus to a
// checkbox that is on screen (so there is nothing left to scroll to) and holds the chat in place for a moment,
// until the webview has settled or you scroll yourself.

// How long the chat is held after delete mode opens
const HOLD_MS = 700;
// How long a note taken at the menu click stays good (delete mode opens after the menu's closing animation)
const NOTE_MS = 3000;
const AT_BOTTOM_PX = 5;
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'touchmove', 'pointerdown'];

/**
 * @param {() => boolean} isEnabled - whether the guard should act (the extension's on/off switch)
 */
export function installDeleteModeScrollGuard(isEnabled) {
    const chat = document.getElementById('chat');
    const bar = document.getElementById('dialogue_del_mes');
    if (!chat || !bar) return;

    const atBottom = () => chat.scrollHeight - chat.clientHeight - chat.scrollTop <= AT_BOTTOM_PX;

    // The first message that reaches into the view, and how far its top is from the chat's top
    function firstMessageInView() {
        const box = chat.getBoundingClientRect();
        for (let y = box.top + 4; y < box.bottom; y += 16) {
            const mes = document.elementFromPoint(box.left + box.width / 2, y)?.closest('.mes');
            if (mes?.parentElement === chat) return { mes, offset: mes.getBoundingClientRect().top - box.top };
        }
        return { mes: null, offset: 0 };
    }

    // What the chat shows now: enough to bring it back to the same place after the messages around it change height
    const takeNote = () => ({ ...firstMessageInView(), top: chat.scrollTop, atBottom: atBottom(), at: performance.now() });

    function putBack(note) {
        if (note.atBottom) {
            if (!atBottom()) chat.scrollTop = chat.scrollHeight;
        } else if (note.mes?.isConnected) {
            const drift = note.mes.getBoundingClientRect().top - chat.getBoundingClientRect().top - note.offset;
            if (Math.abs(drift) > 1) chat.scrollTop += drift;
        } else if (chat.dataset.ttChatSurface !== 'bounded' && Math.abs(chat.scrollTop - note.top) > 1) {
            // The message is gone and there is only the old scroll position to go by. Not with TauriTavern's
            // virtualized chat, which moves its messages itself.
            chat.scrollTop = note.top;
        }
    }

    // The first message in view whose checkbox is on screen, so focusing it asks for no scrolling
    function checkboxInView() {
        const box = chat.getBoundingClientRect();
        let { mes } = firstMessageInView();
        for (let i = 0; mes && i < 40; i++, mes = mes.nextElementSibling) {
            const checkbox = mes.querySelector(':scope > .del_checkbox');
            if (!checkbox) continue;
            const rect = checkbox.getBoundingClientRect();
            if (rect.top >= box.bottom) break;
            if (rect.height > 0 && rect.top >= box.top && rect.bottom <= box.bottom) return checkbox;
        }
        return null;
    }

    let holding = false;
    // The scroll position as of the last scroll event: still the old one right after a jump, because the
    // jump's own scroll event comes later
    let lastTop = chat.scrollTop;
    let lastAtBottom = atBottom();
    // Taken when "Delete messages" is clicked in the menu, before anything can move
    let clickNote = null;

    chat.addEventListener('scroll', () => {
        if (holding) return;
        lastTop = chat.scrollTop;
        lastAtBottom = atBottom();
        // You scrolled between the click and delete mode opening: note the new place
        if (clickNote) clickNote = performance.now() - clickNote.at < NOTE_MS ? { ...takeNote(), at: clickNote.at } : null;
    }, { passive: true });

    document.addEventListener('click', (event) => {
        if (isEnabled() && event.target instanceof Element && event.target.closest('#option_delete_mes')) clickNote = takeNote();
    }, true);

    function hold(note) {
        holding = true;
        const until = performance.now() + HOLD_MS;
        const keep = () => {
            if (holding) putBack(note);
        };
        const release = () => {
            if (!holding) return;
            holding = false;
            chat.removeEventListener('scroll', keep);
            for (const type of USER_SCROLL_EVENTS) chat.removeEventListener(type, release, true);
            document.removeEventListener('keydown', release, true);
            lastTop = chat.scrollTop;
            lastAtBottom = atBottom();
        };
        const eachFrame = () => {
            if (!holding) return;
            if (performance.now() >= until) return release();
            putBack(note);
            requestAnimationFrame(eachFrame);
        };
        chat.addEventListener('scroll', keep, { passive: true });
        // Scrolling, touching or typing: the chat is yours again
        for (const type of USER_SCROLL_EVENTS) chat.addEventListener(type, release, { capture: true, passive: true });
        document.addEventListener('keydown', release, true);
        requestAnimationFrame(eachFrame);
    }

    function onDeleteModeOpened() {
        const focused = document.activeElement;
        // Only when a checkbox in the chat was given the focus (TauriTavern); SillyTavern focuses nothing here
        if (!isEnabled() || !(focused instanceof HTMLElement) || !focused.matches('.del_checkbox') || !chat.contains(focused)) {
            clickNote = null;
            return;
        }

        const fresh = clickNote && performance.now() - clickNote.at < NOTE_MS;
        // Without a note from the click (delete mode opened some other way): if the chat has already moved,
        // go by the last scroll position seen; otherwise what it shows now is still the right place
        const jumped = Math.abs(chat.scrollTop - lastTop) > 2;
        const note = fresh ? clickNote : jumped ? { mes: null, offset: 0, top: lastTop, atBottom: lastAtBottom } : takeNote();
        clickNote = null;

        putBack(note);
        // Focus a checkbox that is on screen in place of the far one; with none on screen (one long message
        // fills the view), the Cancel button under the chat
        const target = checkboxInView() ?? document.getElementById('dialogue_del_mes_cancel');
        if (target && target !== focused) {
            target.focus({ preventScroll: true });
            if (document.activeElement === focused) focused.blur();
        }
        putBack(note);
        hold(note);
    }

    // Delete mode opens by showing its bar; this runs right after TauriTavern's own code, before any timer
    let wasOpen = getComputedStyle(bar).display !== 'none';
    new MutationObserver(() => {
        const open = getComputedStyle(bar).display !== 'none';
        if (open && !wasOpen) onDeleteModeOpened();
        wasOpen = open;
    }).observe(bar, { attributes: true, attributeFilter: ['style', 'class'] });
}
