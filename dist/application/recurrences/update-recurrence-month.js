import { requireYearMonth } from '../shared/validation.js';
export async function updateRecurrenceMonth(months, recurrences, transactions, input) {
    const recurrence = await recurrences.getById(input.recurrenceId);
    if (!recurrence || recurrence.profileId !== input.profileId)
        throw new TypeError('Recorrência inválida.');
    if (input.status === 'paid' && !input.linkedTransactionId)
        throw new TypeError('Status Pago exige movimentação vinculada.');
    if (input.linkedTransactionId) {
        const transaction = await transactions.getById(input.linkedTransactionId);
        if (!transaction || transaction.profileId !== input.profileId)
            throw new TypeError('Movimentação vinculada inválida.');
    }
    const month = requireYearMonth(input.month);
    const state = {
        id: `${input.recurrenceId}:${month}`, recurrenceId: input.recurrenceId, profileId: input.profileId,
        month, status: input.status, ...(input.linkedTransactionId ? { linkedTransactionId: input.linkedTransactionId } : {}),
        updatedAt: new Date().toISOString()
    };
    await months.save(state);
    return state;
}
