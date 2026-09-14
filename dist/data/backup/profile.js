import { createBackupEnvelope } from './model.js';
export async function collectProfileBackupData(repositories, profile) {
    const profileId = profile.id;
    const [accounts, transactions, creditCards, debts, assets, allocations, recurrences, recurrenceMonths, investmentInstruments, investmentTrades] = await Promise.all([
        repositories.accounts.listByProfile(profileId), repositories.transactions.listByProfile(profileId),
        repositories.creditCards.listByProfile(profileId), repositories.debts.listByProfile(profileId),
        repositories.assets.listByProfile(profileId), repositories.allocations.listByProfile(profileId),
        repositories.recurrences.listByProfile(profileId), repositories.recurrenceMonths.listByProfile(profileId),
        repositories.investmentInstruments.listByProfile(profileId), repositories.investmentTrades.listByProfile(profileId)
    ]);
    return { profiles: [profile], accounts, transactions, creditCards, debts, assets, allocations, recurrences, recurrenceMonths, investmentInstruments, investmentTrades };
}
export async function createProfileBackup(repositories, profile, exportedAt = new Date().toISOString()) {
    return createBackupEnvelope(await collectProfileBackupData(repositories, profile), exportedAt);
}
