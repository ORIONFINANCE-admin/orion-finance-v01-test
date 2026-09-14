import { DB_NAME, DB_VERSION } from './schema.js';
import { applyIndexedDbMigrations } from './migrations.js';
let databasePromise = null;
export function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.addEventListener('success', () => resolve(request.result), { once: true });
        request.addEventListener('error', () => reject(request.error ?? new Error('Falha no IndexedDB.')), { once: true });
    });
}
export function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.addEventListener('complete', () => resolve(), { once: true });
        transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('Transação IndexedDB abortada.')), { once: true });
        transaction.addEventListener('error', () => reject(transaction.error ?? new Error('Falha na transação IndexedDB.')), { once: true });
    });
}
export function openOrionDatabase() {
    if (databasePromise)
        return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.addEventListener('upgradeneeded', (event) => {
            const oldVersion = event.oldVersion;
            applyIndexedDbMigrations(request.result, oldVersion);
        });
        request.addEventListener('success', () => resolve(request.result), { once: true });
        request.addEventListener('error', () => reject(request.error ?? new Error('Não foi possível abrir o banco local.')), { once: true });
        request.addEventListener('blocked', () => reject(new Error('Atualização do banco bloqueada por outra aba.')), { once: true });
    });
    return databasePromise;
}
export async function withStore(storeName, mode, work) {
    const database = await openOrionDatabase();
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = await work(store);
    await transactionDone(transaction);
    return result;
}
