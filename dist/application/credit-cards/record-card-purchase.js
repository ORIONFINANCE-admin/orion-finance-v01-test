import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
import { requireISODate } from '../shared/validation.js';
export async function recordCardPurchase(transactions, cards, _accounts, input) {
    const card = await cards.getById(input.creditCardId);
    if (!card || !card.active || card.profileId !== input.profileId)
        throw new TypeError('Cartão selecionado não está disponível.');
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0)
        throw new RangeError('O valor deve ser maior que zero.');
    const transaction = {
        id: createEntityId('txn'), profileId: input.profileId, kind: 'expense', amount,
        date: requireISODate(input.date), description: input.description.trim() || 'Compra no cartão',
        categoryId: input.categoryId, entrySource: 'manual', createdAt: new Date().toISOString(),
        settlement: { kind: 'credit-card', creditCardId: input.creditCardId }
    };
    await transactions.save(transaction);
    return transaction;
}
