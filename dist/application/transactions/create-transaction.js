import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
import { requireISODate } from '../shared/validation.js';
async function requireActiveAccount(repository, id) {
    const account = await repository.getById(id);
    if (!account || !account.active)
        throw new TypeError('A conta selecionada não está disponível.');
}
export async function createTransaction(transactions, accounts, input) {
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0)
        throw new RangeError('O valor deve ser maior que zero.');
    const date = requireISODate(input.date);
    const description = input.description.trim() || (input.kind === 'transfer' ? 'Transferência' : 'Movimentação');
    const now = new Date().toISOString();
    let transaction;
    if (input.kind === 'transfer') {
        if (input.fromAccountId === input.toAccountId)
            throw new TypeError('Origem e destino devem ser diferentes.');
        await requireActiveAccount(accounts, input.fromAccountId);
        await requireActiveAccount(accounts, input.toAccountId);
        transaction = {
            id: createEntityId('txn'), profileId: input.profileId, kind: 'transfer', amount, date,
            description, entrySource: 'manual', createdAt: now,
            fromAccountId: input.fromAccountId, toAccountId: input.toAccountId
        };
    }
    else if (input.kind === 'expense') {
        await requireActiveAccount(accounts, input.accountId);
        transaction = {
            id: createEntityId('txn'), profileId: input.profileId, kind: 'expense', amount, date,
            description, categoryId: input.categoryId, entrySource: 'manual', createdAt: now,
            settlement: { kind: 'account', accountId: input.accountId, method: input.paymentMethod }
        };
    }
    else {
        await requireActiveAccount(accounts, input.accountId);
        transaction = {
            id: createEntityId('txn'), profileId: input.profileId, kind: input.kind, amount, date,
            description, categoryId: input.categoryId, entrySource: 'manual', createdAt: now,
            accountId: input.accountId
        };
    }
    await transactions.save(transaction);
    return transaction;
}
