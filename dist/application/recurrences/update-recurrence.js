import { parseMajorToCents } from '../../domain/money/money.js';
import { requireDayOfMonth, requireYearMonth } from '../shared/validation.js';
export async function updateRecurrenceDetails(recurrences, accounts, gateway, input) {
    const current = await recurrences.getById(input.recurrenceId);
    if (!current || current.profileId !== input.profileId || !current.active)
        throw new TypeError('Recorrência não encontrada para o perfil ativo.');
    if (input.accountId) {
        const account = await accounts.getById(input.accountId);
        if (!account || account.profileId !== input.profileId || !account.active)
            throw new TypeError('Conta da recorrência inválida.');
    }
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o compromisso recorrente.');
    const amount = parseMajorToCents(input.amount);
    if (amount <= 0)
        throw new RangeError('Valor da recorrência deve ser maior que zero.');
    const endMonth = input.endMonth ? requireYearMonth(input.endMonth) : undefined;
    if (endMonth !== undefined && endMonth < current.startMonth)
        throw new RangeError('O mês final não pode vir antes do inicial.');
    return gateway.update(input.profileId, 'recurrence', {
        ...current,
        name,
        amount,
        accountId: input.accountId,
        dayOfMonth: requireDayOfMonth(input.dayOfMonth),
        endMonth,
        priority: input.priority,
        note: input.note?.trim() || undefined
    });
}
