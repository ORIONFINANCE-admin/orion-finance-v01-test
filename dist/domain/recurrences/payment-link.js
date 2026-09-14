export function transactionMatchesRecurrence(recurrence, transaction, month) {
    if (transaction.profileId !== recurrence.profileId)
        return false;
    if (!transaction.date.startsWith(`${month}-`))
        return false;
    if (transaction.amount !== recurrence.amount)
        return false;
    if (recurrence.kind === 'expense') {
        if (transaction.kind !== 'expense')
            return false;
        if (!recurrence.accountId)
            return true;
        return transaction.settlement.kind === 'account' && transaction.settlement.accountId === recurrence.accountId;
    }
    if (transaction.kind !== 'income' && transaction.kind !== 'yield')
        return false;
    return !recurrence.accountId || transaction.accountId === recurrence.accountId;
}
