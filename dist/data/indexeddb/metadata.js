import { requestToPromise, withStore } from './database.js';
import { STORES } from './schema.js';
export class IndexedDbMetadataRepository {
    async get(key) {
        return withStore(STORES.metadata, 'readonly', async (store) => {
            const value = await requestToPromise(store.get(key));
            return value?.value ?? null;
        });
    }
    async set(key, value) {
        await withStore(STORES.metadata, 'readwrite', async (store) => {
            await requestToPromise(store.put({ key, value }));
        });
    }
}
export class IndexedDbMigrationRunRepository {
    async getByFingerprint(profileId, fingerprint) {
        return withStore(STORES.migrationRuns, 'readonly', async (store) => {
            const values = await requestToPromise(store.index('profileId').getAll(profileId));
            return values.find((item) => item.sourceFingerprint === fingerprint) ?? null;
        });
    }
    async save(run) {
        await withStore(STORES.migrationRuns, 'readwrite', async (store) => {
            await requestToPromise(store.put(run));
        });
    }
}
export class IndexedDbProviderHealthRepository {
    async save(record) {
        await withStore(STORES.providerHealth, 'readwrite', async (store) => {
            await requestToPromise(store.put(record));
        });
    }
    async listLatest() {
        return withStore(STORES.providerHealth, 'readonly', async (store) => {
            const values = await requestToPromise(store.getAll());
            const latest = new Map();
            for (const item of values) {
                const current = latest.get(item.providerId);
                if (!current || item.checkedAt > current.checkedAt)
                    latest.set(item.providerId, item);
            }
            return [...latest.values()].sort((a, b) => a.role.localeCompare(b.role));
        });
    }
}
