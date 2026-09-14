export async function refreshPortfolioQuotes(repository, gateway, profileId, now = new Date()) {
    const instruments = (await repository.listByProfile(profileId)).filter((item) => item.active);
    const items = [];
    for (const instrument of instruments) {
        const result = await gateway.getQuote({
            symbol: instrument.providerSymbol ?? instrument.symbol,
            venue: instrument.venue,
            currency: instrument.currency
        }, now);
        if (!result) {
            items.push({ instrumentId: instrument.id, symbol: instrument.symbol, status: 'unavailable', warnings: ['Nenhuma fonte retornou cotação válida.'] });
            continue;
        }
        items.push({
            instrumentId: instrument.id,
            symbol: instrument.symbol,
            status: result.fromCache ? 'cached' : 'fresh',
            providerId: result.providerId,
            stale: result.stale,
            warnings: result.warnings
        });
    }
    const fresh = items.filter((item) => item.status === 'fresh').length;
    const cached = items.filter((item) => item.status === 'cached').length;
    return { attempted: items.length, fresh, cached, unavailable: items.length - fresh - cached, items };
}
