import { parseMajorToCents } from '../../domain/money/money.js';
export async function saveManualQuote(cache, instrument, rawPrice, now = new Date()) {
    const price = parseMajorToCents(rawPrice);
    if (price <= 0)
        throw new RangeError('A cotação deve ser maior que zero.');
    const timestamp = now.toISOString();
    const snapshot = {
        instrument: { symbol: instrument.providerSymbol ?? instrument.symbol, venue: instrument.venue, currency: instrument.currency },
        price,
        providerId: 'manual',
        asOf: timestamp,
        fetchedAt: timestamp,
        delay: 'unknown'
    };
    await cache.saveQuote(snapshot);
    return snapshot;
}
