import { deactivateEntity, undoEntityMutation } from '../../application/lifecycle/deactivate-entity.js';
import { el } from '../dom.js';
import { showActionToast, showToast } from './feedback.js';
import { showConfirmation, showSheet } from './sheets.js';
export function showEntityActions(title, onEdit, onDeactivate) {
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
    const content = el('div', 'action-menu', [edit, deactivate]);
    const close = showSheet(title, content);
    edit.addEventListener('click', () => { close(); onEdit(); });
    deactivate.addEventListener('click', () => { close(); onDeactivate(); });
}
export function confirmEntityDeactivation(gateway, profileId, entityType, entityId, label, onChanged) {
    showConfirmation(`Desativar ${label}?`, 'O histórico financeiro será preservado. Esta alteração é auditada e poderá ser desfeita imediatamente.', 'Desativar', () => {
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
