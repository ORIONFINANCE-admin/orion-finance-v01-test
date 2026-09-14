import { cents } from '../../domain/money/money.js';
const FUNDAMENTAL_METRICS = new Set([
    'pe_ratio', 'pb_ratio', 'ev_ebitda', 'dividend_yield_pct', 'roe_pct', 'roa_pct', 'roic_pct',
    'current_ratio', 'debt_to_equity_ratio', 'net_debt_to_ebitda', 'net_margin_pct', 'ebitda_margin_pct',
    'revenue_growth_pct', 'earnings_growth_pct'
]);
function isDelay(value) {
    return value === 'realtime' || value === 'delayed' || value === 'end-of-day' || value === 'unknown';
}
function isRole(value) {
    return value === 'primary' || value === 'secondary' || value === 'tertiary';
}
function isFundamentalMetric(value) {
    return typeof value === 'string' && FUNDAMENTAL_METRICS.has(value);
}
function parseQuote(payload, expected) {
    if (payload.symbol !== expected.symbol || payload.venue !== expected.venue || payload.currency !== expected.currency) {
        throw new TypeError('Gateway retornou instrumento diferente do solicitado.');
    }
    if (!Number.isSafeInteger(payload.priceCents) || payload.priceCents < 0) {
        throw new TypeError('Gateway retornou preço monetário inválido.');
    }
    if (typeof payload.providerId !== 'string' || !payload.providerId.trim())
        throw new TypeError('Gateway sem providerId.');
    if (typeof payload.asOf !== 'string' || !Number.isFinite(Date.parse(payload.asOf)))
        throw new TypeError('Gateway sem data de referência válida.');
    if (typeof payload.fetchedAt !== 'string' || !Number.isFinite(Date.parse(payload.fetchedAt)))
        throw new TypeError('Gateway sem data de coleta válida.');
    if (!isDelay(payload.delay))
        throw new TypeError('Gateway retornou delay inválido.');
    return {
        instrument: expected,
        price: cents(payload.priceCents),
        providerId: payload.providerId,
        ...(isRole(payload.providerRole) ? { sourceRole: payload.providerRole } : {}),
        asOf: payload.asOf,
        fetchedAt: payload.fetchedAt,
        delay: payload.delay
    };
}
function parseMetric(payload, expected, providerId) {
    if (!isFundamentalMetric(payload.metric))
        throw new TypeError('Gateway retornou métrica fundamental desconhecida.');
    if (typeof payload.value !== 'number' || !Number.isFinite(payload.value))
        throw new TypeError('Gateway retornou valor fundamental inválido.');
    if (payload.unit !== 'ratio' && payload.unit !== 'percent')
        throw new TypeError('Gateway retornou unidade fundamental inválida.');
    if (payload.providerId !== providerId)
        throw new TypeError('Gateway retornou métrica de provider incompatível.');
    if (typeof payload.referencePeriod !== 'string' || !payload.referencePeriod.trim())
        throw new TypeError('Gateway sem período fundamental.');
    if (typeof payload.fetchedAt !== 'string' || !Number.isFinite(Date.parse(payload.fetchedAt)))
        throw new TypeError('Gateway sem data fundamental válida.');
    return {
        instrument: expected,
        metric: payload.metric,
        value: payload.value,
        unit: payload.unit,
        providerId,
        ...(isRole(payload.providerRole) ? { sourceRole: payload.providerRole } : {}),
        referencePeriod: payload.referencePeriod,
        fetchedAt: payload.fetchedAt
    };
}
function parseFundamentals(payload, expected) {
    if (payload.symbol !== expected.symbol || payload.venue !== expected.venue || payload.currency !== expected.currency) {
        throw new TypeError('Gateway retornou fundamentos de instrumento diferente do solicitado.');
    }
    if (typeof payload.providerId !== 'string' || !payload.providerId.trim())
        throw new TypeError('Gateway fundamental sem providerId.');
    if (typeof payload.fetchedAt !== 'string' || !Number.isFinite(Date.parse(payload.fetchedAt)))
        throw new TypeError('Gateway fundamental sem data de coleta válida.');
    if (!Array.isArray(payload.metrics) || payload.metrics.length === 0)
        throw new TypeError('Gateway fundamental sem métricas.');
    const metrics = payload.metrics.map((item) => parseMetric(item, expected, payload.providerId));
    return {
        instrument: expected,
        metrics,
        providerId: payload.providerId,
        ...(isRole(payload.providerRole) ? { sourceRole: payload.providerRole } : {}),
        fetchedAt: payload.fetchedAt
    };
}
export class HttpMarketGatewayProvider {
    baseUrl;
    fetchImpl;
    metadata = {
        id: 'orion-market-gateway',
        name: 'Orion Market Gateway',
        role: 'primary',
        supportsQuotes: true,
        supportsFundamentals: true,
        commercialUseStatus: 'unknown'
    };
    constructor(baseUrl, fetchImpl = fetch) {
        this.baseUrl = baseUrl;
        this.fetchImpl = fetchImpl;
    }
    async getQuote(instrument) {
        const envelope = await this.request('/v1/quote', instrument);
        return envelope.quote ? parseQuote(envelope.quote, instrument) : null;
    }
    async getFundamentals(instrument) {
        const envelope = await this.request('/v1/fundamentals', instrument);
        return envelope.fundamentals ? parseFundamentals(envelope.fundamentals, instrument) : null;
    }
    async request(path, instrument) {
        const url = new URL(`${this.baseUrl}${path}`);
        url.searchParams.set('symbol', instrument.symbol);
        url.searchParams.set('venue', instrument.venue);
        url.searchParams.set('currency', instrument.currency);
        const response = await this.fetchImpl(url, { headers: { accept: 'application/json' } });
        if (response.status === 404)
            return {};
        if (!response.ok)
            throw new Error(`Market gateway indisponível (${response.status}).`);
        return await response.json();
    }
}
