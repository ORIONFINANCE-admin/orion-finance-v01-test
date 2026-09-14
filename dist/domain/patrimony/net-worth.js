import { addCents, subtractCents, sumCents } from '../money/money.js';
export function calculateNetWorth(input) {
    const assets = addCents(sumCents(input.cash), sumCents(input.otherFinancialAssets));
    const accountLiabilities = sumCents(input.accountLiabilities ?? []);
    const liabilities = addCents(accountLiabilities, addCents(sumCents(input.debts), sumCents(input.creditCardLiabilities)));
    return { assets, liabilities, netWorth: subtractCents(assets, liabilities) };
}
