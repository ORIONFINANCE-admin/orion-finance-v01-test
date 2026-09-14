export async function refreshPortfolioFundamentals(repository, gateway, profileId, now = new Date()) {
    const instruments = (await repository.listByProfile(profileId)).filter((item) => item.active);
    const items = [];
    for (const instrument of instruments) {
        if (instrument.venue !== 'B3' || !['stock', 'bdr'].includes(instrument.assetClass)) {
            items.push({ instrumentId: instrument.id, symbol: instrument.symbol, status: 'unsupported', warnings: ['Fundamentos automáticos ainda não estão habilitados para esta classe.'] });
            continue;
        }
        const result = await gateway.getFundamentals({
            symbol: instrument.providerSymbol ?? instrument.symbol,
            venue: instrument.venue,
            currency: instrument.currency
        }, now);
        if (!result) {
            items.push({ instrumentId: instrument.id, symbol: instrument.symbol, status: 'unavailable', warnings: ['Nenhuma fonte retornou fundamentos válidos.'] });
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
    const unsupported = items.filter((item) => item.status === 'unsupported').length;
    const unavailable = items.filter((item) => item.status === 'unavailable').length;
    return { attempted: items.length - unsupported, fresh, cached, unsupported, unavailable, items };
}
