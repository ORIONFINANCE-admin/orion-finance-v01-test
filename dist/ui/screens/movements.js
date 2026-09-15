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
    if ('categoryId' in transaction && transaction.categoryId)
        return transaction.categoryId;
    switch (transaction.kind) {
        case 'income': return 'Receita';
        case 'yield': return 'Rendimento';
        case 'expense': return 'Despesa';
        case 'transfer': return 'Transferência';
        case 'credit-card-payment': return 'Pagamento de fatura';
        case 'debt-payment': return 'Pagamento de dívida';
        case 'asset-contribution': return 'Valor aplicado';
        case 'asset-withdrawal': return 'Valor resgatado';
        case 'asset-yield': return 'Rendimento';
        case 'asset-valuation': return 'Atualização de valor';
        default: {
            const exhaustive = transaction;
            return exhaustive;
        }
    }
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
        el('div', 'screen-heading', [el('div', '', [el('h1', '', ['Movimentações']), el('p', '', ['Tudo o que entrou, saiu ou mudou no seu dinheiro.'])])])
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
            el('span', 'action-menu-copy', [el('strong', '', ['Editar']), el('small', '', ['Corrija as informações desta movimentação.'])])
        ]);
        edit.type = 'button';
        edit.addEventListener('click', () => { close(); void openEditTransactionSheet(repositories, profile, mutations, transaction, onChanged); });
        actions.append(edit);
    }
    else {
        actions.append(el('div', 'inline-warning', [transaction.kind === 'debt-payment' || transaction.kind === 'credit-card-payment' ? 'Este pagamento está ligado à dívida ou fatura. Para corrigir, desfaça o pagamento e registre novamente.' : 'Este registro está ligado a outro item do Orion e não pode ser editado diretamente.']));
    }
    const isPayment = transaction.kind === 'debt-payment' || transaction.kind === 'credit-card-payment';
    const removeLabel = isPayment ? 'Desfazer pagamento' : 'Excluir';
    const remove = el('button', 'action-menu-row danger-row', [
        el('span', 'action-menu-symbol', ['×']),
        el('span', 'action-menu-copy', [
            el('strong', '', [removeLabel]),
            el('small', '', [isPayment ? 'O pagamento será revertido e poderá ser restaurado logo em seguida.' : 'A movimentação pode ser restaurada logo em seguida.'])
        ])
    ]);
    remove.type = 'button';
    remove.addEventListener('click', () => {
        close();
        showConfirmation(isPayment ? 'Desfazer este pagamento?' : 'Excluir movimentação?', isPayment ? 'O saldo e a dívida ou fatura voltarão ao estado anterior.' : 'A movimentação será removida e você poderá desfazer logo em seguida.', removeLabel, () => {
            void deleteTransaction(mutations, profile.id, transaction.id).then((event) => {
                onChanged();
                showActionToast(isPayment ? 'Pagamento desfeito.' : 'Movimentação excluída.', 'Desfazer', () => {
                    void undoTransactionMutation(mutations, profile.id, event.id).then(() => {
                        onChanged();
                        showToast(isPayment ? 'Pagamento restaurado.' : 'Movimentação restaurada.', 'success');
                    }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível desfazer.', 'error'));
                });
            }).catch((error) => showToast(error instanceof Error ? error.message : (isPayment ? 'Não foi possível desfazer o pagamento.' : 'Falha ao excluir.'), 'error'));
        });
    });
    actions.append(remove);
    close = showSheet(labelFor(transaction), actions);
}
