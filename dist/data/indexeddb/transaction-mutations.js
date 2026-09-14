import { transactionMatchesRecurrence } from '../../domain/recurrences/payment-link.js';
import { openOrionDatabase, requestToPromise, transactionDone } from './database.js';
import { STORES } from './schema.js';
function auditId() {
    return `audit_${crypto.randomUUID()}`;
}
async function linkedPaidStates(store, profileId, transactionId) {
    const states = await requestToPromise(store.getAll());
    return states.filter((state) => state.profileId === profileId && state.status === 'paid' && state.linkedTransactionId === transactionId);
}
async function assertLinkedUpdateCompatible(recurrenceStore, states, next) {
    for (const state of states) {
        const recurrence = await requestToPromise(recurrenceStore.get(state.recurrenceId));
        if (!recurrence || !transactionMatchesRecurrence(recurrence, next, state.month)) {
            throw new TypeError('Esta movimentação está vinculada a um compromisso pago. Desvincule o pagamento antes de alterar valor, data ou conta.');
        }
    }
}
function requireOwnedTransaction(value, profileId) {
    if (!value || typeof value !== 'object')
        throw new TypeError('Movimentação não encontrada.');
    const transaction = value;
    if (transaction.profileId !== profileId)
        throw new TypeError('Movimentação não pertence ao perfil ativo.');
    return transaction;
}
export class IndexedDbTransactionMutationGateway {
    async update(profileId, next) {
        if (next.profileId !== profileId)
            throw new TypeError('Perfil da movimentação é incompatível.');
        const database = await openOrionDatabase();
        const unit = database.transaction([STORES.transactions, STORES.recurrenceMonths, STORES.recurrences, STORES.auditEvents], 'readwrite');
        const transactions = unit.objectStore(STORES.transactions);
        const recurrenceMonths = unit.objectStore(STORES.recurrenceMonths);
        const recurrences = unit.objectStore(STORES.recurrences);
        const audit = unit.objectStore(STORES.auditEvents);
        const previous = requireOwnedTransaction(await requestToPromise(transactions.get(next.id)), profileId);
        const linkedStates = await linkedPaidStates(recurrenceMonths, profileId, next.id);
        await assertLinkedUpdateCompatible(recurrences, linkedStates, next);
        const now = new Date().toISOString();
        const updated = { ...next, updatedAt: now };
        const event = {
            id: auditId(), profileId, entityType: 'transaction', entityId: next.id, action: 'update',
            beforeSnapshot: previous, afterSnapshot: updated, occurredAt: now
        };
        await requestToPromise(transactions.put(updated));
        await requestToPromise(audit.put(event));
        await transactionDone(unit);
        return event;
    }
    async remove(profileId, transactionId) {
        const database = await openOrionDatabase();
        const unit = database.transaction([STORES.transactions, STORES.recurrenceMonths, STORES.auditEvents], 'readwrite');
        const transactions = unit.objectStore(STORES.transactions);
        const recurrenceMonths = unit.objectStore(STORES.recurrenceMonths);
        const audit = unit.objectStore(STORES.auditEvents);
        const previous = requireOwnedTransaction(await requestToPromise(transactions.get(transactionId)), profileId);
        const linkedStates = await linkedPaidStates(recurrenceMonths, profileId, transactionId);
        if (linkedStates.length > 0)
            throw new TypeError('Esta movimentação está vinculada a um compromisso pago. Desvincule o pagamento antes de excluir.');
        const now = new Date().toISOString();
        const event = {
            id: auditId(), profileId, entityType: 'transaction', entityId: transactionId, action: 'delete',
            beforeSnapshot: previous, afterSnapshot: null, occurredAt: now
        };
        await requestToPromise(transactions.delete(transactionId));
        await requestToPromise(audit.put(event));
        await transactionDone(unit);
        return event;
    }
    async undo(profileId, auditEventId) {
        const database = await openOrionDatabase();
        const unit = database.transaction([STORES.transactions, STORES.auditEvents], 'readwrite');
        const transactions = unit.objectStore(STORES.transactions);
        const audit = unit.objectStore(STORES.auditEvents);
        const sourceRaw = await requestToPromise(audit.get(auditEventId));
        if (!sourceRaw)
            throw new TypeError('Alteração auditada não encontrada.');
        const source = sourceRaw;
        if (source.profileId !== profileId)
            throw new TypeError('Alteração não pertence ao perfil ativo.');
        if (source.revertedAt)
            throw new TypeError('Esta alteração já foi desfeita.');
        if (source.entityType !== 'transaction')
            throw new TypeError('Tipo de alteração não suportado para desfazer.');
        if (!source.beforeSnapshot || typeof source.beforeSnapshot !== 'object')
            throw new TypeError('Não há estado anterior para restaurar.');
        const previous = requireOwnedTransaction(source.beforeSnapshot, profileId);
        const now = new Date().toISOString();
        const restored = { ...previous, updatedAt: now };
        const restoreEvent = {
            id: auditId(), profileId, entityType: 'transaction', entityId: source.entityId, action: 'restore',
            beforeSnapshot: source.afterSnapshot, afterSnapshot: restored, occurredAt: now, relatedEventId: source.id
        };
        const markedSource = { ...source, revertedAt: now };
        await requestToPromise(transactions.put(restored));
        await requestToPromise(audit.put(markedSource));
        await requestToPromise(audit.put(restoreEvent));
        await transactionDone(unit);
        return restoreEvent;
    }
}
