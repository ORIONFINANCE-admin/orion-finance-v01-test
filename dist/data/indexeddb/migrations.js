import { STORES } from './schema.js';
export const MIGRATION_VERSIONS = [1, 2, 3, 4, 5];
export function pendingMigrationVersions(oldVersion) {
    if (!Number.isSafeInteger(oldVersion) || oldVersion < 0)
        throw new RangeError('Versão anterior do banco inválida.');
    return MIGRATION_VERSIONS.filter((version) => version > oldVersion);
}
function createIndexedStore(database, name, indexes) {
    if (database.objectStoreNames.contains(name))
        return;
    const store = database.createObjectStore(name, { keyPath: 'id' });
    for (const index of indexes)
        store.createIndex(index, index, { unique: false });
}
function migrateToV1(database) {
    if (!database.objectStoreNames.contains(STORES.metadata))
        database.createObjectStore(STORES.metadata, { keyPath: 'key' });
    if (!database.objectStoreNames.contains(STORES.profiles))
        database.createObjectStore(STORES.profiles, { keyPath: 'id' });
    createIndexedStore(database, STORES.accounts, ['profileId']);
    createIndexedStore(database, STORES.transactions, ['profileId', 'date']);
}
function migrateToV2(database) {
    createIndexedStore(database, STORES.creditCards, ['profileId']);
    createIndexedStore(database, STORES.debts, ['profileId']);
    createIndexedStore(database, STORES.assets, ['profileId']);
    createIndexedStore(database, STORES.allocations, ['profileId', 'accountId']);
    createIndexedStore(database, STORES.recurrences, ['profileId']);
    createIndexedStore(database, STORES.recurrenceMonths, ['profileId', 'recurrenceId', 'month']);
}
function migrateToV3(database) {
    createIndexedStore(database, STORES.auditEvents, ['profileId', 'entityId', 'occurredAt']);
    createIndexedStore(database, STORES.marketCache, ['symbolKey', 'fetchedAt']);
}
function migrateToV4(database) {
    createIndexedStore(database, STORES.investmentInstruments, ['profileId', 'symbol']);
    createIndexedStore(database, STORES.investmentTrades, ['profileId', 'instrumentId', 'date']);
}
function migrateToV5(database) {
    createIndexedStore(database, STORES.migrationRuns, ['profileId', 'sourceVersion', 'createdAt']);
    createIndexedStore(database, STORES.providerHealth, ['providerId', 'checkedAt']);
}
export function applyIndexedDbMigrations(database, oldVersion) {
    for (const version of pendingMigrationVersions(oldVersion)) {
        if (version === 1)
            migrateToV1(database);
        else if (version === 2)
            migrateToV2(database);
        else if (version === 3)
            migrateToV3(database);
        else if (version === 4)
            migrateToV4(database);
        else if (version === 5)
            migrateToV5(database);
    }
}
