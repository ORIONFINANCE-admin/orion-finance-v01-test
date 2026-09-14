import { openOrionDatabase, requestToPromise, transactionDone } from './database.js';
import { STORES } from './schema.js';
const STORE_BY_ENTITY = {
    account: STORES.accounts,
    'credit-card': STORES.creditCards,
    debt: STORES.debts,
    asset: STORES.assets,
    allocation: STORES.allocations,
    recurrence: STORES.recurrences
};
function auditId() {
    return `audit_${crypto.randomUUID()}`;
}
function requireOwnedEntity(value, profileId) {
    if (!value || typeof value !== 'object')
        throw new TypeError('Registro não encontrado.');
    const entity = value;
    if (typeof entity.id !== 'string' || typeof entity.profileId !== 'string' || typeof entity.active !== 'boolean') {
        throw new TypeError('Registro incompatível com alteração segura.');
    }
    if (entity.profileId !== profileId)
        throw new TypeError('Registro não pertence ao perfil ativo.');
    return entity;
}
export class IndexedDbEntityLifecycleMutationGateway {
    async update(profileId, entityType, next) {
        if (next.profileId !== profileId)
            throw new TypeError('Perfil do registro é incompatível.');
        const storeName = STORE_BY_ENTITY[entityType];
        const database = await openOrionDatabase();
        const unit = database.transaction([storeName, STORES.auditEvents], 'readwrite');
        const store = unit.objectStore(storeName);
        const audit = unit.objectStore(STORES.auditEvents);
        const previous = requireOwnedEntity(await requestToPromise(store.get(next.id)), profileId);
        const now = new Date().toISOString();
        const updated = { ...next, updatedAt: now };
        const event = {
            id: auditId(), profileId, entityType, entityId: next.id, action: 'update',
            beforeSnapshot: previous, afterSnapshot: updated, occurredAt: now
        };
        await requestToPromise(store.put(updated));
        await requestToPromise(audit.put(event));
        await transactionDone(unit);
        return event;
    }
    async deactivate(profileId, entityType, entityId) {
        const storeName = STORE_BY_ENTITY[entityType];
        const database = await openOrionDatabase();
        const unit = database.transaction([storeName, STORES.auditEvents], 'readwrite');
        const store = unit.objectStore(storeName);
        const audit = unit.objectStore(STORES.auditEvents);
        const previous = requireOwnedEntity(await requestToPromise(store.get(entityId)), profileId);
        if (!previous.active)
            throw new TypeError('Este registro já está desativado.');
        const now = new Date().toISOString();
        const deactivated = { ...previous, active: false, updatedAt: now };
        const event = {
            id: auditId(), profileId, entityType, entityId, action: 'deactivate',
            beforeSnapshot: previous, afterSnapshot: deactivated, occurredAt: now
        };
        await requestToPromise(store.put(deactivated));
        await requestToPromise(audit.put(event));
        await transactionDone(unit);
        return event;
    }
    async undo(profileId, auditEventId) {
        const database = await openOrionDatabase();
        const lookup = database.transaction(STORES.auditEvents, 'readonly');
        const sourceRaw = await requestToPromise(lookup.objectStore(STORES.auditEvents).get(auditEventId));
        await transactionDone(lookup);
        if (!sourceRaw)
            throw new TypeError('Alteração auditada não encontrada.');
        const source = sourceRaw;
        if (source.profileId !== profileId)
            throw new TypeError('Alteração não pertence ao perfil ativo.');
        if (source.entityType === 'transaction')
            throw new TypeError('Use o fluxo de movimentações para desfazer esta alteração.');
        if (source.revertedAt)
            throw new TypeError('Esta alteração já foi desfeita.');
        if (!source.beforeSnapshot || typeof source.beforeSnapshot !== 'object')
            throw new TypeError('Não há estado anterior para restaurar.');
        const storeName = STORE_BY_ENTITY[source.entityType];
        const unit = database.transaction([storeName, STORES.auditEvents], 'readwrite');
        const store = unit.objectStore(storeName);
        const audit = unit.objectStore(STORES.auditEvents);
        const previous = requireOwnedEntity(source.beforeSnapshot, profileId);
        const now = new Date().toISOString();
        const restored = { ...previous, updatedAt: now };
        const restoreEvent = {
            id: auditId(), profileId, entityType: source.entityType, entityId: source.entityId, action: 'restore',
            beforeSnapshot: source.afterSnapshot, afterSnapshot: restored, occurredAt: now, relatedEventId: source.id
        };
        await requestToPromise(store.put(restored));
        await requestToPromise(audit.put({ ...source, revertedAt: now }));
        await requestToPromise(audit.put(restoreEvent));
        await transactionDone(unit);
        return restoreEvent;
    }
}
