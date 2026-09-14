function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function countCollection(data, key) {
    const value = data[key];
    return Array.isArray(value) ? value.length : 0;
}
export function inspectLegacyV01Backup(raw) {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed))
        throw new TypeError('Backup legado inválido.');
    const version = typeof parsed.version === 'string' ? parsed.version : 'desconhecida';
    if (!isRecord(parsed.data))
        throw new TypeError('Backup legado sem coleção data.');
    const data = parsed.data;
    const keys = ['profiles', 'accounts', 'transactions', 'goals', 'allocations', 'debts', 'recurrences', 'recurrence_months', 'monthly_snapshots'];
    const counts = {};
    for (const key of keys)
        counts[key] = countCollection(data, key);
    const blockers = [];
    const warnings = [];
    if ((counts.debts ?? 0) > 0)
        blockers.push('Há dívidas legadas; aguardar módulo de dívidas da nova geração.');
    if ((counts.recurrences ?? 0) > 0 || (counts.recurrence_months ?? 0) > 0)
        blockers.push('Há recorrências legadas; aguardar módulo de recorrências.');
    if ((counts.goals ?? 0) > 0 || (counts.allocations ?? 0) > 0)
        blockers.push('Há objetivos/alocações legados; aguardar módulo correspondente.');
    if ((counts.monthly_snapshots ?? 0) > 0)
        warnings.push('Snapshots mensais serão recalculados e não migrados como autoridade.');
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const creditPurchases = transactions.filter((value) => isRecord(value) && value.credit_purchase === true).length;
    if (creditPurchases > 0)
        blockers.push(`Há ${creditPurchases} compra(s) de cartão legada(s) que exigem migração do módulo de cartão.`);
    return { version, counts, blockers, warnings, canMigrateCoreNow: blockers.length === 0 };
}
