import { addCents, sumCents, ZERO_CENTS } from '../../domain/money/money.js';
import { calculateInvestmentPosition, marketValueForPosition, unrealizedGainLoss } from '../../domain/investments/position.js';
function quoteIsStale(quote, now) {
    const fetched = Date.parse(quote.fetchedAt);
    return !Number.isFinite(fetched) || now.getTime() - fetched > 36 * 60 * 60 * 1000;
}
export async function getPortfolioSnapshot(repositories, marketCache, profileId, now = new Date()) {
    const [instruments, trades] = await Promise.all([
        repositories.investmentInstruments.listByProfile(profileId), repositories.investmentTrades.listByProfile(profileId)
    ]);
    const items = [];
    let staleQuotes = 0;
    let missingQuotes = 0;
    for (const instrument of instruments.filter((item) => item.active)) {
        const position = calculateInvestmentPosition(instrument.id, trades);
        if (position.quantity === 0 && position.realizedGainLoss === 0)
            continue;
        const quote = position.quantity > 0
            ? await marketCache.getQuote({ symbol: instrument.providerSymbol ?? instrument.symbol, venue: instrument.venue, currency: instrument.currency })
            : null;
        if (!quote && position.quantity > 0)
            missingQuotes += 1;
        if (quote && quoteIsStale(quote, now))
            staleQuotes += 1;
        const marketValue = quote ? marketValueForPosition(position.quantity, quote.price) : position.costBasis;
        items.push({
            instrument,
            position,
            quote,
            marketValue,
            unrealizedGainLoss: quote ? unrealizedGainLoss(position, quote.price) : ZERO_CENTS,
            valuationBasis: quote ? 'market' : 'cost'
        });
    }
    return {
        items,
        costBasis: sumCents(items.map((item) => item.position.costBasis)),
        marketValue: sumCents(items.map((item) => item.marketValue)),
        realizedGainLoss: sumCents(items.map((item) => item.position.realizedGainLoss)),
        unrealizedGainLoss: sumCents(items.map((item) => item.unrealizedGainLoss)),
        staleQuotes,
        missingQuotes
    };
}
export function totalPortfolioPerformance(snapshot) {
    return addCents(snapshot.realizedGainLoss, snapshot.unrealizedGainLoss);
}
export function allocationBasisPoints(item, total) {
    if (total <= 0 || item.marketValue <= 0)
        return 0;
    return Number((BigInt(item.marketValue) * 10000n + BigInt(total) / 2n) / BigInt(total));
}
export function basisPointsToPercent(value) {
    if (!Number.isSafeInteger(value))
        return '0,00%';
    return `${(value / 100).toFixed(2).replace('.', ',')}%`;
}
