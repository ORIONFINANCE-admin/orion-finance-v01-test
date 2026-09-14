const PERCENT_METRICS = new Set([
    'dividend_yield_pct', 'roe_pct', 'roa_pct', 'roic_pct', 'net_margin_pct', 'ebitda_margin_pct',
    'revenue_growth_pct', 'earnings_growth_pct'
]);
function parseOptionalNumber(raw) {
    if (raw == null || !raw.trim())
        return null;
    const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value))
        throw new TypeError(`Valor fundamental inválido: ${raw}`);
    return value;
}
export async function saveManualFundamentals(cache, instrument, input) {
    const referencePeriod = input.referencePeriod.trim();
    if (!referencePeriod)
        throw new TypeError('Informe o período de referência dos fundamentos.');
    const now = new Date().toISOString();
    const instrumentRef = { symbol: instrument.providerSymbol ?? instrument.symbol, venue: instrument.venue, currency: instrument.currency };
    const metrics = [];
    for (const [key, raw] of Object.entries(input.values)) {
        const value = parseOptionalNumber(raw);
        if (value == null)
            continue;
        metrics.push({
            instrument: instrumentRef,
            metric: key,
            value,
            unit: PERCENT_METRICS.has(key) ? 'percent' : 'ratio',
            providerId: 'manual',
            referencePeriod,
            fetchedAt: now
        });
    }
    if (metrics.length === 0)
        throw new TypeError('Informe pelo menos um indicador fundamentalista.');
    await cache.saveFundamentals({ instrument: instrumentRef, metrics, providerId: 'manual', fetchedAt: now });
}
