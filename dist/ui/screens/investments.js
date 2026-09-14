import { assessFundamentals } from '../../application/investments/radar-assessment.js';
import { allocationBasisPoints, basisPointsToPercent, getPortfolioSnapshot, totalPortfolioPerformance } from '../../application/investments/portfolio.js';
import { formatQuantity } from '../../domain/investments/quantity.js';
import { formatBRL } from '../../domain/money/money.js';
import { el } from '../dom.js';
import { openCreateInstrumentSheet, openManualFundamentalsSheet, openManualQuoteSheet, openTradeSheet } from './investments/forms.js';
const RADAR_METRICS = [
    'pe_ratio', 'pb_ratio', 'roe_pct', 'roic_pct', 'net_debt_to_ebitda', 'net_margin_pct'
];
const METRIC_LABELS = {
    pe_ratio: 'P/L', pb_ratio: 'P/VP', ev_ebitda: 'EV/EBITDA', dividend_yield_pct: 'DY',
    roe_pct: 'ROE', roa_pct: 'ROA', roic_pct: 'ROIC', current_ratio: 'Liquidez',
    debt_to_equity_ratio: 'Dívida/PL', net_debt_to_ebitda: 'Dív. líquida/EBITDA',
    net_margin_pct: 'Margem líquida', ebitda_margin_pct: 'Margem EBITDA',
    revenue_growth_pct: 'Cresc. receita', earnings_growth_pct: 'Cresc. lucro'
};
function freshnessLabel(instrument, quote) {
    if (!quote)
        return `${instrument.symbol} · sem cotação`;
    const when = new Date(quote.fetchedAt);
    const date = Number.isFinite(when.getTime()) ? when.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'data desconhecida';
    return `${quote.providerId === 'manual' ? 'Manual' : quote.providerId} · ${date}`;
}
function performanceClass(value) {
    return value > 0 ? 'positive-text' : value < 0 ? 'negative-text' : 'neutral-text';
}
function supportsGeneralFundamentals(instrument) {
    return instrument.venue === 'B3' && (instrument.assetClass === 'stock' || instrument.assetClass === 'bdr');
}
function adherenceLabel(assessment) {
    if (assessment.adherence === 'high')
        return 'Aderência alta';
    if (assessment.adherence === 'moderate')
        return 'Aderência moderada';
    if (assessment.adherence === 'low')
        return 'Aderência baixa';
    return 'Dados insuficientes';
}
function adherenceClass(assessment) {
    if (assessment.adherence === 'high')
        return 'radar-adherence-high';
    if (assessment.adherence === 'moderate')
        return 'radar-adherence-moderate';
    if (assessment.adherence === 'low')
        return 'radar-adherence-low';
    return 'radar-adherence-insufficient';
}
function fundamentalAge(snapshot) {
    const when = new Date(snapshot.fetchedAt);
    if (!Number.isFinite(when.getTime()))
        return 'data desconhecida';
    const ageDays = Math.floor(Math.max(0, Date.now() - when.getTime()) / 86_400_000);
    const date = when.toLocaleDateString('pt-BR');
    return ageDays > 7 ? `${snapshot.providerId} · ${date} · desatualizado` : `${snapshot.providerId} · ${date}`;
}
function formatFundamental(value, unit) {
    return unit === 'percent'
        ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
        : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x`;
}
function radarAssessmentBlock(snapshot, assessment) {
    const metrics = new Map(snapshot.metrics.map((item) => [item.metric, item]));
    const chips = el('div', 'radar-metric-grid');
    for (const key of RADAR_METRICS) {
        const metric = metrics.get(key);
        if (!metric)
            continue;
        chips.append(el('div', 'radar-metric-chip', [
            el('small', '', [METRIC_LABELS[key]]),
            el('strong', '', [formatFundamental(metric.value, metric.unit)])
        ]));
    }
    return el('div', 'radar-assessment', [
        el('div', 'radar-assessment-head', [
            el('span', `radar-adherence ${adherenceClass(assessment)}`, [adherenceLabel(assessment)]),
            el('span', 'radar-coverage', [assessment.scorePercent == null
                    ? `${assessment.coverage}/${assessment.expectedCriteria} critérios`
                    : `${assessment.scorePercent}% · ${assessment.coverage}/${assessment.expectedCriteria}`])
        ]),
        chips,
        el('small', 'radar-source', [`Fundamentos: ${fundamentalAge(snapshot)} · referência preservada por indicador`])
    ]);
}
export async function renderInvestments(repositories, marketCache, profile, actions) {
    const [portfolio, instruments] = await Promise.all([
        getPortfolioSnapshot(repositories, marketCache, profile.id),
        repositories.investmentInstruments.listByProfile(profile.id)
    ]);
    const activeInstruments = instruments.filter((item) => item.active);
    const root = el('div', 'screen investments-screen');
    const back = el('button', 'text-action investment-back', ['‹ Planejar']);
    back.type = 'button';
    back.addEventListener('click', actions.onBack);
    const add = el('button', 'btn primary compact', ['+ Ativo']);
    add.type = 'button';
    add.addEventListener('click', () => openCreateInstrumentSheet(repositories, profile, actions.onChanged));
    root.append(el('div', 'screen-heading investments-heading', [
        el('div', '', [back, el('h1', '', ['Investimentos']), el('p', '', ['Carteira e Radar sem misturar valorização com renda realizada.'])]), add
    ]));
    const performance = totalPortfolioPerformance(portfolio);
    root.append(el('section', 'investment-hero', [
        el('div', 'investment-hero-top', [el('span', 'eyebrow', ['CARTEIRA']), el('span', 'investment-data-badge', [portfolio.missingQuotes > 0 ? `${portfolio.missingQuotes} sem cotação` : 'Dados conciliados'])]),
        el('strong', 'investment-total', [formatBRL(portfolio.marketValue)]),
        el('div', 'investment-hero-grid', [
            investmentMetric('Custo atual', formatBRL(portfolio.costBasis)),
            investmentMetric('Realizado', formatBRL(portfolio.realizedGainLoss), performanceClass(portfolio.realizedGainLoss)),
            investmentMetric('Não realizado', formatBRL(portfolio.unrealizedGainLoss), performanceClass(portfolio.unrealizedGainLoss)),
            investmentMetric('Performance', formatBRL(performance), performanceClass(performance))
        ])
    ]));
    const refresh = el('button', 'btn secondary full-width investment-refresh', [actions.onRefreshMarket ? 'Atualizar cotações e fundamentos' : 'Gateway de mercado ainda não configurado']);
    refresh.type = 'button';
    refresh.disabled = !actions.onRefreshMarket;
    if (actions.onRefreshMarket)
        refresh.addEventListener('click', () => {
            refresh.disabled = true;
            refresh.textContent = 'Atualizando…';
            void actions.onRefreshMarket().then((message) => { refresh.textContent = message; window.setTimeout(() => actions.onChanged(), 450); })
                .catch(() => { refresh.textContent = 'Falha ao atualizar · tente novamente'; refresh.disabled = false; });
        });
    root.append(refresh);
    const portfolioSection = el('section', 'section-block');
    portfolioSection.append(el('div', 'section-title-row', [el('h2', '', ['Carteira']), el('span', 'section-caption', [`${portfolio.items.length} posições`])]));
    if (portfolio.items.length === 0) {
        portfolioSection.append(el('div', 'empty-card investment-empty', [el('strong', '', ['Nenhuma posição ainda']), el('span', '', ['Adicione um ativo ao Radar e registre a primeira compra quando estiver pronto.'])]));
    }
    else {
        const list = el('div', 'investment-list');
        for (const item of portfolio.items) {
            const allocation = basisPointsToPercent(allocationBasisPoints(item, portfolio.marketValue));
            const trade = el('button', 'text-action', ['Negociar']);
            trade.type = 'button';
            trade.addEventListener('click', () => void openTradeSheet(repositories, profile, item.instrument, actions.onChanged));
            const quote = el('button', 'icon-text-action', ['Cotação']);
            quote.type = 'button';
            quote.addEventListener('click', () => openManualQuoteSheet(marketCache, item.instrument, actions.onChanged));
            list.append(el('article', 'investment-row', [
                el('div', 'investment-symbol', [item.instrument.symbol.slice(0, 5)]),
                el('div', 'investment-copy', [
                    el('strong', '', [item.instrument.symbol]),
                    el('small', '', [`${formatQuantity(item.position.quantity)} un. · ${allocation} da carteira`]),
                    el('em', '', [freshnessLabel(item.instrument, item.quote)])
                ]),
                el('div', 'investment-value', [
                    el('strong', '', [formatBRL(item.marketValue)]),
                    el('small', performanceClass(item.unrealizedGainLoss), [item.valuationBasis === 'market' ? formatBRL(item.unrealizedGainLoss) : 'a custo'])
                ]),
                el('div', 'investment-actions', [trade, quote])
            ]));
        }
        portfolioSection.append(list);
    }
    root.append(portfolioSection);
    const radar = el('section', 'section-block radar-section');
    radar.append(el('div', 'section-title-row', [el('h2', '', ['Radar']), el('span', 'section-caption', [`${activeInstruments.length} acompanhados`])]));
    if (activeInstruments.length === 0) {
        radar.append(el('div', 'empty-card', [el('strong', '', ['Radar vazio']), el('span', '', ['Cadastre ações, FIIs, ETFs ou outros ativos que deseja acompanhar, mesmo antes de comprar.'])]));
    }
    else {
        const list = el('div', 'radar-list');
        for (const instrument of activeInstruments) {
            const held = portfolio.items.find((item) => item.instrument.id === instrument.id);
            const ref = { symbol: instrument.providerSymbol ?? instrument.symbol, venue: instrument.venue, currency: instrument.currency };
            const [quoteSnapshot, fundamentalSnapshot] = await Promise.all([
                marketCache.getQuote(ref), marketCache.getFundamentals(ref)
            ]);
            const generalModelSupported = supportsGeneralFundamentals(instrument);
            const assessment = fundamentalSnapshot && generalModelSupported ? assessFundamentals(fundamentalSnapshot) : null;
            const trade = el('button', 'btn secondary compact', [held ? 'Operar' : 'Registrar compra']);
            trade.type = 'button';
            trade.addEventListener('click', () => void openTradeSheet(repositories, profile, instrument, actions.onChanged));
            const manualQuote = el('button', 'icon-text-action', ['Preço']);
            manualQuote.type = 'button';
            manualQuote.addEventListener('click', () => openManualQuoteSheet(marketCache, instrument, actions.onChanged));
            const manualFundamentals = el('button', 'icon-text-action', ['Fundamentos']);
            manualFundamentals.type = 'button';
            manualFundamentals.addEventListener('click', () => openManualFundamentalsSheet(marketCache, instrument, actions.onChanged));
            const card = el('article', 'radar-row', [
                el('div', 'radar-main', [el('strong', '', [instrument.symbol]), el('span', '', [instrument.name]), el('small', '', [freshnessLabel(instrument, quoteSnapshot)])]),
                el('div', 'radar-price', [el('strong', '', [quoteSnapshot ? formatBRL(quoteSnapshot.price) : '—']), el('small', '', [instrument.assetClass.toUpperCase()])])
            ]);
            if (assessment && fundamentalSnapshot)
                card.append(radarAssessmentBlock(fundamentalSnapshot, assessment));
            else if (generalModelSupported)
                card.append(el('div', 'radar-assessment radar-assessment-empty', [
                    el('strong', '', ['Longo prazo · aguardando fundamentos']),
                    el('span', '', [actions.onRefreshMarket ? 'Atualize os dados ou informe fundamentos manualmente.' : 'Informe fundamentos manualmente enquanto o gateway não estiver configurado.'])
                ]));
            else
                card.append(el('div', 'radar-assessment radar-assessment-empty', [
                    el('strong', '', ['Modelo geral não aplicado']),
                    el('span', '', ['Esta classe exige critérios próprios antes de receber uma aderência automática.'])
                ]));
            card.append(el('div', 'radar-actions', [trade, manualQuote, ...(generalModelSupported ? [manualFundamentals] : [])]));
            list.append(card);
        }
        radar.append(list);
    }
    radar.append(el('div', 'architecture-note radar-note', [
        el('strong', '', ['Análise por critérios · transparente']),
        el('span', '', ['A aderência usa somente indicadores presentes e preserva a referência de cada dado. É informativa, não prevê retorno e não substitui análise do setor, risco ou decisão do usuário.'])
    ]));
    root.append(radar);
    return root;
}
function investmentMetric(label, value, tone = '') {
    return el('div', 'investment-metric', [el('small', '', [label]), el('strong', tone, [value])]);
}
