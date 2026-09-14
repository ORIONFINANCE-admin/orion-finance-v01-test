import { calculateDebtPosition } from '../../domain/debts/position.js';
import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
import { requireISODate } from '../shared/validation.js';
export async function payDebt(transactions, debts, accounts, input) {
    const debt = await debts.getById(input.debtId);
    if (!debt || debt.profileId !== input.profileId)
        throw new TypeError('Dívida inválida.');
    const account = await accounts.getById(input.accountId);
    if (!account || account.profileId !== input.profileId || !account.active)
        throw new TypeError('Conta inválida.');
    const history = await transactions.listByProfile(input.profileId);
    const outstanding = calculateDebtPosition(debt, history).outstanding;
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0 || amount > outstanding)
        throw new RangeError('Pagamento deve ser positivo e não pode exceder o saldo da dívida.');
    const transaction = {
        id: createEntityId('txn'), profileId: input.profileId, kind: 'debt-payment', amount,
        date: requireISODate(input.date), description: `Pagamento · ${debt.name}`, entrySource: 'manual',
        createdAt: new Date().toISOString(), debtId: debt.id, accountId: account.id
    };
    await transactions.save(transaction);
    return transaction;
}
