import { requestToPromise, withStore } from './database.js';
import { STORES } from './schema.js';
async function getById(storeName, id) {
    return withStore(storeName, 'readonly', async (store) => {
        const value = await requestToPromise(store.get(id));
        return value ?? null;
    });
}
async function save(storeName, value) {
    await withStore(storeName, 'readwrite', async (store) => { await requestToPromise(store.put(value)); });
}
async function listByProfile(storeName, profileId) {
    return withStore(storeName, 'readonly', async (store) => {
        const values = await requestToPromise(store.index('profileId').getAll(profileId));
        return values;
    });
}
export class IndexedDbProfileRepository {
    getById(id) { return getById(STORES.profiles, id); }
    save(profile) { return save(STORES.profiles, profile); }
}
export class IndexedDbAccountRepository {
    async listByProfile(profileId) {
        const values = await listByProfile(STORES.accounts, profileId);
        return [...values].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    }
    getById(id) { return getById(STORES.accounts, id); }
    save(account) { return save(STORES.accounts, account); }
}
export class IndexedDbTransactionRepository {
    async listByProfile(profileId) {
        const values = await listByProfile(STORES.transactions, profileId);
        return [...values].sort((left, right) => {
            const byDate = right.date.localeCompare(left.date);
            return byDate !== 0 ? byDate : (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
        });
    }
    getById(id) { return getById(STORES.transactions, id); }
    save(transaction) { return save(STORES.transactions, transaction); }
    async remove(id) {
        await withStore(STORES.transactions, 'readwrite', async (store) => { await requestToPromise(store.delete(id)); });
    }
}
export class IndexedDbCreditCardRepository {
    listByProfile(profileId) { return listByProfile(STORES.creditCards, profileId); }
    getById(id) { return getById(STORES.creditCards, id); }
    save(card) { return save(STORES.creditCards, card); }
}
export class IndexedDbDebtRepository {
    listByProfile(profileId) { return listByProfile(STORES.debts, profileId); }
    getById(id) { return getById(STORES.debts, id); }
    save(debt) { return save(STORES.debts, debt); }
}
export class IndexedDbAssetRepository {
    listByProfile(profileId) { return listByProfile(STORES.assets, profileId); }
    getById(id) { return getById(STORES.assets, id); }
    save(asset) { return save(STORES.assets, asset); }
}
export class IndexedDbAllocationRepository {
    listByProfile(profileId) { return listByProfile(STORES.allocations, profileId); }
    getById(id) { return getById(STORES.allocations, id); }
    save(allocation) { return save(STORES.allocations, allocation); }
}
export class IndexedDbRecurrenceRepository {
    listByProfile(profileId) { return listByProfile(STORES.recurrences, profileId); }
    getById(id) { return getById(STORES.recurrences, id); }
    save(recurrence) { return save(STORES.recurrences, recurrence); }
}
export class IndexedDbRecurrenceMonthRepository {
    listByProfile(profileId) { return listByProfile(STORES.recurrenceMonths, profileId); }
    getById(id) { return getById(STORES.recurrenceMonths, id); }
    save(state) { return save(STORES.recurrenceMonths, state); }
}
export class IndexedDbInvestmentInstrumentRepository {
    listByProfile(profileId) { return listByProfile(STORES.investmentInstruments, profileId); }
    getById(id) { return getById(STORES.investmentInstruments, id); }
    save(instrument) { return save(STORES.investmentInstruments, instrument); }
}
export class IndexedDbInvestmentTradeRepository {
    async listByProfile(profileId) {
        const values = await listByProfile(STORES.investmentTrades, profileId);
        return [...values].sort((left, right) => right.date.localeCompare(left.date));
    }
    getById(id) { return getById(STORES.investmentTrades, id); }
    save(trade) { return save(STORES.investmentTrades, trade); }
}
