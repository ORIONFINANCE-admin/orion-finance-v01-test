import { requestToPromise, withStore } from './database.js';
import { STORES } from './schema.js';
function symbolKey(instrument) {
    return `${instrument.venue}:${instrument.symbol.toUpperCase()}:${instrument.currency}`;
}
export class IndexedDbMarketDataCache {
    async getQuote(instrument) {
        const key = symbolKey(instrument);
        return withStore(STORES.marketCache, 'readonly', async (store) => {
            const value = await requestToPromise(store.get(`quote:${key}`));
            if (!value)
                return null;
            const record = value;
            const { id: _id, symbolKey: _symbolKey, ...snapshot } = record;
            return snapshot;
        });
    }
    async saveQuote(snapshot) {
        const key = symbolKey(snapshot.instrument);
        const record = { ...snapshot, id: `quote:${key}`, symbolKey: key };
        await withStore(STORES.marketCache, 'readwrite', async (store) => {
            await requestToPromise(store.put(record));
        });
    }
    async getFundamentals(instrument) {
        const key = symbolKey(instrument);
        return withStore(STORES.marketCache, 'readonly', async (store) => {
            const value = await requestToPromise(store.get(`fundamentals:${key}`));
            if (!value)
                return null;
            const record = value;
            const { id: _id, symbolKey: _symbolKey, ...snapshot } = record;
            return snapshot;
        });
    }
    async saveFundamentals(snapshot) {
        const key = symbolKey(snapshot.instrument);
        const record = { ...snapshot, id: `fundamentals:${key}`, symbolKey: key };
        await withStore(STORES.marketCache, 'readwrite', async (store) => {
            await requestToPromise(store.put(record));
        });
    }
}
