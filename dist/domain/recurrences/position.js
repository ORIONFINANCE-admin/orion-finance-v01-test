import { addCents, ZERO_CENTS } from '../money/money.js';
function dueDateForMonth(month, dayOfMonth) {
    const [yearText, monthText] = month.split('-');
    const year = Number(yearText);
    const monthNumber = Number(monthText);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const day = Math.min(Math.max(dayOfMonth, 1), lastDay);
    return `${month}-${String(day).padStart(2, '0')}`;
}
export function effectiveRecurrenceStatus(recurrence, month, monthState, today) {
    if (monthState?.status === 'paid')
        return 'paid';
    if (monthState?.status === 'ignored')
        return 'ignored';
    return dueDateForMonth(month, recurrence.dayOfMonth) < today ? 'overdue' : 'planned';
}
export function calculateMonthCommitments(recurrences, monthStates, month, today) {
    let plannedExpense = ZERO_CENTS;
    let plannedIncome = ZERO_CENTS;
    let overdueExpense = ZERO_CENTS;
    for (const recurrence of recurrences) {
        if (!recurrence.active || recurrence.startMonth > month || (recurrence.endMonth !== undefined && recurrence.endMonth < month))
            continue;
        const state = monthStates.find((item) => item.recurrenceId === recurrence.id && item.month === month);
        const status = effectiveRecurrenceStatus(recurrence, month, state, today);
        if (status === 'paid' || status === 'ignored')
            continue;
        if (recurrence.kind === 'expense') {
            plannedExpense = addCents(plannedExpense, recurrence.amount);
            if (status === 'overdue')
                overdueExpense = addCents(overdueExpense, recurrence.amount);
        }
        else
            plannedIncome = addCents(plannedIncome, recurrence.amount);
    }
    return { plannedExpense, plannedIncome, overdueExpense };
}
