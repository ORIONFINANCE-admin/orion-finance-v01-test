import { calculateCreditCardPosition } from '../../domain/credit-cards/invoice.js';
import { parseMajorToCents } from '../../domain/money/money.js';
import { calculateAssetPosition } from '../../domain/assets/position.js';
import { createEntityId } from '../shared/ids.js';
import { requireISODate } from '../shared/validation.js';
export async function payCreditCard(transactions, cards, accounts, assets, input) {
    const card = await cards.getById(input.creditCardId);
    if (!card || card.profileId !== input.profileId)
        throw new TypeError('Cartão inválido.');
    const history = await transactions.listByProfile(input.profileId);
    const position = calculateCreditCardPosition(card, history);
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0 || amount > position.openLiability)
        throw new RangeError('Pagamento deve ser positivo e não pode exceder a fatura aberta.');
    if (input.source.kind === 'account') {
        const account = await accounts.getById(input.source.accountId);
        if (!account || account.profileId !== input.profileId || !account.active)
            throw new TypeError('Conta de pagamento inválida.');
    }
    else {
        const asset = await assets.getById(input.source.assetId);
        if (!asset || asset.profileId !== input.profileId || asset.kind !== 'guarantee')
            throw new TypeError('Garantia inválida.');
        const assetPosition = calculateAssetPosition(asset, history);
        if (amount > assetPosition.currentValue)
            throw new RangeError('Pagamento excede o valor atual da garantia.');
    }
    const transaction = {
        id: createEntityId('txn'), profileId: input.profileId, kind: 'credit-card-payment', amount,
        date: requireISODate(input.date), description: 'Pagamento de fatura', entrySource: 'manual',
        createdAt: new Date().toISOString(), creditCardId: input.creditCardId, source: input.source
    };
    await transactions.save(transaction);
    return transaction;
}
