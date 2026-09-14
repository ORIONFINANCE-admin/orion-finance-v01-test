import { el, button } from '../dom.js';
export function loadingState(title = 'Preparando Orion…', detail = 'Carregando seus dados locais com segurança.') {
    const spinner = el('span', 'state-spinner');
    spinner.setAttribute('aria-hidden', 'true');
    const root = el('div', 'state-view loading-state', [spinner, el('strong', '', [title]), el('span', '', [detail])]);
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    return root;
}
export function errorState(title, detail, onRetry) {
    const children = [el('strong', '', [title]), el('span', '', [detail])];
    if (onRetry)
        children.push(button('btn secondary compact', 'Tentar novamente', onRetry));
    const root = el('div', 'state-view error-state', children);
    root.setAttribute('role', 'alert');
    return root;
}
export function fatalState(detail) {
    const reload = button('btn primary compact', 'Reabrir Orion', () => window.location.reload());
    const root = el('div', 'state-view fatal-state', [
        el('span', 'state-symbol', ['✦']),
        el('strong', '', ['O Orion não conseguiu iniciar.']),
        el('span', '', [detail]),
        reload
    ]);
    root.setAttribute('role', 'alert');
    return root;
}
