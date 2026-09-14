import { BACKUP_FORMAT_VERSION } from '../../app/version.js';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function arrayOrEmpty(record, key) {
    const value = record[key];
    if (value === undefined)
        return [];
    if (!Array.isArray(value))
        throw new TypeError(`Backup inválido: ${key} deve ser uma lista.`);
    return value;
}
function requireString(record, key) {
    const value = record[key];
    if (typeof value !== 'string')
        throw new TypeError(`Backup inválido: ${key} deve ser texto.`);
    return value;
}
function validateEntityList(values, malformedMessage, checks) {
    for (const value of values) {
        if (!isRecord(value) || typeof value.id !== 'string' || typeof value.profileId !== 'string' || !checks(value)) {
            throw new TypeError(`Backup inválido: ${malformedMessage}.`);
        }
    }
}
export function parseBackup(raw) {
    const unknownValue = JSON.parse(raw);
    if (!isRecord(unknownValue))
        throw new TypeError('Backup inválido: envelope ausente.');
    if (unknownValue.formatVersion !== BACKUP_FORMAT_VERSION)
        throw new TypeError(`Formato de backup não suportado: ${String(unknownValue.formatVersion)}.`);
    if (typeof unknownValue.schemaVersion !== 'number' || !Number.isSafeInteger(unknownValue.schemaVersion))
        throw new TypeError('Backup inválido: schemaVersion ausente.');
    const data = unknownValue.data;
    if (!isRecord(data))
        throw new TypeError('Backup inválido: data ausente.');
    const profiles = arrayOrEmpty(data, 'profiles');
    const accounts = arrayOrEmpty(data, 'accounts');
    const transactions = arrayOrEmpty(data, 'transactions');
    const creditCards = arrayOrEmpty(data, 'creditCards');
    const debts = arrayOrEmpty(data, 'debts');
    const assets = arrayOrEmpty(data, 'assets');
    const allocations = arrayOrEmpty(data, 'allocations');
    const recurrences = arrayOrEmpty(data, 'recurrences');
    const recurrenceMonths = arrayOrEmpty(data, 'recurrenceMonths');
    const investmentInstruments = arrayOrEmpty(data, 'investmentInstruments');
    const investmentTrades = arrayOrEmpty(data, 'investmentTrades');
    for (const value of profiles) {
        if (!isRecord(value) || typeof value.id !== 'string' || typeof value.displayName !== 'string')
            throw new TypeError('Backup inválido: perfil malformado.');
    }
    validateEntityList(accounts, 'conta malformada', (value) => typeof value.name === 'string' && Number.isSafeInteger(value.openingBalance));
    validateEntityList(transactions, 'movimentação malformada', (value) => typeof value.kind === 'string' && Number.isSafeInteger(value.amount));
    validateEntityList(creditCards, 'cartão malformado', (value) => typeof value.name === 'string' && Number.isSafeInteger(value.openingLiability));
    validateEntityList(debts, 'dívida malformada', (value) => typeof value.name === 'string' && Number.isSafeInteger(value.openingBalance));
    validateEntityList(assets, 'ativo malformado', (value) => typeof value.name === 'string' && Number.isSafeInteger(value.openingValue));
    validateEntityList(allocations, 'alocação malformada', (value) => typeof value.name === 'string' && Number.isSafeInteger(value.amount));
    validateEntityList(recurrences, 'recorrência malformada', (value) => typeof value.name === 'string' && Number.isSafeInteger(value.amount));
    validateEntityList(recurrenceMonths, 'estado de recorrência malformado', (value) => typeof value.recurrenceId === 'string' && typeof value.month === 'string');
    validateEntityList(investmentInstruments, 'instrumento de investimento malformado', (value) => typeof value.symbol === 'string' && typeof value.name === 'string' && typeof value.venue === 'string');
    validateEntityList(investmentTrades, 'negociação de investimento malformada', (value) => typeof value.instrumentId === 'string' && typeof value.side === 'string' && Number.isSafeInteger(value.quantity) && Number.isSafeInteger(value.grossAmount) && Number.isSafeInteger(value.fees));
    return {
        formatVersion: BACKUP_FORMAT_VERSION,
        schemaVersion: unknownValue.schemaVersion,
        appVersion: requireString(unknownValue, 'appVersion'),
        exportedAt: requireString(unknownValue, 'exportedAt'),
        data: {
            profiles: profiles,
            accounts: accounts,
            transactions: transactions,
            creditCards: creditCards,
            debts: debts,
            assets: assets,
            allocations: allocations,
            recurrences: recurrences,
            recurrenceMonths: recurrenceMonths,
            investmentInstruments: investmentInstruments,
            investmentTrades: investmentTrades
        }
    };
}
