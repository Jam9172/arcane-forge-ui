// Scrolling a menu is never blocked by one of its own drop-downs.
//
// SillyTavern's searchable drop-downs (Select2: the lorebook pickers, tags and others) hold every scrolling
// parent still while their list is open: each scroll is put straight back. A list that picks several things
// stays open after a pick, so the menu behind it looks frozen until the list is closed by a click elsewhere,
// and a list left open out of sight freezes the menu for good.
//
// With this guard, a scroll (wheel or finger) anywhere outside an open list closes the list first, so the
// scroll goes through. It also takes off any of Select2's scroll holds left behind with no list open.

// How often, at most, the leftover holds are looked for while scrolling
const SWEEP_MS = 500;

/**
 * @param {() => boolean} isEnabled - whether the guard should act (the extension's on/off switch)
 */
export function installDropdownScrollGuard(isEnabled) {
    const $ = globalThis.jQuery;
    if (!$) return;
    let swept = 0;

    function release(event) {
        if (!isEnabled()) return;
        const target = event.target instanceof Element ? event.target : null;
        // Scrolling inside an open list is the list's own business
        if (target?.closest('.select2-dropdown')) return;

        if (document.querySelector('.select2-container--open')) {
            $('select.select2-hidden-accessible').each(function () {
                try {
                    if ($(this).data('select2')?.isOpen()) $(this).select2('close');
                } catch { /* not a Select2 any more */ }
            });
            return;
        }

        // No list is open, so a hold still on one of the scrolled element's parents is a leftover
        const now = Date.now();
        if (!target || now - swept < SWEEP_MS) return;
        swept = now;
        $(target).parents().addBack().off('scroll.select2');
    }

    document.addEventListener('wheel', release, { capture: true, passive: true });
    document.addEventListener('touchmove', release, { capture: true, passive: true });
}
