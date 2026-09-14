function higherIsBetter(positiveAt, neutralAt, unitLabel) {
    return (value) => value >= positiveAt
        ? { status: 'positive', explanation: `Acima do critério de ${positiveAt}${unitLabel}.` }
        : value >= neutralAt
            ? { status: 'neutral', explanation: `Faixa intermediária entre ${neutralAt}${unitLabel} e ${positiveAt}${unitLabel}.` }
            : { status: 'attention', explanation: `Abaixo do critério de ${neutralAt}${unitLabel}.` };
}
function lowerIsBetter(positiveAt, neutralAt) {
    return (value) => value > 0 && value <= positiveAt
        ? { status: 'positive', explanation: `Dentro do critério de até ${positiveAt}.` }
        : value > 0 && value <= neutralAt
            ? { status: 'neutral', explanation: `Faixa intermediária entre ${positiveAt} e ${neutralAt}.` }
            : { status: 'attention', explanation: value <= 0 ? 'Valor não positivo exige interpretação contextual.' : `Acima do critério de ${neutralAt}.` };
}
const CRITERIA = [
    { metric: 'roe_pct', label: 'ROE', evaluate: higherIsBetter(15, 10, '%') },
    { metric: 'roic_pct', label: 'ROIC', evaluate: higherIsBetter(12, 8, '%') },
    { metric: 'net_margin_pct', label: 'Margem líquida', evaluate: higherIsBetter(10, 5, '%') },
    { metric: 'revenue_growth_pct', label: 'Crescimento de receita', evaluate: higherIsBetter(6, 2, '%') },
    { metric: 'earnings_growth_pct', label: 'Crescimento de lucro', evaluate: higherIsBetter(6, 2, '%') },
    { metric: 'current_ratio', label: 'Liquidez corrente', evaluate: higherIsBetter(1.25, 1, 'x') },
    { metric: 'debt_to_equity_ratio', label: 'Dívida / patrimônio', evaluate: lowerIsBetter(1, 2) },
    { metric: 'net_debt_to_ebitda', label: 'Dívida líquida / EBITDA', evaluate: lowerIsBetter(2, 3.5) },
    { metric: 'pe_ratio', label: 'P/L', evaluate: lowerIsBetter(18, 28) },
    { metric: 'pb_ratio', label: 'P/VP', evaluate: lowerIsBetter(2.5, 4) },
    { metric: 'ev_ebitda', label: 'EV/EBITDA', evaluate: lowerIsBetter(10, 15) }
];
function latestByMetric(metrics) {
    const result = new Map();
    for (const metric of metrics)
        if (!result.has(metric.metric))
            result.set(metric.metric, metric);
    return result;
}
export function assessFundamentals(snapshot) {
    const byMetric = latestByMetric(snapshot.metrics);
    const criteria = [];
    for (const definition of CRITERIA) {
        const metric = byMetric.get(definition.metric);
        if (!metric)
            continue;
        const result = definition.evaluate(metric.value);
        criteria.push({
            metric: definition.metric,
            label: definition.label,
            value: metric.value,
            unit: metric.unit,
            referencePeriod: metric.referencePeriod,
            status: result.status,
            explanation: result.explanation
        });
    }
    const positive = criteria.filter((item) => item.status === 'positive').length;
    const neutral = criteria.filter((item) => item.status === 'neutral').length;
    const attention = criteria.filter((item) => item.status === 'attention').length;
    const coverage = criteria.length;
    const scorePercent = coverage >= 5 ? Math.round(((positive + neutral * 0.5) / coverage) * 100) : null;
    const adherence = scorePercent == null
        ? 'insufficient'
        : scorePercent >= 75
            ? 'high'
            : scorePercent >= 55
                ? 'moderate'
                : 'low';
    return {
        adherence,
        scorePercent,
        coverage,
        expectedCriteria: CRITERIA.length,
        positive,
        neutral,
        attention,
        criteria,
        providerId: snapshot.providerId,
        fetchedAt: snapshot.fetchedAt
    };
}
export function fundamentalCriterionCount() {
    return CRITERIA.length;
}
