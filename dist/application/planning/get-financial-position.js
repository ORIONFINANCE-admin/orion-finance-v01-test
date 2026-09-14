import { calculateCashBalances, totalCash } from '../../domain/ledger/ledger.js';
import { addCents, cents, subtractCents, sumCents, ZERO_CENTS } from '../../domain/money/money.js';
import { calculateCreditCardPosition } from '../../domain/credit-cards/invoice.js';
import { calculateDebtPosition } from '../../domain/debts/position.js';
import { calculateAssetPosition } from '../../domain/assets/position.js';
import { calculateMonthCommitments } from '../../domain/recurrences/position.js';
import { calculateNetWorth } from '../../domain/patrimony/net-worth.js';
import { calculateInvestmentPosition, marketValueForPosition } from '../../domain/investments/position.js';
function monthKey(now) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function todayKey(now) {
    return `${monthKey(now)}-${String(now.getDate()).padStart(2, '0')}`;
}
export async function getFinancialPosition(repositories, profileId, now = new Date()) {
    const [accounts, transactions, cards, debts, assets, allocations, recurrences, recurrenceMonths, instruments, trades] = await Promise.all([
        repositories.accounts.listByProfile(profileId), repositories.transactions.listByProfile(profileId),
        repositories.creditCards.listByProfile(profileId), repositories.debts.listByProfile(profileId),
        repositories.assets.listByProfile(profileId), repositories.allocations.listByProfile(profileId),
        repositories.recurrences.listByProfile(profileId), repositories.recurrenceMonths.listByProfile(profileId),
        repositories.investmentInstruments.listByProfile(profileId), repositories.investmentTrades.listByProfile(profileId)
    ]);
    const activeAccounts = accounts.filter((item) => item.active);
    const balances = calculateCashBalances(activeAccounts, transactions, trades);
    const rawCashValues = activeAccounts.map((item) => balances.get(item.id) ?? ZERO_CENTS);
    const cashValues = rawCashValues.filter((value) => value >= 0);
    const accountLiabilities = rawCashValues.filter((value) => value < 0).map((value) => cents(-value));
    const eligibleAccounts = activeAccounts.filter((item) => item.includeInAvailable !== false);
    const eligibleAccountIds = new Set(eligibleAccounts.map((item) => item.id));
    const availableValues = eligibleAccounts.map((item) => balances.get(item.id) ?? ZERO_CENTS);
    const availableNow = sumCents(availableValues);
    const cashTotal = totalCash(balances);
    const activeAllocations = allocations.filter((item) => item.active);
    const totalAllocated = sumCents(activeAllocations.filter((item) => eligibleAccountIds.has(item.accountId)).map((item) => item.amount));
    const commitments = calculateMonthCommitments(recurrences, recurrenceMonths, monthKey(now), todayKey(now));
    const positionedCards = cards.filter((item) => item.active).map((card) => ({ card, position: calculateCreditCardPosition(card, transactions) }));
    const positionedDebts = debts.filter((item) => item.active).map((debt) => ({ debt, position: calculateDebtPosition(debt, transactions) }));
    const positionedAssets = assets.filter((item) => item.active).map((asset) => ({ asset, position: calculateAssetPosition(asset, transactions) }));
    const positionedInvestments = [];
    for (const instrument of instruments.filter((item) => item.active)) {
        const position = calculateInvestmentPosition(instrument.id, trades);
        if (position.quantity === 0 && position.realizedGainLoss === 0)
            continue;
        const quote = position.quantity > 0 && repositories.marketDataCache
            ? await repositories.marketDataCache.getQuote({ symbol: instrument.providerSymbol ?? instrument.symbol, venue: instrument.venue, currency: instrument.currency })
            : null;
        positionedInvestments.push({
            instrument,
            position,
            quote,
            currentValue: quote ? marketValueForPosition(position.quantity, quote.price) : position.costBasis,
            valuationBasis: quote ? 'market' : 'cost'
        });
    }
    const otherAssets = [
        ...positionedAssets.filter((item) => item.asset.includeInNetWorth).map((item) => item.position.currentValue),
        ...positionedInvestments.map((item) => item.currentValue)
    ];
    const debtValues = positionedDebts.map((item) => item.position.outstanding);
    const cardValues = positionedCards.map((item) => item.position.openLiability);
    const netWorth = calculateNetWorth({ cash: cashValues, otherFinancialAssets: otherAssets, accountLiabilities, debts: debtValues, creditCardLiabilities: cardValues });
    const reserved = addCents(totalAllocated, commitments.plannedExpense);
    return {
        availableNow, totalCash: cashTotal, totalAllocated,
        freeToDecide: subtractCents(availableNow, reserved), commitments,
        cards: positionedCards, debts: positionedDebts, assets: positionedAssets, investments: positionedInvestments,
        allocations: activeAllocations, recurrences: recurrences.filter((item) => item.active), recurrenceMonths,
        netWorth
    };
}
