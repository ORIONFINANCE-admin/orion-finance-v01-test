import { addCents, maxCents, subtractCents, ZERO_CENTS } from '../money/money.js';
export function calculateDebtPosition(debt, transactions) {
    let paid = ZERO_CENTS;
    for (const transaction of transactions) {
        if (transaction.kind === 'debt-payment' && transaction.debtId === debt.id) {
            paid = addCents(paid, transaction.amount);
        }
    }
    const outstanding = maxCents(subtractCents(debt.openingBalance, paid), ZERO_CENTS);
    return debt.settlementOffer === undefined
        ? { paid, outstanding }
        : { paid, outstanding, settlementOffer: debt.settlementOffer };
}
