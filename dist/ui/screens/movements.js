import { formatBRL } from '../../domain/money/money.js';
import { deleteTransaction, undoTransactionMutation } from '../../application/transactions/mutate-transaction.js';
import { isEditableManualTransaction } from '../../application/transactions/update-manual-transaction.js';
import { el } from '../dom.js';
import { showConfirmation, showSheet } from '../components/sheets.js';
import { showActionToast, showToast } from '../components/feedback.js';
import { openEditTransactionSheet } from './edit-transaction.js';
function signFor(transaction) {
    if (transaction.kind === 'income' || transaction.kind === 'yield' || transaction.kind === 'asset-yield')
        return '+';
    if (transaction.kind === 'expense')
        return '−';
    if (transaction.kind === 'asset-valuation' && transaction.amount > 0)
        return '+';
    return '';
}
function amountClass(transaction) {
    if (transaction.kind === 'income' || transaction.kind === 'yield' || transaction.kind === 'asset-yield')
        return 'positive-text';
    if (transaction.kind === 'expense')
        return 'negative-text';
    if (transaction.kind === 'asset-valuation')
        return transaction.amount >= 0 ? 'positive-text' : 'negative-text';
    return 'neutral-text';
}
function labelFor(transaction) {
    switch (transaction.kind) {
        case 'income': return transaction.description ?? 'Receita';
        case 'yield': return transaction.description ?? 'Rendimento';
        case 'expense': return transaction.description ?? 'Despesa';
        case 'transfer': return transaction.description ?? 'Transferência';
        case 'credit-card-payment': return transaction.description ?? 'Pagamento de fatura';
        case 'debt-payment': return transaction.description ?? 'Pagamento de dívida';
        case 'asset-contribution': return transaction.description ?? 'Aporte';
        case 'asset-withdrawal': return transaction.description ?? 'Resgate';
        case 'asset-yield': return transaction.description ?? 'Rendimento de ativo';
        case 'asset-valuation': return transaction.description ?? 'Valorização patrimonial';
        default: {
            const exhaustive = transaction;
            return exhaustive;
        }
    }
}
function metaFor(transaction) {
    return 'categoryId' in transaction && transaction.categoryId ? transaction.categoryId : transaction.kind;
}
function iconFor(transaction) {
    if (transaction.kind === 'transfer' || transaction.kind === 'asset-contribution' || transaction.kind === 'asset-withdrawal')
        return '↔';
    if (transaction.kind === 'expense')
        return '↓';
    if (transaction.kind === 'credit-card-payment' || transaction.kind === 'debt-payment')
        return '✓';
    if (transaction.kind === 'asset-valuation')
        return '◇';
    return '↑';
}
export async function renderMovements(repositories, profile, mutations, onChanged) {
    const transactions = await repositories.transactions.listByProfile(profile.id);
    const root = el('div', 'screen movements-screen', [
        el('div', 'screen-heading', [el('div', '', [el('h1', '', ['Movimentações']), el('p', '', ['Fatos financeiros e patrimoniais registrados no Orion.'])])])
    ]);
    if (transactions.length === 0) {
        root.append(el('div', 'empty-card large', [el('strong', '', ['Seu extrato começa aqui']), el('span', '', ['Use o botão + para registrar uma receita, despesa ou transferência.'])]));
        return root;
    }
    const list = el('section', 'statement-list');
    let lastDate = '';
    for (const transaction of transactions) {
        if (transaction.date !== lastDate) {
            lastDate = transaction.date;
            const [year, month, day] = transaction.date.split('-');
            list.append(el('h3', 'date-heading', [`${day}/${month}/${year}`]));
        }
        const amount = `${signFor(transaction)}${formatBRL(transaction.amount)}`;
        const row = el('button', 'movement-row movement-button', [
            el('span', `movement-icon ${amountClass(transaction)}`, [iconFor(transaction)]),
            el('div', 'movement-copy', [el('strong', '', [labelFor(transaction)]), el('small', '', [metaFor(transaction)])]),
            el('b', `movement-amount ${amountClass(transaction)}`, [amount])
        ]);
        row.type = 'button';
        row.setAttribute('aria-label', `${labelFor(transaction)}, ${amount}. Abrir ações.`);
        row.addEventListener('click', () => openMovementActions(repositories, profile, mutations, transaction, onChanged));
        list.append(row);
    }
    root.append(list);
    return root;
}
function openMovementActions(repositories, profile, mutations, transaction, onChanged) {
    const actions = el('div', 'action-menu');
    let close = () => undefined;
    if (isEditableManualTransaction(transaction)) {
        const edit = el('button', 'action-menu-row', [
            el('span', 'action-menu-symbol', ['✎']),
            el('span', 'action-menu-copy', [el('strong', '', ['Editar']), el('small', '', ['Altera este fato com auditoria e preserva o histórico da mudança.'])])
        ]);
        edit.type = 'button';
        edit.addEventListener('click', () => { close(); void openEditTransactionSheet(repositories, profile, mutations, transaction, onChanged); });
        actions.append(edit);
    }
    else {
        actions.append(el('div', 'inline-warning', ['Este lançamento possui vínculo especializado. Para evitar inconsistência, a edição direta está bloqueada; é possível excluí-lo com auditoria e recriar corretamente.']));
    }
    const remove = el('button', 'action-menu-row danger-row', [
        el('span', 'action-menu-symbol', ['×']),
        el('span', 'action-menu-copy', [el('strong', '', ['Excluir']), el('small', '', ['A exclusão pode ser desfeita imediatamente.'])])
    ]);
    remove.type = 'button';
    remove.addEventListener('click', () => {
        close();
        showConfirmation('Excluir movimentação?', 'A exclusão é auditada e pode ser desfeita imediatamente.', 'Excluir', () => {
            void deleteTransaction(mutations, profile.id, transaction.id).then((event) => {
                onChanged();
                showActionToast('Movimentação excluída.', 'Desfazer', () => {
                    void undoTransactionMutation(mutations, profile.id, event.id).then(() => {
                        onChanged();
                        showToast('Movimentação restaurada.', 'success');
                    }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível desfazer.', 'error'));
                });
            }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao excluir.', 'error'));
        });
    });
    actions.append(remove);
    close = showSheet(labelFor(transaction), actions);
}
