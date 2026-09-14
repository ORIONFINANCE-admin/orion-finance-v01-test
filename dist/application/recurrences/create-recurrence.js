import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
import { requireDayOfMonth, requireYearMonth } from '../shared/validation.js';
export async function createRecurrence(recurrences, accounts, input) {
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o compromisso recorrente.');
    if (input.accountId) {
        const account = await accounts.getById(input.accountId);
        if (!account || account.profileId !== input.profileId || !account.active)
            throw new TypeError('Conta da recorrência inválida.');
    }
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0)
        throw new RangeError('Valor da recorrência deve ser maior que zero.');
    const startMonth = requireYearMonth(input.startMonth);
    const endMonth = input.endMonth ? requireYearMonth(input.endMonth) : undefined;
    if (endMonth !== undefined && endMonth < startMonth)
        throw new RangeError('O mês final não pode vir antes do inicial.');
    const now = new Date().toISOString();
    const recurrence = {
        id: createEntityId('rec'), profileId: input.profileId, name, kind: input.kind, amount,
        dayOfMonth: requireDayOfMonth(input.dayOfMonth), startMonth, active: true,
        ...(endMonth !== undefined ? { endMonth } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        ...(input.accountId ? { accountId: input.accountId } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        createdAt: now, updatedAt: now
    };
    await recurrences.save(recurrence);
    return recurrence;
}
