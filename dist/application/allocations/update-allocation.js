import { calculateAllocationPosition } from '../../domain/allocations/position.js';
import { calculateCashBalances } from '../../domain/ledger/ledger.js';
import { parseMajorToCents, ZERO_CENTS } from '../../domain/money/money.js';
import { requireISODate } from '../shared/validation.js';
export async function updateAllocationDetails(allocations, accounts, transactions, gateway, input) {
    const current = await allocations.getById(input.allocationId);
    if (!current || current.profileId !== input.profileId || !current.active)
        throw new TypeError('Alocação não encontrada para o perfil ativo.');
    const account = await accounts.getById(current.accountId);
    if (!account || account.profileId !== input.profileId || !account.active)
        throw new TypeError('Conta da alocação não está disponível.');
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o nome da alocação.');
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0)
        throw new RangeError('Valor alocado deve ser maior que zero.');
    const targetAmount = input.targetAmount ? parseMajorToCents(input.targetAmount) : undefined;
    if (targetAmount !== undefined && targetAmount < amount)
        throw new RangeError('Meta não pode ser menor que o valor alocado.');
    const [profileAccounts, history, allAllocations] = await Promise.all([
        accounts.listByProfile(input.profileId),
        transactions.listByProfile(input.profileId),
        allocations.listByProfile(input.profileId)
    ]);
    const balance = calculateCashBalances(profileAccounts, history).get(account.id) ?? ZERO_CENTS;
    const otherAllocations = allAllocations.filter((item) => item.id !== current.id);
    const available = calculateAllocationPosition(account.id, balance, otherAllocations).unallocated;
    if (amount > available)
        throw new RangeError('Alocação excede o saldo ainda disponível nesta conta.');
    const goalDate = input.goalDate ? requireISODate(input.goalDate) : undefined;
    return gateway.update(input.profileId, 'allocation', {
        ...current,
        name,
        amount,
        targetAmount,
        goalDate,
        protected: input.protected,
        description: input.description?.trim() || undefined
    });
}
