import { parseMajorToCents } from '../../domain/money/money.js';
import { requireISODate } from '../shared/validation.js';
export function isEditableManualTransaction(transaction) {
    return transaction.kind === 'expense' || transaction.kind === 'income' || transaction.kind === 'yield' || transaction.kind === 'transfer';
}
async function requireActiveAccount(accounts, profileId, accountId) {
    const account = await accounts.getById(accountId);
    if (!account || account.profileId !== profileId || !account.active)
        throw new TypeError('A conta selecionada não está disponível.');
}
export async function updateManualTransaction(transactions, accounts, cards, gateway, input) {
    const current = await transactions.getById(input.transactionId);
    if (!current || current.profileId !== input.profileId)
        throw new TypeError('Movimentação não encontrada para o perfil ativo.');
    if (!isEditableManualTransaction(current))
        throw new TypeError('Esta movimentação possui vínculo financeiro especializado e não pode ser editada por este fluxo.');
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0)
        throw new RangeError('O valor deve ser maior que zero.');
    const date = requireISODate(input.date);
    const description = input.description.trim() || (input.kind === 'transfer' ? 'Transferência' : 'Movimentação');
    const common = {
        id: current.id,
        profileId: current.profileId,
        amount,
        date,
        description,
        ...(current.createdAt ? { createdAt: current.createdAt } : {}),
        entrySource: current.entrySource ?? 'manual'
    };
    let next;
    if (input.kind === 'transfer') {
        if (current.kind !== 'transfer')
            throw new TypeError('O tipo original da movimentação não pode ser convertido em transferência.');
        if (input.fromAccountId === input.toAccountId)
            throw new TypeError('Origem e destino devem ser diferentes.');
        await requireActiveAccount(accounts, input.profileId, input.fromAccountId);
        await requireActiveAccount(accounts, input.profileId, input.toAccountId);
        next = { ...common, kind: 'transfer', fromAccountId: input.fromAccountId, toAccountId: input.toAccountId };
    }
    else if (input.kind === 'expense-account') {
        if (current.kind !== 'expense')
            throw new TypeError('O tipo original da movimentação não pode ser convertido em despesa.');
        await requireActiveAccount(accounts, input.profileId, input.accountId);
        next = { ...common, kind: 'expense', categoryId: input.categoryId, settlement: { kind: 'account', accountId: input.accountId, method: input.paymentMethod } };
    }
    else if (input.kind === 'expense-card') {
        if (current.kind !== 'expense')
            throw new TypeError('O tipo original da movimentação não pode ser convertido em despesa.');
        const card = await cards.getById(input.creditCardId);
        if (!card || card.profileId !== input.profileId || !card.active)
            throw new TypeError('O cartão selecionado não está disponível.');
        next = { ...common, kind: 'expense', categoryId: input.categoryId, settlement: { kind: 'credit-card', creditCardId: input.creditCardId } };
    }
    else {
        if (current.kind !== 'income' && current.kind !== 'yield')
            throw new TypeError('O tipo original da movimentação não pode ser convertido em receita.');
        await requireActiveAccount(accounts, input.profileId, input.accountId);
        next = { ...common, kind: input.kind, categoryId: input.categoryId, accountId: input.accountId };
    }
    return gateway.update(input.profileId, next);
}
