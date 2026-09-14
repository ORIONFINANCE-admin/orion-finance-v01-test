import { addCents, maxCents, subtractCents, ZERO_CENTS } from '../money/money.js';
export function calculateCreditCardPosition(cardOrId, transactions) {
    const creditCardId = typeof cardOrId === 'string' ? cardOrId : cardOrId.id;
    const openingLiability = typeof cardOrId === 'string' ? ZERO_CENTS : cardOrId.openingLiability;
    let purchasesRecognized = ZERO_CENTS;
    let payments = ZERO_CENTS;
    for (const transaction of transactions) {
        if (transaction.kind === 'expense' &&
            transaction.settlement.kind === 'credit-card' &&
            transaction.settlement.creditCardId === creditCardId)
            purchasesRecognized = addCents(purchasesRecognized, transaction.amount);
        if (transaction.kind === 'credit-card-payment' && transaction.creditCardId === creditCardId) {
            payments = addCents(payments, transaction.amount);
        }
    }
    const grossLiability = addCents(openingLiability, purchasesRecognized);
    const net = subtractCents(grossLiability, payments);
    return {
        purchasesRecognized,
        payments,
        openLiability: maxCents(net, ZERO_CENTS),
        creditBalance: maxCents(subtractCents(ZERO_CENTS, net), ZERO_CENTS)
    };
}
