import { button, el } from '../dom.js';
import { icon, iconButton } from '../icons.js';
let currentOverlay = null;
let restoreFocus = null;
let dialogSequence = 0;
function focusableElements(root) {
    return [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter((node) => !node.hasAttribute('hidden') && node.getAttribute('aria-hidden') !== 'true');
}
function closeCurrent() {
    if (!currentOverlay)
        return;
    currentOverlay.remove();
    currentOverlay = null;
    document.documentElement.classList.remove('sheet-open');
    const target = restoreFocus;
    restoreFocus = null;
    target?.focus({ preventScroll: true });
}
function bindDialogKeyboard(sheet) {
    sheet.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeCurrent();
            return;
        }
        if (event.key !== 'Tab')
            return;
        const focusable = focusableElements(sheet);
        if (focusable.length === 0) {
            event.preventDefault();
            sheet.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    });
}
export function showSheet(title, content, actions) {
    closeCurrent();
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = el('div', 'sheet-overlay');
    const sheet = el('section', 'sheet-panel');
    const titleId = `orion-sheet-title-${++dialogSequence}`;
    const titleNode = el('h2', '', [title]);
    titleNode.id = titleId;
    sheet.tabIndex = -1;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', titleId);
    const header = el('header', 'sheet-header', [titleNode, iconButton('close', 'Fechar', closeCurrent)]);
    sheet.append(header, el('div', 'sheet-body', [content]));
    if (actions)
        sheet.append(el('footer', 'sheet-actions', [actions]));
    overlay.append(sheet);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay)
            closeCurrent();
    });
    bindDialogKeyboard(sheet);
    document.body.append(overlay);
    document.documentElement.classList.add('sheet-open');
    currentOverlay = overlay;
    requestAnimationFrame(() => (focusableElements(sheet)[0] ?? sheet).focus({ preventScroll: true }));
    return closeCurrent;
}
export function showSelectionSheet(title, options, currentValue, onSelect) {
    const list = el('div', 'selection-list');
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', title);
    for (const option of options) {
        const copy = el('span', 'selection-copy', [
            el('strong', '', [option.label]),
            option.description ? el('small', '', [option.description]) : null
        ]);
        const trailing = option.value === currentValue ? icon('check', 'selection-check') : (option.badge ? el('em', '', [option.badge]) : null);
        const row = el('button', 'selection-row', [copy, trailing]);
        row.type = 'button';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(option.value === currentValue));
        row.addEventListener('click', () => {
            onSelect(option.value);
            closeCurrent();
        });
        list.append(row);
    }
    showSheet(title, list);
}
export function showConfirmation(title, message, confirmLabel, onConfirm) {
    const content = el('div', 'confirmation-copy', [el('p', '', [message])]);
    const actions = el('div', 'two-actions', [
        button('btn secondary', 'Cancelar', closeCurrent),
        button('btn primary', confirmLabel, () => { closeCurrent(); onConfirm(); })
    ]);
    showSheet(title, content, actions);
}
