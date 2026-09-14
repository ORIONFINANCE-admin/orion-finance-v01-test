import { addCents, ZERO_CENTS } from '../../domain/money/money.js';
import { asArray, asRecord, createdAt, legacyMoney, numberValue, optionalRate, optionalString, stringValue, updatedAt } from './shared.js';
function debtInstitution(record) {
    const raw = `${stringValue(record, 'creditor')} ${stringValue(record, 'name')}`.toLowerCase();
    if (raw.includes('inter'))
        return 'inter';
    if (raw.includes('bradesco'))
        return 'bradesco';
    if (raw.includes('nubank'))
        return 'nubank';
    if (raw.includes('itau') || raw.includes('itaú'))
        return 'itau';
    if (raw.includes('santander'))
        return 'santander';
    return undefined;
}
function debtKind(value) {
    if (value === 'formal' || value === 'informal' || value === 'tax')
        return value;
    return 'other';
}
function debtPriority(value) {
    if (value === 'high' || value === 'medium' || value === 'low')
        return value;
    return 'medium';
}
export function convertLegacyDebts(data, profileId, exportedAt) {
    return asArray(data, 'debts').map((item) => {
        const record = asRecord(item, 'Dívida legada');
        const id = stringValue(record, 'id');
        if (!id)
            throw new TypeError('Dívida legada sem id.');
        const settlementOffer = legacyMoney(record, 'settlement_amount');
        const monthlyRate = optionalRate(record, 'monthly_rate');
        const annualRate = optionalRate(record, 'annual_rate');
        const institutionId = debtInstitution(record);
        const creditor = optionalString(record, 'creditor');
        const baseDate = optionalString(record, 'base_date');
        const offerExpiry = optionalString(record, 'offer_expiry');
        const note = optionalString(record, 'note');
        return {
            id,
            profileId,
            name: stringValue(record, 'name', 'Dívida').trim() || 'Dívida',
            ...(creditor ? { creditor } : {}),
            ...(institutionId ? { institutionId } : {}),
            kind: debtKind(stringValue(record, 'kind')),
            ...(baseDate ? { baseDate } : {}),
            openingBalance: legacyMoney(record, 'base_balance'),
            ...(settlementOffer > ZERO_CENTS ? { settlementOffer } : {}),
            ...(offerExpiry ? { offerExpiry } : {}),
            priority: debtPriority(stringValue(record, 'priority')),
            ...(monthlyRate !== undefined ? { monthlyRate } : {}),
            ...(annualRate !== undefined ? { annualRate } : {}),
            ...(note ? { note } : {}),
            active: record.active !== false,
            createdAt: createdAt(record, exportedAt),
            updatedAt: updatedAt(record, exportedAt)
        };
    });
}
function goalAllocationAmounts(data) {
    const totals = new Map();
    for (const item of asArray(data, 'allocations')) {
        const record = asRecord(item, 'Alocação legada');
        const goalId = stringValue(record, 'goal_id');
        if (!goalId)
            continue;
        totals.set(goalId, addCents(totals.get(goalId) ?? ZERO_CENTS, legacyMoney(record, 'amount')));
    }
    return totals;
}
export function convertLegacyAllocations(data, profileId, validAccountIds, exportedAt, warnings) {
    const totals = goalAllocationAmounts(data);
    const goals = asArray(data, 'goals').map((item) => asRecord(item, 'Objetivo legado'));
    const result = [];
    const knownGoalIds = new Set();
    for (const goal of goals) {
        const id = stringValue(goal, 'id');
        const accountId = stringValue(goal, 'account_id');
        if (!id || !validAccountIds.has(accountId)) {
            warnings.push(`Objetivo legado ${id || '(sem id)'} ignorado por conta ausente.`);
            continue;
        }
        knownGoalIds.add(id);
        const target = legacyMoney(goal, 'target');
        const monthly = legacyMoney(goal, 'monthly');
        const description = optionalString(goal, 'description');
        result.push({
            id: `allocation_${id}`,
            profileId,
            accountId,
            name: stringValue(goal, 'name', 'Objetivo').trim() || 'Objetivo',
            amount: totals.get(id) ?? ZERO_CENTS,
            ...(target > ZERO_CENTS ? { targetAmount: target } : {}),
            ...(monthly > ZERO_CENTS ? { suggestedMonthlyAmount: monthly } : {}),
            ...(description ? { description } : {}),
            protected: false,
            active: true,
            createdAt: createdAt(goal, exportedAt),
            updatedAt: exportedAt
        });
    }
    for (const item of asArray(data, 'allocations')) {
        const record = asRecord(item, 'Alocação legada');
        const goalId = stringValue(record, 'goal_id');
        if (goalId && knownGoalIds.has(goalId))
            continue;
        const accountId = stringValue(record, 'account_id');
        if (!validAccountIds.has(accountId))
            continue;
        const amount = legacyMoney(record, 'amount');
        if (amount <= ZERO_CENTS)
            continue;
        result.push({
            id: `allocation_legacy_${stringValue(record, 'id', `${accountId}_${result.length}`)}`,
            profileId,
            accountId,
            name: 'Alocação importada',
            amount,
            protected: false,
            active: true,
            createdAt: createdAt(record, exportedAt),
            updatedAt: updatedAt(record, exportedAt)
        });
    }
    return result;
}
function recurrencePriority(value) {
    return value === 'essential' ? 'essential' : 'flexible';
}
export function convertLegacyRecurrences(data, profileId, links, exportedAt, warnings) {
    const recurrences = asArray(data, 'recurrences').map((item) => {
        const record = asRecord(item, 'Recorrência legada');
        const id = stringValue(record, 'id');
        if (!id)
            throw new TypeError('Recorrência legada sem id.');
        const dueDay = numberValue(record, 'due_day', 1);
        const categoryId = optionalString(record, 'category');
        const endMonth = optionalString(record, 'end_month');
        const note = optionalString(record, 'note');
        return {
            id,
            profileId,
            name: stringValue(record, 'name', 'Compromisso').trim() || 'Compromisso',
            kind: 'expense',
            amount: legacyMoney(record, 'amount'),
            ...(categoryId ? { categoryId } : {}),
            dayOfMonth: Number.isSafeInteger(dueDay) && dueDay >= 1 && dueDay <= 31 ? dueDay : 1,
            startMonth: stringValue(record, 'start_month', exportedAt.slice(0, 7)),
            ...(endMonth ? { endMonth } : {}),
            priority: recurrencePriority(stringValue(record, 'priority')),
            ...(note ? { note } : {}),
            active: record.active !== false,
            createdAt: createdAt(record, exportedAt),
            updatedAt: updatedAt(record, exportedAt)
        };
    });
    const states = new Map();
    for (const item of asArray(data, 'recurrence_months')) {
        const record = asRecord(item, 'Estado mensal de recorrência legado');
        const recurrenceId = stringValue(record, 'recurrence_id');
        const month = stringValue(record, 'month');
        if (!recurrenceId || !/^\d{4}-\d{2}$/.test(month))
            continue;
        const rawStatus = stringValue(record, 'status');
        const status = rawStatus === 'ignored' ? 'ignored' : rawStatus === 'paid' ? 'paid' : 'planned';
        states.set(`${recurrenceId}:${month}`, {
            id: `${recurrenceId}_${month}`,
            recurrenceId,
            profileId,
            month,
            status,
            updatedAt: updatedAt(record, exportedAt)
        });
    }
    for (const link of links) {
        if (!/^\d{4}-\d{2}$/.test(link.month))
            continue;
        const key = `${link.recurrenceId}:${link.month}`;
        const current = states.get(key);
        if (current?.status === 'ignored')
            warnings.push(`Recorrência ${link.recurrenceId} em ${link.month} tinha pagamento e estado ignorado; pagamento prevaleceu.`);
        states.set(key, {
            id: `${link.recurrenceId}_${link.month}`,
            recurrenceId: link.recurrenceId,
            profileId,
            month: link.month,
            status: 'paid',
            linkedTransactionId: link.transactionId,
            updatedAt: exportedAt
        });
    }
    return { recurrences, recurrenceMonths: [...states.values()] };
}
