import { calculateCashBalances } from '../../domain/ledger/ledger.js';
import { addCents, parseMajorToCents } from '../../domain/money/money.js';
import { calculateInvestmentPosition } from '../../domain/investments/position.js';
import { parseQuantity } from '../../domain/investments/quantity.js';
import { createEntityId } from '../shared/ids.js';
import { requireISODate } from '../shared/validation.js';
export async function recordInvestmentTrade(trades, instruments, accounts, transactions, input, now = new Date()) {
    const instrument = await instruments.getById(input.instrumentId);
    if (!instrument || !instrument.active || instrument.profileId !== input.profileId)
        throw new Error('Ativo de investimento inválido.');
    const account = await accounts.getById(input.settlementAccountId);
    if (!account || !account.active || account.profileId !== input.profileId)
        throw new Error('Conta de liquidação inválida.');
    const quantity = parseQuantity(input.quantity);
    if (quantity <= 0)
        throw new RangeError('A quantidade deve ser maior que zero.');
    const grossAmount = parseMajorToCents(input.grossAmount);
    const fees = parseMajorToCents(input.fees?.trim() || '0');
    if (grossAmount <= 0)
        throw new RangeError('O valor bruto deve ser maior que zero.');
    if (fees < 0)
        throw new RangeError('Taxas não podem ser negativas.');
    const date = requireISODate(input.date);
    const existingTrades = await trades.listByProfile(input.profileId);
    const position = calculateInvestmentPosition(input.instrumentId, existingTrades);
    if (input.side === 'sell' && quantity > position.quantity)
        throw new RangeError('Venda excede a posição disponível.');
    if (input.side === 'buy') {
        const [allAccounts, allTransactions] = await Promise.all([
            accounts.listByProfile(input.profileId), transactions.listByProfile(input.profileId)
        ]);
        const balances = calculateCashBalances(allAccounts.filter((item) => item.active), allTransactions, existingTrades);
        const available = balances.get(account.id) ?? account.openingBalance;
        const required = addCents(grossAmount, fees);
        if (required > available)
            throw new RangeError('Saldo insuficiente na conta de liquidação para registrar a compra.');
    }
    else if (fees > grossAmount) {
        throw new RangeError('Taxas de venda não podem superar o valor bruto.');
    }
    const trade = {
        id: createEntityId('trade'),
        profileId: input.profileId,
        instrumentId: input.instrumentId,
        settlementAccountId: input.settlementAccountId,
        side: input.side,
        quantity,
        grossAmount,
        fees,
        date,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        createdAt: now.toISOString(),
        entrySource: 'manual'
    };
    await trades.save(trade);
    return trade;
}
