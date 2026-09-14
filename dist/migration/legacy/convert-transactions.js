import { addCents, ZERO_CENTS } from '../../domain/money/money.js';
import { asArray, asRecord, booleanValue, createdAt, isoDateFromTimestamp, legacyMoney, optionalString, stringValue, updatedAt } from './shared.js';
function paymentMethod(value) {
    if (value === 'pix')
        return 'pix';
    if (value === 'debito')
        return 'debit';
    if (value === 'dinheiro')
        return 'cash';
    if (value === 'credito')
        return 'credit-rail';
    return 'other';
}
function transactionBase(record, profileId, exportedAt) {
    const id = stringValue(record, 'id');
    if (!id)
        throw new TypeError('Movimentação legada sem id.');
    const description = optionalString(record, 'description');
    const categoryId = optionalString(record, 'category');
    const note = optionalString(record, 'note');
    return {
        id,
        profileId,
        amount: legacyMoney(record, 'amount'),
        date: stringValue(record, 'date', exportedAt.slice(0, 10)),
        ...(description ? { description } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(note ? { note } : {}),
        createdAt: createdAt(record, exportedAt),
        updatedAt: updatedAt(record, exportedAt),
        entrySource: 'manual'
    };
}
function requireAccount(contexts, id) {
    const context = contexts.get(id);
    if (!context)
        throw new TypeError(`Movimentação legada referencia conta ausente: ${id}.`);
    return context;
}
function monthFor(record) {
    const explicit = stringValue(record, 'recurrence_month');
    if (/^\d{4}-\d{2}$/.test(explicit))
        return explicit;
    return stringValue(record, 'date').slice(0, 7);
}
export function convertLegacyTransactions(data, profileId, accountContexts, exportedAt) {
    const legacyTransactions = asArray(data, 'transactions').map((item) => asRecord(item, 'Movimentação legada'));
    const transactions = [];
    const warnings = [];
    const recurrenceLinks = [];
    const invoicePaymentIds = new Set(legacyTransactions.filter((item) => booleanValue(item, 'is_invoice_payment')).map((item) => stringValue(item, 'id')));
    const syntheticGroups = new Map();
    for (const legacy of legacyTransactions) {
        const base = transactionBase(legacy, profileId, exportedAt);
        const type = stringValue(legacy, 'type');
        const recurrenceId = optionalString(legacy, 'recurrence_id');
        if (recurrenceId)
            recurrenceLinks.push({ recurrenceId, month: monthFor(legacy), transactionId: base.id });
        if (type === 'transferencia') {
            const from = stringValue(legacy, 'from_account_id');
            const to = stringValue(legacy, 'to_account_id');
            requireAccount(accountContexts, from);
            requireAccount(accountContexts, to);
            if (from === to)
                throw new TypeError(`Transferência legada ${base.id} possui origem igual ao destino.`);
            transactions.push({ ...base, kind: 'transfer', fromAccountId: from, toAccountId: to });
            continue;
        }
        const accountId = stringValue(legacy, 'account_id');
        const account = requireAccount(accountContexts, accountId);
        if (booleanValue(legacy, 'is_debt_payment')) {
            const debtId = stringValue(legacy, 'debt_id');
            if (!debtId)
                throw new TypeError(`Pagamento de dívida ${base.id} sem debt_id.`);
            transactions.push({ ...base, kind: 'debt-payment', debtId, accountId });
            continue;
        }
        if (booleanValue(legacy, 'is_invoice_payment')) {
            if (!account.cardId)
                throw new TypeError(`Pagamento de fatura ${base.id} sem cartão correspondente.`);
            const source = stringValue(legacy, 'invoice_payment_source') === 'guarantee'
                ? { kind: 'guarantee-asset', assetId: account.guaranteeAssetId ?? `asset_legacy_guarantee_${accountId}` }
                : { kind: 'account', accountId };
            transactions.push({ ...base, kind: 'credit-card-payment', creditCardId: account.cardId, source });
            continue;
        }
        if (type === 'entrada' || type === 'rendimento') {
            transactions.push({ ...base, kind: type === 'rendimento' ? 'yield' : 'income', accountId });
            continue;
        }
        if (type !== 'saida')
            throw new TypeError(`Tipo de movimentação legado não suportado: ${type}.`);
        const isCardPurchase = booleanValue(legacy, 'credit_purchase') || (stringValue(legacy, 'payment') === 'credito' && Boolean(account.cardId));
        if (isCardPurchase) {
            if (!account.cardId)
                throw new TypeError(`Compra de cartão ${base.id} sem cartão correspondente.`);
            transactions.push({ ...base, kind: 'expense', settlement: { kind: 'credit-card', creditCardId: account.cardId } });
            const paymentId = optionalString(legacy, 'invoice_payment_id');
            if (booleanValue(legacy, 'credit_settled') && paymentId && !invoicePaymentIds.has(paymentId)) {
                const assetId = account.guaranteeAssetId ?? `asset_legacy_guarantee_${accountId}`;
                const current = syntheticGroups.get(paymentId);
                syntheticGroups.set(paymentId, {
                    cardId: account.cardId,
                    accountId,
                    assetId,
                    amount: current ? addCents(current.amount, base.amount) : base.amount,
                    date: isoDateFromTimestamp(stringValue(legacy, 'settled_at'), base.date),
                    createdAt: stringValue(legacy, 'settled_at', base.updatedAt ?? exportedAt)
                });
            }
            continue;
        }
        transactions.push({
            ...base,
            kind: 'expense',
            settlement: { kind: 'account', accountId, method: paymentMethod(stringValue(legacy, 'payment')) }
        });
    }
    const guaranteePayments = new Map();
    for (const [paymentId, group] of syntheticGroups) {
        const previous = guaranteePayments.get(group.cardId) ?? ZERO_CENTS;
        guaranteePayments.set(group.cardId, addCents(previous, group.amount));
        transactions.push({
            id: paymentId,
            profileId,
            kind: 'credit-card-payment',
            creditCardId: group.cardId,
            source: { kind: 'guarantee-asset', assetId: group.assetId },
            amount: group.amount,
            date: group.date,
            description: 'Liquidação de fatura migrada · garantia',
            note: 'Evento reconstruído a partir de compras marcadas como liquidadas na versão legada.',
            createdAt: Number.isFinite(Date.parse(group.createdAt)) ? new Date(group.createdAt).toISOString() : exportedAt,
            updatedAt: exportedAt,
            entrySource: 'manual'
        });
        warnings.push(`Pagamento de fatura ${paymentId} foi reconstruído como liquidação pela garantia.`);
    }
    return { transactions, guaranteePayments, recurrenceLinks, warnings };
}
