import { calculateAllocationPosition } from '../../domain/allocations/position.js';
import { calculateCashBalances } from '../../domain/ledger/ledger.js';
import { parseMajorToCents, ZERO_CENTS } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
export async function createAllocation(allocations, accounts, transactions, input) {
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o nome da alocação.');
    const account = await accounts.getById(input.accountId);
    if (!account || account.profileId !== input.profileId || !account.active)
        throw new TypeError('Conta inválida para alocação.');
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0)
        throw new RangeError('Valor alocado deve ser maior que zero.');
    const targetAmount = input.targetAmount ? parseMajorToCents(input.targetAmount) : undefined;
    if (targetAmount !== undefined && targetAmount < amount)
        throw new RangeError('Meta não pode ser menor que o valor já alocado.');
    const [profileAccounts, history, currentAllocations] = await Promise.all([
        accounts.listByProfile(input.profileId), transactions.listByProfile(input.profileId), allocations.listByProfile(input.profileId)
    ]);
    const balance = calculateCashBalances(profileAccounts, history).get(account.id) ?? ZERO_CENTS;
    const current = calculateAllocationPosition(account.id, balance, currentAllocations);
    if (amount > current.unallocated)
        throw new RangeError('Alocação excede o saldo ainda não alocado desta conta.');
    const now = new Date().toISOString();
    const allocation = {
        id: createEntityId('alloc'), profileId: input.profileId, accountId: account.id, name, amount,
        protected: input.protected, active: true,
        ...(targetAmount !== undefined ? { targetAmount } : {}),
        ...(input.goalDate ? { goalDate: input.goalDate } : {}),
        createdAt: now, updatedAt: now
    };
    await allocations.save(allocation);
    return allocation;
}
