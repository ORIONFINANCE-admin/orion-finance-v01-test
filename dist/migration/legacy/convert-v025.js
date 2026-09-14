import { convertLegacyCore, finalizeCardsAndGuarantees } from './convert-core.js';
import { convertLegacyTransactions } from './convert-transactions.js';
import { convertLegacyAllocations, convertLegacyDebts, convertLegacyRecurrences } from './convert-planning.js';
import { parseLegacyBackup } from './parse.js';
import { asArray } from './shared.js';
function validateReferences(data) {
    const accounts = new Set(data.accounts.map((item) => item.id));
    const cards = new Set(data.creditCards.map((item) => item.id));
    const debts = new Set(data.debts.map((item) => item.id));
    const assets = new Set(data.assets.map((item) => item.id));
    const recurrences = new Set(data.recurrences.map((item) => item.id));
    for (const transaction of data.transactions) {
        if (transaction.kind === 'income' || transaction.kind === 'yield' || transaction.kind === 'debt-payment') {
            if (!accounts.has(transaction.accountId))
                throw new TypeError(`Migração gerou conta ausente em ${transaction.id}.`);
        }
        else if (transaction.kind === 'expense') {
            if (transaction.settlement.kind === 'account' && !accounts.has(transaction.settlement.accountId))
                throw new TypeError(`Migração gerou conta ausente em ${transaction.id}.`);
            if (transaction.settlement.kind === 'credit-card' && !cards.has(transaction.settlement.creditCardId))
                throw new TypeError(`Migração gerou cartão ausente em ${transaction.id}.`);
        }
        else if (transaction.kind === 'transfer') {
            if (!accounts.has(transaction.fromAccountId) || !accounts.has(transaction.toAccountId))
                throw new TypeError(`Migração gerou transferência inválida em ${transaction.id}.`);
        }
        else if (transaction.kind === 'credit-card-payment') {
            if (!cards.has(transaction.creditCardId))
                throw new TypeError(`Migração gerou pagamento para cartão ausente em ${transaction.id}.`);
            if (transaction.source.kind === 'account' && !accounts.has(transaction.source.accountId))
                throw new TypeError(`Migração gerou fonte de pagamento ausente em ${transaction.id}.`);
            if (transaction.source.kind === 'guarantee-asset' && !assets.has(transaction.source.assetId))
                throw new TypeError(`Migração gerou garantia ausente em ${transaction.id}.`);
        }
        if (transaction.kind === 'debt-payment' && !debts.has(transaction.debtId))
            throw new TypeError(`Migração gerou pagamento para dívida ausente em ${transaction.id}.`);
    }
    for (const state of data.recurrenceMonths)
        if (!recurrences.has(state.recurrenceId))
            throw new TypeError(`Estado mensal sem recorrência: ${state.id}.`);
}
export function convertLegacyV025Backup(raw, targetProfileId) {
    const parsed = parseLegacyBackup(raw);
    const warnings = [];
    const core = convertLegacyCore(parsed.data, targetProfileId, parsed.exportedAt);
    const transactionConversion = convertLegacyTransactions(parsed.data, targetProfileId, core.accountContexts, parsed.exportedAt);
    warnings.push(...transactionConversion.warnings);
    const cardsAndGuarantees = finalizeCardsAndGuarantees(core.accountContexts, targetProfileId, transactionConversion.guaranteePayments, parsed.exportedAt);
    const debts = convertLegacyDebts(parsed.data, targetProfileId, parsed.exportedAt);
    const accountIds = new Set(core.accounts.map((item) => item.id));
    const allocations = convertLegacyAllocations(parsed.data, targetProfileId, accountIds, parsed.exportedAt, warnings);
    const recurrenceConversion = convertLegacyRecurrences(parsed.data, targetProfileId, transactionConversion.recurrenceLinks, parsed.exportedAt, warnings);
    if (asArray(parsed.data, 'monthly_snapshots').length > 0) {
        warnings.push('Snapshots mensais legados não são migrados como autoridade; serão recalculados pelo novo Financial Core.');
    }
    warnings.push('A identidade legada foi reatribuída ao profile abstrato de destino; nenhum profile pessoal é hardcoded.');
    const data = {
        profiles: [core.profile],
        accounts: core.accounts,
        transactions: transactionConversion.transactions,
        creditCards: cardsAndGuarantees.creditCards,
        debts,
        assets: cardsAndGuarantees.assets,
        allocations,
        recurrences: recurrenceConversion.recurrences,
        recurrenceMonths: recurrenceConversion.recurrenceMonths,
        investmentInstruments: [],
        investmentTrades: []
    };
    validateReferences(data);
    const counts = {
        profiles: data.profiles.length,
        accounts: data.accounts.length,
        transactions: data.transactions.length,
        creditCards: data.creditCards.length,
        debts: data.debts.length,
        assets: data.assets.length,
        allocations: data.allocations.length,
        recurrences: data.recurrences.length,
        recurrenceMonths: data.recurrenceMonths.length
    };
    return { data, report: { sourceVersion: parsed.version, exportedAt: parsed.exportedAt, counts, warnings } };
}
