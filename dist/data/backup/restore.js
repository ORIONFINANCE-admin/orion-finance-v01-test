import { openOrionDatabase, requestToPromise, transactionDone } from '../indexeddb/database.js';
import { STORES } from '../indexeddb/schema.js';
const PROFILE_STORES = [
    STORES.accounts, STORES.transactions, STORES.creditCards, STORES.debts, STORES.assets,
    STORES.allocations, STORES.recurrences, STORES.recurrenceMonths, STORES.investmentInstruments, STORES.investmentTrades
];
function assertBoundToProfile(data, profileId) {
    if (data.profiles.length !== 1 || data.profiles[0]?.id !== profileId)
        throw new TypeError('Backup não está vinculado ao perfil de destino.');
    const groups = [data.accounts, data.transactions, data.creditCards, data.debts, data.assets, data.allocations, data.recurrences, data.recurrenceMonths, data.investmentInstruments, data.investmentTrades];
    for (const group of groups)
        for (const item of group) {
            if (item.profileId !== profileId)
                throw new TypeError('Backup contém dados de outro perfil.');
        }
}
async function deleteProfileRecords(store, profileId) {
    const keys = await requestToPromise(store.index('profileId').getAllKeys(profileId));
    for (const key of keys)
        await requestToPromise(store.delete(key));
}
export async function replaceProfileDataAtomically(profileId, data) {
    assertBoundToProfile(data, profileId);
    const storeNames = [STORES.profiles, ...PROFILE_STORES];
    const database = await openOrionDatabase();
    const transaction = database.transaction(storeNames, 'readwrite');
    const stores = Object.fromEntries(storeNames.map((name) => [name, transaction.objectStore(name)]));
    for (const name of PROFILE_STORES)
        await deleteProfileRecords(stores[name], profileId);
    await requestToPromise(stores[STORES.profiles].delete(profileId));
    const batches = [
        [STORES.profiles, data.profiles], [STORES.accounts, data.accounts], [STORES.transactions, data.transactions],
        [STORES.creditCards, data.creditCards], [STORES.debts, data.debts], [STORES.assets, data.assets],
        [STORES.allocations, data.allocations], [STORES.recurrences, data.recurrences], [STORES.recurrenceMonths, data.recurrenceMonths],
        [STORES.investmentInstruments, data.investmentInstruments], [STORES.investmentTrades, data.investmentTrades]
    ];
    for (const [name, values] of batches)
        for (const value of values)
            await requestToPromise(stores[name].put(value));
    await transactionDone(transaction);
}
/** @deprecated Use replaceProfileDataAtomically for public-ready profile isolation. */
export async function replaceCoreDataAtomically(data) {
    const profile = data.profiles[0];
    if (!profile || data.profiles.length !== 1)
        throw new TypeError('Restauração global desabilitada: backup deve conter um único perfil.');
    await replaceProfileDataAtomically(profile.id, data);
}
