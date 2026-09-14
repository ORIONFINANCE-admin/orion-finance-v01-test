function sameInstrument(left, right) {
    return left.symbol === right.symbol && left.venue === right.venue && left.currency === right.currency;
}
function isValidQuote(snapshot, instrument) {
    return sameInstrument(snapshot.instrument, instrument)
        && Number.isSafeInteger(snapshot.price)
        && snapshot.price >= 0
        && Number.isFinite(Date.parse(snapshot.asOf))
        && Number.isFinite(Date.parse(snapshot.fetchedAt));
}
function isValidFundamentals(snapshot, instrument) {
    if (!sameInstrument(snapshot.instrument, instrument) || !snapshot.providerId.trim())
        return false;
    if (!Number.isFinite(Date.parse(snapshot.fetchedAt)) || snapshot.metrics.length === 0)
        return false;
    return snapshot.metrics.every((metric) => sameInstrument(metric.instrument, instrument)
        && metric.providerId === snapshot.providerId
        && Number.isFinite(metric.value)
        && Number.isFinite(Date.parse(metric.fetchedAt))
        && metric.referencePeriod.trim().length > 0);
}
function staleAt(fetchedAt, now, maxAgeMs) {
    const value = Date.parse(fetchedAt);
    return !Number.isFinite(value) || now.getTime() - value > maxAgeMs;
}
export class ResilientMarketDataGateway {
    providers;
    cache;
    freshness;
    constructor(providers, cache, freshness) {
        this.providers = providers;
        this.cache = cache;
        this.freshness = freshness;
        if (providers.length < 1)
            throw new TypeError('Ao menos um provider de market data é obrigatório.');
    }
    async getQuote(instrument, now = new Date()) {
        const warnings = [];
        for (const provider of this.providers) {
            if (!provider.metadata.supportsQuotes)
                continue;
            try {
                const snapshot = await provider.getQuote(instrument);
                if (!snapshot) {
                    warnings.push(`${provider.metadata.id}: sem cotação.`);
                    continue;
                }
                if (!isValidQuote(snapshot, instrument)) {
                    warnings.push(`${provider.metadata.id}: resposta inválida.`);
                    continue;
                }
                await this.cache.saveQuote(snapshot);
                return {
                    value: snapshot,
                    providerId: snapshot.providerId,
                    providerRole: snapshot.sourceRole ?? provider.metadata.role,
                    fromCache: false,
                    stale: staleAt(snapshot.fetchedAt, now, this.freshness.quoteMaxAgeMs),
                    warnings
                };
            }
            catch {
                warnings.push(`${provider.metadata.id}: indisponível.`);
            }
        }
        const cached = await this.cache.getQuote(instrument);
        if (!cached || !isValidQuote(cached, instrument))
            return null;
        return {
            value: cached,
            providerId: cached.providerId,
            providerRole: 'cache',
            fromCache: true,
            stale: staleAt(cached.fetchedAt, now, this.freshness.quoteMaxAgeMs),
            warnings: [...warnings, 'Usando último snapshot local válido.']
        };
    }
    async getFundamentals(instrument, now = new Date()) {
        const warnings = [];
        for (const provider of this.providers) {
            if (!provider.metadata.supportsFundamentals || !provider.getFundamentals)
                continue;
            try {
                const snapshot = await provider.getFundamentals(instrument);
                if (!snapshot) {
                    warnings.push(`${provider.metadata.id}: sem fundamentos.`);
                    continue;
                }
                if (!isValidFundamentals(snapshot, instrument)) {
                    warnings.push(`${provider.metadata.id}: fundamentos inválidos.`);
                    continue;
                }
                await this.cache.saveFundamentals(snapshot);
                return {
                    value: snapshot,
                    providerId: snapshot.providerId,
                    providerRole: snapshot.sourceRole ?? provider.metadata.role,
                    fromCache: false,
                    stale: staleAt(snapshot.fetchedAt, now, this.freshness.fundamentalsMaxAgeMs),
                    warnings
                };
            }
            catch {
                warnings.push(`${provider.metadata.id}: fundamentos indisponíveis.`);
            }
        }
        const cached = await this.cache.getFundamentals(instrument);
        if (!cached || !isValidFundamentals(cached, instrument))
            return null;
        return {
            value: cached,
            providerId: cached.providerId,
            providerRole: 'cache',
            fromCache: true,
            stale: staleAt(cached.fetchedAt, now, this.freshness.fundamentalsMaxAgeMs),
            warnings: [...warnings, 'Usando último snapshot fundamental local válido.']
        };
    }
}
