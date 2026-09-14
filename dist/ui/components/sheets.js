import { button, el } from '../dom.js';
import { icon, iconButton } from '../icons.js';
export class SheetStack {
    items = [];
    push(item) {
        this.items.push(item);
    }
    peek() {
        return this.items.at(-1) ?? null;
    }
    removeFrom(item) {
        const index = this.items.indexOf(item);
        if (index < 0)
            return [];
        return this.items.splice(index);
    }
    get size() {
        return this.items.length;
    }
}
const sheetStack = new SheetStack();
let dialogSequence = 0;
function focusableElements(root) {
    return [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter((node) => !node.hasAttribute('hidden') && node.getAttribute('aria-hidden') !== 'true');
}
function syncTopLayer() {
    const top = sheetStack.peek();
    if (top)
        top.overlay.removeAttribute('aria-hidden');
    document.documentElement.classList.toggle('sheet-open', sheetStack.size > 0);
}
function closeLayer(layer) {
    const removed = sheetStack.removeFrom(layer);
    if (removed.length === 0)
        return;
    for (const entry of removed)
        entry.overlay.remove();
    syncTopLayer();
    if (layer.restoreFocus?.isConnected) {
        requestAnimationFrame(() => layer.restoreFocus?.focus({ preventScroll: true }));
    }
}
function bindDialogKeyboard(sheet, close) {
    sheet.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
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
    const previous = sheetStack.peek();
    if (previous)
        previous.overlay.setAttribute('aria-hidden', 'true');
    const restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = el('div', 'sheet-overlay');
    const sheet = el('section', 'sheet-panel');
    const titleId = `orion-sheet-title-${++dialogSequence}`;
    const titleNode = el('h2', '', [title]);
    titleNode.id = titleId;
    sheet.tabIndex = -1;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', titleId);
    const layer = { overlay, restoreFocus };
    const close = () => closeLayer(layer);
    const header = el('header', 'sheet-header', [titleNode, iconButton('close', 'Fechar', close)]);
    sheet.append(header, el('div', 'sheet-body', [content]));
    if (actions)
        sheet.append(el('footer', 'sheet-actions', [actions]));
    overlay.append(sheet);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay)
            close();
    });
    bindDialogKeyboard(sheet, close);
    document.body.append(overlay);
    sheetStack.push(layer);
    syncTopLayer();
    requestAnimationFrame(() => (focusableElements(sheet)[0] ?? sheet).focus({ preventScroll: true }));
    return close;
}
export function showSelectionSheet(title, options, currentValue, onSelect) {
    const list = el('div', 'selection-list');
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', title);
    let close = () => undefined;
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
            close();
        });
        list.append(row);
    }
    close = showSheet(title, list);
}
export function showConfirmation(title, message, confirmLabel, onConfirm) {
    const content = el('div', 'confirmation-copy', [el('p', '', [message])]);
    let close = () => undefined;
    const actions = el('div', 'two-actions', [
        button('btn secondary', 'Cancelar', () => close()),
        button('btn primary', confirmLabel, () => { close(); onConfirm(); })
    ]);
    close = showSheet(title, content, actions);
}
