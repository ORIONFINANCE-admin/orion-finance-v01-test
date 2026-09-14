import { el } from '../dom.js';
import { icon } from '../icons.js';
import { showSelectionSheet } from './sheets.js';
export function textField(label, value = '', type = 'text') {
    const input = el('input', 'field-input');
    input.type = type;
    input.value = value;
    input.setAttribute('aria-label', label);
    return input;
}
export function moneyField(label) {
    const input = el('input', 'field-input money-input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.placeholder = '0,00';
    input.setAttribute('aria-label', label);
    return input;
}
export function selectorField(label, optionsInitial, initialValue = null) {
    let options = optionsInitial;
    let value = initialValue;
    const valueNode = el('span', 'selector-value');
    const trigger = el('button', 'selector-trigger', [valueNode, icon('chevron', 'selector-chevron')]);
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    const wrapper = el('label', 'field selector-field', [el('span', 'field-label', [label]), trigger]);
    const sync = () => {
        const selected = options.find((option) => option.value === value);
        valueNode.textContent = selected?.label ?? 'Selecionar';
        trigger.classList.toggle('placeholder', !selected);
    };
    trigger.addEventListener('click', () => {
        showSelectionSheet(label, options, value, (next) => {
            value = next;
            sync();
            trigger.dispatchEvent(new CustomEvent('selectorchange', { bubbles: true, detail: next }));
        });
    });
    sync();
    return {
        element: wrapper,
        getValue: () => value,
        setValue: (next) => { value = next; sync(); },
        setOptions: (next) => { options = next; if (value && !options.some((option) => option.value === value))
            value = null; sync(); }
    };
}
export function labeledField(label, input) {
    return el('label', 'field', [el('span', 'field-label', [label]), input]);
}
