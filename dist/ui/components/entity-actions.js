import { deactivateEntity, undoEntityMutation } from '../../application/lifecycle/deactivate-entity.js';
import { el } from '../dom.js';
import { showActionToast, showToast } from './feedback.js';
import { showConfirmation, showSheet } from './sheets.js';
export function showEntityActions(title, onEdit, onDeactivate, extraActions = []) {
    const edit = el('button', 'action-menu-row', [
        el('span', 'action-menu-symbol', ['✎']),
        el('span', 'action-menu-copy', [el('strong', '', ['Editar']), el('small', '', ['Alterar informações sem reescrever o histórico.'])])
    ]);
    edit.type = 'button';
    const deactivate = el('button', 'action-menu-row danger-row', [
        el('span', 'action-menu-symbol', ['○']),
        el('span', 'action-menu-copy', [el('strong', '', ['Desativar']), el('small', '', ['Oculta do uso atual e preserva o histórico.'])])
    ]);
    deactivate.type = 'button';
    const extraRows = extraActions.map((item) => {
        const row = el('button', `action-menu-row ${item.tone === 'danger' ? 'danger-row' : ''}`, [
            el('span', 'action-menu-symbol', [item.symbol]),
            el('span', 'action-menu-copy', [el('strong', '', [item.label]), el('small', '', [item.description])])
        ]);
        row.type = 'button';
        return { row, action: item.onSelect };
    });
    const content = el('div', 'action-menu', [...extraRows.map((item) => item.row), edit, deactivate]);
    const close = showSheet(title, content);
    for (const item of extraRows)
        item.row.addEventListener('click', () => { close(); item.action(); });
    edit.addEventListener('click', () => { close(); onEdit(); });
    deactivate.addEventListener('click', () => { close(); onDeactivate(); });
}
export function confirmEntityDeactivation(gateway, profileId, entityType, entityId, label, onChanged) {
    showConfirmation(`Desativar ${label}?`, 'Esse item deixará de aparecer no uso atual, mas o histórico será mantido. Você poderá desfazer logo em seguida.', 'Desativar', () => {
        void deactivateEntity(gateway, profileId, entityType, entityId).then((event) => {
            onChanged();
            showActionToast(`${label} desativado.`, 'Desfazer', () => {
                void undoEntityMutation(gateway, profileId, event.id).then(() => {
                    onChanged();
                    showToast('Alteração desfeita.', 'success');
                }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível desfazer.', 'error'));
            });
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível desativar.', 'error'));
    });
}
