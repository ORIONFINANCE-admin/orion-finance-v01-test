import { openOrionDatabase } from './database.js';
import { STORES } from './schema.js';
export async function inspectLocalDatabase() {
    try {
        const database = await openOrionDatabase();
        const expected = Object.values(STORES);
        const available = expected.filter((store) => database.objectStoreNames.contains(store));
        const missing = expected.filter((store) => !database.objectStoreNames.contains(store));
        return {
            status: missing.length === 0 ? 'healthy' : 'unavailable',
            version: database.version,
            expectedStores: expected.length,
            availableStores: available.length,
            missingStores: missing,
            message: missing.length === 0 ? null : `Stores ausentes: ${missing.join(', ')}`
        };
    }
    catch (error) {
        return {
            status: 'unavailable',
            version: null,
            expectedStores: Object.keys(STORES).length,
            availableStores: 0,
            missingStores: [],
            message: error instanceof Error ? error.message : 'Banco local indisponível.'
        };
    }
}
