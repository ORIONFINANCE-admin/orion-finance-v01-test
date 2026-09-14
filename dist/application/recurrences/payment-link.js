import { transactionMatchesRecurrence } from '../../domain/recurrences/payment-link.js';
import { requireYearMonth } from '../shared/validation.js';
import { updateRecurrenceMonth } from './update-recurrence-month.js';
export async function listRecurrencePaymentCandidates(recurrences, recurrenceMonths, transactions, input) {
    const recurrence = await recurrences.getById(input.recurrenceId);
    if (!recurrence || recurrence.profileId !== input.profileId)
        throw new TypeError('Recorrência inválida.');
    const month = requireYearMonth(input.month);
    const [items, monthStates] = await Promise.all([
        transactions.listByProfile(input.profileId),
        recurrenceMonths.listByProfile(input.profileId)
    ]);
    const linkedElsewhere = new Set(monthStates
        .filter((state) => state.status === 'paid' && state.recurrenceId !== recurrence.id && state.linkedTransactionId)
        .map((state) => state.linkedTransactionId));
    return items
        .filter((item) => !linkedElsewhere.has(item.id) && transactionMatchesRecurrence(recurrence, item, month))
        .sort((left, right) => right.date.localeCompare(left.date));
}
export async function linkRecurrencePayment(recurrenceMonths, recurrences, transactions, input) {
    await updateRecurrenceMonth(recurrenceMonths, recurrences, transactions, {
        profileId: input.profileId,
        recurrenceId: input.recurrenceId,
        month: input.month,
        status: 'paid',
        linkedTransactionId: input.transactionId
    });
}
export async function unlinkRecurrencePayment(recurrenceMonths, recurrences, transactions, input) {
    await updateRecurrenceMonth(recurrenceMonths, recurrences, transactions, {
        profileId: input.profileId,
        recurrenceId: input.recurrenceId,
        month: input.month,
        status: 'planned'
    });
}
