export async function updateTransaction(gateway, profileId, transaction) {
    if (transaction.profileId !== profileId)
        throw new TypeError('Perfil da movimentação é incompatível.');
    return gateway.update(profileId, transaction);
}
export async function deleteTransaction(gateway, profileId, transactionId) {
    return gateway.remove(profileId, transactionId);
}
export async function undoTransactionMutation(gateway, profileId, auditEventId) {
    return gateway.undo(profileId, auditEventId);
}
